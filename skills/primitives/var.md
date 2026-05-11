# Var — Mapping Rules (ETX expoData → Ethos Var, and ETX "high" mixes → Ethos Var)

This file contains confirmed rules for creating an Ethos Var from ETX expoData entries
**and** from ETX "high" mixes (mixes that output to virtual channels consumed by other mixes).

---

## Conceptual Mapping

One Ethos **Var** per unique `chn` value across all expoData entries.

Multiple ETX expoData lines with the same `chn` represent **rates** — each active under a
different switch position (e.g. low/mid/high rates on a 3-pos switch). Each rate line maps
to an additional value entry in the Ethos Var via "+ Add a new value", with the switch
condition set to match ETX `swtch`.

| ETX expoData field | Ethos Var field | Status |
|---|---|---|
| `name` | Name AND Comment | ✓ Both settable via keyboard (session-5) |
| `srcRaw` | Values → "Use a source" → Analog | ✓ Confirmed session-5 |
| `weight` | Values numeric % | Partially — "Use a source" replaces the % field |
| `swtch` | Value condition (each rate line) | ✓ For multi-rate; NONE = single value row only |
| `curve` | n/a | ✗ No curve field in Var editor |
| `mode` | n/a | ✗ Not settable |

**Multi-rate example** (3-position switch SA: low/mid/high rates):
```
expoData line 1: chn=Rud, swtch=SA0, weight=60   → Value 1 (condition=SA↑, source=Rudder, 60%)
expoData line 2: chn=Rud, swtch=SA1, weight=80   → Value 2 (condition=SA-, source=Rudder, 80%)
expoData line 3: chn=Rud, swtch=SA2, weight=100  → Value 3 (condition=SA↓, source=Rudder, 100%)
```
Use "+ Add a new value" for each line after the first. The first value row is the default
(no condition); additional rows each need their switch condition set.

---

## Navigation

Model Setup (194,459) → swipe left → Vars tile (300,330)
Helper: `navigateToVars(page)` in `tests/helpers/navigate.ts`

---

## Creating a Var

```typescript
// First var on empty list
await tapBitmap(page, 400, 266);    // Large centred + → editor opens ✓

// Subsequent vars: use list-header + button
await tapBitmap(page, 563, 69);     // + in list header → fresh var editor ✓
```

---

## Setting the Name Field

**Name IS interactive in WASM** (nav skills entry "Non-interactive" was wrong).
Set Name BEFORE Comment (same keyboard). Name keyboard does NOT scroll the editor, so Values ≡ stays at y=390.

```typescript
// Pencil icon for Name row at bitmap (738, 139)
await tapBitmap(page, 738, 139);
await page.waitForTimeout(700);
// → Keyboard opens, Name row highlighted orange

// Type "Rudder" (keyboard starts ALL-CAPS, same layout as Comment keyboard)
await touchBitmap(page, 280, 315);  // R (auto-caps)
await page.waitForTimeout(150);
await touchBitmap(page, 40, 395);   // Shift → lowercase
await page.waitForTimeout(150);
await touchBitmap(page, 520, 315);  // u
await page.waitForTimeout(150);
await touchBitmap(page, 200, 340);  // d
await page.waitForTimeout(150);
await touchBitmap(page, 200, 340);  // d
await page.waitForTimeout(150);
await touchBitmap(page, 200, 315);  // e
await page.waitForTimeout(150);
await touchBitmap(page, 280, 315);  // r
await page.waitForTimeout(200);
await touchBitmap(page, 700, 450);  // ENTER
await page.waitForTimeout(600);
await tapBitmap(page, 400, 50);     // commit focus
```

---

## Setting the Analog Source (Values field → "Use a source")

**Set AFTER Name, BEFORE Comment.** Comment keyboard scrolls the editor (Values row moves
from y=390 to y≈290). Name keyboard does NOT scroll, so the order is: Name → Source → Comment.

