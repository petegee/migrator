/**
 * curve-0 session-3: enter curve "Flm" (Custom 9-pt smooth)
 *
 * Fixes from session-2:
 *   1. TWO 300px right-panel scrolls to bring Points header from y≈453 to y≈153
 *   2. Expand Points at (760, 153) — safe, Points count ▼ scrolled off top after 2nd scroll
 *   3. Assume 1% step on control bar (confirmed for mix context; curve Y likely same)
 *      → NO step-up tap before decrements/increments
 *   4. All row taps at x=650 safe (Smooth toggle at y≈-300 after two scrolls, off screen)
 *
 * After two 300px scrolls + expand, row positions:
 *   P1 y≈196, P2 y≈239, P3 y≈282, P4 y≈325, P5 y≈368, P6 y≈411
 *   Third scroll 150px → P7 y≈304, P8 y≈347, P9 y≈390
 *
 * ETX: name=flm, type=0 (custom), points=4 (+midpoints=9 total), smooth=1
 * Y deltas from 0.0% default: [-100, -76, -52, -27, -3, 19, 44, 68, 86]
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, goBack } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';
const SC_DIR =
  '/home/pete/Source/ethos/migrator/test-results/curve-0-session-3';

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

test.setTimeout(300_000);

test('curve-0 session-3: enter curve "Flm" Custom 9-pt smooth', async ({ page }) => {
  fs.mkdirSync(SC_DIR, { recursive: true });
  let si = 0;
  const snap = async (label: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    fs.writeFileSync(`${SC_DIR}/${String(si++).padStart(2, '0')}-${label}.png`, buf);
    console.log(`snap: ${String(si - 1).padStart(2, '0')}-${label}`);
  };

  // ── Phase 1: Boot + fresh model ──────────────────────────────────────────────
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await tapBitmap(page, 54, 459);
  await page.waitForTimeout(800);

  // ── Phase 2: Navigate to Curves ──────────────────────────────────────────────
  await tapBitmap(page, 194, 459);
  await page.waitForTimeout(800);
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(1000);
  await tapBitmap(page, 100, 330);  // Curves tile (r2c1)
  await page.waitForTimeout(600);

  // ── Phase 3: Open curve editor ────────────────────────────────────────────────
  await tapBitmap(page, 400, 266);  // large + on empty list
  await page.waitForTimeout(700);
  await snap('00-editor-open');

  // ── Phase 4: Set Name = "Flm" ─────────────────────────────────────────────────
  await tapBitmap(page, 600, 80);
  await page.waitForTimeout(600);
  for (let i = 0; i < 10; i++) {
    await touchBitmap(page, 680, 395);  // Bksp
    await page.waitForTimeout(80);
  }
  await touchBitmap(page, 280, 340);  // F (auto-caps first char)
  await page.waitForTimeout(120);
  await touchBitmap(page, 40, 395);   // Shift → lowercase
  await page.waitForTimeout(120);
  await touchBitmap(page, 680, 340);  // l
  await page.waitForTimeout(120);
  await touchBitmap(page, 600, 395);  // m
  await page.waitForTimeout(120);
  await touchBitmap(page, 700, 450);  // ENTER
  await page.waitForTimeout(400);
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(300);
  await snap('01-name-set');

  // ── Phase 5: Set Type = Custom ────────────────────────────────────────────────
  await tapBitmap(page, 600, 140);    // Type field → picker
  await page.waitForTimeout(400);
  await tapBitmap(page, 320, 320);    // Custom (confirmed session-1)
  await page.waitForTimeout(700);
  await snap('02-type-custom');

  // ── Phase 6: Set Points count = 9 ────────────────────────────────────────────
  await tapBitmap(page, 600, 220);    // Points count field → picker (default 5)
  await page.waitForTimeout(500);
  await snap('03-picker-open');
  await cdpTouchSwipeBitmap(page, 320, 270, 90);  // scroll picker to show 9
  await snap('04-picker-scrolled');
  await tapBitmap(page, 320, 300);    // tap "9"
  await page.waitForTimeout(700);
  await snap('05-points-9');

  // ── Phase 7: Set Smooth = ON ──────────────────────────────────────────────────
  await tapBitmap(page, 600, 300);    // Smooth toggle (default OFF → ON)
  await page.waitForTimeout(300);
  await snap('06-smooth-on');

  // ── Phase 8: First 300px scroll ──────────────────────────────────────────────
  // Brings Points header from ~y=753 (off-screen) to ~y=453 (bottom edge visible)
  await cdpTouchSwipeBitmap(page, 450, 420, 120);
  await snap('07-after-scroll-1');

  // ── Phase 9: Second 300px scroll ─────────────────────────────────────────────
  // Brings Points header from y≈453 → y≈153 (center of screen)
  // After this scroll, Points count ▼ and Smooth are off the top (no accidental taps)
  await cdpTouchSwipeBitmap(page, 450, 420, 120);
  await snap('08-after-scroll-2');

  // ── Phase 10: Expand Points section ──────────────────────────────────────────
  // Points > header is now at y≈153. Tap the ">" chevron to expand.
  // Points count ▼ is at y≈-148 after two scrolls (off top — safe).
  await tapBitmap(page, 760, 153);
  await page.waitForTimeout(500);
  await snap('09-points-expanded');

  // ── Phase 11: Enter Y values (P1–P6) ─────────────────────────────────────────
  // Row positions after two 300px scrolls + expand:
  //   Header at y≈153, rows spaced 43px: P1=196, P2=239, P3=282, P4=325, P5=368, P6=411
  // Y column at x≈650. Control bar: dec=(475,456), inc=(613,456).
  // Step: 1% (assumed, no step-up tap — same as mix context confirmation).

  const adjustY = async (
    rowY: number, taps: number, dir: 'dec' | 'inc', label: string,
  ) => {
    await tapBitmap(page, 650, rowY);
    await page.waitForTimeout(400);
    await snap(`${label}-bar-open`);
    const btnX = dir === 'dec' ? 475 : 613;
    for (let i = 0; i < taps; i++) {
      await tapBitmap(page, btnX, 456);
      await page.waitForTimeout(80);
    }
    await snap(`${label}-adjusted`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(200);
  };

  // P1 (X=-100%): 0 → -100%
  await adjustY(196, 100, 'dec', '10-p1');
  // P2 (X=-75%): 0 → -76%
  await adjustY(239, 76, 'dec', '11-p2');
  // P3 (X=-50%): 0 → -52%
  await adjustY(282, 52, 'dec', '12-p3');
  // P4 (X=-25%): 0 → -27%
  await adjustY(325, 27, 'dec', '13-p4');
  // P5 (X=0%): 0 → -3%
  await adjustY(368, 3, 'dec', '14-p5');
  // P6 (X=25%): 0 → +19%
  await adjustY(411, 19, 'inc', '15-p6');

  await snap('16-after-p1-p6');

  // ── Phase 12: Third scroll for P7–P9 ─────────────────────────────────────────
  // P7 is at y≈454 (bottom edge). Scroll 150px to bring P7–P9 into view.
  await cdpTouchSwipeBitmap(page, 450, 300, 150);
  await snap('17-after-scroll-3');

  // After 150px more: P7≈304, P8≈347, P9≈390
  // P7 (X=50%): 0 → +44%
  await adjustY(304, 44, 'inc', '18-p7');
  // P8 (X=75%): 0 → +68%
  await adjustY(347, 68, 'inc', '19-p8');
  // P9 (X=100%): 0 → +86%
  await adjustY(390, 86, 'inc', '20-p9');

  await snap('21-all-points-done');

  // ── Phase 13: Back and download ───────────────────────────────────────────────
  await goBack(page);
  await page.waitForTimeout(500);
  await snap('22-curves-list');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buf = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buf);
  console.log(`accumulated.bin saved: ${buf.length} bytes`);
  await snap('23-final');

  expect(buf.length).toBeGreaterThan(500);
});
