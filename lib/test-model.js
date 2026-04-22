// Test a .bin model against the Ethos WASM firmware.
// Usage: node test-model.js <model.bin> [--keep-logs]
// Outputs: <model>_test_report.json, <model>_diff.txt, <model>_validation.txt
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const modelFile = process.argv[2];
const keepLogs = process.argv.includes('--keep-logs');
if (!modelFile) { console.error('Usage: node test-model.js <model.bin> [--keep-logs]'); process.exit(1); }

const modelData = fs.readFileSync(modelFile);
const modelName = path.basename(modelFile, '.bin');
const modelDir = path.dirname(modelFile);
const outputDir = modelDir;
const startTime = Date.now();

console.log(`[${timestamp()}] Testing: ${modelFile} (${modelData.length}B)`);

const DIR = __dirname;
const PATCHED_JS = path.join(DIR, 'X18RS_FCC_patched.js');
const RADIO_BIN  = path.join(DIR, 'wasm_radio.bin');

global.document = {
  currentScript: { src: `file://${PATCHED_JS}` },
  createElement: () => ({ getContext:()=>null, style:{}, set onload(f){}, set src(s){}, set onerror(f){} }),
  body: { appendChild: ()=>{} }, head: { appendChild: ()=>{} },
};
global.window = global; global.self = global;
global.location = { href:`file://${DIR}/`, origin:'file://' };
global.performance = { now: ()=>Date.now() };
global.navigator = { userAgent:'Node.js', hardwareConcurrency:1 };

const firmwareCode = fs.readFileSync(PATCHED_JS, 'utf8');
const X18RS_FCC = new Function('require','module','exports','__dirname','__filename',
  firmwareCode+'\nreturn X18RS_FCC;'
)(require, module, exports, DIR, PATCHED_JS);

const wasmBinary = fs.readFileSync(path.join(DIR, 'X18RS_FCC.wasm'));
const logs = { stdout: [], stderr: [], errors: [], files: {} };
let vmFS = null;

function timestamp() {
  const now = new Date();
  return now.toISOString().split('T')[1].split('.')[0];
}

function logStdout(msg) {
  const t = timestamp();
  logs.stdout.push({ time: t, msg });
  console.log(`[${t}] ${msg}`);
}

function logStderr(msg) {
  const t = timestamp();
  logs.stderr.push({ time: t, msg });
  console.error(`[${t}] ERR: ${msg}`);
}

function logError(msg) {
  const t = timestamp();
  logs.errors.push({ time: t, msg });
  console.error(`[${t}] ERROR: ${msg}`);
}

process.on('uncaughtException', (err) => {
  const msg = err.message?.split('\n')[0] || '';
  if (!msg.includes('pthread')) logError(`${msg}`);
  report();
  process.exit(0);
});

function dumpFilesFromFS(FS) {
  const dumped = {};
  try {
    const files = FS.readdir('/models');
    files.forEach(fname => {
      if (fname === '.' || fname === '..') return;
      try {
        const data = FS.readFile(`/models/${fname}`);
        dumped[fname] = Buffer.from(data);
      } catch(e) {
        logError(`Failed to read /models/${fname}: ${e.message}`);
      }
    });
  } catch(e) {
    logError(`Failed to dump /models: ${e.message}`);
  }
  return dumped;
}

function computeDiff(inputBuf, outputBuf) {
  const diffs = [];
  const minLen = Math.min(inputBuf.length, outputBuf.length);

  for (let i = 0; i < minLen; i++) {
    if (inputBuf[i] !== outputBuf[i]) {
      diffs.push({
        offset: `0x${i.toString(16).padStart(4, '0')}`,
        before: `0x${inputBuf[i].toString(16).padStart(2, '0')}`,
        after: `0x${outputBuf[i].toString(16).padStart(2, '0')}`
      });
    }
  }

  return {
    inputLen: inputBuf.length,
    outputLen: outputBuf.length,
    diffCount: diffs.length,
    diffs: diffs.slice(0, 50)  // limit to first 50
  };
}

function writeDiffReport(diffInfo, fname) {
  let text = `Byte-for-byte diff: ${fname}\n`;
  text += `Input length: ${diffInfo.inputLen}, Output length: ${diffInfo.outputLen}\n`;
  text += `Changed bytes: ${diffInfo.diffCount}\n\n`;

  if (diffInfo.diffCount === 0) {
    text += 'IDENTICAL — firmware made no changes\n';
  } else {
    text += `First ${Math.min(diffInfo.diffCount, 50)} changes:\n`;
    text += 'Offset    Before  After\n';
    text += '─────────────────────────\n';
    diffInfo.diffs.forEach(d => {
      text += `${d.offset}  ${d.before}     ${d.after}\n`;
    });
    if (diffInfo.diffCount > 50) text += `\n... and ${diffInfo.diffCount - 50} more\n`;
  }

  return text;
}

