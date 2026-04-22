# Ethos Binary Model Format (.bin) — Reverse-Engineering Reference

This document describes the reverse-engineered binary format used by FrSky Ethos transmitter
firmware for model configuration files and radio settings files.

All multi-byte integers are **little-endian** unless noted.

---

## 1. File Types

| Type         | `ck[0]` | Notes                          |
|--------------|---------|--------------------------------|
| Model file   | `0x81`  | One model's full configuration |
| Radio file   | `0x80`  | Global radio/system settings   |

---

## 2. File Structure Overview

```
[0x00–0x0F]  16-byte FRSK file header
[0x10–EOF]   Content (model or radio data)
```

---

## 3. FRSK File Header (16 bytes)

```
Offset  Size  Description
──────  ────  ───────────────────────────────────────────────────────
0x00    4     Magic: ASCII "FRSK" = 46 52 53 4B
0x04    1     Version major (always 0x01)
0x05    1     Version minor (always 0x00)
0x06    1     Always 0x01
0x07    1     Firmware build number
              0x1C = build 28, 0x1F = build 31, 0x25 = build 37 (1.6.x)
0x08    4     Content length (LE uint32) = file_size − 16
0x0C    4     Checksum — see Section 4
```

### Example: test.bin header
```
46 52 53 4B  01 00 01 25  B5 02 00 00  81 17 E2 C4
FRSK         v1.0 bld37  clen=693     checksum
```

---

## 4. Checksum (bytes 0x0C–0x0F)

The 4-byte checksum field encodes **three independent values**:

```
0x0C  type_byte    0x81 = model file, 0x80 = radio settings file
0x0D  ver_byte     Firmware config-schema version:
                     0x17 for build 37 (Ethos ≥ 1.6.x)
                     0x05 for builds 28–31
0x0E  crc_lo       Low byte  of CRC16-CCITT(content, init=0)
0x0F  crc_hi       High byte of CRC16-CCITT(content, init=0)
```

### CRC16-CCITT Algorithm

- **Polynomial**: 0x1021 (non-reflected, big-endian shift)
- **Init**: 0x0000
- **No final XOR**
- Variant name: **CRC-16/XMODEM** (also called CRC-CCITT)
- The precomputed 512-byte lookup table is in the WASM binary at data offset `0x0122732a`

**Table-based computation:**
```
crc = 0x0000
for each byte b in content:
    crc = (crc << 8) XOR table[((crc >> 8) XOR b) & 0xFF]
return crc & 0xFFFF
```

**Storage:** CRC is stored little-endian:
- `header[0x0E]` = `crc & 0xFF`      (low byte)
- `header[0x0F]` = `(crc >> 8) & 0xFF` (high byte)

### Verified against 11 files across builds 28, 31, 37 — all correct.

### C# implementation
```csharp
private static readonly ushort[] Crc16Table = BuildCrc16Table();

private static ushort[] BuildCrc16Table() {
    var t = new ushort[256];
    for (int i = 0; i < 256; i++) {
        ushort crc = (ushort)(i << 8);
        for (int j = 0; j < 8; j++)
            crc = (ushort)((crc & 0x8000) != 0 ? (crc << 1) ^ 0x1021 : crc << 1);
        t[i] = crc;
    }
    return t;
}

private static ushort ComputeCrc16(byte[] data) {
    ushort crc = 0;
    foreach (var b in data)
        crc = (ushort)((crc << 8) ^ Crc16Table[((crc >> 8) ^ b) & 0xFF]);
    return crc;
}

// Build checksum bytes:
// ck[0] = 0x81 (model) or 0x80 (radio)
// ck[1] = 0x17 (for Ethos 1.6.x, build 37)
// ck[2] = (byte)(crc & 0xFF)
// ck[3] = (byte)(crc >> 8)
```

### Python implementation
```python
def crc16_ccitt(data: bytes, init: int = 0) -> int:
    """CRC-16/XMODEM: poly=0x1021, non-reflected, init=0."""
    crc = init
    for b in data:
        crc = ((crc << 8) ^ CRC16_TABLE[((crc >> 8) ^ b) & 0xFF]) & 0xFFFF
    return crc
```

---

## 5. Content Structure (starts at file offset 0x10)

### 5.1 Preamble (2 bytes)

```
[0x00]  0x00  — always
[0x01]  0x00  — always
```

> **Correction:** Previously documented as `01 00`. Verified `00 00` from 1chnl.bin (firmware-generated, build 37).

### 5.2 Model Name

```
[0x02]             name_len    1 byte — number of name characters (0–15)
[0x03 .. 0x02+N]   name        N bytes — ASCII model name, NOT null-terminated
```

### 5.3 Bitmap Field (16 bytes, fixed size)

```
[0x03+N .. 0x12+N]  bitmap_name  16 bytes — null-terminated ASCII filename
                                            of the model image (e.g. "Blaster.png")
                                            Zero-padded. All zeros = no image.
```

