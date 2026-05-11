# Primitive Migration Session

**Model:** BAMF2 Std
**Container:** /home/pete/Source/ethos/migrator/models/20231128_BAMF2 Std/20231128.etx
**Primitive:** output-0
**Session:** 2
**Migrator root:** /home/pete/Source/ethos/migrator

---

## Goal

Enter exactly ONE primitive from this EdgeTX model into the Ethos WASM emulator UI
by driving Playwright. The firmware serialises correctly — no binary work needed.

Do NOT modify any other primitives. Load the accumulated state, add this one
primitive, save the result.

---

## Accumulated State

Path: `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin`
Status: EXISTS (825 bytes) — upload this before editing

If it EXISTS: upload it via the Upload button before making any changes.
If it does NOT exist: call `navigateCreateModelWizard(page)` to start fresh.

After successfully entering the primitive, download the model .bin and write it to
`/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin` using `fs.writeFileSync`.

---

## ETX Primitive Data

```yaml
data:
  curve: 0
  max: 0
  min: 350
  name: Elev
  offset: 0
  ppmCenter: -24
  revert: 0
  symetrical: 1
index: 0
total_count: 9
type: output
```

---

## Current Mapping Rules for type: output

```
# Primitive Type: output

Maps to Ethos **Outputs** screen (Model Setup → Outputs tile).

## ETX Field → Ethos UI Mapping

| ETX field     | ETX encoding                          | Ethos field      | Ethos value              |
|---------------|---------------------------------------|------------------|--------------------------|
| `name`        | string                                | Channel name     | type directly            |
| `min`         | positive int N → -(100 - N/10)%      | Min              | e.g. 350 → -65.0%, 0 → -100% (default) |
| `max`         | negative int N → +(100 - |N|/10)%    | Max              | e.g. 0 → +100% (default), -350 → +65.0% |
| `offset`      | int (tenths of %)                     | Center/Subtrim   | 0 → 0.0% (default)       |
| `ppmCenter`   | int μs offset from 1500              | PWM center       | e.g. -24 → 1476us        |
| `revert`      | 0=Normal, 1=Reversed                  | Direction        | default=Normal            |
| `symetrical`  | 0=independent min/max, 1=symmetric   | (visual only)    | no separate field         |
| `curve`       | 0=none                                | Curve            | ---  (default)            |

## Navigation

1. Model Setup (tap bottom nav at x=194, y=459)
2. Outputs tile (tap approx x=100, y=330 from Model Setup page 1)
3. Tap channel row to open channel editor (CH1 = left col, row 1 at x=200, y=112)

## Outputs Editor Field Positions (firmware 1.6.6, DEFAULT/unscrolled state)

Canvas bitmap space: 800×480. CSS canvas: 640×385. Scale factor: bm_y × (385/480) = display_y.

| Field          | Bitmap y (center) | Notes                                     |
|----------------|------------------|-------------------------------------------|
| Name (value)   | 196              | Tap at bx=738 to open keyboard            |
| Direction      | 260              |                                           |
| Min            | 340              |                                           |
| Max            | 386              |                                           |
| Center/Subtrim | 449              |                                           |
| PWM center     | off-screen       | Scroll first (see below)                  |
| Curve          | off-screen       | Below PWM center                          |

**IMPORTANT**: Bitmap y=150 (nav guide value) hits the stats area ("Channel 0.0% / Mixes 0.0%"),
NOT the Name field. Use y=196 for the Name value area.

## Control Bar (bitmap y≈456, firmware 1.6.6)

| Button  | Bitmap x range | Notes                                      |
|---------|----------------|--------------------------------------------|
| `<`     | ~20-55         | Previous step size                         |
| step    | ~56-185        | Step size label                            |
| `>`     | ~185-420       | **Next step size — icon at bx≈390**        |
| `-`     | ~420-575       | Decrement value                            |
| `+`     | ~575-735       | Increment value                            |
| `⋮`     | ~735-800       | Context menu                               |

**IMPORTANT**: Nav guide says `>` step-up is at bx=437, but that lands in the `-` section (420-575).
Use bx=395 for the `>` step-up button.

## Scrolling to PWM Center

After entering Min (and any other fields above PWM center), scroll down using:
```typescript
await cdpTouchSwipeBitmap(page, 400, 300, 200);  // 100bx swipe up
```
This scrolls content ~99 bitmap pixels. In the resulting ONE-SCROLL state:

| Field          | DEFAULT bitmap y | ONE-SCROLL bitmap y |
|----------------|-----------------|---------------------|
| Max            | 386             | 287                 |
| Center/Subtrim | 449             | 350                 |
| PWM center     | 512 (off-screen)| 413                 |

Tap PWM center at `tapBitmap(page, 600, 413)` in ONE-SCROLL state.
Step is 1μs by default; decrement 24× to reach 1476us from 1500us default.

## Workflow (confirmed session-1)

```typescript
// Phase 1: Navigate to channel editor
await tapBitmap(page, 194, 459);  // Model Setup
await tapBitmap(page, 100, 330);  // Outputs tile
await tapBitmap(page, 200, 112);  // CH1 row

