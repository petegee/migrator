# Primitive Migration Session

**Model:** BAMF2 Std
**Container:** /home/pete/Source/ethos/migrator/models/20231128_BAMF2 Std/20231128.etx
**Primitive:** mix-1
**Session:** 1
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
Status: EXISTS (746 bytes) — upload this before editing

If it EXISTS: upload it via the Upload button before making any changes.
If it does NOT exist: call `navigateCreateModelWizard(page)` to start fresh.

After successfully entering the primitive, download the model .bin and write it to
`/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin` using `fs.writeFileSync`.

---

## ETX Primitive Data

```yaml
data:
  carryTrim: 0
  curve:
    type: 0
    value: 0
  delayDown: 0
  delayUp: 0
  destCh: 0
  flightModes: 111101111
  mixWarn: 0
  mltpx: ADD
  name: RSComp
  offset: 0
  speedDown: 0
  speedUp: 0
  srcRaw: ch(8)
  swtch: NONE
  weight: 25
index: 1
total_count: 35
type: mix
```

---

## Current Mapping Rules for type: mix

```
# Mix — Mapping Rules (ETX mixData → Ethos Free mix)

This file contains confirmed rules for creating an Ethos Mix from ETX mixData.

---

## Architecture: Stick → Var → Mix → Channel(s)

For primary control mixes, the Source must be the corresponding **Var** (not the raw analog
stick). Each of the four main analog sticks gets a Var, and each primary mix references its Var:
- Elev mix → Source = "Elevat" Var
- Rudder mix → Source = "Rudder" Var
- Aileron mix → Source = "Aileron" Var (future)
- Throttle mix → Source = "Throttle" Var (future — throttle stick down = brakes on gliders)

Vars are created first (see var.md), then Free mixes reference them via the Source picker.

---

## Conceptual Mapping

One ETX mix entry → one Ethos **Free mix** (if no destCh preset is appropriate).

| ETX mixData field | Ethos Mix field | Status |
|---|---|---|
| `name` | Name | ✓ Confirmed session-1 — tap(490,80) to open keyboard at cursor-end |
| `srcRaw` | Source | ✓ Confirmed session-1 — 7-step flow to set Var as source |
| `mltpx` | Operation | ✓ "Add" is the default (matches `mltpx: ADD`) |
| `swtch` | Active condition | ✓ "Always on" is the default (matches `swtch: NONE`) |
| `weight` | Actions → "Always on Weight 100%" | ✓ 100% is the default |
| `destCh` | Channel | ✗ Free mix has no destCh field — Channel column shows "None" |
| `flightModes` | n/a | ✓ 0 = all modes = default |
| `offset` | n/a | ✓ 0 = default |
| `curve` | n/a | ✓ linear = default |
| `carryTrim` | n/a | ✓ 0 = default |

**destCh mapping is unresolved.** Free mix has no Channel field. The channel routing may be
configurable via the Outputs/Channels screen separately. Preset mix types (Ailerons, Elevators,
Rudders) auto-assign channels — but these are only appropriate when the ETX name matches.

---

## Navigation

Model Setup page 1 → Mixes tile at r1c4 (700, 140).
Helper: `navigateToMixes(page)` in `tests/helpers/navigate.ts`

**From Vars list:** goBack → Model Setup page 2 (has nav bar) → tapBitmap(54,459) → navigateToMixes.

---

## Creating a Mix (Free mix)

```typescript
// Glider template pre-populates Ailerons/Elevators/Rudders mixes.
// Mixes list is NOT empty — must use list header + button.

// First mix after template mixes: use list header +
await tapBitmap(page, 563, 69);     // + in list header → Mixes library grid ✓
await page.waitForTimeout(700);

// Free mix is r1c1 of 4-column library grid
await tapBitmap(page, 100, 101);    // Free mix ✓
await page.waitForTimeout(700);

// Placement popup (always appears since list is non-empty)
// "Last position" is at y=187 with no existing custom mixes.
// With preset mixes already in list: y=187 inserts at first position (before Ailerons).
await touchBitmap(page, 320, 187);  // touchBitmap required ✓
await page.waitForTimeout(700);
// → Free mix editor opens
```

---

## Setting the Name Field

The name value is **right-aligned** in the field area. Tapping at x=350 opens keyboard at cursor
pos 0 (before "F" in "Free mix") — backspaces are no-ops. Tapping at x=490 (past right edge of
right-aligned "Free mix" text) opens keyboard with cursor at the end.

```typescript
// Open keyboard with cursor PAST end of "Free mix" text
await tapBitmap(page, 490, 80);
await page.waitForTimeout(700);

// Delete "Free mix" (8 chars) — cursor is now at end
for (let i = 0; i < 8; i++) {
  await touchBitmap(page, 680, 395); // Backspace
  await page.waitForTimeout(100);
}
await page.waitForTimeout(300);

