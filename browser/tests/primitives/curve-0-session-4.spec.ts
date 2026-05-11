/**
 * curve-0 session-4: enter curve "Flm" (Custom 9-pt smooth)
 *
 * Fixes from session-3:
 *   - Right panel maxes out after ONE 300px scroll (second scroll does nothing)
 *   - "Points >" header sits at y≈453 at max scroll
 *   - Expand at (400, 455): x=400 (label center), NOT x=760 (triggers Points count picker ▼)
 *   - After expanding, content grows → second 300px scroll brings rows into view
 *   - Row positions after expand + second scroll: P1=196, P2=239, P3=282, P4=325, P5=368, P6=411
 *   - Third 150px scroll for P7-P9: y≈304, 347, 390
 *   - Step-up tap included (0.1%→1% per session-1 curve-context analysis)
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, goBack } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';
const SC_DIR =
  '/home/pete/Source/ethos/migrator/test-results/curve-0-session-4';

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

test('curve-0 session-4: enter curve "Flm" Custom 9-pt smooth', async ({ page }) => {
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
  await tapBitmap(page, 100, 330);
  await page.waitForTimeout(600);

  // ── Phase 3: Open curve editor ────────────────────────────────────────────────
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(700);
  await snap('00-editor-open');

  // ── Phase 4: Set Name = "Flm" ─────────────────────────────────────────────────
  await tapBitmap(page, 600, 80);
  await page.waitForTimeout(600);
  for (let i = 0; i < 10; i++) {
    await touchBitmap(page, 680, 395);
    await page.waitForTimeout(80);
  }
  await touchBitmap(page, 280, 340);  // F
  await page.waitForTimeout(120);
  await touchBitmap(page, 40, 395);   // Shift
  await page.waitForTimeout(120);
  await touchBitmap(page, 680, 340);  // l
  await page.waitForTimeout(120);
  await touchBitmap(page, 600, 395);  // m
  await page.waitForTimeout(120);
  await touchBitmap(page, 700, 450);  // ENTER
  await page.waitForTimeout(400);
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(300);

  // ── Phase 5: Set Type = Custom ────────────────────────────────────────────────
  await tapBitmap(page, 600, 140);
  await page.waitForTimeout(400);
  await tapBitmap(page, 320, 320);
  await page.waitForTimeout(700);

  // ── Phase 6: Set Points count = 9 ────────────────────────────────────────────
  await tapBitmap(page, 600, 220);
  await page.waitForTimeout(500);
  await cdpTouchSwipeBitmap(page, 320, 270, 90);  // scroll picker
  await tapBitmap(page, 320, 300);                 // select 9
  await page.waitForTimeout(700);
  await snap('01-setup-done');  // verify: Type=Custom, Points=9

  // ── Phase 7: Set Smooth = ON ──────────────────────────────────────────────────
  await tapBitmap(page, 600, 300);
  await page.waitForTimeout(300);
  await snap('02-smooth-on');

  // ── Phase 8: First 300px scroll → Points header reaches y≈453 (max scroll) ──
  await cdpTouchSwipeBitmap(page, 450, 420, 120);
  await snap('03-after-scroll-1');

  // ── Phase 9: Expand "Points >" at y≈453 ──────────────────────────────────────
  // CRITICAL: use x=400 (label center), NOT x=760 (which triggers Points count ▼)
  // The ">" collapsible is at y≈453-460 at max scroll.
  await tapBitmap(page, 400, 455);
  await page.waitForTimeout(600);
  await snap('04-after-expand-tap');

  // ── Phase 10: Second 300px scroll → rows come into view ──────────────────────
  // After expanding, scroll height increased (9 rows × 43px = 387px added).
  // This scroll brings Points header from y≈453 → y≈153, rows to y≈196+.
  await cdpTouchSwipeBitmap(page, 450, 420, 120);
  await page.waitForTimeout(300);
  await snap('05-after-scroll-2');

  // ── Phase 11: Enter Y values (P1–P6) ─────────────────────────────────────────
  // Row positions after expand + second 300px scroll:
  //   P1=196, P2=239, P3=282, P4=325, P5=368, P6=411 (Y col x≈650)
  // Control bar: step-up=(395,456), dec=(475,456), inc=(613,456)
  // Step-up: 0.1% → 1% (one tap before each batch)

  const adjustY = async (
    rowY: number, taps: number, dir: 'dec' | 'inc', label: string,
  ) => {
    await tapBitmap(page, 650, rowY);
    await page.waitForTimeout(400);
    await snap(`${label}-bar-open`);
    await tapBitmap(page, 395, 456);           // > step-up (0.1% → 1%)
    await page.waitForTimeout(200);
    const btnX = dir === 'dec' ? 475 : 613;
    for (let i = 0; i < taps; i++) {
      await tapBitmap(page, btnX, 456);
      await page.waitForTimeout(80);
    }
    await snap(`${label}-adjusted`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(200);
  };

  await adjustY(196, 100, 'dec', '06-p1');
  await adjustY(239,  76, 'dec', '07-p2');
  await adjustY(282,  52, 'dec', '08-p3');
  await adjustY(325,  27, 'dec', '09-p4');
  await adjustY(368,   3, 'dec', '10-p5');
  await adjustY(411,  19, 'inc', '11-p6');

  await snap('12-after-p1-p6');

  // ── Phase 12: Third scroll 150px → P7–P9 ─────────────────────────────────────
  // P7 at y≈454 (just off bottom after p1-p6). Scroll 150px up.
  await cdpTouchSwipeBitmap(page, 450, 300, 150);
  await snap('13-after-scroll-3');

  await adjustY(304, 44, 'inc', '14-p7');
  await adjustY(347, 68, 'inc', '15-p8');
  await adjustY(390, 86, 'inc', '16-p9');

  await snap('17-all-done');

  // ── Phase 13: Back and download ───────────────────────────────────────────────
  await goBack(page);
  await page.waitForTimeout(500);
  await snap('18-curves-list');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buf = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buf);
  console.log(`accumulated.bin saved: ${buf.length} bytes`);
  await snap('19-final');

  expect(buf.length).toBeGreaterThan(500);
});
