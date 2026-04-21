# Mistakes and Lessons Learned

This document is **auto-updated** as you test models and provide feedback. It captures:
- Common pitfalls discovered during reverse-engineering
- Solutions that worked
- Build-specific gotchas
- Patterns to replicate

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
