#!/usr/bin/env node
/**
 * Cross-diff analysis: find the source-field bytes by comparing 4 mix-source runs.
 *
 * Each run has the same 689-byte baseline (wizard+1FreeMix, Source="---").
 * The changed file differs only in which source was selected.
 *
 * Strategy:
 *   1. Load diffs for specs 06, 17, 18, 19.
 *   2. Find offsets that appear in ALL 4 diffs (always change from baseline).
 *   3. Among those, find offsets whose "after" value DIFFERS between runs
 *      → these are the source-encoding bytes.
 *   4. Print a table so we can read off category/member encoding.
 */

const fs = require('fs');
const path = require('path');

const DIFFS_DIR = path.join(__dirname, 'diffs');

const RUNS = [
  { file: '06-mixes-source.json',         label: 'Analogs/Rudder (1st)' },
  { file: '17-mixes-source-analog2.json', label: 'Analogs/2nd item'     },
  { file: '18-mixes-source-analog4.json', label: 'Analogs/4th item'     },
  { file: '19-mixes-source-channel1.json',label: 'Channels/CH1'         },
];

// Load diffs, skip missing files with a warning
const loaded = RUNS.map(r => {
  const fp = path.join(DIFFS_DIR, r.file);
  if (!fs.existsSync(fp)) {
    console.warn(`  MISSING: ${r.file}`);
    return null;
  }
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const map = new Map(d.diffs.map(e => [e.offset, e.after]));
  return { ...r, map, baselineBytes: d.baselineBytes, changedBytes: d.changedBytes };
}).filter(Boolean);

if (loaded.length < 2) {
  console.error('Need at least 2 runs to compare. Run the specs first.');
  process.exit(1);
}

// Build union of all changed offsets
const allOffsets = new Set();
for (const run of loaded) run.map.forEach((_, offset) => allOffsets.add(offset));

// Find offsets that vary between runs (different "after" values across runs)
const varying = [];
for (const offset of [...allOffsets].sort((a, b) => a - b)) {
  const values = loaded.map(r => r.map.has(offset) ? r.map.get(offset) : '(same)');
  const uniqueValues = new Set(values.map(String));
  if (uniqueValues.size > 1) {
    varying.push({ offset, values });
  }
}

// Print results
console.log(`\n=== Mix source encoding — cross-diff analysis ===`);
console.log(`Comparing ${loaded.length} runs:\n`);
loaded.forEach((r, i) => {
  console.log(`  [${i}] ${r.label}  (${r.baselineBytes} → ${r.changedBytes} bytes)`);
});

console.log(`\nOffsets whose value DIFFERS between runs (source-encoding candidates):`);
console.log(`${'offset'.padEnd(10)} ${'hex'.padEnd(8)} ${loaded.map((r, i) => `[${i}]`.padEnd(8)).join(' ')}`);
console.log('-'.repeat(10 + 8 + loaded.length * 9));

for (const { offset, values } of varying) {
  const hex = `0x${offset.toString(16).toUpperCase().padStart(4, '0')}`;
  const cols = values.map(v =>
    v === '(same)' ? '(same)  ' : `0x${Number(v).toString(16).padStart(2,'0')}=${String(v).padEnd(3)}`
  );
  console.log(`${String(offset).padEnd(10)} ${hex.padEnd(8)} ${cols.join(' ')}`);
}

console.log(`\nTotal varying offsets: ${varying.length}`);
console.log(`\nHint: look for 1-2 bytes that change systematically with source selection.`);
console.log(`  Category byte: same value across all Analog runs, different for Channels.`);
console.log(`  Member byte:   increments (or otherwise progresses) across Analog items.`);
