# Reverse Engineer BAMF2 Std from EdgeTX to Ethos — Attempt 2

## Before You Begin: Load Reference Documentation

Read these files **now**, before doing anything else — they contain the full format specification:

1. `/home/pete/source/ethos/migrator/skills/ethos-bin-format.md` — complete binary format reference (required)
2. `/home/pete/source/ethos/migrator/skills/edgetx-ethos-migration.md` — EdgeTX→Ethos concept mapping (required)
3. `/home/pete/source/ethos/migrator/skills/wasm-radio-emulator.md` — WASM emulator testing API (required)
4. `/home/pete/source/ethos/migrator/templates/mistakes-and-lessons.md` — prior lessons and known pitfalls (required)

Do not proceed to Step 1 until you have read all four files.

---

## Your Mission

You are reverse-engineering a model from an EdgeTX container (.etx format, a ZIP file) into the Ethos binary format (.bin). 

**Container:** models/20231128.etx  
**Model name:** BAMF2 Std  
**Output filename:** `attempt-2.bin` ← you MUST use exactly this name

Your goal is to generate a valid Ethos model file that:

1. **Represents the same model structure** (inputs, mixes, outputs, trims, etc.)
2. **Passes firmware validation** (WASM harness round-trip test)
3. **Loads on the radio** as an active model without errors
4. **Produces zero byte changes** after firmware round-trip (firmware should not modify it)

This is **Attempt 2** — you have access to lessons learned from prior attempts (if any) in `/home/pete/source/ethos/migrator/templates/mistakes-and-lessons.md`.

---

## Source Model: BAMF2 Std

### Structure Summary

The source EdgeTX model has this structure:

```
[See parsed output below]
```

### Key Sections to Migrate

Map these EdgeTX features to Ethos binary structure:

| EdgeTX | Ethos Binary | Section |
|--------|--------------|---------|
| expoData (inputs) | Inputs with Vars | 8b |
| mixData | Mix Entries | 10 |
| limitData (outputs) | Channel Slots | 8 |
| trimData | Trim Channel Blocks | 7 |
| flightModeData | Flight Mode Blocks | (in config) |
| logicalSwData | Logical Switches | (after mixes) |
| customFuncData | Special Functions | (after logical switches) |
| gvarData | GVars | (near footer) |
| sensorData | Telemetry | (near footer) |

---

## Reference Documentation

### Binary Format Reference

All details are in `skills/ethos-bin-format.md`. Key sections:

- **Section 3**: FRSK Header (16 bytes) — magic, version, build, content length, CRC
- **Section 4**: CRC16-CCITT computation (critical!)
- **Section 5**: Content preamble + model name + bitmap field
- **Section 7**: Model Config Block (trim channel blocks)
- **Section 8**: Channel Slots (output placeholders, 6 fixed)
- **Section 8b**: Inputs with Vars (expo/rates)
- **Section 9**: RF Module Block
- **Section 10**: Mix Entries
- **Section 11–End**: Logical switches, special functions, GVars, telemetry, footer

### Critical Build Info

- **Build number**: 0x25 (build 37, Ethos 1.6.x — this is what the WASM harness supports)
- **Config schema version**: 0x17 (for build 37)
- **Preamble bytes**: Always `00 00` (NOT `01 00`)
- **Footer**: `55 55 55 55` ("UUUU") followed by 20–30 trailing bytes

### Value Encoding

- **Rates/weights**: Per-mille (‰) — 1000‰ = 100% = int16 LE 0x03E8
- **Trim values**: μs (microseconds) — int16 LE, ±100 typical
- **CRC16-CCITT**: polynomial 0x1021, non-reflected, init=0, no final XOR
- **Names**: Length-prefixed ASCII (1 byte length + N bytes, not null-terminated)

### WASM Radio Emulator Reference

See `skills/wasm-radio-emulator.md` for detailed emulator API and testing strategies. Key points:

**Layer 1: Structural Validation (round-trip test)**
```bash
! node /home/pete/source/ethos/migrator/lib/test-model.js attempt-2.bin
```
- Confirms firmware parses the model without assertion failures
- Byte-for-byte round-trip (0 changes = valid structure)
- **This is your primary validation gate**

**Layer 2: Functional Smoke Test** (optional, advanced)
The emulator can drive stick/switch inputs and observe trim/switch callbacks:
```javascript
M._setAnalogPosition(0, 4095); // Aileron full right
M._setAnalogPosition(1, 4095); // Elevator full up
M._setSwitchPosition(0, 2);    // SA down
// Firmware calls setTrimsValue, setSwitchesPosition callbacks
```

**Layer 3: Log Analysis** (optional)
Grep firmware logs for channel/mixer output messages.

**Most migration work uses Layer 1 only** — the round-trip test is sufficient. Use Layer 2/3 if you need detailed functional verification.

---

## Reference Models

Three fully working examples are in `/home/pete/source/ethos/migrator/reference-models/`:

### 1. `reference-models/1chnl.bin` (527 bytes, minimal model)
- 1 input: "Inp1"
- 1 var: "LineName" (100% rate)
- 1 mix: "Ailerons"
- Build 37, firmware-generated

