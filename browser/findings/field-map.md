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

### Model type

Screen path: Model Setup → Edit model → Model type

| Value | Byte offset | Hex value | Notes |
|-------|-------------|-----------|-------|
| Airplane | ⏳ | | wizard default (baseline) |
| Glider   | ⏳ | | target — all models use this type |

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

## Vars screen

Screen path: Model Setup → (swipe left) → Vars → +

⏳ Investigation pending.

---

## Mixes screen

Screen path: Model Setup → Mixes → +

⏳ Investigation pending.

---

## Outputs screen

Screen path: Model Setup → Outputs

⏳ Investigation pending.

---

## Flight modes screen

Screen path: Model Setup → Flight modes

⏳ Investigation pending.

---

## Curves screen

Screen path: Model Setup → (swipe left) → Curves → +

⏳ Investigation pending.

---

## Logic switches screen

Screen path: Model Setup → (swipe left) → Logic switches → +

⏳ Investigation pending.

---

## Special functions screen

Screen path: Model Setup → (swipe left) → Special functions → +

⏳ Investigation pending.

---

## Timers screen

Screen path: Model Setup → Timers

⏳ Investigation pending.

---

## Trims screen

Screen path: Model Setup → Trims

⏳ Investigation pending.
