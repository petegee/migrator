# UI Navigation Probe Loop

## Goal

Map every Ethos WASM UI action to confirmed bitmap coordinates and interaction types
(tap vs touch), updating `../skills/ethos-ui-navigation.md` as the single source of truth.

**One session = one probe = one UI action.** Keep scope tight.

---

## What "confirmed" means

A coordinate is confirmed when a probe test shows the expected screen change
(new screen opened, keyboard appeared, field edited, etc.) in the attached screenshot.

---

## Playwright infrastructure

All tests run from `../browser/`. Key files:

- `../browser/playwright.config.ts` — config (`hasTouch: true` is set)
- `../browser/tests/helpers/navigate.ts` — `tapBitmap`, `touchBitmap`, `swipeCanvas`, nav helpers
- `../browser/tests/helpers/boot.ts` — `bootApp`, `navigateCreateModelWizard`
- `../browser/tests/helpers/diff.ts` — `downloadModelBin`, `saveDiff`
- `../browser/tests/ui-nav/` — probe specs live here (one file per action)

Probe output (screenshots) lands in `../browser/test-results/`.

---

## Running a probe

```bash
cd /home/pete/Source/ethos/migrator/ui-nav
./probe.sh <name>
```

The script runs the matching spec and copies screenshots to `results/<name>/`.

To write a new probe from scratch:

```bash
./probe.sh new <name> "<description>"   # creates the spec, then runs it
```

---

## Session workflow (one loop iteration)

1. **Read the skills file** — `../skills/ethos-ui-navigation.md` — identify what is
   missing or unconfirmed in the "Confirmed Coordinates" section.

2. **Pick the next unprobed action** — choose something concrete, e.g.:
   - "Type a character on the FM name keyboard"
   - "Open FM1 editor via + button"
   - "Navigate to Mixes screen"

3. **Write a probe spec** in `../browser/tests/ui-nav/<name>.spec.ts`:
   - Boot app, create model, navigate to the target screen
   - Attempt the action (use coordinates from skills file if known, else use best guess
     from the UI layout — e.g. keyboard row/column logic)
   - Attach a screenshot before and after the action as test attachments
   - Do NOT try to assert anything — just capture evidence

4. **Run the probe**: `./probe.sh <name>`

5. **Read the screenshots** from `results/<name>/` — confirm whether the action worked

6. **Update the skills file** — add a line to the relevant screen's "Confirmed Coordinates"
   block. Format:
   ```
   - `tapBitmap(bx, by)` — <description> ✓ [confirmed YYYY-MM-DD]
   ```
   or for touch-only actions:
   ```
   - `touchBitmap(bx, by)` — <description> ✓ [confirmed YYYY-MM-DD]
   ```
   If the action FAILED (wrong coordinates, wrong interaction type), note it:
   ```
   - `tapBitmap(bx, by)` — <description> ✗ [no response; try touchBitmap or adjust coords]
   ```

7. **Stop.** The next session picks up from the skills file.

---

## Known facts (carry-forward from prior work)

These are already established — do NOT re-probe them:

### Canvas layout
- Bitmap framebuffer: 800×480
- Canvas CSS size: 640×384 at page y≈253.5
- Scale: `page_x = rect.x + bx*(rect.w/800)`, `page_y = rect.y + by*(rect.h/480)`

### Interaction type rules
- **Most navigation** (bottom bar, menu grid, back arrow, lists): `tapBitmap` (mouse.click)
- **Small edit icons** (e.g. FM name pencil icon): `touchBitmap` — mouse events are ignored
- **Keyboard key presses**: `touchBitmap` — `tapBitmap` produces wrong/no key registration
  (observed: `tapBitmap` typed 'F' at offset 0x0185 instead of 'C' from row 3)
- **Context menu items** (Edit/Add/Delete popup rows): `tapBitmap` for FM1 "Edit"; but **Mixes list context menu and placement picker require `touchBitmap`** — `tapBitmap` consistently misses popup items in the Mixes screen even when centred
- **Buttons at canvas bottom edge** (e.g. "+Add a new action"): `page.keyboard.press` fails (canvas has no DOM focus). Use CDP `Input.dispatchKeyEvent` with keyCode 13 after wheel-focusing the item. See Vars action row in skills file.

