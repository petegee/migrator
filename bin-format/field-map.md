# Ethos .bin Field Map

Reverse-engineered field locations from binary diffs.
Source diffs: `../browser/findings/diffs/`
Source specs: `../browser/tests/investigate/`

---

## Encoding conventions observed

| Tag byte | Meaning |
|----------|---------|
| `0x80` | 1-byte unsigned value follows |
| `0x81` | 1-byte signed value follows (tentative) |
| `0x82` | 2-byte LE signed int16 follows |
| (none) | Some fields appear to be raw bytes without tag prefix |

Strings: 1-byte length prefix + raw ASCII bytes (no null terminator confirmed).

---

## File header

**Offsets 0x0008, 0x000E–0x000F** change on every modification regardless of what changed.
These are likely CRC/checksum bytes that cover the entire file.

| Offset | Bytes | Interpretation |
|--------|-------|----------------|
| 0x0008 (8) | 1 byte | File checksum byte 1 (changes with file size and content) |
| 0x000E–0x000F (14–15) | 2 bytes | CRC16 or similar 2-byte checksum |

---

## Outputs section (~0x0060–0x00FF)

First channel (CH1) editor data. Confirmed from 3 clean single-field diffs
(no file size change → no byte-shift noise).

### CH1 Direction flag

- **Spec**: `08-outputs-direction` — Normal → Reverse
- **Offset**: 0x0066 (102)
- **Encoding**: 1-byte flag, `0` = Normal, `1` = Reverse
- **Diff**: `0x0066: 0 → 1`
- **Confidence**: ✓ high (3-byte diff, 2 are checksum)

### CH1 Max travel limit

- **Spec**: `09-outputs-limits` — Max 100% → 80%
- **Offset**: 0x006A (106)
- **Encoding**: 1-byte, encoding TBD (100% stored as `232`/`0xE8`; 80% stored as `32`/`0x20`)
- **Diff**: `0x006A: 232 → 32`
- **Notes**: Values don't map linearly to percentage in an obvious way. May be a fixed-point
  encoding or a table index. Investigate with more values to identify the formula.
- **Confidence**: ✓ field identified, encoding unclear

### CH1 Center / Subtrim

- **Spec**: `10-outputs-subtrim` — subtrim 0 → +5 steps (1 μs each → +5 μs)
- **Region**: 0x006F–0x0071 (111–113)
- **Encoding**: Likely `0x82 <lo> <hi>` int16 LE in microseconds (per spec comment)
- **Diff** (partial — file grew +1 byte, so some noise from shift):
  - `0x006F: 0x80 → 0x81`
  - `0x0070: 1 → 5`
  - `0x0071: 0 → 1`
- **Notes**: Pre-shift value at 0x006F was 0x80 (tag byte?). Post-shift encoding may be
  `0x81 0x05` for 5 or `0x82 0x05 0x00` for 5 as int16. Needs clean diff (no size change).
- **Confidence**: ~ field region identified, encoding unclear

---

## Flight Modes section (~0x0178–0x01C0)

### FM count

- **Spec**: `11-flight-modes-add` — added FM1 (file grew +6 bytes)
- **Offset**: 0x017A (378)
- **Encoding**: 1-byte count (min 1 for FM0-only model)
- **Diff**: `0x017A: 1 → 2`
- **Confidence**: ✓ high (seen in both 11 and 12 diffs)

### FM1 block start

After FM0 (which always exists), FM1 data is inserted at approximately offset 0x0182 (386).
The FM0 block ends before 0x0182; FM1 block begins there when FM1 is added.

- **FM1 block size**: 6 bytes when no name set (file went from 651 to 657 bytes)
- **FM1 block with name**: 7+ bytes (+1 per char)

### FM1 name

- **Spec**: `12-flight-modes-name` — added FM1, named "CRUISE"
- **Name length byte offset**: 0x0184 (388) relative to file start (= FM1 block + 2)
- **Name chars offset**: 0x0185 (389) onwards
- **Encoding**: `<len:1> <ASCII chars>` — length byte + raw chars, no null terminator
- **Diff**:
  - `0x017A: 1 → 2` (FM count)
  - `0x0184: 0 → 6` (name length: 6 chars)
  - `0x0185–0x018A: 43 52 55 49 53 45` ("CRUISE")
- **FM1 block structure** (12 bytes when name = "CRUISE"):
  - `0x0182–0x0183`: `00 00` — switch/condition bytes (unset = 0)
  - `0x0184`: name length byte
  - `0x0185+`: name chars (raw ASCII, no null terminator)
  - After name: `00 80 80` trailer (3 bytes)
- **File size delta**: baseline 651 → changed 663 (+12 = 6 base block + 6 name chars)
- **Save requirement**: after typing name via keyboard (ENTER to close keyboard), must tap
  another field in the FM editor to commit focus, then navigate back twice (FM editor →
  FM list → Model Setup) before downloading — a single goBack does not flush the name.
- **Confidence**: ✓ confirmed — "CRUISE" at 0x0185, length byte at 0x0184

---

## Mixes section (~0x0182–0x02xx)

Note: the Mixes section overlaps with the Flight Modes section offset range in the *baseline*
model (no FM1 added). After FM1 is inserted, mix data shifts right by 6+ bytes.

**Baseline (651-byte model, no FM1) mix name strings visible at:**
- 0x018A–0x0192: "Ailerons" (the default mix created by glider wizard)
- These shift when FM1 is added

