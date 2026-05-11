# Primitive: curve

## ETX → Ethos Field Mapping

| ETX field | Ethos field | Notes |
|-----------|-------------|-------|
| `name` | Name | 3-char, keyboard opens via tapBitmap on field (no pencil icon) |
| `type` | Type | 0=Custom; picker at y=140 |
| `points` | Points | ETX `points` = additional midpoints beyond 5-point default; `points=4` → 9 total |
| `smooth` | Smooth | Toggle at y=300; default OFF; one tap → ON |
| `point_values` | Y values in Points table | Array of Y% at equidistant X positions |

## ETX Points Count Mapping

ETX `points` field = number of additional midpoints (beyond 5-point default):
- `points: 0` → 5 total (default, no additional)
- `points: 4` → 9 total (Ethos "9 points" in picker)

X positions for 9-point curve: -100%, -75%, -50%, -25%, 0%, 25%, 50%, 75%, 100%

## Confirmed Navigation (bitmap 800×480)

### Navigate to Curves
1. `tapBitmap(page, 194, 459)` — Model Setup nav
2. `swipeCanvas(page, 'left')` — page 1 → page 2
3. `tapBitmap(page, 100, 330)` — Curves tile (r2c1)
4. `tapBitmap(page, 400, 266)` — Add curve (+) on empty list

### Curve Editor Fields (unscrolled)
| Field | Tap coord | Notes |
|-------|-----------|-------|
| Name | `(600, 80)` | Opens keyboard directly |
| Type | `(600, 140)` | Opens picker |
| Points count | `(600, 220)` | Opens picker |
| Smooth | `(600, 300)` | Toggle |

### Type Picker
- Tap `(600, 140)` to open
- Custom at `tapBitmap(page, 320, 320)` ✓

### Points Count Picker (SCROLL REQUIRED for values > 6)
Picker shows 5 items centered on current value. Default=5, visible: 2,3,4,5,6.
To select "9":
1. `tapBitmap(page, 600, 220)` — open picker
2. `cdpTouchSwipeBitmap(page, 320, 270, 90)` — scroll picker (finger 270→90)
3. `tapBitmap(page, 320, 300)` — tap "9" (at y≈300 after scroll)

### Right Panel Scroll Mechanics
- Right panel reaches MAX SCROLL after ONE 300px swipe: `cdpTouchSwipeBitmap(450, 420, 120)`
- Second identical swipe does nothing — panel already at max
- After expand, content grows → second swipe works again

### Points Section (collapsible "Points >")
After first 300px scroll, "Points >" header sits at y≈453-455.
- **CRITICAL**: expand with `tapBitmap(page, 400, 455)` — use x=400 (label center)
- x=760 triggers Points count picker ▼ — DO NOT use x=760
- After expanding, second 300px scroll reveals rows

## Complete Working Procedure for 9-Point Custom Smooth Curve

```typescript
// 1. First scroll → Points header at max (y≈453)
await cdpTouchSwipeBitmap(page, 450, 420, 120);

// 2. Expand Points at label center (x=400)
await tapBitmap(page, 400, 455);
await page.waitForTimeout(600);

// 3. Second scroll → rows into view
await cdpTouchSwipeBitmap(page, 450, 420, 120);
await page.waitForTimeout(300);

// 4. Enter P1-P5 (separator-aware positions confirmed from sessions 4-7)
//    Separators at y=282 and y=411 are non-interactive — skip them
//    Y column x=650. Control bar: step-up (395,456), dec (475,456), inc (613,456)
//    Step-up changes increment 0.1% → 1.0% (tap once before each batch)

await adjustY(196, 100, 'dec');  // P1 X=-100% → -100%
await adjustY(239,  76, 'dec');  // P2 X=-75%  → -76%
// SKIP y=282 (separator — opens nothing)
await adjustY(325,  52, 'dec');  // P3 X=-50%  → -52%
await adjustY(368,  27, 'dec');  // P4 X=-25%  → -27%
// SKIP y=411 (separator — opens nothing)
await adjustY(454,   3, 'dec');  // P5 X=0%    → -3%

// 5. Tiny scroll (50px finger) to shift content for P6
await cdpTouchSwipeBitmap(page, 450, 430, 380);
await page.waitForTimeout(300);

// 6. Main 3rd scroll (150px finger)
await cdpTouchSwipeBitmap(page, 450, 300, 150);
await page.waitForTimeout(300);

// 7. Enter P6-P9 (confirmed positions after steps 5+6 from session-7 snaps)
await adjustY(269,  19, 'inc');  // P6 X=+25%  → +19%
await adjustY(312,  44, 'inc');  // P7 X=+50%  → +44%
// SKIP y=355 (separator area)
await adjustY(398,  68, 'inc');  // P8 X=+75%  → +68%
await adjustY(441,  86, 'inc');  // P9 X=+100% → +86%
```

