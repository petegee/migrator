# UI Navigation Probe Status

All confirmed coordinates come from investigation specs that produced non-empty binary diffs
(i.e. the navigation + action actually worked end-to-end). Source: `browser/tests/investigate/`.

---

## Confirmed — Navigation

| Action | Bitmap coords | Type | Source |
|--------|--------------|------|--------|
| Boot: language OK | (565, 297) | tap | boot.ts |
| Boot: storage OK | (639, 292) | tap | boot.ts |
| Bottom nav: Model Setup | (194, 459) | tap | navigate.ts |
| Bottom nav: Home | (54, 459) | tap | navigate.ts |
| Back arrow (any screen) | (25, 25) | tap | navigate.ts |
| Model Setup page 1 → page 2 | swipeCanvas left | swipe | navigate.ts |
| Model Setup p1: Edit Model (r1c2) | (300, 140) | tap | navigate.ts |
| Model Setup p1: Flight Modes (r1c3) | (500, 140) | tap | navigate.ts |
| Model Setup p1: Mixes (r1c4) | (700, 140) | tap | navigate.ts |
| Model Setup p1: Outputs (r2c1) | (100, 330) | tap | navigate.ts |
| Model Setup p1: Timers (r2c2) | (300, 330) | tap | navigate.ts |
| Model Setup p1: Trims (r2c3) | (500, 330) | tap | navigate.ts |
| Model Setup p1: RF System (r2c4) | (700, 330) | tap | navigate.ts |
| Model Setup p2: Telemetry (r1c1) | (100, 140) | tap | navigate.ts |
| Model Setup p2: Logic Switches (r1c3) | (500, 140) | tap | navigate.ts |
| Model Setup p2: Special Functions (r1c4) | (700, 140) | tap | navigate.ts |
| Model Setup p2: Curves (r2c1) | (100, 330) | tap | navigate.ts |
| Model Setup p2: Vars (r2c2) | (300, 330) | tap | navigate.ts |

---

## Confirmed — Flight Modes screen

| Action | Bitmap coords | Type | Source |
|--------|--------------|------|--------|
| Add FM (+ header button) | (569, 69) | tap | 11-flight-modes-add.spec.ts |
| FM editor: Name pencil icon | (780, 80) | **touch** | 12-flight-modes-name.spec.ts |
| FM editor: Name pencil icon (alt) | (750, 83) | **touch** | probe-fm-editor.spec.ts |
| Keyboard ENTER | (700, 450) | **touch** | keyboard-touch-vs-tap probe + spec 12 |
| Keyboard Row 1 (QWERTYUIOP) y | ≈262 | — | fmk-03-touch-780-80.png |
| Keyboard Row 2 (ASDFGHJKL) y | ≈305 | — | fmk-03-touch-780-80.png |
| Keyboard Row 3 (ZXCVBNM) y | ≈340 | — | fmk-03-touch-780-80.png |

**Notes:**
- FM0 has an expanded touch area that intercepts taps aimed at FM1's list row (y≈148).
- The Name pencil icon requires `touchBitmap` — mouse events are ignored.
- All keyboard keys require `touchBitmap` — `tapBitmap` registers the wrong key.
- After typing a name and pressing ENTER, tap another FM editor field (e.g. (400, 128))
  to commit focus, then `goBack` twice before downloading — single `goBack` doesn't flush.

---

## Confirmed — Outputs screen

| Action | Bitmap coords | Type | Source |
|--------|--------------|------|--------|
| Open CH1 editor | (200, 112) | tap | 08,09,10-outputs-*.spec.ts |
| Direction toggle (Normal↔Reverse) | (615, 250) | tap | 08-outputs-direction.spec.ts |
| Max field | (700, 380) | tap | 09-outputs-limits.spec.ts |
| Center/Subtrim field | (700, 440) | tap | 10-outputs-subtrim.spec.ts |
| Control bar: step-up ">" | (400, 456) | tap | 09-outputs-limits.spec.ts |
| Control bar: decrement "-" | (480, 456) | tap | 09-outputs-limits.spec.ts |
| Control bar: increment "+" | (630, 456) | tap | 10-outputs-subtrim.spec.ts |

---

## Confirmed — Mixes screen

| Action | Bitmap coords | Type | Source |
|--------|--------------|------|--------|
| Add mix (+ header button) | (563, 69) | tap | 05-mixes-add.spec.ts |
| Select "Free mix" in type picker | (100, 101) | tap | 06-mixes-source.spec.ts |
| Select "Last position" placement | (396, 186) | tap | 06-mixes-source.spec.ts |
| Open mix context menu (name col tap) | (200, 116) | tap | 06-mixes-source.spec.ts |
| Context menu "Edit" | (320, 167) | tap | 06-mixes-source.spec.ts |
| Source picker — open (compact, 1st tap) | (350, 207) | tap | 06-mixes-source.spec.ts |
| Source picker — expand (2nd tap same) | (350, 207) | tap | 06-mixes-source.spec.ts |
| Source picker — "Analogs" category | (280, 207) | tap | 06-mixes-source.spec.ts |
| Source picker — select member (Rudder) | (440, 204) | tap | 06-mixes-source.spec.ts |

---

## Confirmed — Vars screen

| Action | Bitmap coords | Type | Source |
|--------|--------------|------|--------|
| Add var (+ on empty screen) | (400, 266) | tap | 02-vars-add.spec.ts |

---

## Pending probes (unresolved issues)

| Probe spec | What it resolves | Priority |
|-----------|------------------|----------|
| `keyboard-touch-vs-tap` | Whether `touchBitmap` correctly registers key presses; exact key x-positions | HIGH |
| `fm1-ctx-edit` | y-coord and interaction type for "Edit" in FM1 context menu popup | HIGH |
| (future) keyboard-all-keys | Confirm x-position of every key in all 3 rows | MEDIUM |
| (future) fm-editor-switch | FM1 switch selector navigation | LOW |
| (future) vars-name-keyboard | How to type a var name (keyboard layout same as FM name?) | LOW |

## How to run the next probe

```bash
cd /home/pete/Source/ethos/migrator/ui-nav
./probe.sh keyboard-touch-vs-tap
# then read results/keyboard-touch-vs-tap/ screenshots
# update ../skills/ethos-ui-navigation.md with findings
```
