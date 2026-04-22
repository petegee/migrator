# WASM Radio Emulator — Driver Reference

## Overview

The emulator is the FrSky Ethos firmware (`X18RS_FCC.wasm`) compiled to WebAssembly via Emscripten. It runs a fully functional radio simulator in Node.js or a browser. The JavaScript wrapper (`X18RS_FCC_patched.js`) bridges JS ↔ WASM.

**WASM firmware binary:** `lib/X18RS_FCC.wasm` (self-contained copy in this migrator project)  
**All runtime files (wrapper, harness, radio settings):** `lib/` (self-contained local copies)

**Primary use in migration work:**
1. Load a generated `.bin` model into the firmware
2. Validate it parses cleanly (no sentinel errors)
3. Verify byte-for-byte round-trip fidelity (firmware re-saves identical bytes)
4. Optionally drive stick/switch inputs and observe trim/switch state callbacks

---

## Files

| File | Location | Purpose |
|------|----------|---------|
| `X18RS_FCC.wasm` | `migrator/lib/` | Firmware binary (23 MB, Ethos X18RS FCC variant) |
| `X18RS_FCC_patched.js` | `migrator/lib/` | Emscripten JS wrapper (has patched exports) |
| `wasm_radio.bin` | `migrator/lib/` | Radio settings file — **required** at init time |
| `test-model.js` | `migrator/lib/` | Main validation harness — run this for migration testing |
| `out.wat` | `migrator/lib/` | Decompiled WASM source (143 MB) — searchable firmware internals |

---

## Quickstart: Run the Validation Test

```bash
# From the model's working directory:
node ../../lib/test-model.js attempt-N.bin

# Or with absolute path:
node /home/pete/source/ethos/migrator/lib/test-model.js attempt-N.bin
```

Outputs written to the same directory as the `.bin`:

| File | Contents |
|------|---------|
| `<model>_test_report.json` | Structured pass/fail result |
| `<model>_diff.txt` | Byte-for-byte changes after firmware round-trip |
| `<model>_validation.txt` | Python structural validator output |
| `wasm_out_<model>.bin` | What the firmware wrote back after loading your model |

**Two-part loading — both must pass:**

| Part | What it means | Pass signal | Fail signal |
|------|--------------|-------------|-------------|
| **Part 1** — model visible on select screen | The .bin file was found, header parsed, model appears in the firmware's model list | `ModelData::read(...)` in logs | No `ModelData::read` / `UNKNOWN` |
| **Part 2** — model loads on selection | Model is selected and starts without content errors | No `Invalid Data` in logs | `Invalid Data` visible in emulator UI / logs |

**Overall status:**
- `status: "PASS"` — both parts passed; `part1ModelVisible: true`, `part2ModelLoaded: true`
- `status: "FAIL"` — sentinel error, or Part 1 passed but Part 2 failed (Invalid Data)
- `status: "UNKNOWN"` — firmware exited before reading the model (bad header/crash)
- `diffCount: 0` — firmware re-saved identical bytes (no normalisation needed; check this after PASS)

---

## Initialising the WASM Module in Node.js

The full setup pattern used by all scripts:

```javascript
const fs   = require('fs');
const path = require('path');

const MIGRATOR_DIR = '/home/pete/source/ethos/migrator';
const LIB_DIR      = path.join(MIGRATOR_DIR, 'lib');
const PATCHED_JS   = path.join(LIB_DIR, 'X18RS_FCC_patched.js');
const RADIO_BIN    = path.join(LIB_DIR, 'wasm_radio.bin');
const WASM_BIN     = path.join(LIB_DIR, 'X18RS_FCC.wasm');

// Browser-like globals required by Emscripten in Node.js
global.document = {
  currentScript: { src: `file://${PATCHED_JS}` },
  createElement: () => ({ getContext:()=>null, style:{}, set onload(f){}, set src(s){}, set onerror(f){} }),
  body: { appendChild: ()=>{} }, head: { appendChild: ()=>{} },
};
global.window   = global;
global.self     = global;
global.location = { href: `file://${LIB_DIR}/`, origin: 'file://' };
global.performance = { now: () => Date.now() };
global.navigator   = { userAgent: 'Node.js', hardwareConcurrency: 1 };