## Points Table Row Positions (confirmed from sessions 4–7)

### After expand + 2nd scroll (before tiny/3rd scroll):
| Y position | Content |
|-----------|---------|
| y=196 | P1 (X=-100%) — data row |
| y=239 | P2 (X=-75%)  — data row |
| y=282 | SEPARATOR — non-interactive |
| y=325 | P3 (X=-50%)  — data row |
| y=368 | P4 (X=-25%)  — data row |
| y=411 | SEPARATOR — non-interactive |
| y=454 | P5 (X=0%)    — data row |
| y=497 | off-screen (P6 area) |

Row spacing: 43px (data rows and separators both 43px in touch-coordinate space).
Separators at y=282 and y=411 confirmed non-interactive (no control bar on tap).

### After tiny scroll (50px finger, y=430→380) + main 3rd scroll (150px finger, y=300→150):
| Y position | Content | Confirmation |
|-----------|---------|-------------|
| y=269 | P6 (X=+25%) — opens control bar | Session-7 snap 19 |
| y=312 | P7 (X=+50%) — opens control bar | Session-7 snap 21 |
| y=355 | separator area — skip | |
| y=398 | P8 (X=+75%) — opens control bar | Session-7 snap 23 |
| y=441 | P9 (X=+100%) — opens control bar | Session-7 snap 25 |

## Control Bar Coordinates (confirmed)
| Control | Bitmap position |
|---------|----------------|
| Step-up (▷) | `(395, 456)` — changes 0.1% → 1.0% increment |
| Decrement (−) | `(475, 456)` |
| Increment (+) | `(613, 456)` |
| Close bar | `tapBitmap(page, 400, 50)` — tap header area |

## Default Values
- All Y values default to **0.0%** in a new Custom curve (flat line, NOT linear).
- All tap counts are calculated as delta from 0.0% at 1.0% step.
- Smooth toggle defaults to OFF; one tap at `(600, 300)` → ON.

## adjustY Helper Pattern
```typescript
const adjustY = async (rowY, taps, dir, label) => {
  await tapBitmap(page, 650, rowY);
  await page.waitForTimeout(400);
  await snap(`${label}-bar-open`);
  await tapBitmap(page, 395, 456);  // step-up: 0.1% → 1.0%
  await page.waitForTimeout(200);
  const btnX = dir === 'dec' ? 475 : 613;
  for (let i = 0; i < taps; i++) {
    await tapBitmap(page, btnX, 456);
    await page.waitForTimeout(80);
  }
  await snap(`${label}-done`);
  await tapBitmap(page, 400, 50);  // close bar
  await page.waitForTimeout(200);
};
```

## Session History

### Session 1 — LEARN
- Points count picker: boundary issues; x=200 scrolled wrong panel
- Default Y=0.0% discovered; Smooth accidentally toggled twice

### Session 2 — LEARN
- Tap at x=760 re-opened Points count picker; dismissal hit Smooth toggle

### Session 3 — LEARN
- Two 300px scrolls = same as one (max scroll after first); second scroll does nothing before expand

### Session 4 — LEARN
- Expand at (400,455) confirmed working. KEY DISCOVERY: separator rows at y=282 and y=411.
- P1=-100% ✓, P2=-76% ✓. Row mapping shifted for P3+ due to separator confusion.

### Session 5 — LEARN
- Separator-aware P1-P5 all correct ✓. After 3rd scroll, P6 position was off (scroll ratio ~1.57 misapplied).

### Session 6 — LEARN
- Tiny scroll + main 3rd scroll gave correct SELECT positions: P6=269, P7=312, P8=398, P9=441.
- Bug: each adjustY call used the NEXT row's tap count (off-by-one in value assignment).

### Session 7 — SUCCESS ✓
- All 9 points entered correctly. accumulated.bin updated (687 bytes).