**Examples:**
- test.bin: bitmap = 16 × `0x00` (no image)
- Blaster.bin: bitmap = `"Blaster.png\x00\x00\x00\x00\x00"` (16 bytes)
- Weasel.bin:  bitmap = `"Weasel.png\x00\x00\x00\x00\x00\x00"` (16 bytes)

### 5.4 Model Config Block

Immediately after the bitmap, a variable-length block of model-level settings follows.
Structure partially decoded (see Section 7). Starts at content offset `0x13 + N` where N = name_len.

---

## 6. Section Layout (within content)

Sections appear in this order:

| # | Section                  | Anchor / Marker                           |
|---|--------------------------|-------------------------------------------|
| 1 | Model header             | Start of content                          |
| 2 | Flight modes             | Follows model config                      |
| 3 | Channel slots            | Count=6, src=[0..5], default data, named output channel entries |
| 4 | RF module block          | `0C 00…` header + `10 00 kVkVbDfH`       |
| 5 | Mixes                    | Named entries with `FF FF FF FF` switch   |
| 6 | **Inputs with Vars**     | `[count][00 00]` + channel names + var entries |
| 7 | Logical switches         | (seen in complex models)                  |
| 8 | Special functions        | (sound names like "beep-08bshort")        |
| 9 | GVars / variables        | (variable count)                          |
|10 | Telemetry sensors        | (named sensors)                           |
|11 | Footer                   | `55 55 55 55` ("UUUU")                    |

> **Key correction:** The Inputs with Vars section appears **after** RF module and Mixes — not before RF module as previously believed. The section after FM blocks is the channel slots section (output channel placeholders), not the inputs section.

### Footer

The file ends with `55 55 55 55` ("UUUU") followed by trailing config bytes. The exact length varies by model complexity (observed: ~22–29 bytes after UUUU).

---

## 7. Model Config Block

After the bitmap field, at content offset `bitmap_end = 0x03 + name_len + 16`:

```
Offset from bitmap_end   Description
───────────────────────  ──────────────────────────────────────────────
+0x00   1 byte           0xFF (build 37) or 0x08 (build 28/31)
+0x01   1 byte           0xFF (constant)
+0x02   1 byte           Unknown — observed 0x30 in 1chnl.bin (simple 1-channel model)
+0x03   1 byte           Unknown — observed 0x31 in 1chnl.bin
+0x04   3 bytes          Unknown (= 00 00 00 for build 37)
+0x07   1 byte           Unknown — observed 0x01 in 1chnl.bin (previously thought 0x04)
+0x08   4 bytes          Unknown — observed 00 00 00 00 in 1chnl.bin (previously thought 00 01 01 01)
+0x0C   1 byte           Unknown (= 00)
+0x0D   1 byte   ★       TRIM CHANNEL COUNT (u8) — number of trim channel blocks that follow
```

> **Note:** Bytes +0x02, +0x03, +0x07, +0x08–0x0B vary between models and are not yet decoded. Values above are from firmware-generated 1chnl.bin (build 37, minimal model).
>
> **Re-interpretation (was "FM count"):** This byte was previously labelled "flight mode count"
> but is now understood to be the **trim channel count**. Evidence: a minimal build-37 model
> (1chnl.bin, no user FMs) always has 6 blocks — matching the 4 stick trims plus T5/T6
> hardware trim switches on X18/X20 Pro. Build-31 models have 4 blocks — matching 4 stick
> trims only (T5/T6 not present on that hardware). A true flight mode count would be 1 for a
> minimal model, not 6.

### Trim Channel Blocks

Immediately after the trim count byte, there are `trim_count` × 7-byte blocks, one per
hardware trim channel (in channel order: Rudder, Elevator, Aileron, Throttle [, T5, T6]):

```
Byte 0    0x02            — type tag (constant)
Byte 1    0x19 = 25       — trim range % (default 25%; display scale = range × 4)
Byte 2    0x00            — step size: 0 = Fine (1 μs/step at 25% range)
                            Options from manual: Extra fine=0.5, Fine=1, Medium=2, Coarse=4 μs
Byte 3    0x02            — trim mode: 0=OFF, 1=Independent per FM, 2=Easy mode, 3=Custom
Byte 4    0x01            — audio: 0=OFF, 1=ON
Byte 5–6  s16 LE          — trim value in μs (Fine step = 1 μs; range ±(range×4) μs)
```

**Trim value unit:** The manual states Fine step = 1 μs at 25% range, and the display
range is −100 to +100. Therefore **1 binary unit = 1 μs** of PWM adjustment.
- Default 25% range: display −100 to +100, binary ±100 μs
- Max 100% range: display −400 to +400, binary ±400 μs
- Trim mode 2 (Easy mode) = one value shared across all flight modes (default for aileron/rudder)
- Trim mode 1 (Independent per FM) = this value applies only to the active FM (used for elevator)

**Trim count by build:**
- Build-37 (X18/X20 Pro/R/RS): 6 channels — Rudder, Elevator, Aileron, Throttle, T5, T6
- Build-31 (X20/X20S): 4 channels — Rudder, Elevator, Aileron, Throttle

