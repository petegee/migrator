# Mix — Mapping Rules (ETX mixData → Ethos Free mix)

This file contains confirmed rules for creating an Ethos Mix from ETX mixData.

---

## Architecture: Stick → Var → Mix → Channel(s)

For primary control mixes, the Source must be the corresponding **Var** (not the raw analog
stick). Each of the four main analog sticks gets a Var, and each primary mix references its Var:
- Elev mix → Source = "Elevat" Var
- Rudder mix → Source = "Rudder" Var
- Aileron mix → Source = "Aileron" Var (future)
- Throttle mix → Source = "Throttle" Var (future — throttle stick down = brakes on gliders)

Vars are created first (see var.md), then Free mixes reference them via the Source picker.

---

## "High" vs "Low" Mixes — ETX Pattern and Ethos Migration Rule

In ETX/OTX models, mixes come in two roles:

**"High" mixes** compute intermediate values and output to a virtual channel (e.g. CH8).
Other mixes reference them via `srcRaw: ch(N)`. They are identifiable because:
- Other mix entries in the ETX file have `srcRaw: ch(N)` pointing to this mix's destCh
- They are NOT the final stage before a physical output

**"Low" mixes** are the final stage — their output (destCh) routes to a servo/ESC output channel.

### Ethos preferred approach: convert "high" mixes to Vars

Instead of replicating the ETX channel-routing pattern (where a "high" mix outputs to
CH8 and other mixes pick it up via srcRaw=ch(8)), create a **Var** in Ethos for each
"high" mix. Low mixes then reference that Var as their source.

Benefits:
- Cleaner conceptual model (Vars are explicitly intermediate; Mixes are final outputs)
- Avoids the need to assign virtual channels in Ethos
- Mirrors the ETX intent more clearly in the UI

### Migration procedure for "high" mixes

When you encounter a mix with `srcRaw: ch(N)`:
1. Look up which ETX mix(es) output to channel N (i.e. have `destCh: N-1` or equivalent)
2. Those are "high" mixes — migrate them as **Vars** (using the Var flow from var.md),
   not as Mixes
3. Name the Var descriptively (e.g. the name field of the high mix if it has one)
4. In the current mix, set Source = that new Var instead of CH(N)

### BAMF2 example: RSComp (mix-1)

- RSComp: `srcRaw=ch(8)`, weight=25%, destCh=0 (→ CH1)
- CH8 is produced by one or more "high" mixes elsewhere in the ETX model
- Correct Ethos migration: create a Var for whatever computes CH8, then set RSComp source = that Var
- Current accumulated.bin uses raw CH8 source (partial migration — will be corrected when
  the CH8-producing mixes are identified and migrated as Vars)

---

## Conceptual Mapping

One ETX mix entry → one Ethos **Free mix** (if no destCh preset is appropriate).

| ETX mixData field | Ethos Mix field | Status |
|---|---|---|
| `name` | Name | ✓ Confirmed session-1 — tap(490,80) to open keyboard at cursor-end |
| `srcRaw` | Source | ✓ Var (7-step) / Analog (5-step) / Channel (7-step, session-7 unconfirmed) |
| `mltpx` | Operation | ✓ "Add" is the default (matches `mltpx: ADD`) |
| `swtch` | Active condition | ✓ "Always on" is the default (matches `swtch: NONE`) |
| `weight` | Actions → "Always on Weight 100%" | △ Non-default requires Action editor (session-7) |
| `destCh` | Channel | ✗ Free mix has no destCh field — Channel column shows "None" |
| `flightModes` | n/a | ✓ 0 = all modes = default |
| `offset` | n/a | ✓ 0 = default |
| `curve` | n/a | ✓ linear = default |
| `carryTrim` | n/a | ✓ 0 = default |

**destCh mapping is unresolved.** Free mix has no Channel field. The channel routing may be
configurable via the Outputs/Channels screen separately. Preset mix types (Ailerons, Elevators,
Rudders) auto-assign channels — but these are only appropriate when the ETX name matches.

---

## Navigation

