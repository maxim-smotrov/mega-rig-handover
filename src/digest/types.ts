// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One job's night, folded from its lines in `runs/<night>.jsonl`. */
export type DigestRow = {
  job: string;
  /** `null` when the log says so; views render it as `—`. */
  owner: string | null;
  /** Every line for this job, whatever its status. */
  runs: number;
  /** Lines with status `retry`. */
  retries: number;
  /** Lines with status `fail`. A later `ok` doesn't erase them. */
  fails: number;
  lastStatus: RunStatus;
  /** Error of the job's last line, `null` when it had none. */
  lastError: string | null;
  /** `at` of the job's first and last line, exactly as logged (offset kept). */
  firstAt: string;
  lastAt: string;
};

/** Log lines per status, bad lines excluded. */
export type StatusCounts = Record<RunStatus, number>;

export type Night = {
  night: string;
  /** Sorted by job. */
  rows: DigestRow[];
  counts: StatusCounts;
  /** Lines that did not parse as a run line. Counted, never thrown. */
  badLines: number;
};

/**
 * Reads `<runsDir>/<night>.jsonl`. Returns `null` when the night has no file, or when `night`
 * is not `YYYY-MM-DD`. An empty file is a night with no rows.
 */
export type ReadNight = (runsDir: string, night: string) => Night | null;