**Example: 1chnl.bin (6 trim channels, build 37)**
```
Trim[0] Rudder:   02 19 00 02 01 02 00  — value = +2 μs (tiny default offset)
Trim[1] Elevator: 02 19 00 02 01 00 00  — value = 0
Trim[2] Aileron:  02 19 00 02 01 00 00  — value = 0
Trim[3] Throttle: 02 19 00 02 01 00 00  — value = 0
Trim[4] T5:       02 19 00 02 01 00 00  — value = 0
Trim[5] T6:       02 19 00 02 01 00 00  — value = 0
```

**Example: Blaster.bin (4 trim channels, build 31) — glider with real trim set**
```
Trim[0] Rudder:   02 19 00 02 01 9C FF  — value = −100 μs (full left rudder trim)
Trim[1] Elevator: 02 19 00 02 01 46 00  — value = +70 μs (nose-up elevator trim)
Trim[2] Aileron:  02 19 00 02 01 00 00  — value = 0
Trim[3] Throttle: 02 19 00 02 01 00 00  — value = 0
```

---

## 8. Channel Slots Section

Immediately after the FM blocks, a fixed channel-slot block appears. This is **not** the Inputs section — it lists the output channel placeholders. The actual Inputs with Vars section is later (Section 8b).

```
2 bytes    0x00 0x00       — separator
1 byte     slot_count      — always 6 (observed in all build-37 models)
6 bytes    src_assignments — physical-source index for each slot (always 00 01 02 03 04 05)
3 bytes    padding         — 00 00 00
16 bytes   default_data    — default TLV data block: 80 80 82 E8 03 82 18 FC 80 01 00×6
```

Then 6 named channel entries follow immediately (one per slot):

### Named Channel Entry Format

```
[0]      name_len   uint8 — length of name (1–15)
[1..N]   name       name_len bytes, ASCII (e.g. "Out1")
[N+1..N+2]  flags  2 bytes: 01 01 for inactive/default slots
[N+3..N+18] data   16 bytes: all 0x01 = inactive/unused
```

In a minimal model only the first slot is named (the configured output channel); the remaining 5 appear as runs of `0x01` fill bytes.

**Example (1chnl.bin):**
```
[0x007c]  04 "Out1" 01 01 [01×16]    — channel 0, inactive config
[0x0093]  [46 bytes 0x01]             — 5 more inactive slots
[0x00c1]  00                          — separator before RF block
[0x00c2]  RF module block starts
```

### Default 16-byte Data Block

The default data block (at the end of the preamble, before named entries) always contains:
```
80 80 82 E8 03 82 18 FC 80 01 00 00 00 00 00 00
```
Meaning: source=default, rate_high=+1000‰, rate_low=−1000‰, mode=active.

### Value Encoding (type-length-value)

| Type byte | Size | Notes                                      |
|-----------|------|--------------------------------------------|
| `0x80`    | 1    | 1-byte value follows                       |
| `0x81`    | 1    | 1-byte value (different meaning)           |
| `0x82`    | 2    | 2-byte little-endian signed int16 follows  |

Examples:
- `82 E8 03` → int16 value = 0x03E8 = **+1000**
- `82 18 FC` → int16 value = 0xFC18 = **−1000** (signed)
- `80 80`    → 1-byte value = **0x80** (some default/flag)

---

## 8b. Inputs with Vars Section

This section appears **after** the RF module block and Mixes section. It encodes Ethos "Inputs" (equivalent to EdgeTX expoData). Each Input has a channel name and one or more Vars (rate variations, each with its own rate data).

### Section Header

```
1 byte     input_count    — number of Input channels
2 bytes    0x00 0x00      — padding/separator
```

### Input Channel Entry

Each Input channel is just a name label (no rate data at this level):

```
[0]      name_len   uint8 — length of channel name (1–15)
[1..N]   name       name_len bytes, ASCII (e.g. "Inp1")
```

The Var entries for this channel follow immediately.

### Var Entry Format

Each Var (rate variation within an Input channel):

```
[0]      name_len   uint8 — length of var name (1–15)
[1..N]   name       name_len bytes, ASCII (e.g. "LineName")
[N+1..N+2]  flags  2 bytes — observed 08 00; encoding not fully decoded
[N+3..N+18] data   16 bytes (see below)
```

### 16-byte Var Data Block

```
Byte  Description
0–3   Control bytes: 01 00 00 00 (constant for active var)
4–6   Rate low:  0x82 [lo] [hi] = LE int16 in ‰ (negative value, e.g. 82 18 FC = −1000‰)
7–9   Rate high: 0x82 [lo] [hi] = LE int16 in ‰ (positive value, e.g. 82 E8 03 = +1000‰)
10–15 Padding: 0x00 × 6
```

> **Note:** Rate low (negative) comes **before** rate high (positive) — opposite of the default data block in Section 8.

Rate values are in per-mille (‰). To convert from EdgeTX percentage: `ethos_rate = edgetx_weight_pct × 10`.