### Confirmed coordinates

| Action | Coords | Type | Status |
|--------|--------|------|--------|
| Boot language OK | (565, 297) | tap | ✓ |
| Boot storage OK | (639, 292) | tap | ✓ |
| Bottom nav: Model Setup | (194, 459) | tap | ✓ |
| Bottom nav: Home | (54, 459) | tap | ✓ |
| Back arrow | (25, 25) | tap | ✓ |
| Model Setup grid r1c3 (Flight Modes) | (500, 140) | tap | ✓ |
| FM list: "+" header button (add FM1) | (569, 69) | tap | ✓ |
| FM editor: Name pencil icon | (780, 80) OR (750, 83) | **touch** | ✓ |
| Keyboard ENTER | (700, 450) | **touch** | ✓ confirmed (y=415 tap had no effect) |
| Keyboard Row 1 (QWERTYUIOP) y | 315 | **touch** | ✓ confirmed (safe centre) |
| Keyboard Row 2 (ASDFGHJKL) y | 340 | **touch** | ✓ confirmed by D/F |
| Keyboard Row 3 (ZXCVBNM) y | 395 | **touch** | ✓ confirmed (y=385 first hit) |
| Keyboard x-spacing | 80px per key, x=40 for Q/A | **touch** | ✓ confirmed from D(200)/F(280) |
| FM1 editor open (4-tap) | see sequence in skills file | tap | ✓ confirmed 2026-05-01 |
| Curves: Add curve (+ empty screen) | (400, 266) | tap | ✓ confirmed 2026-05-01 |
| Curves: Name field | (600, 80) | tap | keyboard opens (tapBitmap works) ✓ 2026-05-01 |
| Curves: Type field | (600, 140) | tap | Type picker ✓ 2026-05-01 |
| Curves Type picker: Expo | (320, 225) | tap | ✓ 2026-05-01 |
| Curves Type picker: Function | (320, 270) | tap | ✓ 2026-05-01 |
| Curves Type picker: Custom | (320, 320) | tap | ✓ 2026-05-01 |
| Curves Expo: Weight (600,220) Offset (600,300) Expo% (600,340) | x=600, y=220/300/340 | tap | all open control bar ✓ 2026-05-01 |
| Curves Function: Function sub-picker (600,220) Offset (600,300) | x=600 | tap | ✓ 2026-05-01 |
| Curves Custom: Points count (600,220) Smooth (600,300) Easy mode (600,340) Offset (600,420) | x=600 | tap | ✓ 2026-05-01 |
| Vars: Add a new action | wheel×7 (delta=300 each) → CDP Enter (keyCode 13) | special | ✓ confirmed 2026-05-02 |
| Vars action row: value field | (600, ~465) | tap | opens numeric control bar ✓ 2026-05-02 |
| Vars action row: delete button (leftmost icon) | (25, ~465) | tap | opens "remove this action?" confirm dialog ✓ 2026-05-02 |
| Vars action row: condition picker (--- ▼) | (150, ~465) | tap | opens Category picker (System event/Always on/switches) ✓ 2026-05-02 |
| Vars action row: function picker (Add(+) ▼) | (290, ~465) | tap | opens Function picker (Assign/Add/Subtract/Multiply/Divide/…) ✓ 2026-05-02 |
| Vars: Function picker — Assign(=) | (400, ~160) | tap | selects Assign(=), closes picker ✓ 2026-05-02 |
| Vars: list header + button (when vars exist) | (563, 69) | tap | opens new Var editor directly ✓ 2026-05-02 |
| Vars: conditional value condition picker | (200, ~430) | tap | opens Category picker after "+ Add a new value" ✓ 2026-05-02 |
| SF: Add SF (empty screen) | (400, 266) | tap | ✓ 2026-05-02 |
| SF: Action field | (600, 100) | tap | opens action type picker ✓ 2026-05-02 |
| SF Action picker: Reset | y=170 | tap | ✓ 2026-05-01 |
| SF Action picker: Screenshot | y=210 | tap | ✓ 2026-05-01 |
| SF Action picker: Set failsafe | y=250 | tap | ✓ 2026-05-01 |
| SF Action picker: Play audio | y=290 (no scroll) | touch | ✓ 2026-05-02 — Voice+Repeat fields |
| SF Action picker: Haptic | y=210 after 1 swipe | touch | ✓ 2026-05-02 — Pattern+Strength fields |
| SF Action picker: Write logs | y=250 after 1 swipe | touch | ✓ 2026-05-02 — Write interval+Sticks/Pots/Sliders |
| SF Action picker: Go to screen | y=210 after 2 swipes | touch | ✓ 2026-05-02 — Screen picker field |
| SF Action picker: Lock touchscreen | y=250 after 2 swipes | touch | ✓ 2026-05-02 — no params |
| SF Action picker: Load model | y=290 after 2 swipes | touch | ✓ 2026-05-02 — Model+Confirmation fields |
| SF Action picker: Play vario | 2 swipes + wheel(-300) + CDP Enter | special | ✓ 2026-05-02 — Source field |
| SF picker scroll | touchSwipeBitmap(350, 290, 130) | CDP touch | shifts list ~3 items; 2 swipes = bottom of list ✓ 2026-05-02 |
| Mixes: + header button | (563, 69) | tap | opens Mixes library grid ✓ 2026-05-03 |
| Mixes library: Free mix | (100, 101) | tap | opens placement popup ✓ 2026-05-03 |
| Mixes placement: First position | (320, 141) | **touch** | popup items need touchBitmap ✓ 2026-05-03 |
| Mixes placement: Last position | (320, 187) | **touch** | ✓ 2026-05-03 |
| Mixes list row select | (200, 116) | tap | "Free mix" row; 2nd tap opens context menu ✓ 2026-05-03 |
| Mixes context menu: Edit | (350, 140) | **touch** | popup items need touchBitmap ✓ 2026-05-03 |
| Mixes context menu: Add | (350, 187) | **touch** | opens new Free mix editor directly ✓ 2026-05-03 |
| Mixes context menu: Move | (350, 233) | **touch** | opens Mixes library (to replace mix type) ✓ 2026-05-03 |
| Mixes context menu: Clone | (350, 279) | **touch** | duplicates mix in list ✓ 2026-05-03 |
| Mixes context menu: Delete | (350, 340) | **touch** | opens "Are you sure?" confirm dialog ✓ 2026-05-03 (y=325 missed; y=340+ works) |
| Mixes editor: Name | (350, 80) | tap | keyboard opens (no touch needed) ✓ 2026-05-03 |
| Mixes editor: Active condition | (350, 140) | tap | picker: --- / Always on / Switch positions ✓ 2026-05-03 |
| Mixes editor: Source | (350, 200) | tap | compact category picker; 2nd tap = full list ✓ 2026-05-03 |
| Mixes editor: Operation | (350, 260) | tap | picker: Add / Multiply / Replace / Lock ✓ 2026-05-03 |
| Mixes editor: Actions weight row | (350, 390) | tap | tap opens action row editor directly (row spans y≈390–465) ✓ 2026-05-03 |
| Mixes editor: action row context menu | wheel×5 + CDP Enter | special | "Action" popup: Edit/Clone/Add/Delete ✓ 2026-05-03 |
| Mixes editor: action ctx menu Add | (320, 230) | tap | adds new action row ✓ 2026-05-03 |
| Mixes editor: + Add a new action | wheel×6 + CDP Enter | special | focuses button, Enter opens new action editor ✓ 2026-05-03 |

### Known quirks

- **FM0 expanded touch area**: taps at FM1 list row y≈148 are intercepted by FM0 — use the 4-tap workaround (see skills file FM1 editor open sequence).

---

## Skills file location

`/home/pete/Source/ethos/migrator/skills/ethos-ui-navigation.md`

After each successful probe, append to the "Confirmed Coordinates" section near the
top of the relevant screen block. Keep the format consistent. Once an Unresolved issues is 
resolved it can be removed the list.
