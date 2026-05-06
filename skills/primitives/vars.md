# Vars (expoData → Ethos Var) — Mapping Rules

ETX `expoData` entries map to Ethos **Vars**. The Var holds the **current rate/weight**
for that input channel, and conditional Value lines select which rate is active based on
a switch or flight mode. This emulates ETX dual/triple rates cleanly.

## Conceptual Mapping (corrected 2026-05-06)

Each ETX `expoData` entry with a unique `chn` becomes one Ethos **Var** that represents
the input signal for that channel.

**The Var's Value is set to the matching analog input** (stick/pot), not a fixed percentage.
Long-hold the hamburger (≡) icon on the Values field → select "Analogs" → pick the analog.

| ETX field | Ethos Var field | Notes |
|-----------|----------------|-------|
| `name` | Comment | Name non-interactive in WASM; use Comment |
| `srcRaw` (Rud/Ele/Thr/Ail) | Value → Analog source | Long-hold hamburger → Analogs → select |
| `weight` | TBD (Mix weight?) | Not a fixed % in the Var itself |
| `curve` | TBD | Possibly in Mix |
| `swtch` / `flightModes` | TBD (conditional Value lines?) | For dual-rate setups |

**Prior incorrect mapping**: Earlier sessions set a fixed % as the Values default.
Correct model: Value = analog source (hamburger → Analogs). Multiple rates via conditional Value lines.

### Full multi-rate example

ETX source:
```yaml
expoData[0]: {chn: 0, srcRaw: Rud, weight: 80,  swtch: NONE}  # base rate
expoData[1]: {chn: 0, srcRaw: Rud, weight: 100, swtch: SA0}   # high rate when SA↑
```

→ ONE Ethos Var:
- Name (Comment): "Rudder"
- Value (base): Rud analog (hamburger → Analogs → Rudder stick)
- "+ Add a new value" line: condition=SA↑, value=Rud analog × 100% (or different rate)

For each unique `chn` group: one Var. For each additional `expoData` line in that group:
one conditional Value line (condition from `swtch` / `flightModes`, value = rate variant).

---

## Screen Navigation

Model Setup (airplane icon, 194,459) → swipe left to page 2 → Vars tile (300,330)

Helper: `navigateToVars(page)` in `tests/helpers/navigate.ts`

## Prerequisites

**Flight modes**: If any Var needs a conditional Values line with a flight mode condition,
at least one flight mode must exist in the model before the condition picker will show
flight mode options. Create a throw-away flight mode first if none exist yet.
(Navigation to flight modes TBD — add here once confirmed.)

## Adding a Var

- First var on empty list: `tapBitmap(page, 400, 266)` (large + icon on empty screen)
  → opens Var editor directly ✓ confirmed session-3 2026-05-05
- Subsequent vars: `tapBitmap(page, 563, 69)` (+ button in list header)
- Or: tap existing row to open context menu → Add

## Var Editor — Confirmed Fields (session-3 2026-05-05, updated var-1 session-1)

| Field | Coords | Type | Notes |
|-------|--------|------|-------|
| Value | (600, 70) | read-only | Current runtime value, always 0.0% at edit time |
| Name | ~(780, 110) | **non-interactive in WASM** | Pencil icon visible; tap/touch produces no response. Auto-named "Var1", "Var2", etc. |
| Comment | (600, 267) | **tapBitmap** | Opens keyboard ONLY when editor is in **unscrolled** state. In scrolled state (extra rows added) this coord hits Values control bar instead. |
| Range low | (450, 320) | **touch** | Opens numeric control bar |
| Range high | (640, 320) | **touch** | Opens numeric control bar |
| Values default | **(600, 395) unscrolled** | **tapBitmap** | y≈395 in unscrolled state. After 5 wheel steps (cursor at Values), editor may scroll so Values is at y≈343. After adding Action rows, view scrolls so Values is at y≈267. Opens Values control bar (see below). |
| + Add a new value | (600, 440) | **touch** | Adds conditional value row |

### Values Default — Control Bar (confirmed var-2 session-1 2026-05-06)

`tapBitmap(600, 395)` in **unscrolled** editor opens a numeric control bar at canvas bottom ✓

```
< | 0.1% | > | - | + | ⋮
```

Bitmap coordinates of control bar buttons:
| Button | Bitmap coords | Action |
|--------|--------------|--------|
| `<` | (63, 468) | step size decrease |
| step label | (~200, 468) | read current step size from this label |
| `>` | (338, 468) | step size increase (UNTESTED — ⋮ was tapped first in session-1; test next) |
| `-` | (475, 468) | decrement value |
| `+` | (613, 468) | increment value |
| `⋮` | (750, 468) | opens "Value" context popup (see below) — use **touchBitmap** |

**Initial step size**: 0.1% per `+` tap. Read the step label at (~200, 468) after tapping `>` to determine new step.

**CRITICAL — do NOT tap ⋮ unless you intend to use the popup**: tapping ⋮ dismisses the
control bar and opens a "Value" context menu (see below). Subsequent taps at y≈468 hit
the popup or empty space — they do NOT reach the control bar buttons.

