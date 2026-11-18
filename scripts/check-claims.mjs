// Scans user-facing source for wording that would overstate what the prototype does.
// Run: npm run check
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = [
  /\bcures?\b/i,
  /\btreats? (cerebral palsy|CP)\b/i,
  /clinically (proven|validated|effective)(?![^.]*\bnot\b)/i,
  /\breads? (your )?(mind|thoughts)\b(?![^.]*\bnot\b)/i,
  /\byour brain (signals?|activity) (made|caused|triggered)\b/i,
  /\breal[- ]time EEG\b(?![^.]*(would|not|proposed))/i,
  /\bFDA\b/,
];
const REQUIRED = [
  'Conceptual prototype only. Simulated interactions — not a validated medical device or clinical treatment.',
  'SIMULATED — NO EEG DATA IS BEING RECORDED.',
  'Illustrative demonstration data.',
  '56.75%',
  '57.60%',
];

const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|html)$/.test(f)) files.push(p);
  }
};
walk('src');
files.push('index.html');

let problems = 0;
const all = files.map((f) => [f, readFileSync(f, 'utf8')]);
for (const [f, text] of all) {
  let inNegatedList = false;
  text.split('\n').forEach((line, i) => {
    // lists that enumerate what MindWave is NOT are allowed to name those things
    if (/isNot:\s*\[/.test(line)) inNegatedList = true;
    if (inNegatedList && /^\s*\],?\s*$/.test(line)) inNegatedList = false;
    if (inNegatedList) return;
    for (const re of FORBIDDEN) {
      const m = line.match(re);
      if (!m) continue;
      // allow negated statements, e.g. "we have not shown it is clinically effective"
      if (/\b(not|never|no|cannot)\b/i.test(line.slice(0, m.index))) continue;
      problems++;
      console.log(`✗ ${f}:${i + 1}  ${line.trim().slice(0, 140)}`);
    }
  });
}
const joined = all.map(([, t]) => t).join('\n');
for (const r of REQUIRED) if (!joined.includes(r)) {
  problems++;
  console.log(`✗ missing required text: "${r}"`);
}
console.log(problems ? `\n${problems} problem(s) found.` : `✓ Claims check passed (${files.length} files).`);
process.exit(problems ? 1 : 0);
