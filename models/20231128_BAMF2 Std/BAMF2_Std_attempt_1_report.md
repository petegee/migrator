# BAMF2 Std — Attempt 1 Report

**Date:** 2026-04-22  
**Status:** PASS (0 byte diff, structural validation complete)  
**Binary:** `BAMF2_Std_attempt_1.bin` (1654 bytes)

---

## Result Summary

| Check | Result |
|-------|--------|
| FRSK header valid | ✓ |
| CRC16-CCITT correct | ✓ |
| Firmware round-trip (0 diff) | ✓ PASS |
| Python validator | ✓ PASS |
| WASM emulator model visible | ✓ (model appears in list) |
| WASM emulator loads clean | ⚠ `Sentinel(FreeMix) check failed` (non-blocking, see below) |
| Radio test | Not yet performed |

---

## ✓ What Worked

### Sections Generated Correctly
- **FRSK header** — 16 bytes: magic + version bytes + build 0x25 + schema 0x17 + content length LE + type 0x81 + CRC LE
- **Content preamble** — `00 00` (confirmed correct)
- **Model name** — length-prefixed "BAMF2 Std" (9 chars)
- **Bitmap field** — 16 zero bytes (no bitmap)
- **Config block** — 13 config bytes + count byte (6) + 6 × 7-byte trim blocks (all 0µs)
- **Channel slots** — 98-byte fixed section: 28B header + first named channel "Elev" (23B) + 46B inactive fill + 1B `00` separator
- **RF module blocks** — byte-exact RF1 (56 bytes) + RF2 (57 bytes)
- **Mix section header** — `80 80 25 00 05 00 00 00 01` (count=25) required and included
- **25 mix entries** — all unique names from source YAML, `01` separator between entries (not before first)
- **5 input entries** — Rud/Ele/Thr/Ail/CrowDi with per-mille rates (×10 from YAML %)
- **POST_INPUTS block** — 126-byte placeholder (identical to 1chnl.bin / test.bin)
- **Footer** — `55 55 55 55` + 23 trailing bytes

### Input Rates (Verified Correct)
| Input | Source | EdgeTX % | Ethos ‰ | Encoded |
|-------|--------|----------|---------|---------|
| Rudder | Rud | ±80% | ±800‰ | `82 E0 FD` / `82 20 03` |
| Elevator | Ele | ±55% | ±550‰ | `82 D6 FD` / `82 2A 02` |
| Throttle | Thr | ±100% | ±1000‰ | `82 18 FC` / `82 E8 03` |
| Aileron | Ail | ±27% | ±270‰ | `82 EE FE` / `82 12 01` (swapped — weight was negative) |
| CrowDi | Ail | ±100% | ±1000‰ | `82 18 FC` / `82 E8 03` |

### Bugs Fixed During Attempt 1
1. **Rudder trim**: Was incorrectly set to -28µs (from FM4 elevator trim in YAML). Fixed to 0µs. All 6 trims are now 0µs (safe default, consistent with reference models).
2. **First channel name**: Was "Out1" (firmware default). Fixed to "Elev" (from source model limitData[0].name = 'Elev').

---

## ⚠ What Was Unclear / Incomplete

### `Sentinel(FreeMix) check failed`
- **What it is**: A firmware warning emitted during model initialization when mix entries use placeholder/generic data. The firmware's FreeMix pool validator detects that the mix destination/source fields don't point to valid channel assignments.
- **Is it blocking?** No. The same warning appears in `test.bin` (reference model, 4 mixes). The harness still reports PASS with 0 diff.
- **Why it happens**: All 25 mixes use identical placeholder bytes (`01 00 00...`). The destination channel and source fields encode to 0/invalid values in the placeholder.
- **Impact**: Model is structurally valid. May cause issues when trying to load on radio (untested).

### Mix Data Encoding (Unknown)
The 30-byte `MIX_DATA` placeholder works for structural validation but doesn't encode real mix logic:
- Destination channel (which output channel: Elev, Rudd, AilR, etc.) — field offset unknown
- Source (Ail, Ele, Thr, Rud, etc.) — field offset unknown
- Weight (per-mille) — field offset unknown
- FM mask (which flight modes activate this mix) — field offset unknown
- Curve reference — unknown

