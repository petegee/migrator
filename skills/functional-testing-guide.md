# Functional Testing with WASM Emulator — Migration Guide

## Overview

After structural validation passes (`test-model.js` with PASS status and 0 byte diffs), you can optionally run functional tests using the WASM emulator. This involves:

1. **Layer 1** — Structural validation (round-trip test) ✓ **Required**
2. **Layer 2** — Stick/switch input smoke test ✓ Optional but recommended
3. **Layer 3** — Log scraping and analysis ✓ Optional, advanced

This guide covers Layers 2 and 3 in the context of model migration.

---

## When to Use Functional Testing

**Do this when:**
- Structural test (Layer 1) passed but model behaves strangely on radio
- You want to validate input → trim/switch response before radio testing
- You need to debug a complex model (many mixes, logical switches, special functions)
- You're testing a model with novel input structures

**Skip this when:**
- Structural test failed — fix structure first, then retest
- Model is simple (1-2 inputs, 1-2 mixes)
- Time is limited — radio testing is the final authority anyway

---

## Quick Functional Test

```bash
cd models/{MODEL}/
node ../../lib/test-model.js attempt-N.bin
# Ensures structural validation passes first
```

If that passes with `diffCount: 0`, then optionally test with stick inputs:

```javascript
// In the WASM emulator (see wasm-radio-emulator.md for full template):
setTimeout(() => {
  // Register callbacks to observe firmware responses
  M.setTrimsValue = (ptr, count) => {
    const trims = new Int16Array(M.HEAP16.buffer, ptr, count);
    console.log('Trims:', Array.from(trims));
  };
  
  M.setSwitchesPosition = (ptr, count) => {
    const sw = new Int8Array(M.HEAP8.buffer, ptr, count);
    console.log('Switches:', Array.from(sw));
  };
  
  // Drive inputs
  M._setAnalogPosition(0, 2048); // Aileron centre
  M._setAnalogPosition(1, 2048); // Elevator centre
  M._setAnalogPosition(2, 0);    // Throttle minimum
  M._setAnalogPosition(3, 2048); // Rudder centre
  
  // Wait for firmware to process and call callbacks
}, 1000);

setTimeout(() => {
  // Read final model (should be identical to input)
  const out = FS.readFile('/models/model00.bin');
  const identical = Buffer.from(out).equals(Buffer.from(modelData));
  console.log('Round-trip:', identical ? 'PASS' : 'FAIL');
  process.exit(identical ? 0 : 1);
}, 5000);
```

---

## Debugging with Callbacks

If stick inputs don't produce expected trim/switch changes:

### Step 1: Verify Input Channel Mapping

The emulator maps physical sticks to ADC channels:

| Channel | Physical |
|---------|----------|
| 0 | Aileron (right stick horizontal) |
| 1 | Elevator (right stick vertical) |
| 2 | Throttle (left stick vertical) |
| 3 | Rudder (left stick horizontal) |
| 4+ | Pots / sliders |

Verify your model uses these standard mappings.

### Step 2: Check Firmware Logs

```javascript
const logs = [];
const X18RS_FCC = /* ... */;

X18RS_FCC({
  // ...
  print: (t) => { logs.push(t); console.log('[fw]', t); },
  printErr: (t) => { logs.push(t); console.error('[fw!]', t); },
  // ...
  onRuntimeInitialized() {
    // ... test code ...
    setTimeout(() => {
      // Grep for input-related messages
      logs.filter(l => l.includes('input') || l.includes('stick') || l.includes('expo'))
        .forEach(l => console.log(l));
    }, 5000);
  }
});
```

### Step 3: Inspect Trim Callback Data

Trim values use custom units (1/256 μs display-scaled). The callback gives you raw values:

```javascript
M.setTrimsValue = (ptr, count) => {
  const trims = new Int16Array(M.HEAP16.buffer, ptr, count);
  // trims[0] = Rudder
  // trims[1] = Elevator
  // trims[2] = Aileron
  // trims[3] = Throttle
  trims.forEach((v, i) => console.log(`Trim[${i}]: ${v}`));
};
```

Compare these values against EdgeTX trim offsets to verify correctness.

---

## Common Functional Test Failures

| Symptom | Likely Cause | Debug Steps |
|---------|-------------|----------|
| No trim callback after stick move | Input section not parsed correctly | Check Input (Var) data in binary; compare against reference |
| Switch callback doesn't fire | Logical switches or flight modes misconfigured | Verify logicalSw section; check FM definitions |
| Trims change unexpectedly | Trim mode or range misconfigured | Review trim channel blocks (Section 7); compare against 1chnl.bin |
| Firmware crashes with "Sentinel" | Bad field value in mix or input | Inspect byte diffs; check enum ranges |

---

## Integration with Migration Workflow

### In the Prompt Template

Mention functional testing as optional:

```markdown
## Optional Functional Validation

Once structural validation (test-model.js) passes:

1. Run the minimal smoke test (stick inputs → trim callbacks)
2. Verify trims respond as expected
3. Check firmware logs for any warnings

See `skills/functional-testing-guide.md` for detailed emulator API.
```

