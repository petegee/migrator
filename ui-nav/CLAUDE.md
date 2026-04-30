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
- **Context menu items** (Edit/Add/Delete popup rows): UNRESOLVED — see below

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
| Keyboard ENTER | (700, 415) | tap | ✓ (assumed) |
| Keyboard Row 1 (QWERTYUIOP) y | 262 | - | confirmed from probe screenshots |
| Keyboard Row 2 (ASDFGHJKL) y | 305 | - | confirmed from probe screenshots |
| Keyboard Row 3 (ZXCVBNM) y | 340 | - | confirmed from probe screenshots |

### Unresolved issues (probes needed)

1. **Keyboard key input**: `tapBitmap` typed wrong character — need to confirm whether
   `touchBitmap` correctly registers key presses. Next probe: `keyboard-touch-vs-tap`.

2. **FM1 context menu "Edit"**: 4-tap sequence opens the context popup (confirmed ✓),
   but tapping "Edit" at y≈132 either dismisses the popup or does nothing. Edit row
   y-coord may be wrong, or it may require `touchBitmap`. Next probe: `fm1-ctx-edit`.

3. **Exact key x-positions on keyboard**: The x-positions in the spec comments are
   estimates. Each key may need ±20px adjustment. Next probe: `keyboard-key-positions`.

---

## Skills file location

`/home/pete/Source/ethos/migrator/skills/ethos-ui-navigation.md`

After each successful probe, append to the "Confirmed Coordinates" section near the
top of the relevant screen block. Keep the format consistent. Once an Unresolved issues is 
resolved it can be removed the list.