```typescript
async function longHoldBitmap(page: any, bx: number, by: number, holdMs = 1200) {
  const rect = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')]
      .find(cv => cv.getContext('webgl') || cv.getContext('webgl2'));
    const r = c!.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const px = rect.x + bx * (rect.w / 800);
  const py = rect.y + by * (rect.h / 480);
  await page.mouse.move(px, py);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
  await page.waitForTimeout(700);
}

// Step 1: long-hold Values ≡ — 1200ms REQUIRED (900ms opens control bar, not popup)
await longHoldBitmap(page, 449, 390, 1200);
// → "Values" popup: Maximum | Minimum | Use a source

// Step 2: tap "Use a source"
// Popup item positions (bitmap): Maximum≈y201, Minimum≈y255, Use a source≈y308
await tapBitmap(page, 397, 308);
await page.waitForTimeout(700);
// → Values row changes to "--- ▼" source picker (orange)

// Step 3: touch the "--- ▼" button to open category/member picker
await touchBitmap(page, 510, 395);
await page.waitForTimeout(700);
// → Two-column picker: Category | Member

// Step 4: tap "---" in Category column to expand full Category list
await tapBitmap(page, 320, 207);
await page.waitForTimeout(700);
// → Full "Category" list: --- / Analogs / Switches / Trims / Channels

// Step 5: tap "Analogs" — bitmap y≈204 in the full category list
await tapBitmap(page, 440, 204);
await page.waitForTimeout(700);
// → Two-column reopens: Analogs selected, Rudder pre-highlighted in Member
// → Values row bottom shows "Rudder ▼"

// Step 6 (Rudder only): commit — Rudder is already auto-highlighted in sub-list
await tapBitmap(page, 400, 50);
await page.waitForTimeout(400);
// → Values = "Rudder ▼" confirmed

// Step 6 (Elevator): tap row 3 of two-column picker to open Member sub-list
await tapBitmap(page, 500, 287);    // opens single-column sub-list
await page.waitForTimeout(500);
// Step 7 (Elevator): select Elevator in sub-list
await tapBitmap(page, 400, 194);    // Elevator in sub-list (Rudder≈143, Elevator≈194, Throttle≈245)
await page.waitForTimeout(500);
// Step 8 (Elevator): commit
await tapBitmap(page, 400, 50);
await page.waitForTimeout(400);
// → Values = "Elevator ▼" confirmed
```

**ETX srcRaw → Ethos analog name mapping — TWO-STAGE PICKER (confirmed session-2):**

After tapping "Analogs" in the full Category list, a two-column picker opens.
Tapping the Member column (right side) opens a SINGLE-COLUMN Member sub-list.
A second tap in the sub-list is needed to actually select a non-default member.

**Two-column picker rows** (bitmap coords after Analogs selected):
```
Row 1 (---     | Slider right): y≈207
Row 2 (Analogs | Rudder):       y≈247   ← Rudder auto-highlighted
Row 3 (Switches| Elevator):     y≈287   ← tap here to open Member sub-list
```
Member column x≈500. y=287 is critical — y≥298 dismisses picker with Rudder committed.

**Single-column Member sub-list** (opens after tapping row 3 of two-column picker):
```
Rudder:    y≈143   (auto-highlighted)
Elevator:  y≈194   ← tap here to select Elevator
Throttle:  y≈245
Aileron:   y≈296   (unconfirmed)
Pot1:      y≈347   (unconfirmed)
```
Member sub-list x≈400.

**Per ETX srcRaw:**
- Rud → Rudder: skip step 3 (auto-highlighted); just commit with tapBitmap(400, 50)
- Ele → Elevator: tapBitmap(500, 287) to open sub-list, then tapBitmap(400, 194) to select
- Thr → Throttle: tapBitmap(500, 287) → tapBitmap(400, 245) (unconfirmed)
- Ail → Aileron: unconfirmed position
- Right Slider (SLIDER2): tapBitmap(500, 287) to open sub-list, then 2× CDP touch swipe up (by=290→130) to scroll sub-list, then tapBitmap(400, 347) ✓ confirmed session-1 (hvar-0)