**Example (1chnl.bin — "Inp1" channel, "LineName" var, weight=100%):**
```
[0x0163]  01 00 00         — input_count=1, separator
[0x0166]  04 "Inp1"        — Input channel name
[0x016b]  08 "LineName"    — Var name (8 chars)
[0x0174]  08 00            — flags
[0x0176]  01 00 00 00      — control bytes
[0x017a]  82 18 FC         — rate_low  = −1000‰ (−100%)
[0x017d]  82 E8 03         — rate_high = +1000‰ (+100%)
[0x0180]  00 00 00 00 00 00 — padding
```

---

## 9. RF Module Block

Two 40-byte records, each describing an RF module slot.

### Identifier Strings

| Identifier   | Modules                  | Protocol            |
|--------------|--------------------------|---------------------|
| `kVkVbDfH`   | SR10, R9MINI-O           | ACCST / ACCESS 2.4G |
| `d9l8g7n6`   | SR8, RX4R, GR6           | Possibly ACCST/older |

### Record Structure

Within each 40-byte record, the module name field is:
```
10 00  [identifier:8 bytes]  [module_name:up to 6 bytes]  [null padding]
```

Total = 2 + 8 + remainder to fill 16 bytes = 16-byte name field.

### Example (test.bin, no module name set):
```
Record 1 at content[0x137]:
  0C 00 00 00 00 00 00 00   — header bytes
  10 00 6B 56 6B 56 62 44 66 48 00 00 00 00 00 00  — 16-byte name (kVkVbDfH + zeros)
  ... (more config bytes)
```

---

## 10. Mix Entries

Each mix line:
```
[0]      name_len   uint8
[1..N]   name       ASCII
[N+1..N+4]  switch  4 bytes: FF FF FF FF = no switch (NONE)
                              other values = switch condition
[N+5..]  data       variable (mix weights, curve, flight modes, etc.)
```

**Switch field:**
- `FF FF FF FF` = NONE (no switch condition)

**Example (test.bin, "Ailerons" mix):**
```
08 41 69 6C 65 72 6F 6E 73  FF FF FF FF  01 00 00 00 00 00 00 04 01 05 06 07  81 64 00 ...
↑len  └──── "Ailerons" ────┘  └── NONE ──┘  └──────────── mix data ────────────┘
```

---

## 11. Firmware Versions and Build Numbers

| Build (`0x07`) | Firmware     | `ck[1]` |
|----------------|--------------|---------|
| 0x1C = 28      | ≤ 1.5.x      | `0x05`  |
| 0x1F = 31      | 1.5.x–1.6.0  | `0x05`  |
| 0x25 = 37      | 1.6.x (WASM) | `0x17`  |

The `ck[1]` byte tracks the internal config-schema version. It changed at build 37.
Use `0x17` when generating files for Ethos 1.6.x firmware.

---

## 12. Reading a .bin File — Algorithm

```python
def parse_ethos_bin(path: str):
    data = open(path, 'rb').read()
    
    # 1. Validate magic
    assert data[0:4] == b'FRSK', "Not an Ethos binary"
    
    # 2. Parse header
    version = (data[4], data[5])       # (major, minor)
    build = data[7]
    content_len = struct.unpack_from('<I', data, 8)[0]
    assert content_len == len(data) - 16
    
    ck = data[12:16]
    file_type = 'radio' if ck[0] == 0x80 else 'model'
    
    # 3. Verify checksum
    content = data[16:]
    crc = crc16_ccitt(content, init=0)
    assert (crc & 0xFF) == ck[2], "CRC mismatch (low byte)"
    assert (crc >> 8) == ck[3],   "CRC mismatch (high byte)"
    
    # 4. Parse content
    name_len = content[2]
    name = content[3:3+name_len].decode('ascii')
    bitmap = content[3+name_len:3+name_len+16].split(b'\x00')[0].decode('ascii')
    
    return {'type': file_type, 'build': build, 'name': name, 'bitmap': bitmap}
```

---

## 13. Writing a .bin File — Algorithm

```python
def write_ethos_bin(content: bytes, build: int = 0x25, file_type: str = 'model') -> bytes:
    """Wrap content bytes with a valid FRSK header and checksum."""
    crc = crc16_ccitt(content, init=0)
    
    type_byte = 0x80 if file_type == 'radio' else 0x81
    ver_byte  = 0x17 if build >= 0x25 else 0x05
    ck0, ck1  = type_byte, ver_byte
    ck2, ck3  = crc & 0xFF, (crc >> 8) & 0xFF
    
    header = (
        b'FRSK'                                  # magic
        + bytes([1, 0, 1, build])                # version bytes
        + struct.pack('<I', len(content))         # content length
        + bytes([ck0, ck1, ck2, ck3])            # checksum
    )
    return header + content


def build_model_content(name: str, bitmap: str = '') -> bytes:
    """Build minimal model content (name + bitmap + placeholder config)."""
    name_bytes   = name.encode('ascii')[:15]
    bitmap_bytes = bitmap.encode('ascii')[:15]
    
    # Fixed-size fields
    name_field   = bytes([len(name_bytes)]) + name_bytes
    bitmap_field = bitmap_bytes.ljust(16, b'\x00')[:16]  # always 16 bytes
    
    return b'\x00\x00' + name_field + bitmap_field
    # NOTE: real config sections (channel slots, RF block, mixes, inputs, footer) must follow
```