Model Setup page 1 → Mixes tile at r1c4 (700, 140).
Helper: `navigateToMixes(page)` in `tests/helpers/navigate.ts`

**From Vars list:** goBack → Model Setup page 2 (has nav bar) → tapBitmap(54,459) → navigateToMixes.

---

## Creating a Mix (Free mix)

```typescript
// Glider template pre-populates Ailerons/Elevators/Rudders mixes.
// Mixes list is NOT empty — must use list header + button.

// First mix after template mixes: use list header +
await tapBitmap(page, 563, 69);     // + in list header → Mixes library grid ✓
await page.waitForTimeout(700);

// Free mix is r1c1 of 4-column library grid
await tapBitmap(page, 100, 101);    // Free mix ✓
await page.waitForTimeout(700);

// Placement popup (always appears since list is non-empty)
// "Last position" is at y=187 with no existing custom mixes.
// With preset mixes already in list: y=187 inserts at first position (before Ailerons).
await touchBitmap(page, 320, 187);  // touchBitmap required ✓
await page.waitForTimeout(700);
// → Free mix editor opens
```

---

## Setting the Name Field

The name value is **right-aligned** in the field area. Tapping at x=350 opens keyboard at cursor
pos 0 (before "F" in "Free mix") — backspaces are no-ops. Tapping at x=490 (past right edge of
right-aligned "Free mix" text) opens keyboard with cursor at the end.

```typescript
// Open keyboard with cursor PAST end of "Free mix" text
await tapBitmap(page, 490, 80);
await page.waitForTimeout(700);

// Delete "Free mix" (8 chars) — cursor is now at end
for (let i = 0; i < 8; i++) {
  await touchBitmap(page, 680, 395); // Backspace
  await page.waitForTimeout(100);
}
await page.waitForTimeout(300);

// Type name — keyboard starts ALL-CAPS; Shift toggles to lowercase.
// Example: "Elev" = E(auto-caps) + Shift + l + e + v + ENTER
await touchBitmap(page, 200, 315); // E (auto-caps)
await page.waitForTimeout(150);
await touchBitmap(page, 40, 395);  // Shift → lowercase
await page.waitForTimeout(150);
await touchBitmap(page, 680, 340); // l
await page.waitForTimeout(150);
await touchBitmap(page, 200, 315); // e
await page.waitForTimeout(150);
await touchBitmap(page, 360, 395); // v
await page.waitForTimeout(200);
await touchBitmap(page, 700, 450); // ENTER
await page.waitForTimeout(600);
await tapBitmap(page, 400, 50);    // commit focus
await page.waitForTimeout(400);
```

**Keyboard layout (all key presses: touchBitmap):**
```
Row 1 y=315: Q(40) W(120) E(200) R(280) T(360) Y(440) U(520) I(600) O(680) P(760)
Row 2 y=340: A(40) S(120) D(200) F(280) G(360) H(440) J(520) K(600) L(680)
Row 3 y=395: Shift(40) Z(120) X(200) C(280) V(360) B(440) N(520) M(600) Bksp(680)
ENTER: (700, 450)
```

**IMPORTANT:**
- x=650+ is in the curve graph (right panel, x≈540–800) — tapping there DISMISSES keyboard
- x=490, y=80 places cursor at end of right-aligned "Free mix" text in the left panel (x≈0–540)

---

## Setting the Source Field (Var — primary control architecture)

**Use this flow for primary mixes.** Source = Var (e.g. "Elevat", "Rudder").

The Source picker compact popup shows only [Special / --- / Analogs]. Vars require scrolling
the full-screen Category list. Use CDP touch events for reliable list scrolling in overlays.

**Screenshot coordinate scale:** Canvas is 800×480 bitmap. Playwright screenshots are 640×385.
Scale: `bitmap_y = display_y × (480/385) = display_y × 1.247`

**Full Category list order** (requires scroll to see Vars):
`--- / Analogs / Switches / Trims / Channels / Vars / Gyro / Trainer / Timers / System value`

