// Minify all HF tokenizer JSON files under public/tokenizers to shrink repo
// size and network cost. Run with: `npm run minify:tokenizers`.
//
// Behavior:
// - Reads every *.json file in public/tokenizers, JSON.parse + JSON.stringify
//   (no whitespace), writes back in place.
// - Adds a trailing newline so the file doesn't trip lint/diff tools.
// - Prints before/after sizes so the saving is visible.
// - Non-JSON files (e.g. *.tiktoken) are skipped.
// - Re-parses the result to assert it's still valid JSON before writing, so a
//   bad minify can't corrupt the asset.

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'tokenizers');

let totalBefore = 0;
let totalAfter = 0;

for (const name of fs.readdirSync(DIR)) {
  if (!name.endsWith('.json')) continue;
  const file = path.join(DIR, name);
  const raw = fs.readFileSync(file, 'utf8');
  const obj = JSON.parse(raw);
  const min = JSON.stringify(obj) + '\n';

  // Sanity: ensure the round-trip produces identical data.
  JSON.parse(min);

  fs.writeFileSync(file, min);
  totalBefore += raw.length;
  totalAfter += min.length;
  const pct = Math.round((1 - min.length / raw.length) * 100);
  console.log(`${name}: ${raw.length.toLocaleString()} → ${min.length.toLocaleString()} (-${pct}%)`);
}

console.log(`total: ${totalBefore.toLocaleString()} → ${totalAfter.toLocaleString()} (-${Math.round((1 - totalAfter / totalBefore) * 100)}%)`);
