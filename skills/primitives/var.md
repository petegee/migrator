# Var — Mapping Rules (ETX expoData → Ethos Var)

This file contains confirmed rules for creating an Ethos Var from ETX expoData.

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

// Step 6: commit (tap neutral area)
await tapBitmap(page, 400, 50);
await page.waitForTimeout(400);
// → Values = "Rudder ▼" confirmed
```

**ETX srcRaw → Ethos analog name mapping (Analogs category item order):**
- Rud → Rudder (1st item, y≈204 in two-column view right column, auto-highlighted when Analogs selected)
- Ele → Elevator (2nd item)
- Thr → Throttle (unconfirmed position)
- Ail → Aileron (unconfirmed position)

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

## Known Issues / Unconfirmed

- **weight field when using "Use a source"**: The "Use a source" replaces the numeric %;
  whether weight (e.g. 80%) can also be set separately is unconfirmed. May need a multiplier.
- **Upload approach**: Use `navigateCreateModelWizard` (fresh model) for var sessions.
  Upload after wizard goes to a different slot (confirmed broken in var-1 session-1).
- **Elevator/Throttle/Aileron analog positions**: Only Rudder (1st in Analogs list) confirmed.
  Elevator is 2nd item; Throttle/Aileron positions unknown — discover in later sessions.
- **Multi-rate switch picker coords**: The "+ Add a new value" flow and condition picker
  are documented but exact switch picker coordinates are unconfirmed — needs a session with
  a multi-rate input (swtch ≠ NONE) to verify.
