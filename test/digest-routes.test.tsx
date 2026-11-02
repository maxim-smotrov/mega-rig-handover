import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const line = (at: string, job: string, status: string, owner: string | null, error: string | null = null) =>
  JSON.stringify({ at, job, status, owner, error });

// Jobs are logged out of order on purpose: both views must sort by job.
const FULL = [
  line('2026-10-28T01:00:00+01:00', 'zeta-export', 'ok', 'dana'),
  line('2026-10-28T01:05:00+01:00', 'mid-orphan', 'ok', null),
  line('2026-10-28T01:10:00+01:00', 'alpha-sync', 'retry', 'ola', 'timeout'),
  line('2026-10-28T01:11:00+01:00', 'alpha-sync', 'retry', 'ola', 'timeout'),
  line('2026-10-28T01:12:00+01:00', 'alpha-sync', 'retry', 'ola', 'timeout'),
  line('2026-10-28T01:13:00+01:00', 'alpha-sync', 'ok', 'ola'),
  line('2026-10-28T01:20:00+01:00', 'beta-report', 'fail', 'sam', 'disk full'),
].join('\n');

const TRUNCATED = '{"at":"2026-10-28T01:30:00+01:00","job":"cut-o';

const nights = {
  full: '2026-10-28',
  empty: '2026-10-27',
  oneBad: '2026-10-26',
  twoBad: '2026-10-25',
  missing: '2026-10-24',
};

let runsDir: string;
let config: Parameters<typeof createApp>[0];

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  const write = (night: string, text: string) => writeFileSync(join(runsDir, `${night}.jsonl`), text);
  write(nights.full, `${FULL}\n`);
  write(nights.empty, '');
  write(nights.oneBad, `${FULL}\n${TRUNCATED}\n`);
  write(nights.twoBad, `${TRUNCATED}\n${FULL}\nnot json at all\n`);
  config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

beforeEach(() => {
  process.env.LANE_MARKER = 'TEST-MARKER';
});

const getPage = async (night: string) => {
  const res = await createApp(config).request(`/digest/${night}`);
  return { res, html: await res.text() };
};

const getJson = async (night: string) => {
  const res = await createApp(config).request(`/api/digest/${night}`);
  return { res, body: (await res.json()) as Night };
};

const tableRows = (html: string) => html.split('<tr').filter((chunk) => chunk.includes('<td'));

/** The `<tr ...>` chunk of the table row whose cells mention `job`. */
const rowOf = (html: string, job: string) => {
  const row = tableRows(html).find((chunk) => chunk.includes(job));
  if (row === undefined) throw new Error(`no table row for ${job}`);
  return `<tr${row}`;
};

const jobsInPageOrder = (html: string, jobs: string[]) =>
  jobs
    .map((job) => ({ job, at: html.indexOf(job) }))
    .sort((a, b) => a.at - b.at)
    .map((x) => x.job);

describe('GET /digest/:night', () => {
  it('renders the heading, the lane banner and one row per job, sorted by job', async () => {
    const { res, html } = await getPage(nights.full);
    expect(res.status).toBe(200);
    expect(html).toContain(`<h1>digest · ${nights.full}</h1>`);
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('<table');
    const jobs = ['alpha-sync', 'beta-report', 'mid-orphan', 'zeta-export'];
    expect(jobsInPageOrder(html, jobs)).toEqual(jobs);
    expect(tableRows(html)).toHaveLength(jobs.length);
  });

  it('renders a missing owner and a missing error as an em dash', async () => {
    const { html } = await getPage(nights.full);
    expect(rowOf(html, 'mid-orphan').match(/—/g)).toHaveLength(2);
    expect(rowOf(html, 'beta-report')).not.toContain('—');
  });

  it('marks rows with 3 retries or a failure as warn, and only those', async () => {
    const { html } = await getPage(nights.full);
    expect(rowOf(html, 'alpha-sync')).toContain('class="warn"');
    expect(rowOf(html, 'beta-report')).toContain('class="warn"');
    expect(rowOf(html, 'mid-orphan')).not.toContain('class="warn"');
    expect(rowOf(html, 'zeta-export')).not.toContain('class="warn"');
  });

  it('says nothing ran for an empty file, without a table', async () => {
    const { res, html } = await getPage(nights.empty);
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('<table');
    expect(html).toContain('TEST-MARKER');
  });

  it('keeps the good rows and reports one bad line', async () => {
    const { res, html } = await getPage(nights.oneBad);
    expect(res.status).toBe(200);
    expect(html).toContain('1 line could not be read');
    expect(html).toContain('alpha-sync');
    expect(html).toContain('zeta-export');
  });

  it('pluralizes the bad line notice', async () => {
    const { res, html } = await getPage(nights.twoBad);
    expect(res.status).toBe(200);
    expect(html).toContain('2 lines could not be read');
    expect(html).toContain('alpha-sync');
  });

  it('answers 404 for a night with no file, still with the lane banner', async () => {
    const { res, html } = await getPage(nights.missing);
    expect(res.status).toBe(404);
    expect(html).toContain('no run log for this night');
    expect(html).toContain('TEST-MARKER');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the night with rows sorted by job and null owner and error kept', async () => {
    const { res, body } = await getJson(nights.full);
    expect(res.status).toBe(200);
    expect(body.night).toBe(nights.full);
    expect(body.badLines).toBe(0);
    expect(body.counts).toEqual({ ok: 3, retry: 3, fail: 1 });
    expect(body.rows.map((r) => r.job)).toEqual(['alpha-sync', 'beta-report', 'mid-orphan', 'zeta-export']);
    const orphan = body.rows.find((r) => r.job === 'mid-orphan');
    expect(orphan?.owner).toBeNull();
    expect(orphan?.lastError).toBeNull();
    expect(body.rows.find((r) => r.job === 'alpha-sync')).toMatchObject({ runs: 4, retries: 3, fails: 0 });
  });

  it('returns no rows for an empty file', async () => {
    const { res, body } = await getJson(nights.empty);
    expect(res.status).toBe(200);
    expect(body).toEqual({ night: nights.empty, rows: [], counts: { ok: 0, retry: 0, fail: 0 }, badLines: 0 });
  });

  it('counts bad lines and keeps the good rows', async () => {
    const one = await getJson(nights.oneBad);
    expect(one.res.status).toBe(200);
    expect(one.body.badLines).toBe(1);
    expect(one.body.rows).toHaveLength(4);

    const two = await getJson(nights.twoBad);
    expect(two.res.status).toBe(200);
    expect(two.body.badLines).toBe(2);
    expect(two.body.rows).toHaveLength(4);
  });

  it('answers 404 with an error body for a night with no file', async () => {
    const res = await createApp(config).request(`/api/digest/${nights.missing}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log for this night', night: nights.missing });
  });
});

describe('page and JSON agree', () => {
  it('lists the same jobs in the same order', async () => {
    const { body } = await getJson(nights.full);
    const jobs = body.rows.map((r) => r.job);
    const { html } = await getPage(nights.full);
    expect(jobsInPageOrder(html, jobs)).toEqual(jobs);
  });
});
