import type { DigestRow, Night } from '../digest/types.js';

const DASH = '—';
const HEADERS = ['job', 'owner', 'runs', 'retries', 'last status', 'last error', 'first', 'last'];

const needsAttention = (row: DigestRow) => row.retries >= 3 || row.fails > 0;

export function DigestPage({ night }: { night: Night }) {
  return (
    <>
      <h1>digest · {night.night}</h1>
      {night.badLines > 0 && (
        <p class="warn">{night.badLines === 1 ? '1 line' : `${night.badLines} lines`} could not be read</p>
      )}
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              {HEADERS.map((h) => (
                <th>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {night.rows.map((row) => (
              <tr class={needsAttention(row) ? 'warn' : undefined}>
                <td>{row.job}</td>
                <td>{row.owner ?? DASH}</td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td>{row.lastStatus}</td>
                <td>{row.lastError ?? DASH}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