---

## 14. Validation Checklist

When checking a .bin file is valid:

- [ ] Bytes 0–3 = `46 52 53 4B` ("FRSK")
- [ ] Byte 4 = `01`, byte 5 = `00`, byte 6 = `01`
- [ ] `struct.unpack('<I', data[8:12])[0]` == `len(data) - 16`
- [ ] `data[12]` == `0x80` or `0x81`
- [ ] `data[13]` == `0x05` or `0x17` (or other known version)
- [ ] CRC16-CCITT(`data[16:]`, init=0) low byte == `data[14]`
- [ ] CRC16-CCITT(`data[16:]`, init=0) high byte == `data[15]`
- [ ] `data[16]` == `0x00`, `data[17]` == `0x00` (content preamble — **not** `01 00`)
- [ ] Model name length `data[18]` ≤ 15
- [ ] File ends with `55 55 55 55` ("UUUU") footer

---

## 15. Sample File Reference

| File             | Build | Name       | Content (bytes) | Notes                    |
|------------------|-------|------------|-----------------|--------------------------|
| 1chnl.bin        | 37    | "1Chnl"    | 527             | Firmware-generated; 1 input, 1 var, 1 mix — primary reference for build-37 structure |
| wasm_out_radio.bin | 37  | (radio)    | 236             | Firmware-generated radio |
| Blaster.bin      | 31    | "Blaster"  | 5763            | Complex glider           |
| Geronimo.bin     | 31    | "Geronimo" | 2725            | FPV wing                 |
| Magnus.bin       | 28    | "Magnus"   | 5864            | Competition glider       |
| zblank.bin       | 31    | (unknown)  | 2241            | Template model           |

---

## 16. Testing a Generated Model with the WASM Harness

### Overview

The Ethos firmware is compiled to WebAssembly (`X18RS_FCC.wasm`) and ships with an
Emscripten JS wrapper (`X18RS_FCC_patched.js` — a patched variant that exposes internal
exports). A Node.js harness loads this firmware, injects a model file into its virtual
filesystem, runs it, and saves any files the firmware writes back to host disk.

**Round-trip validation**: if the firmware accepts a model it writes it back to disk
unchanged. Comparing the output against the original (CRC, structure) confirms the file
is well-formed.

### Prerequisites

In `migrator/lib/`:
- `X18RS_FCC.wasm` — firmware binary (self-contained local copy, 23 MB)
- `out.wat` — decompiled WebAssembly text (143 MB) — human-readable firmware source, useful for understanding internal field names and struct layouts

In `migrator/lib/`:
- `X18RS_FCC_patched.js` — patched Emscripten wrapper (exposes `_writeDefaultSettingsAndModel`, `_start`)
- `test-model.js` — parameterised harness (see below)
- `wasm_radio.bin` — required radio settings file

Node.js must be available. It is **not** on the default Claude Code PATH; the user must
invoke it manually (e.g. via `! node skills/test-model.js mymodel.bin` in the terminal).

### The Harness: `test-model.js`

An enhanced Node.js script that runs the firmware, captures logs with timestamps, validates output, and generates structured reports.

```bash
# Run from spike/ directory:
node test-model.js <model.bin>         # Normal mode
node test-model.js <model.bin> --keep-logs  # Show all firmware logs in console
```

**What it does:**

1. Initializes WASM firmware and virtual filesystem
2. Writes `<model.bin>` as `model00.bin` into `/models/`
3. Boots firmware via `M._start()` (pthread crash is expected)
4. Captures **all** firmware output (stdout + stderr) with millisecond timestamps
5. Dumps output files from virtual FS to disk
6. Computes byte-for-byte diff between input and output
7. Runs Python validator (`inspect-ethos-bin.py`) automatically
8. Generates 3 report files with results

**Output files** (written to same directory as input model):

| File | Description |
|------|-------------|
| `<model>_test_report.json` | **Structured JSON report** with all metrics, diffs, validation results, and pass/fail status |
| `<model>_diff.txt` | Human-readable byte-for-byte diff (first 50 changes) |
| `<model>_validation.txt` | Python validator output (structure, CRC, checksums, section analysis) |
| `wasm_out_<model>.bin` | Firmware's round-tripped version of the model (for comparison) |

**Report structure** (`_test_report.json`):
```json
{
  "timestamp": "2026-04-21T12:34:56.789Z",
  "modelFile": "test.bin",
  "modelSize": 693,
  "elapsedMs": 5234,
  "status": "PASS",
  "reason": "model read successfully",
  "diffs": {
    "model00.bin": {
      "inputLen": 693,
      "outputLen": 693,
      "diffCount": 0,
      "diffs": []
    }
  },
  "validation": {
    "success": true,
    "output": ["[line1]", "[line2]", ...]
  },
  "summary": {
    "identical": 1,
    "modified": 0,
    "failed": 0
  }
}
```

