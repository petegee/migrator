# Reverse Engineer {MODEL} from EdgeTX to Ethos — Attempt {ATTEMPT}

## Your Mission

You are reverse-engineering a model from an EdgeTX container (.etx format, a ZIP file) into the Ethos binary format (.bin). 

**Container:** {CONTAINER}  
**Model name:** {MODEL}

Your goal is to generate a valid Ethos model file that:

1. **Represents the same model structure** (inputs, mixes, outputs, trims, etc.)
2. **Passes firmware validation** (WASM harness round-trip test)
3. **Loads on the radio** as an active model without errors
4. **Produces zero byte changes** after firmware round-trip (firmware should not modify it)

This is **Attempt {ATTEMPT}** — you have access to lessons learned from prior attempts (if any) in `templates/mistakes-and-lessons.md`.

---

## Source Model: {MODEL}

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
! node ../spike/test-model.js attempt-N.bin
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

Two fully working examples are available in `../spike/`:

### 1. `1chnl.bin` (527 bytes, minimal model)
- 1 input: "Inp1"
- 1 var: "LineName" (100% rate)
- 1 mix: "Ailerons"
- Build 37, firmware-generated

**Use this to understand the minimal structure.**

### 2. `test.bin` (693 bytes, moderate complexity)
- 6 inputs with multiple vars
- 3 mixes
- More realistic model

**Use this as a complexity reference.**

Both are in `../spike/` and have been firmware-validated (PASS, 0 byte changes).

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
! node ../spike/test-model.js {MODEL}_attempt_{ATTEMPT}.bin
```

This will:
1. Run the firmware (5-second timeout)
2. Compute byte-for-byte diff
3. Run Python validator
4. Generate JSON report + diff file + validation report

**Check the output:**
- `{MODEL}_attempt_{ATTEMPT}_test_report.json` — status (PASS/FAIL), diffs
- `{MODEL}_attempt_{ATTEMPT}_diff.txt` — byte changes
- `{MODEL}_attempt_{ATTEMPT}_validation.txt` — structure analysis

### Step 5: Interpret Results

**Best case:**
- status: `PASS`
- diffCount: 0 (identical)
- No validation errors
→ **Model is valid!** Proceed to radio test.

**Moderate case:**
- status: `PASS`
- diffCount: 5–10 (firmware normalized some bytes)
- No validation errors
→ **Model is acceptable.** The changes are harmless (firmware re-encoding).

**Failure:**
- status: `FAIL` or errors in validation
- Check the error messages in the test report
- Common issues:
  - "Sentinel error" → bad binary structure (wrong offsets, truncated section)
  - "CRC mismatch" → checksum wrong
  - Wrong section boundary → offset calculation error

### Step 6: Fix and Iterate

If the test failed:
1. Review the Python validator output (look for hints on which section is bad)
2. Check byte-for-byte diff (if any bytes changed, firmware was expecting different values)
3. Compare against reference models (use hex dump to see structure)
4. Fix the issue in your code
5. Regenerate the .bin file
6. Test again: `! node ../spike/test-model.js`

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

- [ ] Binary file written to `attempt_{ATTEMPT}.bin`
- [ ] File size > 100 bytes (sanity check)
- [ ] Run: `! node ../spike/test-model.js attempt_{ATTEMPT}.bin`
- [ ] Test report status = `PASS`
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

- `../spike/skills/ethos-bin-format.md` — Complete reference
- `../spike/skills/edgetx-ethos-migration.md` — EdgeTX→Ethos mapping
- `../spike/1chnl.bin` — Minimal reference model (527 bytes)
- `../spike/test.bin` — Moderate reference model (693 bytes)
- `../spike/test-model.js` — WASM harness testing script
- `../spike/X18RS_FCC.wasm` — Firmware binary (needed for test harness)
- `templates/mistakes-and-lessons.md` — Prior attempt insights

---

## Success Criteria

You're done when:

✓ Firmware test status = `PASS`
✓ Byte diff count = 0
✓ No validation errors
✓ **Model loads in WASM emulator without errors** (do not skip this)
✓ You can explain the binary structure to someone else
✓ You've documented any new lessons learned

Once complete, save your findings. The next attempt will start fresh but with lessons from this one.

---

## Get Started!

The parsed model structure is shown below. Begin with Step 1: Analyze.

Good luck! 🚀
