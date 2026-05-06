# FrSky Ethos `.bin` Model File Format

A reverse-engineering reference for the binary container format used by FrSky's **Ethos** firmware (Tandem X20/X20S/X20R, X18/X18S, Horus X10/X12 with Ethos installed, etc.) to store model configurations and radio settings.

> **Status:** Unofficial. FrSky has not published a format specification. The structure described here was derived by inspecting model files and cross-referencing observed behaviour with Ethos Suite. Field interpretations are best-effort and likely incomplete; treat this as a starting point for further reverse engineering rather than a definitive spec.

---

## 1. Scope and context

Ethos is the operating system developed by Bertrand Songis and the FrSky team for FrSky's newer transmitters. It is a clean-sheet design, not a fork of OpenTX, although some idioms carry over from the developer's earlier work.

The same `FRSK` container format appears to be used across several Ethos artefacts:

- `SD_CARD/models/<model_name>/model.bin` — per-model configuration
- `SD_CARD/radio.bin` (or `NAND/radio.bin` on radios with internal storage) — global radio settings
- `*.frsk` files — bootloader and firmware images flashed via Ethos Suite's DFU Flasher

The file analysed for this document is a 674-byte model `.bin` describing a four-channel fixed-wing aircraft with Aileron1, Aileron2, Elevators, and Rudders inputs feeding three mixers (Ailerons, Elevators, Rudders) into output channels.

---

## 2. High-level structure

An Ethos `.bin` file is a self-contained, length-and-checksum-framed binary container. It is **not** compressed and **not** a generic archive format (not tar, gzip, zip, StuffIt, ICE, etc.).

```
+-----------------------------------+
|       16-byte header              |
|  magic | version | length | CRC   |
+-----------------------------------+
|                                   |
|       Payload (packed structs)    |
|                                   |
|  - Inputs table                   |
|  - Mixers table                   |
|  - Outputs / channels             |
|  - Flight modes / flags           |
|  - Reserved padding               |
|                                   |
+-----------------------------------+
```

The payload is a serialised dump of the firmware's in-memory packed C structs, written end-to-end with no compression layer. Repetition seen in the bytes (arrays of identical default records, runs of zero padding) is structural, not RLE-encoded.

---

## 3. Header (offsets 0x00–0x0F)

The first 16 bytes form a fixed header. All multi-byte integers are **little-endian**.

| Offset | Size | Field            | Example         | Meaning |
|--------|------|------------------|-----------------|---------|
| 0x00   | 4    | Magic            | `46 52 53 4B`   | ASCII `"FRSK"` — FrSky/Ethos container marker |
| 0x04   | 2    | Format version   | `01 00`         | `0x0001` — on-disk format version |
| 0x06   | 2    | Board / file type| `01 25`         | `0x2501` — board or file-type discriminator (interpretation tentative) |
| 0x08   | 4    | Payload length   | `92 02 00 00`   | `0x00000292` = 658 bytes; equals `file_size − 16` |
| 0x0C   | 4    | CRC / checksum   | `81 17 76 E4`   | 32-bit checksum of the payload (almost certainly CRC-32, exact polynomial unconfirmed) |

### Validation rules

When reading a file, a parser should verify:

1. Bytes `0x00–0x03` equal `FRSK`.
2. The payload length at `0x08` equals `file_size − 16`.
3. The CRC at `0x0C` matches the computed checksum of bytes `0x10..EOF`.

When writing or editing a file, **both the length field and the CRC must be recomputed**, or Ethos will reject the file at load time. Ethos Suite handles this automatically; hand-edited files will not.

---

## 4. Payload layout

The payload begins at offset `0x10` and is a sequence of packed C structs in a fixed order. The exact field layouts are version-dependent and have not been fully reverse-engineered, but the major sections can be identified by their characteristic patterns and by the named string fields they contain.

### 4.1 Section ordering (observed)

In the sample file, the payload sections appear in this order:

1. Model header / metadata (offsets ~0x10–0x2F)
2. Inputs table (offsets ~0x30–0x10D)
3. Model identifier block (offsets ~0x10E–0x17F)
4. Mixers table (offsets ~0x180–0x1EE)
5. Outputs / channels and flight-mode data (offsets ~0x1EF–0x28F)
6. Trailing reserved padding (offsets ~0x290–EOF)

### 4.2 Inputs table

Each input slot is a fixed-size record. In the sample file there are six identical default records back-to-back, each beginning with the byte pattern `02 19 00 02 01 00 00`, suggesting a default `ExpoData`-equivalent struct repeated for unused slots.

Named input records follow a recognisable pattern. For example, the Aileron1 input record at approximately offset `0x66` looks like:

```
00 80 80 82 E8 03 82 18 FC 80 01 00 00 00 00 00 00 08 41 69 6C 65 72 6F 6E 31
                                                    ^^ ^^^^^^^^^^^^^^^^^^^^^^^
                                                    |  "Aileron1" (8 bytes)
                                                    Length prefix
```

The trailing `08 "Aileron1"` is a **Pascal-style length-prefixed string** — one byte giving the string length, followed by that many ASCII bytes, with **no null terminator**. The fixed bytes preceding the name field are the input's numeric configuration (source, weight, offset, curve reference, switch reference, etc.).