```typescript
async function cdpTouchSwipeBitmap(
  page: any, bx: number, byStart: number, byEnd: number, steps = 20,
) {
  const client = await (page.context() as any).newCDPSession(page);
  const rect = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')]
      .find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2'));
    const r = c!.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const cssX = rect.x + bx * (rect.w / 800);
  const cssYStart = rect.y + byStart * (rect.h / 480);
  const cssYEnd = rect.y + byEnd * (rect.h / 480);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: cssX, y: cssYStart, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
    modifiers: 0,
  });
  for (let i = 1; i <= steps; i++) {
    const y = cssYStart + (cssYEnd - cssYStart) * i / steps;
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: cssX, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
      modifiers: 0,
    });
    await page.waitForTimeout(8);
  }
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ x: cssX, y: cssYEnd, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
    modifiers: 0,
  });
  await page.waitForTimeout(700);
}

// Step 1: tap Source field → compact popup [Special / --- / Analogs]
await tapBitmap(page, 350, 200);
await page.waitForTimeout(700);

// Step 2: tap "---" in compact popup → full-screen Category list
// Compact popup positions: Special≈y206, ---≈y254, Analogs≈y302
await tapBitmap(page, 320, 254);
await page.waitForTimeout(700);

// Step 3: CDP touch swipe UP (byStart=290→byEnd=130) = scroll DOWN ~3 items
// Finger UP = content DOWN; reveals Trims/Channels/Vars/Gyro/Trainer
// Vars appears at bitmap y≈261 after swipe
await cdpTouchSwipeBitmap(page, 320, 290, 130);

// Step 4: tap "Vars" in scrolled full-screen list
// After 3-item scroll: Trims≈163, Channels≈212, Vars≈261, Gyro≈310, Trainer≈358
await tapBitmap(page, 320, 261);
await page.waitForTimeout(700);
// → 2-col picker: Category col (Channels/Vars/Gyro) | Member col (Elevat/Rudder/Elevat)

// Step 5: tap Member col row 3 → opens single-column "Member" sub-list
// Row layout in 2-col picker: row1 y≈211, row2 y≈260, row3 y≈309
// Member col x≈510. MUST tap row 3 (y≈309 = Gyro | Elevat) to open sub-list
await tapBitmap(page, 510, 309);
await page.waitForTimeout(700);
// → "Member" sub-list opens: Rudder≈y239, Elevat≈y288

// Step 6: tap target Var in sub-list
// display_y×1.247 = bitmap_y: Rudder at display≈192→bitmap≈239, Elevat at display≈231→bitmap≈288
await tapBitmap(page, 400, 288);   // Elevat
await page.waitForTimeout(700);
// → 2-col picker updates: Elevat highlighted in Member col

// Step 7: commit
await tapBitmap(page, 400, 50);
await page.waitForTimeout(400);
// → Source = "Elevat" ✓
```

**Var sub-list positions (bitmap y after scale 480/385=1.247):**
```
Rudder:  y≈239   (display y≈192)
Elevat:  y≈288   (display y≈231)
```
Member sub-list x≈400.

**Note on preset mixes (Ailerons/Elevators/Rudders from Glider template):** These have NO
Source field — they show Curve/Weight&Rates/Differential instead. Only Free mixes have an
explicit Source field.

---

## Setting the Source Field (Analog — raw stick, if not using Var)

Five-step flow (confirmed session-1 for raw Elevator analog):

```typescript
// Step 1: tap Source → compact Category popup [Special / --- / Analogs]
await tapBitmap(page, 350, 200);
await page.waitForTimeout(700);

// Step 2: tap "Analogs" in compact popup (y≈302)
await tapBitmap(page, 320, 302);
await page.waitForTimeout(700);

// Step 3: tap "Analogs" in full-screen list (y≈212)
await tapBitmap(page, 400, 212);
await page.waitForTimeout(700);

// Step 4: tap "Elevator" row in Member column (510, 296)
// → single-column Member sub-list (Rudder≈y143, Elevator≈y194, Throttle≈y245)
await tapBitmap(page, 510, 296);
await page.waitForTimeout(700);

// Step 5: tap Elevator in single-column sub-list
await tapBitmap(page, 400, 194);
await page.waitForTimeout(500);

// Commit
await tapBitmap(page, 400, 50);
await page.waitForTimeout(400);
```