// Type name — keyboard starts ALL-CAPS; Shift toggles to lowercase.
// Example: "Elev" = E(auto-caps) + Shift + l + e + v + ENTER
await touchBitmap(page, 200, 315); // E (auto-caps)
await page.waitForTimeout(150);
await touchBitmap(page, 40, 395);  // Shift → lowercase
await page.waitForTimeout(150);
await touchBitmap(page, 680, 340); // l
await page.waitForTimeout(150);
await touchBitmap(page, 200, 315); // e
await page.waitForTimeout(150);
await touchBitmap(page, 360, 395); // v
await page.waitForTimeout(200);
await touchBitmap(page, 700, 450); // ENTER
await page.waitForTimeout(600);
await tapBitmap(page, 400, 50);    // commit focus
await page.waitForTimeout(400);
```

**Keyboard layout (all key presses: touchBitmap):**
```
Row 1 y=315: Q(40) W(120) E(200) R(280) T(360) Y(440) U(520) I(600) O(680) P(760)
Row 2 y=340: A(40) S(120) D(200) F(280) G(360) H(440) J(520) K(600) L(680)
Row 3 y=395: Shift(40) Z(120) X(200) C(280) V(360) B(440) N(520) M(600) Bksp(680)
ENTER: (700, 450)
```

**IMPORTANT:**
- x=650+ is in the curve graph (right panel, x≈540–800) — tapping there DISMISSES keyboard
- x=490, y=80 places cursor at end of right-aligned "Free mix" text in the left panel (x≈0–540)

---

## Setting the Source Field (Var — primary control architecture)

**Use this flow for primary mixes.** Source = Var (e.g. "Elevat", "Rudder").

The Source picker compact popup shows only [Special / --- / Analogs]. Vars require scrolling
the full-screen Category list. Use CDP touch events for reliable list scrolling in overlays.

**Screenshot coordinate scale:** Canvas is 800×480 bitmap. Playwright screenshots are 640×385.
Scale: `bitmap_y = display_y × (480/385) = display_y × 1.247`

**Full Category list order** (requires scroll to see Vars):
`--- / Analogs / Switches / Trims / Channels / Vars / Gyro / Trainer / Timers / System value`

```typescript
async function cdpTouchSwipeBitmap(
  page: any, bx: number, byStart: number, byEnd: number, steps = 20,
) {
  const client = await (page.context() as any).newCDPSession(page);
  const rect = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')]
      .find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2'));
    const r = c!.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const cssX = rect.x + bx * (rect.w / 800);
  const cssYStart = rect.y + byStart * (rect.h / 480);
  const cssYEnd = rect.y + byEnd * (rect.h / 480);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: cssX, y: cssYStart, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
    modifiers: 0,
  });
  for (let i = 1; i <= steps; i++) {
    const y = cssYStart + (cssYEnd - cssYStart) * i / steps;
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: cssX, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
      modifiers: 0,
    });
    await page.waitForTimeout(8);
  }
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ x: cssX, y: cssYEnd, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
    modifiers: 0,
  });
  await page.waitForTimeout(700);
}

// Step 1: tap Source field → compact popup [Special / --- / Analogs]
await tapBitmap(page, 350, 200);
await page.waitForTimeout(700);

// Step 2: tap "---" in compact popup → full-screen Category list
// Compact popup positions: Special≈y206, ---≈y254, Analogs≈y302
await tapBitmap(page, 320, 254);
await page.waitForTimeout(700);

// Step 3: CDP touch swipe UP (byStart=290→byEnd=130) = scroll DOWN ~3 items
// Finger UP = content DOWN; reveals Trims/Channels/Vars/Gyro/Trainer
// Vars appears at bitmap y≈261 after swipe
await cdpTouchSwipeBitmap(page, 320, 290, 130);

// Step 4: tap "Vars" in scrolled full-screen list
// After 3-item scroll: Trims≈163, Channels≈212, Vars≈261, Gyro≈310, Trainer≈358
await tapBitmap(page, 320, 261);
await page.waitForTimeout(700);
// → 2-col picker: Category col (Channels/Vars/Gyro) | Member col (Elevat/Rudder/Elevat)

// Step 5: tap Member col row 3 → opens single-column "Member" sub-list
// Row layout in 2-col picker: row1 y≈211, row2 y≈260, row3 y≈309
// Member col x≈510. MUST tap row 3 (y≈309 = Gyro | Elevat) to open sub-list
await tapBitmap(page, 510, 309);
await page.waitForTimeout(700);
// → "Member" sub-list opens: Rudder≈y239, Elevat≈y288

// Step 6: tap target Var in sub-list
// display_y×1.247 = bitmap_y: Rudder at display≈192→bitmap≈239, Elevat at display≈231→bitmap≈288
await tapBitmap(page, 400, 288);   // Elevat
await page.waitForTimeout(700);
// → 2-col picker updates: Elevat highlighted in Member col

