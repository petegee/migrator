# ETHOS .bin Field Map

Binary offset findings from systematic UI investigation.
Each entry maps a UI action to the bytes it changes in the model file.

Header offsets follow the FRSK spec in `ethos/migrator/skills/ethos-bin-format.md`.
Content block starts at offset `0x10` (after the 16-byte FRSK header).

---

## Status key

| Symbol | Meaning |
|--------|---------|
| ✅ | Confirmed — diff is clean and interpretation is certain |
| 🔍 | Observed — diff captured but interpretation is tentative |
| ❓ | Unknown — bytes changed but meaning unclear |
| ⏳ | Pending — investigation not yet run |

---

## Edit model screen

### Model type ✅

Screen path: Model Setup → Edit model → Model type

**0 diffs** between Glider and Airplane — model type is NOT encoded distinctly in the binary
for this firmware build. The create-model wizard default produces the same bytes regardless
of type selection.

Diff file: `findings/diffs/00-model-type-glider.json`

---

### Model name

Screen path: Model Setup → Edit model → Name

Known: stored as length-prefixed ASCII at content offset `0x02` (1-byte length + N bytes).
Confirmed in `ethos-bin-format.md`.

| Field | Content offset | Notes |
|-------|----------------|-------|
| Name length | `0x02` | 0–15 |
| Name bytes  | `0x03` … `0x03+len-1` | ASCII, not null-terminated |

Diff file: `findings/diffs/01-model-name-test.json`

---

## Vars screen 🔍

Screen path: Model Setup → (swipe left) → Vars → +

### Vars count

Section count field at absolute offset **0x01EC**.

- Baseline (0 vars): `0x01EC = 0x00`
- After adding 1 var: `0x01EC = 0x01`

Adding one default var grows the file by **14 bytes**.

Diff files: `02-vars-add.json`, `03-vars-name.json`, `04-vars-value.json`

### Var name ✅

**0 diffs** when var name changed `"---"` → `"TEST"`. Var name is **NOT stored** in the
binary model file (it may be synthesised from the var index, or stored elsewhere).

### Var value 🔍

Changing var value from 0% to +5 steps grows the file by **3 bytes** and shifts the
existing min/max TLV pair (same `0x82` int16 LE encoding as outputs). The value TLV is
inserted before the min field — same pattern as outputs subtrim.

Exact TLV type for the value field is unconfirmed (likely `0x81` 1-byte or `0x82` 2-byte).

### Section count cluster

The four sections Curves / Logic Switches / Vars / Special Functions share a tightly
packed count table. Offsets confirmed from first-changed offset in each add-diff:

| Section | Count offset | Bytes per record |
|---------|-------------|------------------|
| Curves | 0x01E8 | 3 |
| Logic switches | 0x01EA | 26 |
| Vars | 0x01EC | 14 |
| Special functions | 0x01EE | 8 |

These are 2 bytes apart, suggesting alternating `[count] [pad/type]` layout or 2-byte count
fields. Exact sub-structure unconfirmed.

---

## Mixes screen

Screen path: Model Setup → Mixes → +

### Mix weight 🔍

Diff file: `07-mixes-weight.json`

Baseline was a 689-byte file (post-mix-source-change); weight changed from 100% to ~50%
(5× decrement at 10% step). Result: **149 diffs, +9 bytes**. Very noisy — the weight value
is encoded via TLV insertion in the same pattern as outputs limits (0x82 int16 LE), but
the exact offset and insertion structure cannot be decoded cleanly from this diff.

**Needs a clean re-probe** against a fresh baseline with only a single mix added (no source
set), changing weight by 1 step.

---

### Mix source field 🔍

Spec: `06-mixes-source` — diff: `findings/diffs/06-mixes-source.json`

The source field is a **variable-length insertion** within the mix data block,
located at **data block offset 5** (after the initial `01 00 00 00 01` preamble).

Diff shape: 3-byte pure insertion; all subsequent bytes shift by +3.
Confirmed by difflib — rest of block is byte-for-byte identical.

| Source value | Bytes at data block offset 5 | Notes |
|-------------|-------------------------------|-------|
| `---` (none) | *(absent — 0 bytes)* | field not present |
| Analogs / Rudder | `00 08 00` | byte[1]=0x08 likely = channel index in Analogs list |

Encoding `00 08 00`: byte[0] may be category (0=Analog), byte[1]=8 = Rudder's
index in Analogs list, byte[2]=0x00 = modifier. Further verification needed.

Mix data block start (1-mix model): absolute offset `0x0196`.
Source field absolute offset (no prior source): `0x019B`.