// Phase 2: Name
await tapBitmap(page, 738, 196);  // Open Name keyboard
// clear existing (10× Bksp), type new name, tap top to close

// Phase 3: Min (ETX min=350 → -65.0%)
await tapBitmap(page, 600, 340);  // Open Min
await tapBitmap(page, 395, 456);  // > step-up: 0.1% → 1%
// + 35× to go from -100% to -65%

// Phase 4: PWM center (ETX ppmCenter=-24 → 1476us)
await cdpTouchSwipeBitmap(page, 400, 300, 200);  // scroll
await tapBitmap(page, 600, 413);  // PWM center (ONE-SCROLL state)
// − 24× at 1μs/step

// Phase 5: Exit and download
await goBack(page);  // exit channel editor
```

## Notes

- Name field: must tap the value area (right side, bx=738, by=196), not the label
- `min: 0` in ETX = -100% (default full range — no change needed)
- `min: N` (non-zero) = -(100 - N/10)% — e.g. 350 → -65%, 500 → -50%
- `max: 0` in ETX = default +100% (no change needed)
- `offset: 0` → Center/Subtrim = 0.0% (default, no change needed)
- `curve: 0` → Curve = --- (default, no change needed)
- Scroll is ~1:1 bitmap pixels (100px swipe → ~99px content shift)
```

---

## Playwright Infrastructure

Browser dir: `/home/pete/Source/ethos/migrator/browser/`

Helpers (import with path relative to your spec in `tests/primitives/`):
- `../helpers/boot` — `bootApp(page)`, `navigateCreateModelWizard(page)`
- `../helpers/navigate` — `tapBitmap(page,x,y)`, `touchBitmap(page,x,y)`, `swipeCanvas(page,'left'|'right')`
- `../helpers/upload` — `uploadFile(page, 'model', path)`
- `../helpers/download` — `downloadToBuffer(download)`, `clickDownloadMenuItem(page, MENU.modelFile)`

Write your spec to:
  `/home/pete/Source/ethos/migrator/browser/tests/primitives/output-0-session-2.spec.ts`

Run it with:
```bash
cd /home/pete/Source/ethos/migrator/browser
npx playwright test tests/primitives/output-0-session-2.spec.ts --reporter=list --project=chromium
```


Screenshots and traces land in `/home/pete/Source/ethos/migrator/browser/test-results/`.

Emulator URL: https://ethos.studio1247.com/1.6.6/X18RS_FCC

---

## Key Navigation Facts

(from confirmed coordinates in `/home/pete/Source/ethos/migrator/skills/ethos-ui-navigation.md`)

- Canvas bitmap space: 800×480
- Most nav (menus, back arrow, list rows): `tapBitmap`
- Keyboard keys, Mixes/Vars context menu items: `touchBitmap`
- Bottom nav → Model Setup: `tapBitmap(page, 194, 459)`
- Page 2 of Model Setup (Vars/Curves/Logic switches/SF): swipe left from page 1
- Back arrow: `tapBitmap(page, 25, 25)`
- After entering all fields: `clickDownloadMenuItem(page, MENU.modelFile)` then save

---

## Workflow

1. **Read** the primitive data and current rules
2. **Write** the Playwright spec at `/home/pete/Source/ethos/migrator/browser/tests/primitives/output-0-session-2.spec.ts`
   - Boot the emulator (`bootApp`)
   - Upload accumulated.bin if it exists, or run wizard if not
   - Navigate to the right screen for this primitive type
   - Enter all field values from the ETX data
   - Take a screenshot to verify each field
   - Download the model .bin and write it to `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin`
3. **Run** the spec
4. **Read** screenshots from test-results — confirm fields are correct
5. **Update** `/home/pete/Source/ethos/migrator/skills/primitives/output.md` with confirmed steps or failure notes
6. **Write** `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/output-0/session-2/result.txt`:
   - `SUCCESS` — primitive entered and screenshot confirms it
   - `LEARN: <what to change next session>` — something failed

---

## Output Files (mandatory before ending)

| File | Content |
|------|---------|
| `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/output-0/session-2/result.txt` | SUCCESS or LEARN: notes |
| `/home/pete/Source/ethos/migrator/skills/primitives/output.md` | Updated mapping rules for type 'output' |
| `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin` | Updated model .bin (only on SUCCESS) |
