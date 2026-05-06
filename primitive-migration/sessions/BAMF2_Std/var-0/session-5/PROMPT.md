# Primitive Migration Session

**Model:** BAMF2 Std
**Container:** /home/pete/Source/ethos/migrator/models/20231128_BAMF2 Std/20231128.etx
**Primitive:** var-0
**Session:** 5
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
Status: EXISTS (733 bytes) — upload this before editing

If it EXISTS: upload it via the Upload button before making any changes.
If it does NOT exist: call `navigateCreateModelWizard(page)` to start fresh.

After successfully entering the primitive, download the model .bin and write it to
`/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin` using `fs.writeFileSync`.

---

## ETX Primitive Data

```yaml
data:
  chn: 0
  curve:
    type: 0
    value: 0
  flightModes: 0
  mode: 3
  name: Rudder
  offset: 0
  scale: 0
  srcRaw: Rud
  swtch: NONE
  trimSource: 0
  weight: 80
index: 0
total_count: 5
type: var
```

---

## Current Mapping Rules for type: var

```
# Var — Mapping Rules (ETX expoData → Ethos Var)

See `vars.md` for full documentation, session history, and recipes.
This file contains the current authoritative rules for type `var`.

---

## Conceptual Mapping

One Ethos **Var** per unique `chn` value across all expoData entries.
The Var represents that input channel, with one or more rate lines.

### Group expoData by channel first

```yaml
# Example: chn=0 has two lines (dual rate)
expoData[0]: {chn: 0, srcRaw: Rud, weight: 80,  swtch: NONE}  # base — always active
expoData[1]: {chn: 0, srcRaw: Rud, weight: 100, swtch: SA0}   # high rate when SA↑

