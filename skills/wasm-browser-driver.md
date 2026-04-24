# ETHOS WASM Browser Driver

How to drive the ETHOS firmware via its browser-based UI using Playwright.
The simulator runs at `https://ethos.studio1247.com/1.6.6/X18RS_FCC`.

---

## Architecture overview

The ETHOS firmware is compiled to WASM and renders entirely into a single `<canvas>`
element (800 × 480 px framebuffer). The Angular shell provides:
- A top toolbar with **Upload** and **Download** buttons (real DOM elements, always accessible)
- The `<canvas>` for everything else — all menus, dialogs, and data entry are drawn by the WASM

Two interaction surfaces therefore exist:
| Surface | How to interact |
|---------|----------------|
| Angular toolbar (Upload/Download) | Normal Playwright DOM locators |
| Canvas UI (all menus, fields) | `clickCanvasButton()` vision-guided helper |

---

## Boot sequence

The app goes through these stages in order. Each must complete before the next is reachable:

```
1. Angular loads         → mat-progress-bar appears
2. WASM downloads        → mat-progress-bar disappears  ← NOT ready yet
3. Loading overlay       → canvas drawn, black background with text
4. FrSky logo animation  → canvas non-black but NO dialog yet  ← common false-start trap
5. Language dialog       → canvas-drawn modal, OK button visible
6. Storage error dialog  → canvas-drawn modal, OK button visible
7. Home screen           → Angular toolbar interactive, bottom bar visible
```

**Detection:** Wait for `mat-progress-bar` hidden, then poll WebGL `readPixels(400,240)` until
`R>30 || G>30 || B>30`. This fires on the logo (step 4), not the dialog (step 5) — use
`clickCanvasButton` with retries to handle the gap.

**Boot helper calls:**
```typescript
await clickCanvasButton(page, 'OK button on language selection dialog', { retries: 5, waitMs: 1000 });
await clickCanvasButton(page, 'OK button on storage error message',     { retries: 5, waitMs: 1000 });
await expect(page.locator('button[aria-label="Upload"]')).toBeVisible();
```

---

## Screen hierarchy

### Bottom navigation bar (always visible)

Four tabs, left to right:

| Icon | Label | Notes |
|------|-------|-------|
| 🏠 House | **Home** | Main view with widgets, timers |
| ✈️ Airplane | **Model Setup** | All model configuration — our focus |
| ⊞ Screens | Configure Screens | Out of scope |
| ⚙️ Gear | System Setup | Out of scope |

Navigation: tap the icon. Return to Home from anywhere: tap the house icon, or use
`clickCanvasButton(page, 'home icon in the bottom navigation bar')`.

---

### Model Setup — Page 1

Accessed by tapping the airplane icon. Displays an 8-tile grid (4 × 2):

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Model select│  Edit model │ Flight modes│    Mixes    │
│   [📁 icon] │  [✏️ icon]  │  [✈️ icon]  │  [⚙ icon]  │
├─────────────┼─────────────┼─────────────┼─────────────┤
│   Outputs   │   Timers    │    Trims    │  RF system  │
│  [📊 icon]  │  [⏱ icon]  │  [⊟ icon]  │  [📡 icon]  │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

Navigation description for `clickCanvasButton`:
- `'Model select tile in Model Setup menu'`
- `'Edit model tile in Model Setup menu'`
- `'Flight modes tile in Model Setup menu'`
- `'Mixes tile in Model Setup menu'`
- `'Outputs tile in Model Setup menu'`
- `'Timers tile in Model Setup menu'`
- `'Trims tile in Model Setup menu'`
- `'RF system tile in Model Setup menu'`

---

### Model Setup — Page 2

Swipe left (or rotary encoder) from Page 1 to reach:

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Telemetry  │  Checklist  │Logic switches│Spec. funcs │
├─────────────┼─────────────┼─────────────┼─────────────┤
│   Curves    │    Vars     │   Trainer   │    Lua      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

Navigation description for `clickCanvasButton`:
- `'Curves tile in Model Setup menu'`
- `'Vars tile in Model Setup menu'`
- `'Logic switches tile in Model Setup menu'`
- `'Special functions tile in Model Setup menu'`

Swipe helper:
```typescript
// swipe left to reach page 2
await swipeCanvas(page, 'left');
// swipe right to return to page 1
await swipeCanvas(page, 'right');
```

---

### Edit model screen

Fields (scrollable list):