**Use this to understand the minimal structure.**

### 2. `reference-models/shinto.bin` (5.3 KB, complex model)
- Multiple flight modes, logical switches, complex mixes
- Full-featured realistic model with many features

**Use this if your model is complex (50+ features)** — compare byte-for-byte against shinto to debug section ordering or offset errors.

---

**All reference models have been firmware-validated (PASS, 0 byte changes).**
- `/home/pete/source/ethos/migrator/reference-models/1chnl.bin` — minimal, verified
- `/home/pete/source/ethos/migrator/reference-models/shinto.bin` — complex, verified

---

## Prior Lessons Learned

If this is not your first attempt, check `templates/mistakes-and-lessons.md` for:
- Common pitfalls (wrong offsets, bad CRC, missing sections)
- Solutions that worked
- Build-specific gotchas

---

## Process: Step-by-Step

### Step 1: Analyze the Source Model

Review the parsed model structure below. Ask:
- How many inputs, mixes, flight modes?
- Do inputs have multiple rate variations (Vars)?
- Any special trims, logical switches, special functions?
- What complexity tier: minimal, simple, moderate, or complex?

### Step 2: Plan the Binary Structure

Using `skills/ethos-bin-format.md`, outline what sections you'll include and approximate byte offsets:

```
0x00–0x0F     FRSK header (16 bytes)
0x10–0x11     Content preamble (00 00)
0x12–...      Model name + bitmap
...           Config block, channel slots, RF modules, mixes, inputs, etc.
EOF–4         Footer (55 55 55 55)
```

### Step 3: Implement in Python or C#

Choose a language:
- **Python**: Quick iteration, good for one-off models
- **C#**: If you're building reusable tooling

Write code that:
1. Constructs each section as bytes
2. Computes CRC16-CCITT over the content
3. Builds the FRSK header with CRC
4. Writes the .bin file

**Do NOT hardcode byte values** — use constants and the format spec.

### Step 4: Test Immediately

Once you have a .bin file, validate it:

```bash
# Test against WASM firmware (automatically runs Python validator)
! node /home/pete/source/ethos/migrator/lib/test-model.js attempt-2.bin
```

This will:
1. Run the firmware (5-second timeout)
2. Compute byte-for-byte diff
3. Run Python validator
4. Generate JSON report + diff file + validation report

**Check the output:**
- `attempt-2_test_report.json` — status (PASS/FAIL), diffs
- `attempt-2_diff.txt` — byte changes
- `attempt-2_validation.txt` — structure analysis

### Step 5: Interpret Results

Model loading has **two parts** — both must pass:

| Part | What it means | Pass signal | Fail signal |
|------|--------------|-------------|-------------|
| **Part 1** — visible on select screen | .bin parsed, model appears in firmware model list | `ModelData::read(...)` in logs | No `ModelData::read` / `UNKNOWN` |
| **Part 2** — loads on selection | Model starts without content errors | No `Invalid Data` in logs | `Invalid Data` appears in logs |

**Best case:**
- `status: PASS`, `part1ModelVisible: true`, `part2ModelLoaded: true`
- `diffCount: 0` (firmware re-saved identical bytes)
→ **Model is valid!** Proceed to radio test.

**Moderate case:**
- `status: PASS`, both parts true
- `diffCount: 5–10` (firmware normalized some bytes)
→ **Model is acceptable.** The changes are harmless (firmware re-encoding).

**Part 2 failure (Invalid Data):**
- `status: FAIL`, `part1ModelVisible: true`, `part2ModelLoaded: false`
- Firmware read the file but rejected the content on model selection
- Check: model name field, section structure, config schema version (must be 0x17)
- This means the binary is structurally parseable but a field value or section is out of spec

**Structural failure:**
- `status: FAIL` — stderr contains `Sentinel` or `check failed`
- `status: UNKNOWN` — firmware exited before reading the model (bad header/CRC)
- Common causes:
  - "Sentinel error" → bad field value triggers firmware assertion
  - "CRC mismatch" → checksum wrong
  - Wrong section boundary → offset calculation error

### Step 6: Fix and Iterate

If the test failed:
1. Review the Python validator output (look for hints on which section is bad)
2. Check byte-for-byte diff (if any bytes changed, firmware was expecting different values)
3. Compare against reference models (use hex dump to see structure)
4. Fix the issue in your code
5. Regenerate the .bin file
6. Test again: `! node /home/pete/source/ethos/migrator/lib/test-model.js`

Repeat until status = `PASS` and diffCount = 0.

### Step 7: Report Findings

Once firmware test passes, report:

**✓ What worked:**
- Which sections generated cleanly
- Any insights about the format
- Build-specific notes

**? What was unclear:**
- Fields you couldn't fully decode
- Sections that took trial-and-error

**→ Recommendations:**
- What should be improved in the prompt for next time?
- Any mistakes in the format docs?
- Lessons for other models?

---

## Testing Checklist

**Minimum (Layer 1 — Structural Validation):**

