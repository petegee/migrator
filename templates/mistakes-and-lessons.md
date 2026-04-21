# Mistakes and Lessons Learned

This document is **auto-updated** as you test models and provide feedback. It captures:
- Common pitfalls discovered during reverse-engineering
- Solutions that worked
- Build-specific gotchas
- Patterns to replicate

## Using Reference Models for Debugging

When your model fails, use byte-for-byte diff against reference models to understand the issue:

```bash
# Compare your failing model against shinto.bin (complex reference)
python3 -c "
a = open('models/shinto.bin', 'rb').read()
b = open('models/<your-model>/attempt-N.bin', 'rb').read()
diffs = [(i, f'{a[i]:02x}', f'{b[i]:02x}') for i in range(min(len(a), len(b))) if a[i] != b[i]]
for off, before, after in diffs[:20]:
    print(f'0x{off:04x}: {before} → {after}')
"
```

Look for patterns:
- If diffs cluster in a specific offset range (e.g., 0x100–0x150), that section is misaligned
- If diffs match shinto's section structure, you're on the right path
- If diffs are random/scattered, likely a CRC or field value issue

---

## Format

Each entry follows this structure:

```
## [Category] — Issue Title

**Problem:** What goes wrong?
**Symptom:** How do you notice it? (error message, behavior, test result)
**Root Cause:** Why does it happen?
**Solution:** How to fix it
**Example:** Before/after code or bytes
**Status:** ✓ Verified | ⚠ Partial | ❌ Not yet tested
```

---

## Initial Entries (From Spike Project)

### Preamble Bytes — Using 01 00 Instead of 00 00

**Problem:** Content preamble assumed to be `01 00` based on initial reverse-engineering.

**Symptom:** Firmware may reject model or misparse sections. Observed in older analysis.

**Root Cause:** Verification against firmware-generated files (1chnl.bin, build 37) revealed the correct preamble is `00 00`, not `01 00`.

**Solution:** Always use `00 00` for the first two bytes after the FRSK header. Verify against firmware output files when designing binary structure.

**Status:** ✓ Verified (1chnl.bin, build 37, firmware-generated)

---

### Trim Blocks — Confusing "FM blocks" with Trim Channel Blocks

**Problem:** Initially thought the 7-byte blocks in the config were flight mode (FM) definitions; they are actually hardware trim channel blocks.

**Symptom:** Misunderstanding the trim channel count, attempting to store FM-specific data in the wrong place.

**Root Cause:** The block count (byte 0x0D in config) is **trim channel count**, not FM count. Build 37 has 6 (R/E/A/T/T5/T6); build 31 has 4.

**Solution:**
- Understand trim blocks are **per-hardware-trim**, not per-FM
- Trim mode (byte 3) controls whether trim is shared (Easy mode) or independent per FM
- FM definitions are elsewhere (not yet fully decoded)

**Status:** ✓ Verified

---

### Section Ordering — Inputs Before RF Module

**Problem:** Initial documentation placed Inputs section before RF module block; actual order is: RF modules, then mixes, then inputs.

**Symptom:** Offset errors cascade through remaining sections; firmware can't parse sections.

**Solution:** Use this fixed order:
1. Preamble + name + bitmap
2. Config block (trims)
3. Flight mode blocks
4. Channel slots
5. **RF module block** (marker: `10 00 kVkVbDfH`)
6. Mix entries
7. **Inputs with Vars** (here, not earlier!)
8. Logical switches
9. Special functions
10. GVars
11. Telemetry
12. Footer (`55 55 55 55`)

**Status:** ✓ Verified

---

### CRC16-CCITT — Wrong Polynomial or Reflection

**Problem:** CRC validation fails because of polynomial mismatch or reflection setting.

**Symptom:** Test harness says "CRC mismatch" or firmware rejects the file.

**Root Cause:** CRC-16/XMODEM requires:
- Polynomial: **0x1021**
- Reflected: **NO** (non-reflected)
- Init: 0x0000
- Final XOR: **NO**

Common mistakes:
- Using reflected variant (CRC-16/MODBUS)
- Wrong polynomial (0x8005, 0x1021 with wrong bit order)
- Applying final XOR

**Solution:** Use the precomputed lookup table approach from `skills/ethos-bin-format.md` Section 4, or verify against known good files.

**Example (Python):**
```python
def crc16_ccitt(data: bytes) -> int:
    crc = 0x0000
    for b in data:
        crc = ((crc << 8) ^ TABLE[((crc >> 8) ^ b) & 0xFF]) & 0xFFFF
    return crc
```

