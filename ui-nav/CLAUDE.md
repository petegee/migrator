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
| Vars: ctx menu trigger | (350, 140) | tap | Opens ctx menu when row is in sticky state (0 prior taps needed) ✓ 2026-05-04 |
| Vars ctx menu: Edit | (300, 190) | **touch** | Opens existing var's field editor ("< Var1"), 1 var in list; zone y≈165–210 ✓ 2026-05-05 |
| Vars ctx menu: Add | (300, 230) | **touch** | Creates fresh new var, opens its editor ("< Var2", empty fields); zone y≈215–260 ✓ 2026-05-05 |
| Vars ctx menu: Clone | (300, 285) | **touch** | Copies var (inherits fields incl. Comment), stays on list, no editor opens; zone y≈268–310 ✓ 2026-05-05 |
| Vars ctx menu: Delete | (300, 335) | **touch** | Opens "Are you sure?" dialog; confirm with tapBitmap(500, 290) for "Yes"; zone y≈315–355 ✓ confirmed 2026-05-04 |
| Edit Model: Name | (600, 80) or (600, 120) | tap | keyboard opens directly (tapBitmap, no touch needed) ✓ 2026-05-04 |
| Edit Model: Picture | (600, 160) | tap | dropdown picker ✓ 2026-05-04 |
| Edit Model: Model type | (600, 240) | tap | picker: Airplane/Glider/Heli/Multi/Other ✓ 2026-05-04 |
| Edit Model: Receiver | (600, 280) | tap | picker: Non stabilized receiver/S6R/S8R/Archer X/TD SR12 ✓ 2026-05-04 |
| Edit Model: Ailerons | (600, 360) | tap | picker: No ailerons/1/2/4 channels ✓ 2026-05-04 |
| Edit Model: Tail | (600, 400) | tap | picker: None/Traditional/V-Tail ✓ 2026-05-04 |
| Edit Model: Elevators (after 1 scroll) | (600, 240) | tap | picker: No elevators/1/2/4 channels ✓ 2026-05-04 |
| Edit Model: Rudders (after 1 scroll) | (600, 280) | tap | picker: No rudders/1–4 channels ✓ 2026-05-04 |
| Edit Model: Flaps (after 1 scroll) | (600, 330) | tap | picker: No flaps/1/2/4 channels ✓ 2026-05-04 |
| Edit Model: Engine (after 1 scroll) | (600, 400) | tap | picker: No engine/1–4 channels ✓ 2026-05-04 |
| Edit Model: Analogs filter (after 2 scrolls) | (600, 240) | tap | picker: Global/OFF/ON ✓ 2026-05-04 |
| Edit Model: Function switches (after 2 scrolls) | (600, 270) | tap | picker: 6-Pos with OFF/6-Pos/2×3-Pos/6×2-Pos/Momentary ✓ 2026-05-04 |
| Edit Model: Persistent (after 2 scrolls) | (600, 320) | tap | toggle OFF↔ON ✓ 2026-05-04 |
| Edit Model: S.Port connector (after 2 scrolls) | (600, 400) | tap | toggle OFF↔5V ✓ 2026-05-04 |
| Edit Model: Model runtime Reset (after 2 scrolls) | (650, 440) | tap | confirm dialog "Runtime will be reset" ✓ 2026-05-04 |
| Trims: axis header (expand/collapse) | (400, 80) | tap | accordion — only one axis open at a time; 4 axes: Rudder/Elevator/Throttle/Aileron ✓ 2026-05-05 |
| Trims: Range | (600, 160) | tap | numeric control bar (1% step) ✓ 2026-05-05 |
| Trims: Step | (600, 240) | tap | picker: Disable/Extra fine/Fine/Medium/Coarse ✓ 2026-05-05 |
| Trims: Mode | (600, 280) | tap | picker: Easy mode/Independent per FM/Custom/OFF ✓ 2026-05-05 |
| Trims: Audio | (600, 360) | tap | toggle ON↔OFF ✓ 2026-05-05 |
| Trims: Move trim to subtrim | (400, 400) | tap | opens confirm dialog ✓ 2026-05-05 |
| Trims confirm dialog: No | (559, 289) | tap | dismisses ✓ 2026-05-05 |
| Trims confirm dialog: Yes | (471, 289) | tap | moves trim to subtrim ✓ 2026-05-05 |
| Trims: scroll to next axis | touchSwipeBitmap(400, 380, 80) | CDP touch | each swipe reveals next axis section ✓ 2026-05-05 |
| Timers: Timer1 row (highlight) | (400, 116) | tap | first tap shows read-only side panel (Mode/Start/Alarm/Start condition) ✓ 2026-05-05 |
| Timers: context menu | (400, 116) | tap | second tap opens ctx menu (Reset/Edit/Add/Move/Copy/Clone/Delete) ✓ 2026-05-05 |
| Timers ctx menu: Edit | (320, 190) | **touch** | opens Timer edit screen ✓ 2026-05-05 |
| Timer edit: Name | (600, 160) | tap | keyboard opens (tapBitmap, no touch needed) ✓ 2026-05-05 |
| Timer edit: Mode | (600, 240) | tap | picker: Up / Down ✓ 2026-05-05 |
| Timer edit: Alarm | (600, 280) | tap | time picker ✓ 2026-05-05 |
| Timer edit: Start condition | (600, 360) | tap | Category picker (System event/Always on/Switch) ✓ 2026-05-05 |
| Timer edit: Stop condition | (600, 400) | tap | toggle Default↔Custom ✓ 2026-05-05 |
| Timer edit: % timing source (after 1 scroll) | (600, 160) | tap | Category picker: Special/Analogs ✓ 2026-05-05 |
| Timer edit: Reset (after 1 scroll) | (600, 200) | tap | Category picker: System event/Always on ✓ 2026-05-05 |
| Timer edit: Persistent (after 1 scroll) | (600, 280) | tap | toggle OFF↔ON ✓ 2026-05-05 |
| Outputs ch editor: PWM center | (600, 300) | tap | 100px scroll (byStart=300,byEnd=200); numeric control bar (1us step) ✓ 2026-05-05 |
| Outputs ch editor: Curve | (600, 400) | tap | 100px scroll (byStart=300,byEnd=200); curve type picker ✓ 2026-05-05 |
| Outputs ch editor: Balance curve Add | (730, 350) | tap | 150px scroll (byStart=350,byEnd=200); opens "Balance channels" curve editor ✓ 2026-05-05 |
| Outputs ch editor: Slow up | (600, 320) | tap | 250px scroll (byStart=400,byEnd=150); numeric control bar (0.1s step) ✓ 2026-05-05 |
| Outputs ch editor: Slow down | (600, 400) | tap | 250px scroll; numeric control bar ✓ 2026-05-05 |
| Outputs ch editor: Balance channels btn | (133, 450) | tap | 250px scroll; "Choose channels" multi-select dialog ✓ 2026-05-05 |
| Outputs ch editor: Swap channels btn | (400, 450) | tap | 250px scroll; "Swap channels" dialog ✓ 2026-05-05 |
| Outputs ch editor: Reset settings btn | (666, 450) | tap | 250px scroll; "Confirm: reset to defaults" dialog ✓ 2026-05-05 |

### Known quirks

- **FM0 expanded touch area**: taps at FM1 list row y≈148 are intercepted by FM0 — use the 4-tap workaround (see skills file FM1 editor open sequence).
- **Confirm dialog y-offset**: screenshot height is 640×385 (not 640×384). Dialog buttons appear ~50px lower in bitmap space than visual estimation suggests. Always verify dialog button coords with pixel analysis if taps miss.
- **Outputs channel editor full-scroll dead zone**: after a full scroll (250px), the Curve and Balance curve rows appear at the very top of the list but are **unresponsive to all tap/touch events**. Cause appears to be the fixed subtitle header blocking interaction in the top list area. Use the partial scroll (100px) to reach those fields instead.

---

## Skills file location

`/home/pete/Source/ethos/migrator/skills/ethos-ui-navigation.md`

After each successful probe, append to the "Confirmed Coordinates" section near the
top of the relevant screen block. Keep the format consistent. Once an Unresolved issues is 
resolved it can be removed the list.