| Field | Type | Values / notes |
|-------|------|---------------|
| Name | text (≤15 chars) | tap → virtual keyboard |
| Picture | dropdown | .bmp filename |
| Model type | dropdown | Airplane / Glider / Heli / Multi / Other |
| Receiver | dropdown | Non stabilized / SR6 Mini E / S6R |
| Ailerons | dropdown | 1 / 2 / 4 channels |
| Tail | dropdown | None / Traditional / V-Tail |
| Elevators | dropdown | No elevators / 1 / 2 channels |
| Rudder | dropdown | No rudders / 1 / 2 channels |
| Engine | dropdown | No engine / 1 / 2 channels |
| Analogs filter | dropdown | Global / OFF / ON |
| Function switches | dropdown | 6-Pos with OFF / 6-POS / 2×3-Pos / 6×2-Pos / Momentary |
| Persistent | toggle | OFF / ON |
| S.Port connector | toggle | OFF / 5V |
| Model runtime | display + Reset button | elapsed time |
| Reset all mixes | button | destructive |

---

### Mixes screen

List of mix entries. Each entry maps a source → output channel with shaping.

Adding: tap **+** next to the column heading.

Mix entry fields (tap entry to open):

| Field | Type | Notes |
|-------|------|-------|
| Name | text | |
| Active condition | dropdown/source | Always on, switch, flight mode, logic switch |
| Curve | dropdown + value | Expo %, Function curve, Custom curve |
| Weight / Rates | number (‰) | per-mille; 1000 = 100% |
| Offset | number | |
| Source | source picker | stick, switch, pot, var, channel, etc. |
| Flight mode | multi-select | which flight modes this mix is active in |
| Slow | on/off + up/down speed | |

---

### Vars (Variables) screen

Variables are named containers for model parameters, referenceable in mixes.

Adding: tap **+** next to the column heading.

Var entry fields:

| Field | Type | Notes |
|-------|------|-------|
| Name | text (≤15 chars) | |
| Source | source picker | stick axis, switch, pot, slider, etc. |
| Active condition | dropdown | switch or always on |
| Curve | dropdown + value | Expo, Function, Custom |
| Weight / Rates | number (‰) | |
| Offset | number | |
| Flight mode rates | per-flight-mode | each FM can have independent rate |

---

### Outputs screen

Interface between mix logic and physical servo/channel outputs.

Per-channel fields:

| Field | Type | Notes |
|-------|------|-------|
| Name | text | |
| Direction | toggle | Normal / Reverse |
| Min | number % | minimum travel limit |
| Max | number % | maximum travel limit |
| Center / Subtrim | number | PPM center offset |
| Curve | dropdown | balancing curve |
| Failsafe | dropdown | Hold / No pulses / value |

---

### Flight modes screen

| Field | Type | Notes |
|-------|------|-------|
| Name | text | |
| Active condition | source | switch, logic switch |
| Fade in | number (0–25 s) | transition ramp |
| Fade out | number (0–25 s) | transition ramp |

---

### Curves screen

Three curve types:
- **Expo** — single expo % value
- **Function** — predefined shape (x², √x, step, etc.)
- **Custom** — 2–21 point, fixed or variable x-coordinates

---

### Logic Switches screen

Virtual switches triggered by conditions. Added via **+**.

| Field | Notes |
|-------|-------|
| Function | AND, OR, XOR, a=b, a>b, a<b, etc. |
| V1, V2 | sources or values for comparison |
| AND switch | additional gating switch |
| Duration | how long it stays active |
| Delay | activation delay |

---

### Special Functions screen

Trigger actions from switches. Added via **+**.

| Field | Notes |
|-------|-------|
| Active condition | switch or logic switch |
| Action | Play audio, Trainer, Data logging, Lua, etc. |
| Voice / file | audio file to play |
| Repeat | Once / Always / n-second interval |

---

### Timers screen

Up to 8 timers configurable.

| Field | Notes |
|-------|-------|
| Name | |
| Mode | Count down / Count up |
| Start value | initial/reset value |
| Active condition | switch, throttle %, always |
| Persist | survives power cycle |

---

### Trims screen

| Field | Notes |
|-------|-------|
| Trim range | ± steps |
| Trim step | size per press |
| Additional Trims | T5, T6 on supported hardware |
| Cross trim | swap trim axes |
| Instant trim | snap to current stick position |
| Move trims to subtrims | transfer trim offset to subtrim |

---

## UI interaction patterns

### Navigating into a sub-screen

```typescript
// From home → Model Setup → Mixes
await clickCanvasButton(page, 'airplane icon in the bottom navigation bar');
await clickCanvasButton(page, 'Mixes tile in Model Setup menu');
// now inside Mixes list
```

### Going back

Each sub-screen has a **`<`** back arrow in the top-left corner:
```typescript
await clickCanvasButton(page, 'back arrow in top left of screen');
```

### Adding a new element (Var, Mix, Logic switch, etc.)