The same pattern repeats for `09 "Elevators"`, `07 "Rudders"`, and `08 "Aileron2"`.

### 4.3 Model identifier block

Around offset `0x10E–0x16D` the file contains a block with the byte sequence `kVkVbDfH` appearing twice. This is most likely an internal model UUID or hash used by Ethos to track model identity across renames and edits.

### 4.4 Mixers table

The mixers section follows the same length-prefixed-name pattern. In the sample:

- `08 "Ailerons"` at offset `0x18A`
- `09 "Elevators"` at offset `0x1AB`
- `07 "Rudders"` at offset `0x1C4`

Each mixer record contains a source reference (the input it reads from), a weight, an offset, a curve reference, and switch/flight-mode flags. The recurring `81 64 00 00 00 80` tail in each mixer record likely encodes a default weight of 100% with default flags.

### 4.5 Outputs and flight modes

Around offset `0x1EF` the file contains `06 "Rudder"` followed by another packed struct, which appears to be an output-channel name (channel display label) rather than a mixer name. The region from `0x200` to `0x28F` contains flight-mode-related data including what looks like a per-mode flag table.

### 4.6 Reserved padding

The tail of the file (`0x290–EOF`) consists largely of zero bytes. This is **forward-compatibility reserved space** — Ethos can add new fields to the model struct in future firmware versions without breaking the on-disk layout, by consuming bytes from this reserved region.

---

## 5. String encoding

Names (input names, mixer names, output labels) are stored as **Pascal-style length-prefixed ASCII strings**:

```
+--------+----------------------+
| length |  ASCII bytes         |
| 1 byte |  `length` bytes      |
+--------+----------------------+
```

- The length byte is a plain unsigned 8-bit count.
- There is **no null terminator**.
- Strings are not padded to a fixed width inside their containing struct; the next field follows immediately after the last character.

This means struct sizes are *not* strictly fixed across all records — records containing strings are variable-length, and a parser must read each length byte to advance correctly.

---

## 6. Why there's no compression

The reference material describing OpenTX's older internal EEPROM format mentions packed bit-field structures with RLE compression. That detail is **specific to OpenTX** and does not carry over to Ethos:

- OpenTX targeted radios with tiny serial EEPROMs (a few KB total). Compression and wear-levelling were essential.
- Ethos targets radios with SD cards and megabytes of flash. Space pressure is gone.
- Random access into fixed-offset structs is more valuable to embedded reader code than the bytes saved by RLE.
- The presence of an authoritative payload-length field in the header is incompatible with a streaming compression layer (the firmware would need both compressed and decompressed sizes to allocate buffers).

The repetition patterns in an Ethos `.bin` are therefore **structural artefacts**, not missed compression opportunities:

| Pattern | Likely meaning |
|---------|---------------|
| Repeated identical multi-byte records | Array of default-initialised input/mixer/channel slots |
| Long run of `0x01` bytes | Default-enabled per-mode flag bitmap |
| Long run of `0x00` bytes | Reserved padding for forward compatibility |

---

## 7. Practical advice for parsers

A defensive parser for Ethos `.bin` files should:

1. **Validate the header first.** Check magic, version, length, and CRC before reading any payload bytes. A mismatch indicates corruption or a different format generation.

2. **Treat the format version as authoritative.** The byte at offset `0x04` controls struct layout; assume layouts can and do change between major Ethos releases. Document which version(s) your parser supports and refuse the rest cleanly.

3. **Parse strings by their length prefix, not by terminator scanning.** Length-prefixed strings can legitimately contain bytes that look like terminators in adjacent fields.

4. **Preserve unknown bytes round-trip.** If you read a file, modify some fields, and write it back, copy any reserved/padding bytes verbatim. Do not zero them out; future Ethos versions may have given them meaning.

5. **Always recompute the payload length and CRC on write.** Failing to do so produces a file Ethos will reject.

6. **Cross-check against Ethos Suite.** Round-tripping a file through Ethos Suite (open, save without changes, diff) is the most reliable way to validate a parser, because Ethos Suite is the canonical writer of this format.

---

## 8. Open questions

The following points remain unconfirmed and would benefit from further investigation:

- The exact CRC algorithm and polynomial used at offset `0x0C`.
- Whether the byte at offset `0x06` is a board code, a file-type discriminator (model vs. radio settings vs. firmware), or both packed together.
- The full struct layouts for inputs, mixers, channels, flight modes, logical switches, special functions, telemetry sensors, and screen layouts.
- How the `.frsk` firmware/bootloader files differ in their payload structure from model `.bin` files (the container header is presumably the same).
- Whether radio-wide `radio.bin` and per-model `model.bin` use the same format-version numbering or have independent version spaces.

---

## 9. Summary

An Ethos `.bin` is a **`FRSK`-framed container** (16-byte header: magic + version + payload length + CRC) wrapping an **uncompressed, packed C-struct serialisation** of model or radio configuration data. Names are stored as length-prefixed ASCII strings inline within their containing structs. There is no compression layer and no archive directory; the file is a direct memory image of Ethos's internal configuration structs, framed for integrity checking.