### Interpreting the Reports

The harness outputs three files automatically. Check them in this order:

**1. `_test_report.json`** — Primary result file
```json
"status": "PASS" or "FAIL" or "UNKNOWN"
"reason": "model read successfully" | "sentinel error detected" | "no validation event"
"diffs": { "model00.bin": { "diffCount": 0, "diffs": [...] } }
"summary": { "identical": 1, "modified": 0, "failed": 0 }
```

| Status | Interpretation |
|--------|-----------------|
| `PASS` | Firmware parsed model and returned successfully |
| `FAIL` | Firmware detected a structural error (sentinel/check-failed) |
| `UNKNOWN` | Firmware ran but no clear parse event logged |

**2. `_diff.txt`** — Byte-for-byte changes
- `diffCount: 0` = firmware output identical to input (best outcome)
- `diffCount > 0` = firmware normalized some bytes (acceptable, indicates parsing + re-encoding)
- Check exact byte changes to understand what firmware modified

**3. `_validation.txt`** — Python validator output
- CRC check pass/fail
- Section structure analysis
- Any warnings about unusual field values
- If validation fails, indicates model doesn't meet schema requirements

### Expected Console Output (successful run)

```
[12:34:56] Testing: test.bin (693B)
[12:34:56] WASM initialized
[12:34:56] Starting firmware...
[12:34:57] Dumped: wasm_out_test.bin (693B)
[12:34:57] Harness complete (5234ms)

============================================================
RESULT: PASS — model read successfully
============================================================
Firmware output: 12 log lines, 0 errors
Files processed: 1
  identical: 1

Test report: test_test_report.json
Diff report: test_diff.txt
Validation report: test_validation.txt
```

### Command-Line Options

```bash
node test-model.js <model.bin>              # Standard: minimal console output
node test-model.js <model.bin> --keep-logs  # Debug: show all firmware logs in console
```

Use `--keep-logs` when troubleshooting failures to see detailed firmware debug output.

### Known Behaviour

- The pthread crash is **always expected** — it is not a sign of failure. The harness
  catches it and continues.
- The harness runs firmware for 5 seconds then times out (gives ample time for parsing).
- All firmware output (print/printErr) is captured with millisecond timestamps, even if not
  displayed on console (use `--keep-logs` flag to see all output).
- Output files are automatically dumped from the virtual filesystem to disk as `wasm_out_*.bin`.
- CRC and structure validation (Python) is **automatically run** — check `_validation.txt` for results.
- Byte-for-byte diff is computed and saved to `_diff.txt` — 0 changes = firmware accepted the model
  as-is (best outcome).
- Pass/fail decision is logged to console and saved in `_test_report.json` under `status` field.
- Build 37 (schema `0x17`) is the version supported by `X18RS_FCC.wasm`. Models
  generated with `build=0x25, ver_byte=0x17` are the correct target.
- The harness expects `wasm_radio.bin` to exist (pre-captured valid radio settings); if missing,
  you will see FS errors.

### Quick Reference: Full Test Loop for a Generated Model

**Python: Generate and write model**
```python
content = build_model_content(...)           # see Section 13
data    = write_ethos_bin(content, build=0x25, file_type='model')
open('mymodel.bin', 'wb').write(data)
```

**Bash: Run automated test harness** (validates everything at once)
```bash
# All-in-one: parse → validate structure → firmware test → diff → Python validation → JSON report
! node test-model.js mymodel.bin

# Check results:
cat mymodel_test_report.json        # structured results
cat mymodel_diff.txt                # byte-for-byte changes
cat mymodel_validation.txt          # Python validator findings
```

The harness automatically:
1. Validates structure with Python inspector
2. Tests against WASM firmware
3. Computes diff (expect 0 changes for well-formed models)
4. Generates JSON report with pass/fail decision

---

## 18. Ethos Concepts & Signal Flow

Understanding how Ethos processes control inputs helps interpret the binary encoding.

### Signal Flow

```
Physical sticks/switches
         │
         ▼
      Inputs              ← Inputs with Vars (Sec 8b)
  expo/rates applied
         │
         ▼
      Mixers              ← Mix Entries (Sec 10)
  formula per mix
         │ (all mix outputs sum into channels each cycle)
         ▼
     Channels             ← Channel Slots (Sec 8); 64 total
  aggregated, clipped
         │
         ▼
      Outputs             ← Named channel entries (Sec 8)
  PWM mapping applied
         │
         ▼
  Servo PWM 988–2012 μs
```

### Value Encoding: ±100% = ±1000‰

All rates, weights, and offsets in the binary use **per-mille (‰)**:

