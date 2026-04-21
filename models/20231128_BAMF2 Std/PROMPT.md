# Reverse Engineer BAMF2 Std from EdgeTX to Ethos — Attempt 1

## Your Mission

You are reverse-engineering a model from an EdgeTX container (.etx format, a ZIP file) into the Ethos binary format (.bin). 

**Container:** models/20231128.etx  
**Model name:** BAMF2 Std

Your goal is to generate a valid Ethos model file that:

1. **Represents the same model structure** (inputs, mixes, outputs, trims, etc.)
2. **Passes firmware validation** (WASM harness round-trip test)
3. **Loads on the radio** as an active model without errors
4. **Produces zero byte changes** after firmware round-trip (firmware should not modify it)

This is **Attempt 1** — you have access to lessons learned from prior attempts (if any) in `templates/mistakes-and-lessons.md`.

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

## Reference: Ethos Binary Format

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
! node ../spike/test-model.js BAMF2 Std_attempt_1.bin
```

This will:
1. Run the firmware (5-second timeout)
2. Compute byte-for-byte diff
3. Run Python validator
4. Generate JSON report + diff file + validation report

**Check the output:**
- `BAMF2 Std_attempt_1_test_report.json` — status (PASS/FAIL), diffs
- `BAMF2 Std_attempt_1_diff.txt` — byte changes
- `BAMF2 Std_attempt_1_validation.txt` — structure analysis

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

Use this to verify your model before claiming success:

- [ ] Binary file written to `BAMF2 Std_attempt_1.bin`
- [ ] File size > 100 bytes (sanity check)
- [ ] Firmware test runs without crashing
- [ ] Test status = `PASS`
- [ ] Byte diff count = 0 (identical)
- [ ] Python validator passes (no errors)
- [ ] No sentinel errors in logs
- [ ] Can describe each major section in the binary

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