**Status:** ✓ Verified (11+ files, builds 28/31/37)

---

### Name Fields — Assuming Null Termination

**Problem:** Model name, input names, mix names treated as null-terminated strings.

**Symptom:** Names are corrupted or parser skips data incorrectly.

**Root Cause:** Ethos uses **length-prefixed ASCII**, not null-terminated:
```
[1 byte: length] [N bytes: ASCII]
```

**Solution:**
- Read 1 byte (length)
- Read that many bytes (name)
- Do NOT look for `\0`
- Do NOT add `\0` when writing

**Example:**
```python
# Wrong:
name = data[offset:].split(b'\0')[0]

# Correct:
name_len = data[offset]
name = data[offset+1:offset+1+name_len]
offset += 1 + name_len
```

**Status:** ✓ Verified

---

### Bitmap Field — Variable Length, Always 16 Bytes

**Problem:** Bitmap filename is variable-length but the field is always 16 bytes.

**Symptom:** Next section starts at wrong offset; firmware can't parse.

**Root Cause:** Bitmap field is **fixed 16 bytes**, zero-padded. If the filename is shorter, pad with `\0`.

**Solution:**
```python
bitmap_str = "Blaster.png"
bitmap_bytes = bitmap_str.encode('ascii')[:15]
bitmap_field = (bitmap_bytes + b'\0' * 16)[:16]  # always 16 bytes
```

**Status:** ✓ Verified (Blaster.bin, Weasel.bin, test.bin)

---

### Build-Specific Trim Count

**Problem:** Using the wrong number of trim blocks for the target hardware.

**Symptom:** Firmware expects 6 trim blocks (build 37) but gets 4 (build 31).

**Root Cause:** Hardware differs:
- **Build 37 (X18/X20 Pro)**: 6 channels — Rudder, Elevator, Aileron, Throttle, T5, T6
- **Build 31 (X20/X20S)**: 4 channels — Rudder, Elevator, Aileron, Throttle

**Solution:** Always use **6 trim blocks** for build 37 (build=0x25, schema=0x17).

**Status:** ✓ Verified

---

### Footer Length Variability

**Problem:** Footer is not a fixed size; appears to be 22–29 bytes after `55 55 55 55`.

**Symptom:** Firmware accepts valid files with different footer lengths.

**Root Cause:** The bytes after `55 55 55 55` contain configuration data (possibly GVar defaults, telemetry defaults, etc.) that varies by model complexity.

**Solution:** Don't try to invent or trim the footer. Use a reference model's footer, or place a minimal footer (just `55 55 55 55` + ~20 zero bytes) and let firmware normalize it on round-trip.

**Example:** 1chnl.bin footer:
```
55 55 55 55 [~20 bytes]
```

**Status:** ⚠ Partial (works, but structure not fully decoded)

---

### Value Encoding — Per-Mille (‰) vs. Percentage

**Problem:** Rates and weights are encoded in per-mille (‰), not percentage (%).

**Symptom:** Inputs are 10× too strong or too weak; control response is wrong.

**Root Cause:** Ethos uses per-mille for all rates, weights, offsets:
- 1000‰ = 100%
- 500‰ = 50%
- Negative: two's complement int16

**Solution:**
```python
# Convert from EdgeTX % to Ethos ‰:
ethos_per_mille = edgetx_percent * 10

# Encode as int16 LE:
value_int16 = int(ethos_per_mille)
value_bytes = struct.pack('<h', value_int16)  # little-endian signed
```

**Status:** ✓ Verified

---

### WASM Emulator Testing — Structural Pass Not Sufficient

**Problem:** Model passes round-trip test (status=PASS, diffCount=0) but fails when loaded in full WASM emulator or control inputs don't produce expected responses.

**Symptom:**
- test-model.js reports PASS
- Emulator boots with "Sentinel" or "Invalid data" errors
- Stick inputs don't trigger expected trim changes
- Switches don't respond as configured

**Root Cause:** The round-trip harness validates parsing but doesn't exercise full firmware logic (input processing, mixes, trims, logical switches). Sentinel errors triggered during full firmware initialization are not caught by the minimal test.

**Solution:** Use functional smoke test with stick inputs after structural validation passes:
```bash
# See skills/functional-testing-guide.md for complete emulator test template
node test-functional.js attempt-N.bin
# Drive inputs, observe trim/switch callbacks, verify output matches input
```