### ⋮ "Value" Popup (confirmed var-2 session-1 2026-05-06)

`touchBitmap(750, 468)` opens a popup with these options:

| Option | Action | Bitmap coords (approx) |
|--------|--------|------------------------|
| Default | Reset to default value | (~394, 150) |
| Min | Set to Range minimum (−100.0%) | (~394, 192) |
| **Max** | **Set to Range maximum (+100.0%)** | **(~394, 225)** |
| Invert | Invert the value | (~394, 268) |
| Enable slider | Enable slider control | (~394, 310) |

**Use Max for weight=100%**: `touchBitmap(750, 468)` → `touchBitmap(394, 225)` sets value to 100.0% instantly.
Popup item coords are approximate — take a screenshot after opening to verify before tapping.
Popup items require **touchBitmap** (context menu items use touch, not tap).

**CRITICAL — wheel events do NOT change values**: After the editor opens, wheel events
navigate between fields (move the cursor). They do NOT change the value of the focused
field. cdpEnterKey after wheel-focusing Values does NOT open the control bar — it
navigates away instead. Always open the control bar via tapBitmap on the field.

### Editor Scroll State

The Var editor has different scroll states affecting field y-coordinates:

| State | Description | Values default y |
|-------|------------|-----------------|
| Unscrolled (fresh) | Editor just opened, no extra rows | y≈395 |
| 5-wheel-scrolled | Cursor at Values after 5 wheel steps | y≈343 (view may scroll) |
| Extra-rows-scrolled | Action/Value rows added, view scrolls down | y≈267 (Comment coord hits Values) |

**Confirm dialog trap**: When a conditional Values row is focused, `goBack` triggers:
"Are you sure you want to stop using this rate?" (Yes/No). Before goBack, tap a neutral
area e.g. `tapBitmap(400, 50)` to deselect all rows.

## Keyboard — Comment Field (confirmed session-3 2026-05-05)

Open: `tapBitmap(page, 600, 267)` → keyboard appears at screen bottom, Comment field highlights orange.

**All key presses use `touchBitmap`** (tapBitmap registers wrong keys).

**CRITICAL: keyboard starts in ALL-CAPS (CapsLock) mode and stays there.**
It does NOT auto-drop to lowercase after the first character.
Without pressing Shift at all: every character is uppercase (e.g. "RUDDER").
Pressing Shift at (40, 395) TOGGLES between uppercase and lowercase mode.

**To type initial-cap + rest-lowercase (e.g. "Rudder"):**
1. Type first character directly → uppercase auto ("R")
2. `touchBitmap(40, 395)` — press Shift to switch to lowercase mode
3. Type remaining characters → lowercase ("udder")
Result: "Rudder" ✓

**Do NOT press Shift before the first character** — that toggles keyboard to lowercase first,
giving all-lowercase (e.g. "rudder" as in session-3).

```
// Keyboard layout (bitmap coords, 80px x-spacing):
// Row 1 y=315: Q(40) W(120) E(200) R(280) T(360) Y(440) U(520) I(600) O(680) P(760)
// Row 2 y=340: A(40) S(120) D(200) F(280) G(360) H(440) J(520) K(600) L(680)
// Row 3 y=395: shift(40) Z(120) X(200) C(280) V(360) B(440) N(520) M(600) bksp(680)
// ENTER: touchBitmap(700, 450)
```

After typing, press ENTER at touchBitmap(700, 450) to close keyboard.
Then tap neutral area e.g. tapBitmap(400, 50) to commit focus before goBack.

## ETX → Ethos Var Field Mapping

| ETX expoData field | Ethos Var field | Notes |
|---|---|---|
| `name` | Comment | Name field non-interactive in WASM; use Comment as the identifier ✓ |
| base line `weight` (swtch: NONE) | Values default | Set via touch at (600, 395); e.g. 80% |
| additional line `weight` | + Add a new value → value | One Value line per additional ETX rate line ✓ |
| additional line `swtch` | Value line condition | Switch position condition picker |
| `flightModes` bit | Value line condition | Select flight mode as the condition instead |
| `srcRaw` | (not in Var) | Source is wired in the Free Mix that references this Var |
| `curve` | (not in Var) | Curves applied in the Free Mix |
| `offset` | (not mapped) | Leave at 0; apply in the Free Mix if needed |
| `mode` (half-range) | (not mapped) | Handle in the Free Mix |

## Vars List Display (confirmed session-3)

List columns: **Name** | **Value**
Right panel (for selected row): shows Comment and Range summary
Example: Var1 | 0.0% → right panel: "Comment: rudder / Range: -100.0% - 100.0%"

## Practical Recipe — Full Dual-Rate Var Entry

**Upload approach warning**: Do NOT call `navigateCreateModelWizard` before uploading
accumulated.bin. The wizard creates a fresh model in slot 1; upload goes to slot 2;
navigation shows slot 1 (fresh, no vars). Instead, either:
- (A) Boot → dismiss wizard with tapBitmap(25,25) → upload → navigate, OR
- (B) Build all vars from scratch on a fresh model each session (more reliable).