**ETX srcRaw → raw analog source:**
- I1 = Elevator: steps 4 and 5 above
- Rud = Rudder: after step 3, Rudder is auto-highlighted; commit (no steps 4-5)
- Thr = Throttle: step 4 same, step 5 at y≈245 (unconfirmed)

---

## Default Fields (all match ETX defaults)

- Operation: "Add" ✓ (matches mltpx=ADD)
- Active condition: "Always on" ✓ (matches swtch=NONE)
- Actions → "Always on Weight 100%" ✓ (matches weight=100)

No changes needed for these fields when ETX values are defaults.

---

## Returning to List

```typescript
await tapBitmap(page, 400, 50);    // deselect focused row
await goBack(page);
```

---

## Placement Popup Position with Existing Mixes

With Glider template mixes present (Ailerons/Elevators/Rudders), the placement popup at y=187
inserts the new mix BEFORE Ailerons (= first position). To add at last position with N existing
mixes, the popup y-coordinate shifts down by ~46px per existing mix:
```
Last position formula: y = 187 + N×46
  N=3 preset mixes:  y = 325  (mix-0/Elev: first custom, insert here)
  N=4 mixes (3+1):   y = 371  (mix-1/RSComp: ✓ confirmed session-9)
```

For BAMF2 Std migration, insert mixes in ETX order. The formula is confirmed reliable.

---

## Rebuild Approach (upload slot bug workaround)

Upload of accumulated.bin does not go to the correct model slot when called after
`navigateCreateModelWizard({createModel:false})`. Instead:

1. Call `navigateCreateModelWizard()` (createModel=true) to create fresh Glider
2. Re-add all previous vars (Rudder, Elevat) using confirmed var.md code
3. Add current primitive (mix)
4. Download → write to accumulated.bin

This rebuild approach is used until the upload slot bug is resolved.

---

## Setting the Source Field (Channel — srcRaw: ch(N))

For ETX `srcRaw: ch(N)` (Channel source), use the Channels category instead of Vars/Analogs.

**CONFIRMED session-9** for CH8.

```typescript
// Step 1: tap Source field → compact popup [Special / --- / Analogs]
await tapBitmap(page, 350, 200);
await page.waitForTimeout(700);

// Step 2: tap "---" (bitmap y≈254) → full-screen Category list
await tapBitmap(page, 320, 254);
await page.waitForTimeout(700);

// Step 3: ONE CDP scroll to reveal Channels
// Before scroll: Analogs/Switches/Trims visible. After: Trims≈163, Channels≈212, Vars≈261
await cdpTouchSwipeBitmap(page, 320, 290, 130);

// Step 4: tap "Channels" at bitmap y≈212
await tapBitmap(page, 320, 212);
await page.waitForTimeout(700);
// → 2-col picker: Category col | Member col (shows current selection)

// Step 5: tap Member col row 3 (y≈309) to open Channel sub-list
await tapBitmap(page, 510, 309);
await page.waitForTimeout(700);
// → single-column "Member" sub-list, initially showing CH1-CH5

// Step 6: ONE scroll to reveal higher channels
await cdpTouchSwipeBitmap(page, 400, 290, 130);
// → sub-list now shows CH4-CH8 (5 rows)

// Step 7: tap target channel
// Sub-list row heights ≈42px (display). After ONE scroll, visible channels:
//   CH4: bitmap y≈151   CH5: bitmap y≈203   CH6: bitmap y≈256
//   CH7: bitmap y≈308   CH8: bitmap y≈360
await tapBitmap(page, 400, 360);  // CH8 ✓ confirmed session-9
await page.waitForTimeout(700);

// Step 8: commit
await tapBitmap(page, 400, 50);
await page.waitForTimeout(400);
```