**Example Test:**
```javascript
M.setTrimsValue = (ptr, count) => {
  const trims = new Int16Array(M.HEAP16.buffer, ptr, count);
  console.log('Trims:', Array.from(trims)); // Should match expected values
};

M._setAnalogPosition(0, 4095); // Aileron full right
M._setAnalogPosition(1, 4095); // Elevator full up
// Wait for callback to fire and verify trim values
```

**Status:** ✓ Verified (BAMF2 Std: PASS test but sentinel error on full boot)

---

### Inactive Channel Entry Padding — Extra 0x00 Separator

**Problem:** When writing the 5 inactive channel slots after the first named one, each entry gets a spurious leading `0x00` byte.

**Symptom:** Firmware test harness says PASS (0 byte changes), but model produces "read header failed: Invalid data" in the WASM emulator.

**Root Cause:** The inactive channel entries are purely `0x01`-fill bytes — there is NO separator between entries. The separator `0x00` appears only once, immediately before the RF module block, not between channel entries.

**Solution:**
```python
# WRONG — inserts a 0x00 between entries:
for _ in range(5):
    content.extend(b'\x00' + b'\x01' * 19)

# CORRECT — inactive entries are just 0x01 fill:
for _ in range(5):
    content.extend(b'\x01' * 19)

# Then one 0x00 separator BEFORE the RF block:
content.extend(b'\x00')
content.extend(rf_module_bytes)
```

**Status:** ✓ Verified (BAMF2 Std attempt 1)

---

### Test Harness ≠ Emulator Load Test

**Problem:** `node test-model.js` reports PASS with 0 byte changes, but the actual WASM emulator says "read header failed: Invalid data".

**Symptom:** False confidence — the round-trip test passes structural parsing but doesn't catch semantic/layout errors that the UI-level model loader rejects.

**Root Cause:** The test harness only exercises the firmware's binary parser (read → write). The emulator's model-selector UI runs a stricter validation pass that catches malformed sections the parser tolerates.

**Solution:** Always verify in the actual WASM emulator after a harness PASS. Don't claim success until the model loads in the emulator without errors.

**Status:** ✓ Verified (BAMF2 Std attempt 1 — harness PASS, emulator "invalid data" until channel entries fixed)

---

---

### Mix Section — Missing Count Header Causes Model to Not Appear in List

**Problem:** Model with multiple mixes generates a PASS on the harness but doesn't appear in the model selection list in the WASM emulator.

**Symptom:** Harness PASS with 0 byte changes, but model is invisible in the emulator model list (not even selectable to get an "invalid data" error).

**Root Cause:** The mix section requires a 9-byte header immediately before the mix entries:
```
80 80 [count] 00 05 00 00 00 01
```
Where `count` = number of mix entries (uint8). Without this header, the firmware cannot locate or count the mix entries. With only 1 mix and no header, the firmware may accidentally stumble on the first entry, but with multiple mixes it fails silently.

**Solution:**
```python
# REQUIRED before mix entries:
content.extend(bytes([0x80, 0x80, mix_count, 0x00,
                      0x05, 0x00, 0x00, 0x00, 0x01]))
# Then mix entries follow
for name in mix_names:
    content.extend(encode_name(name))
    content.extend(b'\xff\xff\xff\xff')  # switch NONE
    content.extend(mix_data_placeholder)
```

**Evidence:** Verified in 1chnl.bin (count=1) and test.bin/BAMF2 Strng (count=4). Missing from all generate_minimal.py versions, causing the BAMF2 Std model to not appear in the selection list.

**Status:** ✓ Verified (BAMF2 Std attempt 1 — adding header made model visible in emulator list)

---

## Format: Adding New Entries

When you discover a new lesson:

1. Add a new `##` section with a clear title
2. Include all fields: Problem, Symptom, Root Cause, Solution, Status
3. Include examples if helpful
4. Mark status as ✓ (verified), ⚠ (partial), or ❌ (not tested)
5. Commit the change if using git

The migrator's `run.sh --feedback` script will help prompt you for new lessons.

---

## Legend

- **✓ Verified** — Tested on 2+ models, confident
- **⚠ Partial** — Works, but understanding incomplete or edge cases unknown
- **❌ Not yet tested** — Theory only, needs validation on a real model

---

## Related Documentation

- `skills/ethos-bin-format.md` — Complete binary format reference
- `skills/edgetx-ethos-migration.md` — EdgeTX concepts and mapping
- Test results in `models/*/attempt-*_test_report.json` — Evidence for lessons learned