// Load the wrapper (function-scope eval pattern avoids module conflicts)
const firmwareCode = fs.readFileSync(PATCHED_JS, 'utf8');
const X18RS_FCC = new Function('require','module','exports','__dirname','__filename',
  firmwareCode + '\nreturn X18RS_FCC;'
)(require, module, exports, LIB_DIR, PATCHED_JS);

const wasmBinary = fs.readFileSync(WASM_BIN);

X18RS_FCC({
  wasmBinary,
  noInitialRun: true,           // don't auto-call main()
  print:    (t) => console.log('[fw]', t),
  printErr: (t) => console.error('[fw!]', t),
  canvas: {},                   // stub — no rendering needed
  onRuntimeInitialized() {
    const M  = this;
    const FS = M.FS;
    // Safe to call WASM functions from here
    // ... see sections below
  }
}).catch(e => { console.error('Fatal:', e.message); process.exit(1); });
```

**Important:** `_start()` will throw a pthread exception — this is expected and harmless. Catch it with `process.on('uncaughtException', ...)` or a try/catch and check for `'pthread'` in the message.

---

## Loading a Model (.bin File)

The firmware expects:
- `/radio.bin` — radio hardware settings (use `wasm_radio.bin` from spike directory)
- `/models/model00.bin` — the model to load (slot 0)

```javascript
onRuntimeInitialized() {
  const M  = this;
  const FS = M.FS;

  // Create directory
  try { FS.mkdir('/models'); } catch(e) {}

  // Write radio settings (required — firmware won't boot without this; RADIO_BIN from LIB_DIR)
  FS.writeFile('/radio.bin', new Uint8Array(fs.readFileSync(RADIO_BIN)));

  // Write your model into slot 0
  const modelData = fs.readFileSync('/path/to/your/attempt-N.bin');
  FS.writeFile('/models/model00.bin', new Uint8Array(modelData));

  // Boot the firmware
  try { M._start(); } catch(e) {
    if (!e.message?.includes('pthread')) throw e;
  }
}
```

Other model slots follow the same pattern: `model01.bin`, `model02.bin`, etc.

---

## Downloading (Extracting) the Firmware's Output Model

After firmware runs, read back what it wrote:

```javascript
setTimeout(() => {
  // Read back firmware-processed model
  const outputData = FS.readFile('/models/model00.bin'); // Uint8Array
  fs.writeFileSync('./wasm_out_model00.bin', Buffer.from(outputData));

  // Or dump everything in /models/
  const files = FS.readdir('/models');
  files.forEach(fname => {
    if (fname === '.' || fname === '..') return;
    const data = FS.readFile(`/models/${fname}`);
    fs.writeFileSync(`./wasm_out_${fname}`, Buffer.from(data));
  });
}, 5000); // wait 5 seconds for firmware to process
```

The 5-second delay gives the firmware time to complete its startup and model-load cycle.

---

## WASM Input API (JS → Firmware)

All input functions are called via `Module.ccall` or directly as `Module._functionName`.

### Analog Inputs (Sticks and Pots)

```javascript
// M._setAnalogPosition(channelIndex, value)
// value range: -100 to +100  (per-cent of full throw, 0 = centre)
// The firmware clamps any value outside this range — verified in WAT source

M._setAnalogPosition(0, 0);     // Aileron    centre
M._setAnalogPosition(1, 0);     // Elevator   centre
M._setAnalogPosition(2, -100);  // Throttle   minimum (full down)
M._setAnalogPosition(3, 0);     // Rudder     centre
M._setAnalogPosition(4, 0);     // Pot/slider (index 4+)

M._setAnalogPosition(0, 100);   // Aileron full right
M._setAnalogPosition(0, -100);  // Aileron full left

// Max 10 analog inputs (indices 0–9); index ≥ 10 triggers a firmware assertion
```

**Typical channel index mapping (X18RS):**

| Index | Input |
|-------|-------|
| 0 | Right horizontal (Aileron) |
| 1 | Right vertical (Elevator) |
| 2 | Left vertical (Throttle) |
| 3 | Left horizontal (Rudder) |
| 4+ | Pots / sliders |

Verify mapping against your model's input configuration.

### Digital Switches

```javascript
// M._setSwitchPosition(switchIndex, position)
// position: 0 = up/off, 1 = centre, 2 = down/on

