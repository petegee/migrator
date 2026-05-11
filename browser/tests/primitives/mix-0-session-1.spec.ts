/**
 * mix-0 session-1 (v11 — FINAL): Rebuild Glider + Rudder var + Elevat var + Elev Free mix.
 *
 * ETX primitive (mix-0):
 *   name: Elev  srcRaw: I1  destCh: 0 (CH1)  mltpx: ADD
 *   weight: 100  swtch: NONE  flightModes: 0
 *
 * Architecture: Stick → Var → Mix → Channel(s)
 * Source = "Elevat" Var (not raw Elevator analog).
 *
 * Confirmed flow to set Source = Elevat Var:
 *   1. tap(350,200)     → compact popup [Special / --- / Analogs]
 *   2. tap(320,254)     → "---" → full-screen Category list
 *   3. CDP touch swipe  → bx=320, byStart=290→byEnd=130 → 3 items scroll → Vars at y≈261
 *   4. tap(320,261)     → "Vars" → 2-col picker (Channels/Vars/Gyro | Elevat/Rudder/Elevat)
 *   5. tap(510,309)     → Member col row 3 → single-column "Member" sub-list (Rudder/Elevat)
 *   6. tap(400,288)     → "Elevat" in sub-list → Elevat highlighted in 2-col picker
 *   7. tap(400,50)      → commit → Source = "Elevat" ✓
 *
 * Screenshot scale: canvas 800×480 bitmap, CSS 800×480, screenshot 640×385 display.
 *   bitmap_y = display_y × (480/385) = display_y × 1.247
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, goBack, navigateToMixes } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';

// ─── helpers ────────────────────────────────────────────────────────────────

async function longHoldBitmap(page: any, bx: number, by: number, holdMs = 1200) {
  const rect = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')]
      .find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2'));
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

async function typeKeys(page: any, keys: [number, number][]) {
  for (const [x, y] of keys) {
    await touchBitmap(page, x, y);
    await page.waitForTimeout(150);
  }
}

// CDP touch swipe for reliable list scrolling inside dialog overlays.
// Mouse drag can be inconsistent; CDP touch is required for dialogs.
// bx=320, byStart=290→byEnd=130 (finger UP = scroll DOWN) shifts list ~3 items.
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

const KEYS_RUDDER: [number, number][] = [
  [280, 315], [40, 395],  [520, 315], [200, 340],
  [200, 340], [200, 315], [280, 315], [700, 450],
];
const KEYS_ELEVAT: [number, number][] = [
  [200, 315], [40, 395],  [680, 340], [200, 315],
  [360, 395], [40,  340], [360, 315], [700, 450],
];

async function setVarName(page: any, keys: [number, number][]) {
  await tapBitmap(page, 738, 139);
  await page.waitForTimeout(700);
  await typeKeys(page, keys);
  await page.waitForTimeout(500);
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
}

async function setVarAnalogSource(page: any, rudderOnly: boolean) {
  await longHoldBitmap(page, 449, 390, 1200);
  await tapBitmap(page, 397, 308);
  await page.waitForTimeout(700);
  await touchBitmap(page, 510, 395);
  await page.waitForTimeout(700);
  await tapBitmap(page, 320, 207);
  await page.waitForTimeout(700);
  await tapBitmap(page, 440, 204);
  await page.waitForTimeout(700);
  if (!rudderOnly) {
    await tapBitmap(page, 500, 287);
    await page.waitForTimeout(500);
    await tapBitmap(page, 400, 194);
    await page.waitForTimeout(500);
  }
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
}

async function setVarComment(page: any, keys: [number, number][]) {
  await tapBitmap(page, 600, 267);
  await page.waitForTimeout(500);
  await typeKeys(page, keys);
  await page.waitForTimeout(500);
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
}

// ─── test ────────────────────────────────────────────────────────────────────

test.setTimeout(300_000);

test('mix-0 session-1 v11: Elev Free mix with Source = Elevat Var', async ({ page }) => {
  const SC_DIR =
    '/home/pete/Source/ethos/migrator/test-results/mix-0-session-1';
  fs.mkdirSync(SC_DIR, { recursive: true });

  let snapIdx = 0;
  const snap = async (label: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    const file = `${String(snapIdx++).padStart(2, '0')}-${label}.png`;
    fs.writeFileSync(`${SC_DIR}/${file}`, buf);
    console.log(`snap: ${file}`);
  };

  // ── 1. Fresh Glider model ──────────────────────────────────────────────────
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await tapBitmap(page, 54, 459);
  await page.waitForTimeout(800);
  await snap('00-home');

  // ── 2. Vars: Rudder ───────────────────────────────────────────────────────
  await tapBitmap(page, 194, 459);
  await page.waitForTimeout(800);
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(1000);
  await tapBitmap(page, 300, 330);
  await page.waitForTimeout(600);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await setVarName(page, KEYS_RUDDER);
  await setVarAnalogSource(page, true);
  await setVarComment(page, KEYS_RUDDER);
  await tapBitmap(page, 400, 50);
  await goBack(page);
  await page.waitForTimeout(500);

  // ── 3. Vars: Elevat ───────────────────────────────────────────────────────
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(600);
  await setVarName(page, KEYS_ELEVAT);
  await setVarAnalogSource(page, false);
  await setVarComment(page, KEYS_ELEVAT);
  await tapBitmap(page, 400, 50);
  await goBack(page);
  await page.waitForTimeout(500);
  await snap('03-vars-both-added');

  // ── 4. Navigate to Mixes ──────────────────────────────────────────────────
  await goBack(page);
  await page.waitForTimeout(500);
  await tapBitmap(page, 54, 459);
  await page.waitForTimeout(600);
  await navigateToMixes(page);
  await page.waitForTimeout(700);
  await snap('04-mixes-list');

  // ── 5. Add Free mix ───────────────────────────────────────────────────────
  await tapBitmap(page, 563, 69);          // list header + → library
  await page.waitForTimeout(700);
  await tapBitmap(page, 100, 101);         // Free mix r1c1
  await page.waitForTimeout(700);
  await touchBitmap(page, 320, 187);       // placement popup "Before Ailerons"
  await page.waitForTimeout(700);
  await snap('05-free-mix-editor');

  // ── 6. Set Name = "Elev" ──────────────────────────────────────────────────
  await tapBitmap(page, 490, 80);          // cursor past end of "Free mix" (right-aligned)
  await page.waitForTimeout(700);
  for (let i = 0; i < 8; i++) {
    await touchBitmap(page, 680, 395);     // Backspace ×8
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(300);
  await touchBitmap(page, 200, 315);       // E (auto-caps)
  await page.waitForTimeout(150);
  await touchBitmap(page, 40, 395);        // Shift → lowercase
  await page.waitForTimeout(150);
  await touchBitmap(page, 680, 340);       // l
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 315);       // e
  await page.waitForTimeout(150);
  await touchBitmap(page, 360, 395);       // v
  await page.waitForTimeout(200);
  await touchBitmap(page, 700, 450);       // ENTER
  await page.waitForTimeout(600);
  await tapBitmap(page, 400, 50);          // commit
  await page.waitForTimeout(400);
  await snap('06-name-elev-set');

  // ── 7. Set Source = Elevat Var ────────────────────────────────────────────

  // Step 1: tap Source field → compact popup [Special / --- / Analogs]
  await tapBitmap(page, 350, 200);
  await page.waitForTimeout(700);

  // Step 2: tap "---" in compact popup (bitmap y≈254) → full-screen Category list
  await tapBitmap(page, 320, 254);
  await page.waitForTimeout(700);
  await snap('07a-fulllist-initial');

  // Step 3: CDP touch swipe UP (byStart=290→byEnd=130) = scroll DOWN ~3 items
  // Full list: --- / Analogs / Switches / Trims / Channels / Vars / Gyro / Trainer / Timers / System value
  // After swipe: Trims / Channels / Vars / Gyro / Trainer visible
  // Vars at bitmap y≈261 after swipe
  await cdpTouchSwipeBitmap(page, 320, 290, 130);
  await snap('07b-fulllist-after-swipe');  // Trims/Channels/Vars/Gyro/Trainer

  // Step 4: tap "Vars" at bitmap y≈261 in scrolled list
  // display→bitmap: 480/385 = 1.247 scale factor
  // After 3-item scroll: --- Analogs Switches off top
  //   Trims≈163, Channels≈212, Vars≈261, Gyro≈310, Trainer≈358
  await tapBitmap(page, 320, 261);
  await page.waitForTimeout(700);
  await snap('07c-vars-2col-picker');
  // 2-col picker: Category=Channels/Vars(orange)/Gyro, Member=Elevat/Rudder(orange)/Elevat

  // Step 5: tap Member col row 3 → opens single-column "Member" sub-list
  // Row 3 (Gyro category | Elevat member) at bitmap (510, 309)
  await tapBitmap(page, 510, 309);
  await page.waitForTimeout(700);
  await snap('07d-member-sublist');
  // Sub-list: Rudder (default, y≈239) / Elevat (y≈288)

  // Step 6: tap "Elevat" in sub-list at bitmap y≈288
  await tapBitmap(page, 400, 288);
  await page.waitForTimeout(700);
  await snap('07e-elevat-selected');
  // 2-col picker now shows Elevat highlighted in Member col

  // Step 7: commit
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
  await snap('07f-source-elevat-committed');

  // ── 8. Verify editor ──────────────────────────────────────────────────────
  await snap('08-editor-final');

  // ── 9. Download and save ──────────────────────────────────────────────────
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(300);
  await goBack(page);
  await page.waitForTimeout(700);
  await snap('09-mixes-list');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buffer = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buffer);
  console.log(`Saved accumulated.bin: ${buffer.length} bytes`);
  await snap('10-final');

  expect(buffer.length).toBeGreaterThan(100);
});