// Step 7: commit
await tapBitmap(page, 400, 50);
await page.waitForTimeout(400);
// → Source = "Elevat" ✓
```

**Var sub-list positions (bitmap y after scale 480/385=1.247):**
```
Rudder:  y≈239   (display y≈192)
Elevat:  y≈288   (display y≈231)
```
Member sub-list x≈400.

**Note on preset mixes (Ailerons/Elevators/Rudders from Glider template):** These have NO
Source field — they show Curve/Weight&Rates/Differential instead. Only Free mixes have an
explicit Source field.

---

## Setting the Source Field (Analog — raw stick, if not using Var)

Five-step flow (confirmed session-1 for raw Elevator analog):

```typescript
// Step 1: tap Source → compact Category popup [Special / --- / Analogs]
await tapBitmap(page, 350, 200);
await page.waitForTimeout(700);

// Step 2: tap "Analogs" in compact popup (y≈302)
await tapBitmap(page, 320, 302);
await page.waitForTimeout(700);

// Step 3: tap "Analogs" in full-screen list (y≈212)
await tapBitmap(page, 400, 212);
await page.waitForTimeout(700);

// Step 4: tap "Elevator" row in Member column (510, 296)
// → single-column Member sub-list (Rudder≈y143, Elevator≈y194, Throttle≈y245)
await tapBitmap(page, 510, 296);
await page.waitForTimeout(700);

// Step 5: tap Elevator in single-column sub-list
await tapBitmap(page, 400, 194);
await page.waitForTimeout(500);

// Commit
await tapBitmap(page, 400, 50);
await page.waitForTimeout(400);
```

**ETX srcRaw → raw analog source:**
- I1 = Elevator: steps 4 and 5 above
- Rud = Rudder: after step 3, Rudder is auto-highlighted; commit (no steps 4-5)
- Thr = Throttle: step 4 same, step 5 at y≈245 (unconfirmed)

---

## Default Fields (all match ETX defaults)

- Operation: "Add" ✓ (matches mltpx=ADD)
- Active condition: "Always on" ✓ (matches swtch=NONE)
- Actions → "Always on Weight 100%" ✓ (matches weight=100)

No changes needed for these fields when ETX values are defaults.

---

## Returning to List

```typescript
await tapBitmap(page, 400, 50);    // deselect focused row
await goBack(page);
```

---

## Placement Popup Position with Existing Mixes

With Glider template mixes present (Ailerons/Elevators/Rudders), the placement popup at y=187
inserts the new mix BEFORE Ailerons (= first position). To add at last position with N existing
mixes, the popup y-coordinate shifts down by ~46px per existing mix:
```
Last position with 3 preset mixes: approximately y = 187 + 3×46 = 325 (unconfirmed)
```

For BAMF2 Std migration, insert order within Mixes screen may matter — investigate.

---

## Rebuild Approach (upload slot bug workaround)

Upload of accumulated.bin does not go to the correct model slot when called after
`navigateCreateModelWizard({createModel:false})`. Instead:

1. Call `navigateCreateModelWizard()` (createModel=true) to create fresh Glider
2. Re-add all previous vars (Rudder, Elevat) using confirmed var.md code
3. Add current primitive (mix)
4. Download → write to accumulated.bin

This rebuild approach is used until the upload slot bug is resolved.

---

## Known Issues / Unconfirmed

- **destCh (Channel)**: Free mix has Channel="None". ETX destCh=0=CH1 mapping not captured.
  Possible fix: route Free mix to channel via Model Setup → Outputs/Channels screen.
- **Placement popup with existing mixes**: y=187 places at first position (not last) when
  Glider template mixes are present. Need to find "Last position" y with 3 existing mixes.
- **Non-default Operation**: mltpx=Multiply/Replace/Lock — untested.
- **Non-default weight**: weight≠100% — numeric control bar interaction untested in mix editor.
- **Non-default swtch**: switch condition pickup — untested.
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
  `/home/pete/Source/ethos/migrator/browser/tests/primitives/mix-1-session-1.spec.ts`

Run it with:
```bash
cd /home/pete/Source/ethos/migrator/browser
npx playwright test tests/primitives/mix-1-session-1.spec.ts --reporter=list --project=chromium
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
2. **Write** the Playwright spec at `/home/pete/Source/ethos/migrator/browser/tests/primitives/mix-1-session-1.spec.ts`
   - Boot the emulator (`bootApp`)
   - Upload accumulated.bin if it exists, or run wizard if not
   - Navigate to the right screen for this primitive type
   - Enter all field values from the ETX data
   - Take a screenshot to verify each field
   - Download the model .bin and write it to `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin`
3. **Run** the spec
4. **Read** screenshots from test-results — confirm fields are correct
5. **Update** `/home/pete/Source/ethos/migrator/skills/primitives/mix.md` with confirmed steps or failure notes
6. **Write** `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/mix-1/session-1/result.txt`:
   - `SUCCESS` — primitive entered and screenshot confirms it
   - `LEARN: <what to change next session>` — something failed

---

## Output Files (mandatory before ending)

| File | Content |
|------|---------|
| `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/mix-1/session-1/result.txt` | SUCCESS or LEARN: notes |
| `/home/pete/Source/ethos/migrator/skills/primitives/mix.md` | Updated mapping rules for type 'mix' |
| `/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin` | Updated model .bin (only on SUCCESS) |
