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
| Easy mode | `(600, 340)` | Default ON — no tap needed |
| Offset | `(600, 420)` | |

### Type Picker
- Tap `(600, 140)` to open
- Custom at `tapBitmap(page, 320, 320)` ✓

### Points Count Picker (SCROLL REQUIRED for values > 6)
Picker shows 5 items centered on current value. Default=5, visible: 2,3,4,5,6.
To select "9":
1. `tapBitmap(page, 600, 220)` — open picker
2. `cdpTouchSwipeBitmap(page, 320, 270, 90)` — scroll picker DOWN 180px (finger moves up, list scrolls up → higher values appear)
3. `tapBitmap(page, 320, 300)` — tap "9" (now at y≈300 after scroll)

Picker item x≈320 (center of picker overlay). Item spacing ≈43px.

### Right Panel Scroll (to reveal Points table)
Use x=450 (fields panel center), NOT x=200 (graph area):
```
cdpTouchSwipeBitmap(page, 450, 420, 120)  // 300px scroll — reveals Points section
```

### Points Section (collapsible)
After scrolling 300px, "Points >" header appears at y≈197.
- Shows ">" (right chevron) = collapsed
- Tap `(760, 197)` to expand
- After expanding, rows appear below header at ~43px spacing

### Points Table Row Layout (after 300px scroll + expand)
- Y value column: bitmap x≈650
- Row 1 (X=-100%): y≈183
- Row 2 (X=-75%): y≈226
- Row 3 (X=-50%): y≈269
- Row 4 (X=-25%): y≈312
- Row 5 (X=0%): y≈355
- Row 6 (X=25%): y≈398
- Rows 7-9: require second scroll

Row spacing: ≈43px bitmap pixels.

### Entering Y Values
Default Y for ALL points in a new Custom curve: **0.0%** (flat line, NOT linear).
All deltas are calculated from 0.

For each point:
1. `tapBitmap(page, 650, rowY)` — tap Y column
2. `tapBitmap(page, 395, 456)` — control bar > (step up: 0.1% → 1% increments)
3. `tapBitmap(page, 475, 456)` (N times) — decrement OR `tapBitmap(page, 613, 456)` — increment
4. `tapBitmap(page, 400, 50)` — close bar

Control bar coords (confirmed from output-0): step-up `(395,456)`, decrement `(475,456)`, increment `(613,456)`.

## Session-2 Deltas (from 0.0% default)

For curve "flm" (9 points, smooth):
| Point | X | Target Y | Taps | Direction |
|-------|---|----------|------|-----------|
| P1 | -100% | -100% | 100 | decrement |
| P2 | -75% | -76% | 76 | decrement |
| P3 | -50% | -52% | 52 | decrement |
| P4 | -25% | -27% | 27 | decrement |
| P5 | 0% | -3% | 3 | decrement |
| P6 | 25% | +19% | 19 | increment |
| P7 | 50% | +44% | 44 | increment |
| P8 | 75% | +68% | 68 | increment |
| P9 | 100% | +86% | 86 | increment |

## Second Scroll for P7-P9

After entering P1-P6, rows 7-9 are off-screen. Scroll again:
```
cdpTouchSwipeBitmap(page, 450, 400, 185)  // ~215px more scroll
```
After second scroll: P7≈y270, P8≈y313, P9≈y356.

## Session History

### Session 1 — LEARN
- Points count picker: tapBitmap(400,460) missed — outside picker boundary (picker only extends to y≈368)
- Wrong scroll panel: x=200 (graph) only scrolled ~44px; fix = x=450
- Default Y=0.0% (discovered from snap 24 showing all values flat)
- Smooth accidentally toggled twice (ON then OFF) due to coordinate shift after partial scroll
- accumulated.bin NOT updated (git-restored 825-byte file)