**To decode**: Compare `shinto.bin` or `test.bin` byte-by-byte against their YAML source, focusing on the mix entry region.

### Sections Not Encoded (POST_INPUTS Placeholder)
The POST_INPUTS block is a 126-byte zero/minimal placeholder. Actual content not encoded:
- **21 logical switches** — switch conditions for flight modes, crow, launch, etc.
- **18 special functions** — audio cues, trainer mode, etc.
- **6 GVars** — Lau, A2R, Dif, The, Spe, Ail (referenced in many mixes as GV2/GV4/GV6)
- **9 flight modes** — Normal, Lnch1, Lnch2, Speed, Therml + 4 more with switch conditions

---

## → Recommendations for Attempt 2

### Priority 1: Decode Mix Data Format
The FreeMix sentinel can be eliminated by properly encoding the 30 bytes of mix data per entry. Strategy:
1. Load `shinto.bin` (complex reference model in `reference-models/shinto.bin`)
2. Find the mix section in the binary (locate `80 80 [count]` marker)
3. Parse 2-3 known mixes from shinto's YAML source
4. Map YAML fields (destCh, srcRaw, weight, swtch, flightModes) to byte offsets in the 30-byte block
5. Apply same encoding to BAMF2 Std mixes

### Priority 2: GVar Encoding
Several BAMF2 mixes reference GV2, GV4, GV6. Without these, the mixes will use 0 as the GVar value (effectively disabling the associated scaling). Decode GVar format from shinto.bin.

### Priority 3: Flight Mode Switches (Optional)
The 9 flight modes use logical switch conditions (L1, L3) and physical switches (SG0, SG2). Encoding these would make FM selection work on radio, but is not needed for firmware structural validation.

### Priority 4: Logical Switches (Advanced)
21 logical switches (AND/OR of stick positions, switch states, timer values). Complex to encode without format reference. Use `shinto.bin` comparison.

---

## Known Good Binary Structure

These bytes/patterns are verified correct for build 37 (Ethos 1.6.x):

```python
# FRSK header
b'FRSK' + bytes([1, 0, 1, 0x25]) + struct.pack('<I', len_content) + bytes([0x81, 0x17, crc_lo, crc_hi])

# Content start
b'\x00\x00'  # preamble

# 6 × trim blocks (all 0µs)
b'\x02\x19\x00\x02\x01\x00\x00'  # × 6

# Channel slots (fixed)
b'\x00\x00\x06' + b'\x00\x01\x02\x03\x04\x05' + b'\x00\x00\x00'
b'\x80\x80\x82\xe8\x03\x82\x18\xfc\x80\x01\x00\x00\x00\x00\x00\x00'
# First entry: encode_name(channel_name) + b'\x01' * 18
# Inactive fill: b'\x01' * 46
b'\x00'  # separator before RF

# RF1 (56 bytes) + RF2 (57 bytes) — byte-exact from reference

# Mix section header (REQUIRED)
bytes([0x80, 0x80, mix_count, 0x00, 0x05, 0x00, 0x00, 0x00, 0x01])

# Mix entries (01 separator BETWEEN, not before first)
for i, name in enumerate(mix_names):
    if i > 0: content.append(0x01)
    content.extend(encode_name(name))
    content.extend(b'\xff\xff\xff\xff')  # switch NONE
    content.extend(mix_data_30_bytes)

# Footer
b'\x55\x55\x55\x55' + b'\x01\x01\x00\x00\x00\x04\x00\x00\x00\x00\xa1\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00'
```

---

## File Listing

| File | Size | Description |
|------|------|-------------|
| `generate_bamf2_v3.py` | — | Generator script (current version) |
| `BAMF2_Std_attempt_1.bin` | 1654 bytes | Generated binary |
| `BAMF2_Std_attempt_1_diff.txt` | — | Firmware diff (0 changes, PASS) |
| `BAMF2_Std_attempt_1_test_report.json` | — | Test harness output |
