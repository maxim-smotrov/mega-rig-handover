import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from './app.js';

// Saves one rig page as a self-contained HTML file for review (ADR 0001, 0003). The banner
// carries LANE_MARKER from the environment; run it with LANE_MARKER unset for the clean copy.
// Usage: pnpm preview [path] [outFile]
const [path = '/digest/2026-10-28', outFile = 'var/preview/index.html'] = process.argv.slice(2);

const res = await createApp().request(path);
if (res.status !== 200) {
  console.error(`preview: ${path} answered ${res.status}`);
  process.exit(1);
}
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, await res.text());
console.log(`preview: ${path} -> ${outFile}`);