M._setSwitchPosition(0, 0);  // SA → up
M._setSwitchPosition(0, 2);  // SA → down
M._setSwitchPosition(1, 1);  // SB → centre (3-position middle)
```

Switch indices correspond to physical switch positions on the hardware (SA, SB, SC, …).
Max 10 switches (indices 0–9); index ≥ 10 triggers a firmware assertion.
Switch state is dirty-flagged: the `setSwitchesPosition` callback only fires when a value changes.

### Trim Buttons

```javascript
// M._setTrimPressed(trimIndex, direction)
// direction: -1 = left/down, 0 = released, +1 = right/up

M._setTrimPressed(0, 1);   // Rudder trim right (press)
M._setTrimPressed(0, 0);   // Rudder trim release
M._setTrimPressed(1, -1);  // Elevator trim down

// Trim index mapping:
// 0 = Rudder, 1 = Elevator, 2 = Aileron, 3 = Throttle, 4+ = T5/T6
```

### Function Switch (Momentary Button)

```javascript
// M._setFunctionSwitchPressed(index, state)
// state: 1 = pressed, 0 = released
M._setFunctionSwitchPressed(0, 1);
M._setFunctionSwitchPressed(0, 0);
```

### UI / Navigation Inputs

These drive the on-screen UI (not needed for functional testing):

```javascript
M._onMouseDown(x, y);        // Touch/click down
M._onMouseUp(x, y);          // Touch/click up
M._onMouseMove(x, y);        // Touch drag (returns bool: handled)
M._onMouseLongPress();       // Long press
M._onMouseWheel(delta);      // Encoder rotation (±1 per click, returns bool)
M._onKeyEvent(keyCode, keyStr, shiftPressed, isPressed); // Keyboard (returns bool)
```

---

## WASM Output Callbacks (Firmware → JS)

The firmware calls these functions on the Module object when state changes. Register them **before** calling `_start()`.

### Switch State Updates

```javascript
// Called whenever the firmware updates switch display state
Module.setSwitchesPosition = (ptr, count) => {
  const positions = new Int8Array(Module.HEAP8.buffer, ptr, count);
  // positions[i] = current position of switch i (-1, 0, 1, 2, etc.)
  console.log('Switch states:', Array.from(positions));
};

// Called once at startup with switch configuration metadata
Module.setSwitchesConfig = (ptr) => {
  // ptr points to a config struct — layout not fully documented
};

// Function switch state array
Module.setFunctionSwitchesState = (ptr, count) => {
  const states = new Int8Array(Module.HEAP8.buffer, ptr, count);
};
```

### Trim State Updates

```javascript
// Called whenever trim values change (e.g. after setTrimPressed)
Module.setTrimsValue = (ptr, count) => {
  const trims = new Int16Array(Module.HEAP16.buffer, ptr, count);
  // trims[i] = current trim value in 1/256 μs units (display-scaled)
  console.log('Trim values:', Array.from(trims));
};
```

### Screen Rendering (Optional / Ignore in Headless Tests)

```javascript
Module.updateCanvas = (ptr, width, height) => {
  // ptr = pointer to RGBA pixel buffer in WASM heap
  // width, height = display dimensions in pixels
  const pixels = new Uint8Array(Module.HEAP8.buffer, ptr, width * height * 4);
  // Render to canvas or save as PNG if needed
};
```

### Audio (Ignore in Headless Tests)

```javascript
Module.audioPushBuffer = (ptr, count) => {
  // ptr = audio sample buffer, count = number of samples
  // Ignore unless testing audio output
};
```

---

## Additional WASM Utility Functions

```javascript
// Get the filesystem path of the currently active model
const modelPath = M.ccall('getCurrentModel', 'string', [], []);
console.log(modelPath); // e.g. "/models/model00.bin"

// Generate firmware-default model and radio settings (useful as a baseline)
M._writeDefaultSettingsAndModel();
// Writes to /persist/X18RS_FCC/models/ — dump FS to inspect

// Set UI language before booting
M.ccall('setLanguage', 'void', ['string'], ['en']);