```typescript
// Example: ETX Rudder channel, two rates
//   line 0: weight=80, swtch=NONE  (base rate, 80%)
//   line 1: weight=100, swtch=SA0  (high rate when SA up)

// 1. Navigate to Vars
await navigateToVars(page);

// 2. Create var
await tapBitmap(page, 400, 266);   // first var: large + on empty screen
// await tapBitmap(page, 563, 69); // subsequent vars: header + button
await page.waitForTimeout(700);

// 3. Set Values default = base rate weight
//    tapBitmap(600,395) opens control bar in unscrolled state ✓ confirmed var-2 session-1
await tapBitmap(page, 600, 395);
await page.waitForTimeout(500);
// Option A — for weight = 100%: use ⋮ → Max
//   await touchBitmap(page, 750, 468);  // opens "Value" popup
//   await touchBitmap(page, 394, 225);  // tap "Max" to set 100.0% (approx coords)
// Option B — for weight < 100%: use > to increase step, then + to increment
//   await tapBitmap(page, 338, 468);    // tap > once (step becomes 1% or 10% — read label)
//   // tap + at (613, 468) N times; e.g. 80 taps if step=1% gives 80%
// Close bar: await tapBitmap(page, 400, 50);

// 4. Set Comment = ETX name
//    Keyboard stays ALL-CAPS — type first char, then Shift to switch to lowercase
//    tapBitmap(600,267) opens keyboard ONLY in unscrolled editor state
await tapBitmap(page, 600, 267);
await page.waitForTimeout(700);
// type first character (auto-uppercase), then press Shift to go lowercase:
// await touchBitmap(page, 40, 395);  // Shift — switches to lowercase after 1st char
// type remaining characters with touchBitmap — see keyboard layout below
await touchBitmap(page, 700, 450); // ENTER to close keyboard
await page.waitForTimeout(600);
await tapBitmap(page, 400, 50);    // commit focus (tap neutral area before goBack)

// 5. Add a Value line for each additional ETX rate line
//    (repeat for each additional expoData line beyond the base)
await touchBitmap(page, 600, 440); // "+ Add a new value"
await page.waitForTimeout(700);
// The new value row appears at the bottom of the screen (~y=465)
// Set condition: tap condition picker (~150, 465) → Category picker
//   → choose switch position or flight mode
// Set value: tap value field (~600, 465) → numeric control bar → set weight %
// CRITICAL: tap neutral area before goBack to avoid Confirm dialog

// 6. Go back to Vars list
await tapBitmap(page, 400, 50);    // deselect any focused row first
await goBack(page);
```

## Keyboard Layout (Comment field)

```
// All key presses: touchBitmap (tapBitmap registers wrong keys)
// Keyboard stays in ALL-CAPS mode — press Shift after 1st char to switch to lowercase
// Row 1 y=315: Q(40) W(120) E(200) R(280) T(360) Y(440) U(520) I(600) O(680) P(760)
// Row 2 y=340: A(40) S(120) D(200) F(280) G(360) H(440) J(520) K(600) L(680)
// Row 3 y=395: Shift(40) Z(120) X(200) C(280) V(360) B(440) N(520) M(600) Bksp(680)
// ENTER: touchBitmap(700, 450)
// Shift toggles between uppercase/lowercase mode: touchBitmap(40, 395)
// For "Rudder": type R → Shift(40,395) → u d d e r → ENTER
```

## Status

Session-3 (2026-05-05): Comment entry confirmed working. accumulated.bin saved (671 bytes).
var-1 session-1 (2026-05-05): LEARN — Values control bar discovered; upload approach broken.
  - Control bar opens via tapBitmap on Values field; step=0.1%; control bar at y≈468.
  - Wheel events navigate fields, do NOT change values.
  - navigateCreateModelWizard + upload = wrong slot; build from scratch instead.
  - accumulated.bin corrupted (670 bytes); var-1 session-2 never ran.
var-2 session-1 (2026-05-06): LEARN — Values control bar confirmed; ⋮ popup discovered; keyboard stays ALL-CAPS.
  - tapBitmap(600, 395) confirms opening the control bar in unscrolled state ✓
  - ⋮ at (750, 468) opens "Value" popup: Default | Min | Max | Invert | Enable slider
    → Max option sets value to 100.0% (use for Thottl weight=100%) ✓
    → Max approx bitmap coords: (394, 225) — verify with screenshot
  - Keyboard stays ALL-CAPS — type first char, press Shift(40,395) to switch to lowercase
  - 3 vars created (RUDDER/ELEVAT/THOTTL all-caps, Values=0.0%) — not SUCCESS
  - accumulated.bin: 711 bytes (3 vars, correct structure, wrong Values)
  - > step size still untested (⋮ was tapped first; next session must skip ⋮ for Rudder/Elevat)

Key unknowns for var-2 session-2 to resolve:
- Does `>` at (338,468) increase step to 1% or 10%? (Read step label at ~200,468 after tapping)
- Exact bitmap coords of "Max" in ⋮ popup — approx (394, 225), verify with screenshot
