# Primitive Type: output

Maps to Ethos **Outputs** screen (Model Setup → Outputs tile).

## ETX Field → Ethos UI Mapping

| ETX field     | ETX encoding                          | Ethos field      | Ethos value              |
|---------------|---------------------------------------|------------------|--------------------------|
| `name`        | string                                | Channel name     | type directly            |
| `min`         | positive int N → -(100 - N/10)%      | Min              | e.g. 350 → -65.0%, 0 → -100% (default) |
| `max`         | negative int N → +(100 - |N|/10)%    | Max              | e.g. 0 → +100% (default), -350 → +65.0% |
| `offset`      | int (tenths of %)                     | Center/Subtrim   | 0 → 0.0% (default)       |
| `ppmCenter`   | int μs offset from 1500              | PWM center       | e.g. -24 → 1476us        |
| `revert`      | 0=Normal, 1=Reversed                  | Direction        | default=Normal            |
| `symetrical`  | 0=independent min/max, 1=symmetric   | (visual only)    | no separate field         |
| `curve`       | 0=none                                | Curve            | ---  (default)            |

## Navigation

1. Model Setup (tap bottom nav at x=194, y=459)
2. Outputs tile (tap approx x=100, y=330 from Model Setup page 1)
3. Tap channel row to open channel editor (CH1 = left col, row 1 at x=200, y=112)

## Outputs Editor Field Positions (firmware 1.6.6, DEFAULT/unscrolled state)

Canvas bitmap space: 800×480. CSS canvas: 640×385. Scale factor: bm_y × (385/480) = display_y.

| Field          | Bitmap y (center) | Notes                                     |
|----------------|------------------|-------------------------------------------|
| Name (value)   | 196              | Tap at bx=738 to open keyboard            |
| Direction      | 260              |                                           |
| Min            | 340              |                                           |
| Max            | 386              |                                           |
| Center/Subtrim | 449              |                                           |
| PWM center     | off-screen       | Scroll first (see below)                  |
| Curve          | off-screen       | Below PWM center                          |

**IMPORTANT**: Bitmap y=150 (nav guide value) hits the stats area ("Channel 0.0% / Mixes 0.0%"),
NOT the Name field. Use y=196 for the Name value area.

## Control Bar (bitmap y≈456, firmware 1.6.6)

| Button  | Bitmap x range | Notes                                      |
|---------|----------------|--------------------------------------------|
| `<`     | ~20-55         | Previous step size                         |
| step    | ~56-185        | Step size label                            |
| `>`     | ~185-420       | **Next step size — icon at bx≈390**        |
| `-`     | ~420-575       | Decrement value                            |
| `+`     | ~575-735       | Increment value                            |
| `⋮`     | ~735-800       | Context menu                               |

**IMPORTANT**: Nav guide says `>` step-up is at bx=437, but that lands in the `-` section (420-575).
Use bx=395 for the `>` step-up button.

## Scrolling to PWM Center

After entering Min (and any other fields above PWM center), scroll down using:
```typescript
await cdpTouchSwipeBitmap(page, 400, 300, 200);  // 100bx swipe up
```
This scrolls content ~99 bitmap pixels. In the resulting ONE-SCROLL state:

| Field          | DEFAULT bitmap y | ONE-SCROLL bitmap y |
|----------------|-----------------|---------------------|
| Max            | 386             | 287                 |
| Center/Subtrim | 449             | 350                 |
| PWM center     | 512 (off-screen)| 413                 |

Tap PWM center at `tapBitmap(page, 600, 413)` in ONE-SCROLL state.
Step is 1μs by default; decrement 24× to reach 1476us from 1500us default.

## Workflow (confirmed session-2; session-1 had wrong Min encoding)

```typescript
// Phase 1: Navigate to channel editor
await tapBitmap(page, 194, 459);  // Model Setup
await tapBitmap(page, 100, 330);  // Outputs tile
await tapBitmap(page, 200, 112);  // CH1 row

// Phase 2: Name
await tapBitmap(page, 738, 196);  // Open Name keyboard
// clear existing (10× Bksp), type new name, tap top to close

// Phase 3: Min (ETX min=350 → -65.0%)
await tapBitmap(page, 600, 340);  // Open Min
await tapBitmap(page, 395, 456);  // > step-up: 0.1% → 1%
// + 35× to go from -100% to -65%

// Phase 4: PWM center (ETX ppmCenter=-24 → 1476us)
await cdpTouchSwipeBitmap(page, 400, 300, 200);  // scroll
await tapBitmap(page, 600, 413);  // PWM center (ONE-SCROLL state)
// − 24× at 1μs/step

// Phase 5: Exit and download
await goBack(page);  // exit channel editor
```

## Notes

- Name field: must tap the value area (right side, bx=738, by=196), not the label
- `min: 0` in ETX = -100% (default full range — no change needed)
- `min: N` (non-zero) = -(100 - N/10)% — e.g. 350 → -65%, 500 → -50%
- `max: 0` in ETX = default +100% (no change needed)
- `offset: 0` → Center/Subtrim = 0.0% (default, no change needed)
- `curve: 0` → Curve = --- (default, no change needed)
- Scroll is ~1:1 bitmap pixels (100px swipe → ~99px content shift)