**Sub-list item positions (bitmap, 5 visible, ~51px spacing):**

| Scroll 0 (default) | Scroll 1 | Scroll 2 |
|---|---|---|
| --- (y≈143) | Elevator (y≈143) | Aileron (y≈143) |
| Rudder (y≈194) | Throttle (y≈194) | Pot1 (y≈194) |
| Elevator (y≈245) | Aileron (y≈245) | Pot2 (y≈245) |
| Throttle (y≈296) | Pot1 (y≈296) | Left Slider (y≈296) |
| Aileron (y≈347) | Pot2 (y≈347) | **Right Slider (y≈347)** |

Scroll the sub-list with CDP touch swipe: `cdpTouchSwipeBitmap(page, 400, 290, 130)`.
Each swipe shifts rows by ~51px (1 row). Two swipes to reach Right Slider.

---

## Setting Comment (= ETX name)

**Set AFTER the analog source.** Comment keyboard scrolls the editor (Values row moves to y≈290 after).

```typescript
// Keyboard starts ALL-CAPS. First char auto-uppercase; Shift toggles to lowercase.
await tapBitmap(page, 600, 267);    // opens keyboard
await touchBitmap(page, 280, 315);  // R (auto-caps, Row 1 x=280)
await touchBitmap(page, 40, 395);   // Shift → toggles to lowercase
await touchBitmap(page, 520, 315);  // u
await touchBitmap(page, 200, 340);  // d
await touchBitmap(page, 200, 340);  // d
await touchBitmap(page, 200, 315);  // e
await touchBitmap(page, 280, 315);  // r
await touchBitmap(page, 700, 450);  // ENTER
await tapBitmap(page, 400, 50);     // commit focus
```

**All key presses: touchBitmap** (tapBitmap registers wrong keys)

```
Row 1 y=315: Q(40) W(120) E(200) R(280) T(360) Y(440) U(520) I(600) O(680) P(760)
Row 2 y=340: A(40) S(120) D(200) F(280) G(360) H(440) J(520) K(600) L(680)
Row 3 y=395: Shift(40) Z(120) X(200) C(280) V(360) B(440) N(520) M(600) Bksp(680)
ENTER: (700, 450)
```

---

## Setting Values Numeric % (weight field)

When NOT using "Use a source", the Values default is a fixed percentage:

```typescript
await touchBitmap(page, 600, 395);  // opens numeric control bar (unscrolled)
// Control bar at bottom of canvas (y≈468):
//   < at ~(63,468)   decrease step size
//   step at ~(200,468) shows current step (initial 0.1%)
//   > at ~(338,468)  increase step size (step becomes 1% after 1 tap — unconfirmed)
//   - at ~(475,468)  decrement
//   + at ~(613,468)  increment
//   ⋮ at ~(750,468)  options: Default/Min/Max/Invert/Enable slider
// ⋮ → Max: touchBitmap(394, 225) — sets value to Range max (100%)
```

**Note:** When "Use a source" is selected, the numeric % is replaced by the source selector.
Setting `weight` separately after "Use a source" may require a multiplier field — unconfirmed.

---

## Adding Conditional Value Lines (multi-rate)

For each ETX expoData line beyond the first (same `chn`, different `swtch`):

```typescript
await touchBitmap(page, 600, 440);  // "+ Add a new value" (touch only)
// New row: [🗑] [--- ▼ condition] [0.0% value]
await tapBitmap(page, 200, 430);    // condition picker → Category popup → set switch
// Set value (weight%) for this rate via touchBitmap on the value cell
// Before goBack: tapBitmap(400,50) to deselect — avoids "stop using this rate?" dialog
```

**General rule:** one "+ Add a new value" per ETX expoData line that shares the same `chn`.
- Line with `swtch=NONE` → single row, no condition (the BAMF2 Rudder case)
- Lines with `swtch=SA0/SA1/SA2` → add a row per switch position, set condition on each