### Mix source field

- **Spec**: `06-mixes-source` — mix source `---` → Analogs/Rudder (file grew +3 bytes)
- **Key change offset**: 0x019C (412) in the 689-byte baseline (after 1 mix added)
  - `0x019C: 0 → 8` — source category or index byte
- **Encoding**: TBD — likely a category ID + member ID pair
- **Notes**: String "Ailerons" still visible in diff at shifted positions. The source
  encoding appears to be a compact numeric ID, not a string.
- **Confidence**: ~ field region identified in 689-byte model, encoding unclear

### Mix add

- **Spec**: `05-mixes-add` — added one Free mix (file grew +38 bytes)
- **Key offset**: 0x0182 (386) — `3 → 4` (possible mix count byte)
  - Then 0x018A–0x019 region: ASCII string shifting (mix name)
- **Notes**: A mix block is approximately 38 bytes including the string name (e.g. "Free mix").
  The mix count appears to be at 0x0182 in the baseline, same as where FM1 block ends.
  This suggests FM and Mix sections are adjacent with a shared count structure.
- **Confidence**: ~ mix count and approximate block size known

---

## Vars section (~0x01EC–0x0210)

### Var count

- **Spec**: `02-vars-add` — added one default Var (file grew +14 bytes)
- **Offset**: 0x01EC (492)
- **Encoding**: 1-byte count
- **Diff**: `0x01EC: 0 → 1`
- **Notes**: Also `0x01F1 (497): 0 → 0x80` — start of first var's data (tag byte?)
- **Confidence**: ✓ count field confirmed

### Var value (rate)

- **Spec**: `04-vars-value` — var value[0] 0% → +5 steps (file grew +3 bytes)
- **Region**: 0x01F2–0x01FC (498–508) in 665-byte model (after 1 var added)
- **Encoding**: 0x82 + LE int16 observed at 0x01F4 (500):
  - Before: `0x82 0x18 0xFC` = int16 LE 0xFC18 = -1000 (−100.0% in 0.1% units?)
  - After: `0x82 0x18 0xFC` → `0x82 0x18 0xFC 0x82 0xE8 0x03`?
  - Actually before 0x01F8 (504) = 0xE8 = 232 and 0x01F9 (505) = 3 = 0x03
  - LE int16: 0x03E8 = 1000 = +100.0% (upper rate)
  - And 0x01F4–0x01F6 = `0x82 0x18 0xFC`: LE int16 0xFC18 = -1000 = −100.0% (lower rate)
- **Notes**: A var's rate appears to be stored as two int16 values (lower, upper rate).
  `0x82` tags each value. Default rates are ±100.0% = ±1000 in 0.1% units.
- **Confidence**: ~ rate tag and value size confirmed, exact field boundaries unclear due to shift

---

## Curves section

- **Spec**: `13-curves-add` — added one default Curve (file grew +3 bytes)
- **Offset** 0x01E8 (488): `0 → 1` (curve count)
- **Block size**: approximately 3 bytes for default curve
- **Confidence**: ~ count field identified

---

## Logic Switches section

- **Spec**: `14-logic-switches-add` — added one LS (file grew +26 bytes)
- **Offsets** 0x01EA (490), 0x01EC (492), 0x01ED (493): all `0 → 1`
  - Multiple count bytes or flags set on first LS add
- **Block size**: approximately 26 bytes for a default LS
- **Confidence**: ~ count region identified

---

## Special Functions section

- **Spec**: `15-special-functions-add` — added one SF (file grew +8 bytes)
- **Offset** 0x01EE (494): `0 → 1` (SF count)
- **Block size**: approximately 8 bytes for default SF
- **Confidence**: ~ count field identified

---

## Section offset map (baseline 651-byte model)

Approximate start offsets (vary slightly if file has variable-length content before):

| Section | Approx start offset | Notes |
|---------|-------------------|-------|
| Header/checksum | 0x0000 | CRC at 0x000E–0x000F |
| Outputs (CH1–CH32) | ~0x0060 | CH1: direction 0x0066, max 0x006A, subtrim ~0x006F |
| Flight Modes | ~0x0178 | Count at 0x017A, FM1 block at 0x0182+ |
| Mixes | ~0x0182 | Shifts right when FM1 added; count at 0x0182 |
| Vars | ~0x01EC | Count at 0x01EC, data at 0x01F1+ |
| Curves | ~0x01E8 | Count at 0x01E8 |
| Logic Switches | ~0x01EA | Count at 0x01EA–0x01ED |
| Special Functions | ~0x01EE | Count at 0x01EE |

---

## Pending investigations (not yet run or incomplete)

| Field | Status | Blocker |
|-------|--------|---------|
| FM1 name "CRUISE" (full 6-char) | ✓ DONE | offset 0x0184 (len) + 0x0185 (chars) |
| FM1 switch assignment | Not started | — |
| Output Max encoding formula | Identified but unclear | Run more values (90%, 75%, 50%) |
| Output subtrim int16 encoding | Identified but unclear | Need clean diff (no file size change) |
| Mix source category+member encoding | Identified but unclear | Run more source selections |
| Var name | 0 diffs — name change didn't work? | Re-run spec 03 |
| Model name encoding | Identified (spec 01, 393 diffs) | Noisy diff; isolate insertion point |