Tap the **+** symbol next to the relevant column/section heading:
```typescript
await clickCanvasButton(page, 'plus button to add a new Var');
```

### Editing a number value

Tapping a numeric field opens a bottom control bar:
- **`<`** / **`>`** — change step size (0.1%, 1%, 10%)  
- **`-`** / **`+`** — decrement / increment by step
- **`⋮`** (More) — opens dialog: Default / Min / Max / Enable slider

```typescript
await clickCanvasButton(page, 'plus button in number control bar to increment value');
await clickCanvasButton(page, 'more options button in number control bar');
```

### Editing a text field (virtual keyboard)

Tap the text field — a full virtual keyboard appears.
Toggle alpha/numeric with the `?123` / `abc` key.

```typescript
await clickCanvasButton(page, 'Name text field');
// keyboard now visible — type via individual key clicks or use a helper
await clickCanvasButton(page, 'key T on virtual keyboard');
```

### Dropdown / option picker

Tap the field value — an inline dropdown appears. Tap the desired option.

```typescript
await clickCanvasButton(page, 'Model type dropdown');
await clickCanvasButton(page, 'Glider option in dropdown');
```

### Long-press for Options dialog

Fields marked with a **hamburger icon** (☰) in the top-left corner support long-press
for an Options dialog (Invert, Edge, Negative, HalfRange, Use a source, etc.).
In Playwright use `page.mouse` with a hold duration:
```typescript
const pos = /* vision-locate the field */;
await page.mouse.move(pos.x, pos.y);
await page.mouse.down();
await page.waitForTimeout(800);   // hold ~800 ms
await page.mouse.up();
```

---

## Swipe navigation

Within any icon-grid screen (Model Setup pages) swipe left/right to move between pages.
The page indicator dots at the top-centre show current position.

```typescript
async function swipeCanvas(
  page: Page,
  direction: 'left' | 'right',
  { steps = 20, distance = 250 }: { steps?: number; distance?: number } = {},
): Promise<void> {
  const rect = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) throw new Error('swipeCanvas: canvas not found');
  const startX = rect.x + rect.w / 2;
  const centerY = rect.y + rect.h / 2;
  const endX = direction === 'left' ? startX - distance : startX + distance;
  await page.mouse.move(startX, centerY);
  await page.mouse.down();
  await page.mouse.move(endX, centerY, { steps });
  await page.mouse.up();
  await page.waitForTimeout(400);
}
```

---

## `clickCanvasButton` helper (reference implementation)

See `ethos-tests/tests/helpers/boot.ts` for the full implementation.

Key behaviour:
1. Screenshot the canvas element only (`page.locator('canvas').screenshot()`)
2. Send to Claude vision (`claude-sonnet-4-20250514`) asking for `{x, y}` of described element
3. Convert canvas-local coords → page coords via `getBoundingClientRect()`
4. Click; MD5-hash canvas before/after — if hash changed, success
5. Retry up to N times (default 3); throw with attached screenshot on total failure

```typescript
await clickCanvasButton(page, 'description of element', { retries: 3, waitMs: 800 });
```

Use longer `waitMs` (1000+) and more `retries` (5) for dialogs that appear after animations.

---

## Binary diff investigation workflow

For mapping UI field changes to binary offsets:

```
1.  bootApp(page)                          → boot + dismiss dialogs
2.  navigateCreateModelWizard(page)        → minimal baseline model
3.  downloadModelFile(page) → baseline.bin
4.  navigate to target screen + field
5.  change exactly ONE value
6.  downloadModelFile(page) → changed.bin
7.  diff(baseline.bin, changed.bin)        → affected byte offsets
8.  record in field-map.md
```

Binary diff helper (Node.js):
```typescript
function binDiff(a: Buffer, b: Buffer): Array<{offset: number, before: number, after: number}> {
  const len = Math.max(a.length, b.length);
  const diffs = [];
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) diffs.push({ offset: i, before: a[i] ?? -1, after: b[i] ?? -1 });
  }
  return diffs;
}
```

---

## Known canvas geometry

| Property | Value |
|----------|-------|
| WASM framebuffer | 800 × 480 px (fixed) |
| Canvas CSS width | 640 px (after load) |
| Canvas CSS height | 384 px (after load) |
| Canvas page position | varies with Angular layout |
| Scale factor | CSS / framebuffer = 640/800 = 0.8 |

The vision helper works in canvas-screenshot pixel space (matches CSS pixels after
`page.locator('canvas').screenshot()`), so no manual scaling is needed.

---

## Model name limit

Model names are **up to 15 characters** (enforced by ETHOS). Stored as length-prefixed
ASCII at offset `0x02` in the content block (see `ethos-bin-format.md`).