---

## Returning to List

```typescript
await tapBitmap(page, 400, 50);    // deselect focused row
await goBack(page);
```

---

## Migrating ETX "High" Mixes to Ethos Vars

When ETX `mixData` entries output to a virtual channel (`destCh >= 8`) that other mixes
consume via `srcRaw: ch(N)`, migrate those mixes as an Ethos Var instead of a Mix.

See `mix.md` "High vs Low Mixes" section for identification rules.

### Simple case: ADD-only producers

If all producers for ch(N) use `mltpx=ADD`, create a Var with:
- Source = the primary physical input (analog stick, switch, MAX, etc.)
- Values / conditions matching the switch conditions of each producer line
- Weight % matching each producer's `weight`
- Actions: none needed

### Complex case: slider controlling a physical range (ADD + MUL pattern)

When the ETX "high" mix combines a constant offset (ADD) with a slider fine-tune (MUL),
replace the whole thing with an Ethos Var that maps the slider directly to the desired
physical output range.

**Slider convention:** In Ethos (and RC transmitters generally), slider physically UP (top)
= **-100%**, slider physically DOWN (bottom) = **+100%**.

**Pattern: slider top = 0, slider bottom = MAX (e.g. 25)**

1. Source = the physical slider (e.g. Right Slider)
2. Keep default source range (-100 to +100)
3. Action **"Add 100"** (Always on):
   - Slider top (−100) → −100 + 100 = **0**
   - Slider bottom (+100) → +100 + 100 = **200**
   - Effective range is now 0→200
4. Action **"Divide by N"** (Always on):
   - N = 200 ÷ desired_max
   - Example: desired_max = 25 → N = 8 → output range = **0 to 25** ✓

**Formula:** `N = 200 ÷ desired_max_output`

**BAMF2 ch(8) Camber Var — plan:**
```
ETX:
  Therma (ADD, SG2): MAX × GV4    → thermal mode camber level
  FineAd (MUL, SLIDER2): scales accumulated ch(8) by slider position

Ethos Var "ThmC" (or "Camber"):
  Source = Right Slider
  Action 1 (Always on): Add 100      → maps slider top→0, bottom→200
  Action 2 (Always on): Divide by N  → N = 200 ÷ GV4_value

  Result: slider top = 0 camber, slider bottom = GV4% camber
  The GV4 thermal rate becomes the N divisor (e.g. GV4=25 → N=8)
```

The thermal switch condition (SG2) from Therma is handled separately — either via a
flight-mode condition on the Var value, or via the source selection.

## Setting a Switch Condition on a Value Row

When a Var value should only be active under a specific switch condition (e.g. SG2):

```typescript
// Add a conditional value row
await touchBitmap(page, 600, 440);  // "+ Add a new value"
await page.waitForTimeout(800);
// New row: [🗑] [--- ▼ condition] [0.0% value]

// Open condition picker on the new row
await tapBitmap(page, 200, 430);    // condition dropdown
await page.waitForTimeout(700);
// → Category picker: System event / --- / Always on / Switch positions

// Scroll to reveal switch positions (switches are below Always on)
await cdpTouchSwipeBitmap(page, 320, 290, 130);
// → Switches appear in list: SA, SB, SC, ...

// Tap switch row, then tap position (e.g. SG ↑/SG- ↓/SG↓)
// Exact coords for specific switch positions need vision verification per switch.
// Dismiss picker with tapBitmap(400, 50) if wrong switch selected.
```

**Confirmed:** The condition picker scrolls to reveal switch positions. Switch selection
is hierarchical (tap switch → tap position). ✓ session hvar-0-1

---

## Adding Actions to a Var (Add / Divide / etc.)

**Confirmed flow for adding actions** (session hvar-0-1):

### 1. Scroll Var editor to reveal Actions section