- [ ] Binary file written to `attempt-2.bin`
- [ ] File size > 100 bytes (sanity check)
- [ ] Run: `! node /home/pete/source/ethos/migrator/lib/test-model.js attempt-2.bin`
- [ ] `part1ModelVisible: true` — model appeared on select screen (`ModelData::read` in logs)
- [ ] `part2ModelLoaded: true` — model loaded without `Invalid Data` error
- [ ] Test report overall `status = PASS`
- [ ] Byte diff count = 0 (identical)
- [ ] Python validator passes (no errors)
- [ ] No sentinel errors in logs

**Optional (Layer 2 — Functional Smoke Test):**

- [ ] Emulator drives sticks/switches without crashing
- [ ] Trim and switch callbacks fire as expected
- [ ] No sentinel errors during input test

**For Full Confidence:**

- [ ] Model loads on actual radio as active model (user must test)
- [ ] All control surfaces respond correctly
- [ ] No UI errors or warnings

> **Note:** The round-trip harness (`test-model.js`) is your primary gate. See `skills/wasm-radio-emulator.md` for optional functional testing with stick inputs and callbacks.

---

## Common Mistakes to Avoid

1. **Preamble bytes** — Always `00 00`, not `01 00`
2. **CRC16-CCITT** — Wrong polynomial, reflected vs. non-reflected, or final XOR will fail
3. **Name fields** — Length-prefixed (1 byte + N bytes), not null-terminated
4. **Bitmap field** — Always exactly 16 bytes, zero-padded
5. **Section offsets** — Off-by-one errors cascade through rest of file
6. **Build number mismatch** — Use 0x25 (build 37); 0x1C/0x1F won't work with this WASM binary
7. **Trim block count** — Build 37 = 6 channels (R/E/A/T/T5/T6); build 31 = 4 channels
8. **Missing footer** — File must end with `55 55 55 55` + 20–30 trailing bytes
9. **Inactive channel entries** — No separator between them; only one `0x00` byte goes before the RF block, not between channel entries. Each inactive slot is purely `0x01` fill.

Check `templates/mistakes-and-lessons.md` for solutions.

---

## Files You Have Access To

- `/home/pete/source/ethos/migrator/skills/ethos-bin-format.md` — Complete reference
- `/home/pete/source/ethos/migrator/skills/edgetx-ethos-migration.md` — EdgeTX→Ethos mapping
- `/home/pete/source/ethos/migrator/reference-models/1chnl.bin` — Minimal reference model (527 bytes)
- `/home/pete/source/ethos/migrator/lib/test-model.js` — WASM harness testing script
- `/home/pete/source/ethos/migrator/lib/X18RS_FCC.wasm` — Firmware binary (self-contained local copy)
- `templates/mistakes-and-lessons.md` — Prior attempt insights

---

## Success Criteria

You're done when:

✓ `part1ModelVisible: true` — model appeared on select screen (`ModelData::read` in logs)
✓ `part2ModelLoaded: true` — model loaded without `Invalid Data` error
✓ Firmware test overall `status = PASS`
✓ Byte diff count = 0
✓ No validation errors
✓ You can explain the binary structure to someone else
✓ You've documented any new lessons learned

Once complete, save your findings. The next attempt will start fresh but with lessons from this one.

---

## Get Started!

The parsed model structure is shown below. Begin with Step 1: Analyze.

Good luck! 🚀

## Parsed Model Structure

```
Model: BAMF2 Std
Container: 20231128.etx
Source YAML: BAMF2 Std.yml (searched by header.name)

=== INPUTS (Expo) ===
  Ailero: 0 line(s)
  CrowDi: 0 line(s)
  Elevat: 0 line(s)
  Rudder: 0 line(s)
  Thottl: 0 line(s)
Total: 5

=== MIXES ===
  AILL: 0 line(s)
  AILR: 0 line(s)
  Adj: 0 line(s)
  Ail-Ru: 0 line(s)
  AilLCa: 0 line(s)
  AilLRf: 0 line(s)
  AilLnc: 0 line(s)
  AilRCa: 0 line(s)
  AilRRf: 0 line(s)
  AilTri: 0 line(s)
  CAL: 0 line(s)
  CrowDi: 0 line(s)
  ELECom: 0 line(s)
  El-Flp: 0 line(s)
  ElCmpT: 0 line(s)
  Elev: 0 line(s)
  ElevCo: 0 line(s)
  FineAd: 0 line(s)
  Flpron: 0 line(s)
  LncOfS: 0 line(s)
  RSComp: 0 line(s)
  RUD: 0 line(s)
  Speed: 0 line(s)
  Therma: 0 line(s)
  Volume: 0 line(s)
Total: 25

=== FLIGHT MODES ===
  Normal
  Lnch1
  Lnch2
  Speed
  Therml
  ... and 4 more
Total: 9

=== TRIMS ===
  (none)
Total: 0

=== OUTPUT CHANNELS ===
  Elev
  Rudd
  AilR
  AilL
  ThmC
  SpdC
  ... and 3 more
Total: 9

=== OTHER SECTIONS ===
  Logical switches: 21
  Special functions: 18
  GVars: 0
  Telemetry sensors: 0

Complexity: COMPLEX (39 features)
```
