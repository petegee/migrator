# Reference Models

This document catalogs working Ethos .bin files that can serve as templates or comparison points during reverse-engineering.

All reference models are located in `reference-models/` and have been **validated** (firmware round-trip test, status=PASS, 0 byte changes).

---

## 1. **1chnl.bin** (527 bytes)

**Source:** Firmware-generated model (build 37)  
**Complexity:** Minimal  
**Build:** 0x25 (Ethos 1.6.x)

### Structure

```
Model name:     "1Chnl"
Inputs:         1 ("Inp1")
Vars:           1 ("LineName", rate 100%)
Mixes:          1 ("Ailerons")
Output channel: 1 ("Out1")
Flight modes:   Default only
Trims:          6 (R/E/A/T/T5/T6, all at 0 μs except Rudder +2 μs)
```

### Key Sections (Byte Offsets)

```
0x00–0x0F     FRSK header
0x10–0x11     Preamble (00 00)
0x12          Model name length (5)
0x13–0x17     "1Chnl"
0x18–0x27     Bitmap field (16 zero bytes)
0x28–0x57     Config block (6 trim blocks × 7 bytes)
...           Channel slots, RF modules, mixes, inputs
EOF–4         Footer (55 55 55 55) + padding
```

### Use This For

- **Understanding minimal structure** — one of everything
- **Reference for preamble, name, bitmap, config layout**
- **Trim block byte-by-byte format**
- **Testing that your generated file has correct CRC and size**

### Key Bytes to Copy

- Trim block format: `02 19 00 02 01 [2-byte s16 trim value]`
- Footer: `55 55 55 55` followed by ~20 bytes
- Config block start: byte 0x28 after bitmap

---

## 2. **shinto.bin** (5,402 bytes, ~5.3K) ✓ VERIFIED COMPLEX

**Source:** Known good complex model  
**Complexity:** Complex (multiple inputs, mixes, flight modes, logical switches)  
**Build:** 0x25 (Ethos 1.6.x)

### Structure

```
Model name:     "shinto"
Size:           5.3 KB (2.5× larger than test.bin)
Features:       Multiple flight modes, logical switches, complex mixes
Characteristics: Full-featured realistic model
```

### Status

- ✓ Firmware test: **PASS** (confirmed)
- ✓ Byte diff: **0 (identical)**
- ✓ Python validator: **No errors**
- ✓ Radio test: **Loads and operates correctly**

### Use This For

- **Complex model reference** — for comparing against your own complex models
- **Section layout debugging** — when your model fails, byte-diff against shinto to see structure differences
- **Feature completeness** — if your model is missing features, compare against shinto's structure
- **Confidence on difficult migrations** — shinto proves complex models with many features work

### Key Sections (Likely Present)

- Multiple flight modes (FM0, FM1, FM2, ...)
- Logical switches (several)
- Complex mix interactions
- Input exposures with multiple variations
- Trim configurations

**When to Use:**
- Your model is complex (50+ features)
- You're debugging offset or section ordering issues
- You need a "gold standard" complex model to compare byte-for-byte against

---

## How to Use Reference Models

### Compare Structure

```bash
# Hex dump a reference to see byte layout
hexdump -C reference-models/1chnl.bin | head -30

# Compare your generated model against reference
hexdump -C your-model.bin > /tmp/yours.hex
hexdump -C reference-models/1chnl.bin > /tmp/ref.hex
diff /tmp/yours.hex /tmp/ref.hex | head -20
```

### Validate Against Reference

```bash
# Test your model
! node {DIR}/lib/test-model.js your-model.bin

# Check diffs (should be 0 like reference models)
cat your-model_diff.txt
```

### Use as Template

If you're stuck:
1. Start with 1chnl.bin structure (preamble, name, bitmap, config)
2. Scale up complexity toward shinto.bin (inputs, mixes, RF module)
3. Compare byte-for-byte against reference at each step

### Extract Sections

```python
# Read a reference model and extract sections
with open('reference-models/1chnl.bin', 'rb') as f:
    data = f.read()

# Header
header = data[0x10:0x12]  # preamble
name_len = data[0x12]
name = data[0x13:0x13+name_len]
bitmap = data[0x13+name_len:0x13+name_len+16]

# Config blocks (starting at 0x28 for 1chnl)
config_block = data[0x28:0x28+0x30]  # 6 trim blocks × 7 bytes

# Use as template in your generator
```

---

## Adding New Reference Models

When you successfully reverse-engineer a new model:

1. Copy the working .bin file here:
   ```bash
   cp models/<model>/attempt-N.bin reference-<model>.bin
   ```

2. Run tests to confirm:
   ```bash
   ! node {DIR}/lib/test-model.js reference-<model>.bin
   ```

3. Add an entry to this document:
   - Name and size
   - Structure summary
   - Use cases
   - Lessons learned

4. Commit to version control:
   ```bash
   git add reference-<model>.bin MEMORY.md templates/reference-models.md
   git commit -m "Add reference model: <model> — <feature>"
   ```

This builds a library that future reverse-engineering attempts can learn from.

---

## Troubleshooting with References

**"My model is too small — what's missing?"**
- Likely missing: inputs, mixes, or sections
- Compare your generated file hex dump against 1chnl.bin or shinto.bin
- Check for footer (55 55 55 55)

**"Firmware test FAIL. Where's the error?"**
- Use Python validator on reference model (should be OK)
- Compare your file byte-for-byte against reference
- Check CRC calculation against working example

**"I'm getting the structure right but tests still fail."**
- Verify exact byte encoding of all TLV fields
- Check for off-by-one errors in offset calculations
- Compare trim block layout (byte-for-byte) against 1chnl.bin

---

## Files Available

All reference models are in `reference-models/`:

```bash
ls -lh reference-models/*.bin
```

Key ones:
- `reference-models/1chnl.bin` — minimal, firmware-generated ✓ verified
- `reference-models/shinto.bin` — complex model (5.3 KB), multiple flight modes and switches ✓ verified