**Channel sub-list positions (after ONE scroll, bitmap y):**
```
CH4: y≈151   CH5: y≈203   CH6: y≈256   CH7: y≈308   CH8: y≈360
```
For channels above CH8: use TWO scrolls (adds ~8 channels per scroll).

---

## Setting the Weight Field (non-default weight)

**CONFIRMED session-9:** Use CDP wheel navigation in the Action editor + control bar.

### Step 1: Open the Action editor

Touch the "Always on Weight 100%" text in the mix editor (bitmap x≈480, y≈440):

```typescript
await touchBitmap(page, 480, 440);  // opens Action editor
await page.waitForTimeout(800);
```

### Step 2: Action Editor Layout (confirmed session-9)

| Row | Bitmap y (center) | Content |
|-----|-------------------|---------|
| Active condition | ≈68 | "Always on ▼" |
| Action | ≈133 | "Weight ▼" |
| Weight / Rates | ≈188 | "100%" (editable) |
| + Add a new weight | ≈253 | button |

**Important:** Touching the Weight/Rates value directly does NOT open a control bar.
Use CDP wheel navigation + Enter to activate editing.

### Step 3: Navigate to Weight/Rates and edit

```typescript
// CDP wheel ×3 to focus Weight/Rates row (wheel 1=Active condition, 2=Action, 3=Weight/Rates)
await cdpWheelAt(page, 400, 200, 1, 300);  // wheel 1 → Active condition focused
await cdpWheelAt(page, 400, 200, 1, 300);  // wheel 2 → Action focused
await cdpWheelAt(page, 400, 200, 1, 300);  // wheel 3 → Weight/Rates focused (orange)
await cdpEnterKey(page);                    // → control bar appears at bottom, step=1%
await page.waitForTimeout(500);

// Control bar layout (bitmap y≈468):  < | step | > | - | +
// Step cycles: 1% ↔ 10% (two > presses cancel out)
// Use 1% step (default): N decrements = reduce by N%
// Example: 75 decrements = 100% → 25%
for (let i = 0; i < 75; i++) {
  await touchBitmap(page, 475, 468);  // - button (confirmed x=475)
  await page.waitForTimeout(120);
}
// commit
await tapBitmap(page, 400, 50);
await page.waitForTimeout(400);
```

### Step 4: Return to Mix editor

```typescript
await tapBitmap(page, 25, 25);   // back arrow → returns to mix editor
await page.waitForTimeout(700);
```

**Control bar button positions (bitmap, y≈468):**
```
<(step down): x≈65    step display: x≈200    >(step up): x≈338
-(decrement): x≈475   +(increment): x≈612    ⋮(options): x≈734
```
Only `-` (decrement) confirmed working. Step buttons `<`/`>` do not reliably change step
(the step cycling behavior makes two presses cancel, so avoid trying to change step).

**Formula:** To set weight W% from 100%: do (100-W) decrements at 1% step.

---

## Editor Row Layout (bitmap coordinates)

From pixel analysis of confirmed screenshots (mix-0 session-1):

| Editor row | Display y | Bitmap y |
|---|---|---|
| Name | 60-100 | 75-125 |
| Active condition | 103-146 | 128-182 |
| Source | 154-197 | 192-246 |
| Operation | 206-249 | 257-310 |
| Curve | 249-334 | 310-416 |
| **Actions section** | **334-385** | **416-480** |
| Actions row "Weight" text | 345-360 | 430-450 |

---

## Known Issues / Unconfirmed

- **destCh (Channel)**: Free mix has Channel="None". ETX destCh=0 correctly maps to "None".
  Non-zero destCh routing may require Model Setup → Outputs/Channels screen — untested.
- **Non-default Operation**: mltpx=Multiply/Replace/Lock — untested. "Add" is the default.
- **Non-default swtch**: switch condition pickup — untested. "Always on" is the default.
- **Channel source (srcRaw: ch(N))**: ✓ Confirmed session-9. CH8 at y=360 after ONE scroll.
  For channels beyond CH8 (CH9+), a second scroll of the sub-list would reveal them.