function runPythonValidator(binFile) {
  const validatorScript = path.join(DIR, 'skills', 'inspect-ethos-bin.py');
  if (!fs.existsSync(validatorScript)) {
    logError(`Python validator not found at ${validatorScript}`);
    return { success: false, output: 'Validator not found', errors: [] };
  }

  try {
    const output = execSync(`python3 "${validatorScript}" "${binFile}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output, errors: [] };
  } catch(e) {
    return {
      success: false,
      output: e.stdout || '',
      errors: e.stderr?.split('\n').filter(l => l.trim()) || [e.message]
    };
  }
}

function report() {
  const elapsed = Date.now() - startTime;
  logStdout(`Harness complete (${elapsed}ms)`);

  // Determine pass/fail — two-part model loading:
  //   Part 1: model appears on select screen  → ModelData::read logged
  //   Part 2: model selects without error     → no "Invalid Data" in logs
  const hasSentinel    = logs.errors.some(e => e.msg.includes('Sentinel') || e.msg.includes('check failed'));
  const hasModelRead   = logs.stdout.some(l => l.msg.includes('ModelData::read'));
  const hasInvalidData = [...logs.stdout, ...logs.stderr].some(l => l.msg.includes('Invalid Data'));

  const part1 = hasModelRead;           // model visible on select screen
  const part2 = hasModelRead && !hasInvalidData;  // model selected without error

  let status = 'UNKNOWN';
  let reason = 'no validation event';

  if (hasSentinel) {
    status = 'FAIL';
    reason = 'sentinel error detected';
  } else if (part1 && !part2) {
    status = 'FAIL';
    reason = 'model appeared on select screen (Part 1 OK) but loaded with Invalid Data error (Part 2 FAILED)';
  } else if (part2) {
    status = 'PASS';
    reason = 'model appeared on select screen and loaded without Invalid Data error (Parts 1+2 OK)';
  }

  // Build report
  const report = {
    timestamp: new Date().toISOString(),
    modelFile: modelFile,
    modelSize: modelData.length,
    elapsedMs: elapsed,
    status: status,
    reason: reason,
    part1ModelVisible: part1,
    part2ModelLoaded: part2,
    firmwareLogsCount: logs.stdout.length,
    errorCount: logs.errors.length,
    filesProcessed: Object.keys(logs.files).length,
    diffs: {},
    validation: {},
    summary: {
      identical: 0,
      modified: 0,
      failed: 0
    }
  };

  // Process dumped files
  Object.entries(logs.files).forEach(([fname, outputBuf]) => {
    if (fname === 'model00.bin') {
      const diffInfo = computeDiff(modelData, outputBuf);
      report.diffs[fname] = diffInfo;

      if (diffInfo.diffCount === 0) {
        report.summary.identical++;
      } else {
        report.summary.modified++;
      }

      // Write diff file
      const diffText = writeDiffReport(diffInfo, fname);
      const diffPath = path.join(outputDir, `${modelName}_diff.txt`);
      fs.writeFileSync(diffPath, diffText);
      console.log(`\nDiff report: ${diffPath}`);
    }
  });

  // Run Python validator if output file exists
  const outFile = path.join(outputDir, `wasm_out_${modelName}.bin`);
  if (fs.existsSync(outFile)) {
    const valResult = runPythonValidator(outFile);
    report.validation.success = valResult.success;
    report.validation.output = valResult.output.split('\n').slice(0, 20);  // first 20 lines
    if (valResult.errors.length > 0) {
      report.validation.errors = valResult.errors;
    }

    const valPath = path.join(outputDir, `${modelName}_validation.txt`);
    fs.writeFileSync(valPath, valResult.output);
    console.log(`Validation report: ${valPath}`);
  }

  // Write JSON report
  const reportPath = path.join(outputDir, `${modelName}_test_report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Test report: ${reportPath}`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`RESULT: ${status} — ${reason}`);
  console.log(`  Part 1 (model visible on select screen): ${part1 ? 'PASS' : 'FAIL'}`);
  console.log(`  Part 2 (model loads without Invalid Data): ${part2 ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(60));
  console.log(`Firmware output: ${logs.stdout.length} log lines, ${logs.errors.length} errors`);
  console.log(`Files processed: ${report.filesProcessed}`);
  Object.entries(report.summary).forEach(([k, v]) => {
    if (v > 0) console.log(`  ${k}: ${v}`);
  });
}

X18RS_FCC({
  wasmBinary, noInitialRun: true,
  print:    (t) => { logs.stdout.push({ time: timestamp(), msg: t }); if (keepLogs) console.log(`[${timestamp()}] ${t}`); },
  printErr: (t) => { logStderr(t); },
  canvas: {},
  onRuntimeInitialized() {
    const M = this;
    const FS = M.FS;
    vmFS = FS;
    logStdout('WASM initialized');

    try { FS.mkdir('/models'); } catch(e) {}

    FS.writeFile('/radio.bin', new Uint8Array(fs.readFileSync(RADIO_BIN)));
    FS.writeFile('/models/model00.bin', new Uint8Array(modelData));

    logStdout('Starting firmware...');
    try { M._start(); } catch(e) {
      logError(`${e.message?.split('\n')[0]}`);
    }

    setTimeout(() => {
      // Dump output files
      logs.files = dumpFilesFromFS(FS);
      Object.entries(logs.files).forEach(([fname, buf]) => {
        const outPath = path.join(outputDir, `wasm_out_${fname}`);
        fs.writeFileSync(outPath, buf);
        logStdout(`Dumped: ${outPath} (${buf.length}B)`);
      });

      report();
      process.exit(0);
    }, 5000);
  }
}).catch(e => { logError(`Fatal: ${e.message}`); process.exit(1); });