| Value | ‰ | Hex (int16 LE) | Binary bytes |
|-------|---|----------------|--------------|
| +100% | +1000 | 0x03E8 | `82 E8 03` |
| −100% | −1000 | 0xFC18 | `82 18 FC` |
| +50%  | +500  | 0x01F4 | `82 F4 01` |
| 0%    | 0     | 0x0000 | `82 00 00` |

Type byte `0x82` signals a 2-byte signed LE integer follows (see Sec 8 TLV table).
Convert from EdgeTX: `ethos_rate = edgetx_weight_pct × 10`.

### Mixer Formula

```
mixer_output = (source_value × weight) + offset
```

Processing order within each mixer: **Curve → Weight → Offset**
(curve applied first, then weight multiplied, then offset added)

All 64 channels reset to zero each cycle; active mixers add to their target channel sequentially, top to bottom.

### Mixer Functions

| Function | Behaviour |
|----------|-----------|
| Add      | Output added to channel (default) |
| Multiply | Channel multiplied by mixer output |
| Replace  | Mixer output replaces channel value |
| Lock     | Replace + all subsequent mixers for this channel are skipped |

Function encoding in mix data bytes: not yet decoded.

### Mixer Activation Conditions (both must be true)

1. **Switch/condition** — 4-byte field in mix entry (Sec 10); `FF FF FF FF` = always active (NONE)
2. **Flight mode mask** — in mix data bytes; default = active in all FMs (field not yet decoded)

### Flight Modes

- Exactly one FM active at all times; highest-priority FM whose switch condition is true wins
- Default FM = lowest priority (FM0); always the fallback; no Active condition parameter
- Up to 20 user-defined FMs; FM0 always exists
- FM definition blocks (name, active condition, fade in/out) are NOT the trim channel blocks in Sec 7
- Mixer FM mask field selects which FMs a mix is active in (field not yet decoded in binary)

### Trims

- 4 modes per trim channel: **OFF**, **Easy mode** (shared across all FMs), **Independent per FM**, **Custom**
- Default: Easy mode, range 25%, Fine step (1 μs/click), audio ON
- **Trim binary unit = μs** (Fine step = 1 μs at 25% range; display −100 to +100 = ±100 μs)
- Config block (Sec 7) holds **trim channel blocks** — one per hardware trim, NOT one per flight mode:
  - Build-37 (X18/X20 Pro): 6 channels — Rudder, Elevator, Aileron, Throttle, T5, T6
  - Build-31 (X20/X20S): 4 channels — Rudder, Elevator, Aileron, Throttle
- Trim block byte 3 encodes mode: 0=OFF, 1=Independent per FM, 2=Easy mode, 3=Custom
- For Easy mode (2): the s16 LE trim value is the single shared PWM offset (μs)
- For Independent per FM (1): per-FM trim values are likely in FM definition blocks (not yet located)

### PWM Output Mapping (not in model content binary)

Output layer parameters live in the named channel entries (Sec 8), not a separate block:

| Parameter | PWM effect |
|-----------|------------|
| Min       | −100% channel value → 988 μs |
| Max       | +100% channel value → 2012 μs |
| Subtrim   | 0% (centre) offset from 1500 μs |
| Direction | Swaps Min/Max (reverses servo) |

---

## 17. Lessons Learned

### Major Conceptual Corrections

**Preamble bytes are `00 00`, not `01 00`**
- Initial documentation stated content[0:2] = `01 00`
- Later verified against firmware-generated 1chnl.bin (build 37): both bytes are `0x00`
- **Lesson:** Always validate against actual firmware output files, not just parsed files. Firmware-generated models are ground truth.

**Trim blocks are per-hardware-trim, not per-flight-mode**
- Originally mislabelled as "FM blocks" and associated with flight mode count
- Actual structure: one 7-byte block per hardware trim channel (e.g., 6 for X18 Pro: R/E/A/T/T5/T6)
- Trim count varies by hardware build (build-37: 6; build-31: 4)
- **Lesson:** Hardware differences affect file structure. Always cross-reference firmware build number when reverse-engineering.

**Inputs section is last, not first in the order**
- Revision: Inputs with Vars (Section 8b) appear **after** RF module block and Mixes, not immediately after channel slots
- Initial mapping placed it too early, causing offset errors in downstream sections
- **Lesson:** Trace section boundaries by file position, not by logical flow. Use anchor strings (like `UUUU` footer) to find sections from the end.

**Channel slots are not Inputs**
- Confusion: both list "channels," but serve different purposes
- Channel Slots (Sec 8) = output placeholders, fixed 6-slot block with default data
- Inputs (Sec 8b) = logical input channels bound to Vars (rates/expo), variable count
- **Lesson:** Understand the control-flow model (sticks → Inputs → Mixers → Channels → Outputs) before decoding sections.

### Validation and Testing Insights

**Firmware round-trip is non-negotiable for correctness**
- Structural validation (CRC, byte counts) passes but does not guarantee semantic correctness
- Firmware parsing will reveal schema mismatches, wrong field sizes, or missing sections
- Byte-for-byte identical output after firmware round-trip = high confidence
- **Lesson:** Build automated WASM harness testing early. Structure + firmware validation >> structure alone.