### In Lessons Learned

Add entries like:

```markdown
### Logical Switches — Missing Flight Mode Mask

**Problem:** Logical switches defined but never trigger.
**Root Cause:** Logical switch FM mask (flight mode activation) was all zeros.
**Solution:** Ensure logical switch is active in at least one FM.
**Status:** ✓ Verified
```

---

## Reference: Minimal Functional Test Template

```javascript
const fs   = require('fs');
const path = require('path');

const MIGRATOR_DIR = '/home/pete/source/ethos/migrator';
const LIB_DIR      = path.join(MIGRATOR_DIR, 'lib');
const PATCHED_JS   = path.join(LIB_DIR, 'X18RS_FCC_patched.js');
const RADIO_BIN    = path.join(LIB_DIR, 'wasm_radio.bin');
const WASM_BIN     = path.join(LIB_DIR, 'X18RS_FCC.wasm');
const MODEL_BIN    = process.argv[2];

// Browser shims (see wasm-radio-emulator.md)
global.document = {
  currentScript: { src: `file://${PATCHED_JS}` },
  createElement: () => ({ getContext:()=>null, style:{}, set onload(f){}, set src(s){}, set onerror(f){} }),
  body: { appendChild:()=>{} }, head: { appendChild:()=>{} }
};
global.window   = global; global.self = global;
global.location = { href:`file://${LIB_DIR}/`, origin:'file://' };
global.performance = { now: () => Date.now() };
global.navigator   = { userAgent:'Node.js', hardwareConcurrency:1 };

const firmwareCode = fs.readFileSync(PATCHED_JS, 'utf8');
const X18RS_FCC = new Function('require','module','exports','__dirname','__filename',
  firmwareCode+'\nreturn X18RS_FCC;'
)(require,module,exports,LIB_DIR,PATCHED_JS);

const wasmBinary = fs.readFileSync(WASM_BIN);
const modelData  = fs.readFileSync(MODEL_BIN);
const logs = [];
let testPassed = false;

process.on('uncaughtException', (e) => {
  if (!e.message?.includes('pthread')) console.error('[fatal]', e.message);
});

X18RS_FCC({
  wasmBinary, noInitialRun: true,
  print:    (t) => { logs.push(t); console.log('[fw]', t); },
  printErr: (t) => { if (!t.includes('pthread')) console.error('[fw!]', t); },
  canvas:   {},
  onRuntimeInitialized() {
    const M  = this;
    const FS = M.FS;

    // Register output callbacks
    M.setTrimsValue = (ptr, count) => {
      const trims = new Int16Array(M.HEAP16.buffer, ptr, count);
      console.log('Trims after inputs:', Array.from(trims));
    };
    M.setSwitchesPosition = (ptr, count) => {
      const sw = new Int8Array(M.HEAP8.buffer, ptr, count);
      console.log('Switches after inputs:', Array.from(sw));
    };

    // Load files
    try { FS.mkdir('/models'); } catch(e) {}
    FS.writeFile('/radio.bin', new Uint8Array(fs.readFileSync(RADIO_BIN)));
    FS.writeFile('/models/model00.bin', new Uint8Array(modelData));

    // Boot
    try { M._start(); } catch(e) {}

    // Test: drive inputs after settle
    setTimeout(() => {
      console.log('--- Driving inputs ---');
      M._setAnalogPosition(0, 4095); // Aileron full right
      M._setAnalogPosition(1, 4095); // Elevator full up
      M._setAnalogPosition(2, 0);    // Throttle low
      M._setAnalogPosition(3, 4095); // Rudder full right
    }, 1000);

    // Collect and verify output
    setTimeout(() => {
      const out = FS.readFile('/models/model00.bin');
      testPassed = Buffer.from(out).equals(Buffer.from(modelData));
      const modelRead = logs.some(l => l.includes('ModelData::read'));
      const sentinel  = logs.some(l => l.includes('Sentinel') || l.includes('check failed'));

      console.log('');
      console.log('=== RESULTS ===');
      console.log('Model parsed:', modelRead ? 'YES' : 'NO');
      console.log('Sentinel errors:', sentinel ? 'YES' : 'NO');
      console.log('Round-trip identical:', testPassed ? 'YES' : 'NO');
      console.log('Overall:', (testPassed && !sentinel && modelRead) ? 'PASS' : 'FAIL');

      process.exit(testPassed ? 0 : 1);
    }, 5000);
  }
}).catch(e => { console.error('[init]', e.message); process.exit(1); });
```

Save as `test-functional.js` in the migration tooling directory for reuse.

---

## When to Move to Radio Testing

Once functional validation passes:
1. Download the `.bin` file
2. Load it on your radio
3. Test the full feature set (all inputs, all mixes, all trims)
4. Provide feedback via `./run.sh <container> <model> --feedback`

The radio is the final validation — emulator testing is a fast precursor that catches structural issues early.