// Clean shutdown
M._stop();
```

---

## Functional Equivalence Testing Strategy

There is **no direct API to read channel mixer output values** (servo PWM positions) from the WASM. The firmware computes them internally for RF transmission — they are not exposed to JavaScript. Use the following layered approach instead:

### Layer 1: Structural Validation (parse + round-trip)

```bash
node test-model.js models/<name>/attempt-N.bin
```

Confirms:
- Firmware parsed the model without assertion failures
- All section lengths, CRCs, and field values are valid
- Firmware re-serialises identical bytes (no normalisation = no field errors)

### Layer 2: Compare Against Known-Good Model

Byte-diff your output against a working reference model:

```bash
# Python diff
python3 -c "
a = open('reference.bin','rb').read()
b = open('attempt-N.bin','rb').read()
for i,(x,y) in enumerate(zip(a,b)):
    if x!=y: print(f'0x{i:04x}: {x:02x} → {y:02x}')
"
```

Or use the built-in diff output: `wasm_out_model00_diff.txt`.

### Layer 3: Stick-Input → Trim-Output Smoke Test

Set sticks to known positions, wait for the firmware's trim callback, and compare:

```javascript
// After _start() and a short settle delay:
Module.setTrimsValue = (ptr, count) => {
  const trims = new Int16Array(Module.HEAP16.buffer, ptr, count);
  console.log('Trims after inputs:', Array.from(trims));
};

Module.setSwitchesPosition = (ptr, count) => {
  const sw = new Int8Array(Module.HEAP8.buffer, ptr, count);
  console.log('Switches:', Array.from(sw));
};

// Set full stick deflection and compare EdgeTX expected vs Ethos actual
M._setAnalogPosition(0, 4095); // Aileron full right
M._setAnalogPosition(1, 4095); // Elevator full up
M._setSwitchPosition(0, 2);    // SA down
```

Compare trim and switch state outputs between EdgeTX and Ethos models under identical inputs.

### Layer 4: Log Scraping

The firmware emits diagnostic text via `print` (stdout). Capture and parse it:

```javascript
const lines = [];
// In moduleConfig:
print: (t) => { lines.push(t); }
// After boot, grep for channel/mixer output lines:
lines.filter(l => l.includes('channel') || l.includes('mix') || l.includes('output'))
  .forEach(l => console.log(l));
```

---

## Complete Minimal Test Script Template

```javascript
const fs   = require('fs');
const path = require('path');

const MIGRATOR_DIR = '/home/pete/source/ethos/migrator';
const LIB_DIR      = path.join(MIGRATOR_DIR, 'lib');
const PATCHED_JS   = path.join(LIB_DIR, 'X18RS_FCC_patched.js');
const RADIO_BIN    = path.join(LIB_DIR, 'wasm_radio.bin');
const WASM_BIN     = path.join(LIB_DIR, 'X18RS_FCC.wasm');
const MODEL_BIN    = process.argv[2] || 'attempt-1.bin';

// --- Browser shims ---
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

process.on('uncaughtException', (e) => {
  if (!e.message?.includes('pthread')) console.error('Fatal:', e.message);
});

X18RS_FCC({
  wasmBinary, noInitialRun: true,
  print:    (t) => logs.push(t),
  printErr: (t) => { if (!t.includes('pthread')) console.error('[err]', t); },
  canvas:   {},
  onRuntimeInitialized() {
    const M  = this;
    const FS = M.FS;

    // Register output callbacks
    M.setTrimsValue = (ptr, count) => {
      const trims = new Int16Array(M.HEAP16.buffer, ptr, count);
      console.log('Trims:', Array.from(trims));
    };
    M.setSwitchesPosition = (ptr, count) => {
      const sw = new Int8Array(M.HEAP8.buffer, ptr, count);
      console.log('Switches:', Array.from(sw));
    };

    // Load files
    try { FS.mkdir('/models'); } catch(e) {}
    FS.writeFile('/radio.bin', new Uint8Array(fs.readFileSync(RADIO_BIN)));
    FS.writeFile('/models/model00.bin', new Uint8Array(modelData));

    // Boot
    try { M._start(); } catch(e) {}

    // Set inputs after brief settle (range: -100 to +100, 0 = centre)
    setTimeout(() => {
      M._setAnalogPosition(0, 0);    // Aileron centre
      M._setAnalogPosition(1, 0);    // Elevator centre
      M._setAnalogPosition(2, -100); // Throttle low
      M._setAnalogPosition(3, 0);    // Rudder centre
    }, 1000);

    // Collect output
    setTimeout(() => {
      const out = FS.readFile('/models/model00.bin');
      fs.writeFileSync('wasm_out.bin', Buffer.from(out));

      const modelRead = logs.some(l => l.includes('ModelData::read'));
      const sentinel  = logs.some(l => l.includes('Sentinel') || l.includes('check failed'));
      console.log('Status:', sentinel ? 'FAIL' : modelRead ? 'PASS' : 'UNKNOWN');
      process.exit(0);
    }, 5000);
  }
}).catch(e => { console.error('Init failed:', e.message); process.exit(1); });
```

---

## WASM Memory Map (Verified from WAT Decompilation)

These addresses are stable within this firmware build and can be read directly via `Module.HEAP*` after `_start()`.

| Address (dec) | Address (hex) | Type | Count | Contents |
|---------------|---------------|------|-------|---------|
| 9598616 | 0x927698 | int8[] | 10 | Analog input values (sticks/pots), range [-100, 100] |
| 9372880 | 0x8F04D0 | int32[] | 10×8 | Switch position store (stride 8 bytes per switch) |
| 9372960 | 0x8F0520 | uint8 | 1 | Switch dirty flag (set to 1 when any switch changes) |
| 9372978 | 0x8F0532 | int16[] | 6 | Trim values (Rud, Ele, Ail, Thr, T5, T6) |
| 9372972 | 0x8F052C | int8[] | 6 | Function switch states |
| 11134784 | 0xA9E740 | uint16[] | 800×480 | Screen framebuffer (RGB565) |

### Reading inputs back from WASM memory (verification)

```javascript
// Read all 10 analog input values as stored in firmware memory
const analogInputs = new Int8Array(M.HEAP8.buffer, 9598616, 10);
console.log('Analog inputs in firmware:', Array.from(analogInputs));