```typescript
// CDP touch swipe to scroll editor content up (reveals Actions below Values)
await cdpTouchSwipeBitmap(page, 400, 440, 150);
await page.waitForTimeout(700);
```

### 2. Focus and activate "+ Add a new action"

The button renders at canvas bottom edge (y≈452–479). Neither tapBitmap nor touchBitmap
work. Use wheel navigation + CDP Enter (same as documented in ethos-ui-navigation.md):

```typescript
// 7 wheels to focus the button (confirmed)
const centre = await bitmapToPage(page, 400, 300);
const client = await page.context().newCDPSession(page);
for (let i = 0; i < 7; i++) {
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel', x: centre.x, y: centre.y,
    deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse',
  });
  await page.waitForTimeout(150);
}
await page.waitForTimeout(400);
// Button is now orange-highlighted

// Activate via CDP Enter
await cdpEnterKey(page);
```

### 3. New action row appears

```
[🗑] [--- ▼ condition] [Add(+) ▼ function] [■■■] [0.0]
```

- 🗑 delete: tapBitmap opens confirm dialog
- `--- ▼` condition: tapBitmap opens Category picker
- `Add(+) ▼` function: tapBitmap opens Function picker
- `■■■` range bar: inert display
- `0.0` value: touchBitmap opens numeric control bar

### 4. Select action type (Function picker)

```typescript
await tapBitmap(page, 290, 465);  // function picker on action row
// → 9 items: Assign(=) Add(+) Subtract(-) Multiply(*) Divide(/)
//            Percent Min Max Repurpose
// Add is default (slot 2, y≈180). Divide needs 1 scroll.

// Scroll to reveal Divide:
await cdpTouchSwipeBitmap(page, 320, 280, 140);
await tapBitmap(page, 400, 180);   // Divide (slot 2 after 1 scroll)
```

### 5. Set action value (numeric control bar)

```typescript
await touchBitmap(page, 600, 465);  // value field on action row
// → Control bar at bottom (y≈468):
//   < step down (~63), step label (~200), > step up (~338)
//   - decrement (~475), + increment (~613), ⋮ options (~750)

// Increment to desired value:
for (let i = 0; i < N; i++) {
  await touchBitmap(page, 613, 468);  // +
  await page.waitForTimeout(100);
}
// For large values, tap > first to increase step size (e.g. 1% → 10%)
await touchBitmap(page, 338, 468);    // > step up (1% → 10%)
```

### 6. Add a second action

Repeat steps 2–5. The second action row appears below the first.
Actions execute in order (top to bottom).

**Confirmed working:** Add +100 and Divide /25 in the same Var. ✓ session hvar-0-1

### Full example: ThmC Var with Add + Divide

```typescript
// After setting Name and Source (Right Slider):
// Action 1: Divide /25
// → 7 wheels + Enter → tap function → scroll picker → tap Divide
// → touch value → 25 taps of + → commit

// Action 2: Add +100
// → 7 wheels + Enter → tap function → tap Add (default, slot 2)
// → touch value → tap > for 10% step → 10 taps of + → commit
```

---

## Known Issues / Unconfirmed

- **weight field when using "Use a source"**: The "Use a source" replaces the numeric %;
  whether weight (e.g. 80%) can also be set separately is unconfirmed. May need a multiplier.
- **Upload approach**: Use `navigateCreateModelWizard` (fresh model) for var sessions.
  Upload after wizard goes to a different slot (confirmed broken in var-1 session-1).
- **Throttle/Aileron analog positions**: Throttle≈y245 (unconfirmed); Aileron unconfirmed.
  Pot1≈y296, Pot2≈y347, Left Slider≈y398 (estimated from 51px row spacing).
- **Exact switch position coordinates**: The hierarchical switch picker (tap switch → tap position)
  needs exact coordinates for specific switches/positions. Vision verification required per switch.
- **Var range setting**: How to change the default -100/+100 range to 0/200 — unconfirmed.