# → ONE Var for chn=0 with two Value lines
```

### Field mapping per Var

| ETX expoData field | Ethos Var field | How |
|---|---|---|
| `name` | Name (via Comment) | Comment field — keyboard entry |
| `srcRaw` | Value → analog source | **Long-hold hamburger on Values field → "Analogs" → pick stick** |
| Per additional line: `swtch` or `flightModes` | "+ Add a new value" → condition | Condition picker: switch position / flight mode / logical switch |
| Per additional line: `weight` or different source | New Value line → value | Same analog at different rate, or different formula |

### Single-rate case (swtch=NONE, one expoData line)

Just set Value = analog. No conditional value lines needed.

### Multi-rate case (multiple expoData lines for same chn)

1. Set Value = analog (hamburger → Analogs)
2. For each additional expoData line: tap "+ Add a new value"
   - Set condition = ETX `swtch` (switch position) or `flightModes` (flight mode)
   - Set value = the rate for that condition (same analog at different weight, or different value)

---

## Navigation

Model Setup (194,459) → swipe left → Vars tile (300,330)
Helper: `navigateToVars(page)` in `tests/helpers/navigate.ts`

## Creating a Var

- First var on empty list: `tapBitmap(page, 400, 266)` → editor opens directly ✓
- Subsequent vars: `tapBitmap(page, 563, 69)` (+ in list header)

## Setting the Analog Source (Values field → hamburger)

The Values field has a ≡ (hamburger) icon at its top-left.
Long-hold the hamburger to change the field type to an analog source:

```typescript
async function longHoldBitmap(page, bx: number, by: number, holdMs = 800) {
  const rect = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')]
      .find(c => c.getContext('webgl') || c.getContext('webgl2'));
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const px = rect.x + bx * (rect.w / 800);
  const py = rect.y + by * (rect.h / 480);
  await page.mouse.move(px, py);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

// Usage: long-hold hamburger on Values row (unscrolled state)
await longHoldBitmap(page, 370, 395); // approx hamburger x=370, Values y=395
// → popup appears with source type options, including "Analogs"
// tap "Analogs" → Values field becomes an analog selector
// tap the matching analog (Rud / Ele / Thr / Ail)
```

**Hamburger x-coord**: the ≡ icon is at the left edge of the Values row field cell.
Approximate: x≈370, y≈395 (unscrolled). **Verify with screenshot in session-2.**

**ETX srcRaw → Ethos analog name mapping**: unknown — discover from the analog list in session-2.
Expected: Rud → Rudder stick, Ele → Elevator stick, Thr → Throttle stick, Ail → Aileron stick.

## Adding Conditional Value Lines (for multi-rate)

After the base Value is set:
```typescript
await touchBitmap(page, 600, 440); // "+ Add a new value" (touch, not tap)
await page.waitForTimeout(700);
// → new Value row appears at bottom of editor
// Set condition (switch/FM/logical switch) via condition picker
// Set value via hamburger on the new row's value field (same analog? different rate?)
```

Condition picker coords: **unknown — discover in session-2.**
ETX `swtch` values (e.g. "SA0", "SA1") map to Ethos switch positions.
ETX `flightModes` bitmask maps to specific flight mode conditions.

## Setting Comment (= ETX name)

1. Editor in unscrolled state
2. `tapBitmap(page, 600, 267)` → keyboard opens
3. Keyboard starts in **ALL-CAPS** and stays there
4. Type first character (auto-uppercase), then `touchBitmap(40, 395)` → Shift to lowercase
5. Type remaining characters, then `touchBitmap(700, 450)` → ENTER
6. `tapBitmap(page, 400, 50)` → commit focus before goBack

**All key presses: touchBitmap** (tapBitmap registers wrong keys)

```
Row 1 y=315: Q(40) W(120) E(200) R(280) T(360) Y(440) U(520) I(600) O(680) P(760)
Row 2 y=340: A(40) S(120) D(200) F(280) G(360) H(440) J(520) K(600) L(680)
Row 3 y=395: Shift(40) Z(120) X(200) C(280) V(360) B(440) N(520) M(600) Bksp(680)
ENTER: (700, 450)
```

## Returning to List

```typescript
await tapBitmap(page, 400, 50); // deselect focused row (avoids "stop using this rate?" dialog)
await goBack(page);
```

## Known Issues / Unknowns (resolve in session-2)

- Hamburger popup options after long-hold: coords unknown — take screenshot immediately after opening
- "Analogs" option coords in popup: unknown
- Analog list after selecting "Analogs": item names and coords unknown
- ETX srcRaw → Ethos analog display name mapping: unknown
- Conditional Value line: how to set its value (hamburger again? fixed %?): unknown
- Condition picker for switch/FM/logical switch: coords unknown
- `weight` field usage when Value = analog: may be a multiplier somewhere, or handled by Mix
- Only `navigateCreateModelWizard` (build from scratch) works — upload lands on wrong model slot
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
  `/home/pete/Source/ethos/migrator/browser/tests/primitives/var-0-session-5.spec.ts`

Run it with:
```bash
cd /home/pete/Source/ethos/migrator/browser
npx playwright test tests/primitives/var-0-session-5.spec.ts --reporter=list --project=chromium
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
2. **Write** the Playwright spec at `/home/pete/Source/ethos/migrator/browser/tests/primitives/var-0-session-5.spec.ts`
   - Boot the emulator (`bootApp`)
   - Upload accumulated.bin if it exists, or run wizard if not
   - Navigate to the right screen for this primitive type
   - Enter all field values from the ETX data
   - Take a screenshot to verify each field
   - Download the model .bin and write it to `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin`
3. **Run** the spec
4. **Read** screenshots from test-results — confirm fields are correct
5. **Update** `/home/pete/Source/ethos/migrator/skills/primitives/var.md` with confirmed steps or failure notes
6. **Write** `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/var-0/session-5/result.txt`:
   - `SUCCESS` — primitive entered and screenshot confirms it
   - `LEARN: <what to change next session>` — something failed

---

## Output Files (mandatory before ending)

| File | Content |
|------|---------|
| `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/var-0/session-5/result.txt` | SUCCESS or LEARN: notes |
| `/home/pete/Source/ethos/migrator/skills/primitives/var.md` | Updated mapping rules for type 'var' |
| `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin` | Updated model .bin (only on SUCCESS) |