// Read all 6 trim values
const trimValues = new Int16Array(M.HEAP16.buffer, 9372978, 6);
console.log('Trims [Rud,Ele,Ail,Thr,T5,T6]:', Array.from(trimValues));

// Read switch positions (first value in each 8-byte slot)
const switchPositions = [];
for (let i = 0; i < 10; i++) {
  switchPositions.push(M.HEAP32[(9372880 + i * 8) >> 2]);
}
console.log('Switch positions:', switchPositions);
```

### Reading channel outputs via the screen framebuffer

There is **no direct API for channel/mixer output values**. The firmware computes them internally for RF transmission and does not expose them to JavaScript — confirmed by exhaustive WAT export analysis (only 18 non-runtime exports, none output-related).

Channel output values **are visible on screen** as bars and numbers in the Channels Monitor page. You can read them from the framebuffer:

```javascript
// After _start() boots, navigate to Channels Monitor in the UI,
// then read the 800×480 RGB565 framebuffer
Module.updateCanvas = (ptr, width, height) => {
  // ptr should equal 11134784; width=800, height=480
  const pixels = new Uint16Array(M.HEAP16.buffer, ptr, width * height);
  // pixels[y * width + x] = RGB565 colour at (x, y)
  // Decode: R = (pixel >> 11) & 0x1F, G = (pixel >> 5) & 0x3F, B = pixel & 0x1F
};
```

For automated migration testing, the round-trip byte-diff approach (Layer 1) is more reliable than framebuffer parsing.

---

## Common Error Patterns and Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `Sentinel error detected` | Bad field value triggers firmware assertion | Check byte diffs; wrong enum value or out-of-range value |
| `status: UNKNOWN` | Firmware exited before loading model | Check header magic (`FRSK`), section sizes, CRC |
| `diffCount > 0` after round-trip | Firmware normalised a field | Inspect diff offsets against `ethos-bin-format.md` — use the firmware's value |
| Module init hangs | Missing `wasm_radio.bin` | Ensure `/radio.bin` is written before `_start()` |
| `pthread` exception | Normal — firmware spawns threads | Catch and ignore in `uncaughtException` |
| `wasm_out_*.bin` not created | `/models/` dir missing or `_start()` never ran | Confirm `FS.mkdir('/models')` before `writeFile` |

---

## Key Paths Inside the WASM Virtual Filesystem

| Path | Contents |
|------|---------|
| `/radio.bin` | Radio hardware settings (from `wasm_radio.bin`) |
| `/models/model00.bin` | Primary model slot |
| `/models/model01.bin` | Second model slot |
| `/persist/X18RS_FCC/` | Legacy path used by older scripts (`try-funcs.js`) |

The test harness (`test-model.js`) uses `/models/` — always use this layout for migration work.