**CRC16-CCITT implementation is fragile**
- Polynomial 0x1021, non-reflected, no final XOR (= CRC-16/XMODEM)
- Off-by-one errors in table lookup or shift direction produce different valid-looking CRCs
- **Lesson:** Cross-verify CRC against multiple reference implementations before relying on generated files.
- Precomputed table at WASM offset `0x0122732a` is authoritative.

**Build number determines schema version and structure**
- Build-31 vs. Build-37 differ in:
  - Trim count (4 vs. 6)
  - Config byte `0x07` (0x1F vs. 0x25)
  - Schema version byte `ck[1]` (0x05 vs. 0x17)
  - Likely other sections (untested)
- **Lesson:** Always save and verify the build number from sample files. Generated models must match expected hardware.

### File Structure Mapping

**Use multiple reference files as anchors**
- `UUUU` footer is reliable end marker; work backward to find section boundaries
- `10 00 kVkVbDfH` string reliably marks RF module block start
- `FF FF FF FF` switch field marks mix entries (not just mix data)
- **Lesson:** Search for patterns in hex dumps of validated files to triangulate section boundaries.

**Section ordering is fixed, but padding varies**
- Sections must appear in order: header → FMs → channel slots → RF modules → mixes → inputs → logical switches → special functions → GVars → telemetry → footer
- Padding and alignment between sections can vary by model complexity (especially post-footer)
- **Lesson:** Don't assume fixed byte counts. Use entry counts and variable-length name fields to navigate.

### Implementation Patterns

**Type-Length-Value encoding is prevalent**
- TLV patterns (0x80, 0x81, 0x82) for values in channel and var data blocks
- Each type specifies how many bytes follow: `0x80` = 1 byte, `0x82` = 2 bytes (int16 LE)
- **Lesson:** When decoding variable-length blocks, always read the type byte first to know how far to advance.

**ASCII names are never null-terminated but are length-prefixed**
- Pattern: `[1-byte length] [N bytes ASCII]` (not `[bytes] [null]`)
- Bitmap field is exception: 16 bytes, null-terminated or zero-padded
- **Lesson:** Don't assume C-string semantics. Read the length byte first.

**Per-mille (‰) is the universal rate/weight unit**
- 1000‰ = 100% = 0x03E8 (int16 LE)
- Negative rates are two's complement: −1000‰ = 0xFC18 (int16 LE)
- Conversion: `ethos_‰ = edgetx_% × 10`
- **Lesson:** Always scale by 10 when converting from EdgeTX percentage; forget this and rates are off by order of magnitude.

### Debugging Practices

**Hexdump + Python struct module is the fastest tool**
- `hexdump -C file.bin | head -n 50` + `struct.unpack('<I', data[8:12])` beats GUI hex editors
- Pair with `inspect-ethos-bin.py` for automated validation
- **Lesson:** Write small Python scripts to unpack and dump sections; reuse across models.

**Diff firmware input vs. output to catch firmware normalizations**
```python
# Fast diff:
a, b = open('in.bin','rb').read(), open('out.bin','rb').read()
diffs = [(i, f'{a[i]:02x}', f'{b[i]:02x}') for i in range(len(a)) if a[i]!=b[i]]
```
- Firmware may change a few bytes for normalization (e.g., re-encode floats)
- Identical files = model is semantically valid; changes = schema normalization (often harmless)
- **Lesson:** Set expectations: firmware should not reject or crash; minor byte changes are acceptable.

---

## 17. Known Unknowns

- Config block bytes +0x02, +0x03, +0x07, +0x08–0x0B — values vary, purpose unknown
- ~~FM block internal constants `02 19 00 02 01`~~ **RESOLVED** — byte 1 = trim range % (0x19=25), byte 2 = step mode (0=Fine), byte 3 = trim mode (2=Easy), byte 4 = audio (1=ON)
- ~~FM[0] trim value carries real trim data~~ **RESOLVED** — s16 LE value is in μs (Fine step = 1 μs); e.g. +2 = tiny 2 μs offset on rudder channel
- Trim channel blocks are per-hardware-trim, not per-flight-mode — but per-FM trim values for "Independent per FM" mode not yet located in the binary
- 3-byte padding between source assignments and default data block — always `00 00 00`?
- Channel slot entry flags `01 01` — exact meaning unknown
- Var entry flags `08 00` — encoding unknown; may relate to flight mode mask or expo mode
- Var data bytes 0–3 `01 00 00 00` — exact meaning of these control bytes unknown
- Bytes between Mix section end and Inputs section start — structure not fully decoded
- Bytes after last Var entry, before UUUU — contains structured data (logical switches, GVars etc.), not decoded
- Logical switch encoding
- Special function encoding
- GVar structure
- Telemetry sensor list format
- RF module record 2 header bytes differ from record 1 — significance unknown
- Exact footer length varies (observed 22–29 bytes after UUUU)