Diff file: `findings/diffs/06-mixes-source.json`

---

## Outputs screen

Screen path: Model Setup → Outputs

Channel slots section starts at offset `0x005B` (confirmed for test models; varies
with FM/section count). Structure:

```
0x005B-0x005C  00 00              separator
0x005D         06                 slot_count (always 6 on X18RS build-37)
0x005E-0x0063  00 01 02 03 04 05  src_assignments (one per slot)
0x0064-0x0065  00 00              padding
0x0066         direction-Ch1      0=Normal, 1=Reverse  ← spec 08
0x0067-0x0076  TLV data block     16 bytes (see below)
0x0077+        named channel entries
```

### TLV data block (16 bytes, default: `80 80 82 E8 03 82 18 FC 80 01 00×6`) ✅

| Byte(s) | TLV type | Value | Meaning |
|---------|----------|-------|---------|
| `80 80` | 0x80 | 0x80 | source/input reference (default) |
| `82 E8 03` | 0x82 | int16 LE 0x03E8=+1000 | **Max** = +100% ← spec 09 |
| `82 18 FC` | 0x82 | int16 LE 0xFC18=−1000 | **Min** = −100% |
| `80 01` | 0x80 | 0x01 | mode=active |
| `00×6` | — | — | tail padding |

TLV type `0x82` = 2-byte LE signed int16 follows; `0x80`/`0x81` = 1-byte value follows.

### Subtrim ✅ (spec 10)

When subtrim is non-zero, a `0x81 <value>` TLV is **inserted** before the mode field:
- No subtrim: `… 82 18 FC | 80 01 | 00×6`
- Subtrim=+5: `… 82 18 FC | 81 05 | 80 01 | 00×5` (1 byte longer)

The `0x81` value byte is the raw subtrim count (number of UI steps).

### Direction flag ✅ (spec 08)

| Value | Meaning |
|-------|---------|
| `0x00` | Normal |
| `0x01` | Reverse |

Absolute offset for Ch1 direction: `0x0066`. Differs per active channel count.

Diff files: `findings/diffs/08-outputs-direction.json`, `09-outputs-limits.json`, `10-outputs-subtrim.json`

---

## Flight modes screen 🔍

Screen path: Model Setup → Flight modes

### FM count ✅

Section count field at absolute offset **0x017A**.

- Baseline (FM0 only): `0x017A = 0x01`
- After adding FM1: `0x017A = 0x02`

The value includes FM0 (the always-present default mode).

### FM record layout 🔍

- FM0 record: **7 bytes** at `0x017B–0x0181` (unchanged when FM1 added)
- FM1 record: inserted at `0x0182`; **6 bytes** per FM added (confirmed by +6 file growth and
  the value at `0x0182` shifting +6 bytes downstream)

Diff files: `11-flight-modes-add.json`, `12-flight-modes-name.json`

### FM name ❓

The FM name probe (`12-flight-modes-name.json`) produced **identical diffs** to the plain
add probe (`11-flight-modes-add.json`). Either the keyboard input failed to register
"CRUISE", or the name is not stored in the section that shifted. Needs re-probe with
confirmed keyboard input.

---

## Curves screen 🔍

Screen path: Model Setup → (swipe left) → Curves → +

### Curves count

Section count field at absolute offset **0x01E8** (see Vars section count cluster table).

Adding one default curve grows the file by **3 bytes**. The value `0x03` that sits at
`0x01F2` in the baseline shifts to `0x01F5` (+3 positions), confirming a clean 3-byte
insertion immediately after the count byte.

Default curve record is likely `00 00 00` (3 zero bytes — the 3 bytes that appear at
the insertion point are not in the diff, meaning they equal the original bytes which were
also zero).

Diff file: `13-curves-add.json`

---

## Logic switches screen 🔍

Screen path: Model Setup → (swipe left) → Logic switches → +

### Logic switches count

Section count field at absolute offset **0x01EA** (see Vars section count cluster table).

Adding one default logic switch grows the file by **26 bytes**. This is the largest
per-record size of the four clustered sections.

Diff file: `14-logic-switches-add.json`

---

## Special functions screen 🔍

Screen path: Model Setup → (swipe left) → Special functions → +

### Special functions count

Section count field at absolute offset **0x01EE** (see Vars section count cluster table).

Adding one default special function grows the file by **8 bytes**.

Diff file: `15-special-functions-add.json`

---

## Timers screen

Screen path: Model Setup → Timers

⏳ Investigation pending.

---

## Trims screen

Screen path: Model Setup → Trims

⏳ Investigation pending.
