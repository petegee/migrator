/**
 * curve-0 session-7: enter curve "Flm" (Custom 9-pt smooth)
 *
 * KEY FINDINGS from session-6:
 *   After tiny scroll (50px finger 430→380) + main 3rd scroll (150px finger 300→150):
 *     y=269 → opens P6 (X=25%) control bar  [confirmed snap 22]
 *     y=312 → opens P7 (X=50%) control bar  [confirmed snap 24]
 *     y=398 → opens P8 (X=75%) control bar  [confirmed snap 26]
 *     P9 visible in snap 21 at bottom; estimated at y=441 (43px below P8 tap)
 *
 *   Session-6 BUG: tap positions correct but wrong counts were used (each call had
 *   the next row's count). Fixed in session-7 with correct values per row.
 *
 * Target Y values: [-100, -76, -52, -27, -3, +19, +44, +68, +86]
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, goBack } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';
const SC_DIR =
  '/home/pete/Source/ethos/migrator/test-results/curve-0-session-7';

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

test('curve-0 session-7: enter curve "Flm" Custom 9-pt smooth', async ({ page }) => {
  fs.mkdirSync(SC_DIR, { recursive: true });
  let si = 0;
  const snap = async (label: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    fs.writeFileSync(`${SC_DIR}/${String(si++).padStart(2, '0')}-${label}.png`, buf);
    console.log(`snap: ${String(si - 1).padStart(2, '0')}-${label}`);
  };

  // ── Boot + fresh model ────────────────────────────────────────────────────────
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await tapBitmap(page, 54, 459);
  await page.waitForTimeout(800);

  // ── Navigate to Curves ────────────────────────────────────────────────────────
  await tapBitmap(page, 194, 459);
  await page.waitForTimeout(800);
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(1000);
  await tapBitmap(page, 100, 330);
  await page.waitForTimeout(600);

  // ── Open curve editor ─────────────────────────────────────────────────────────
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(700);
  await snap('00-editor-open');

  // ── Name = "Flm" ─────────────────────────────────────────────────────────────
  await tapBitmap(page, 600, 80);
  await page.waitForTimeout(600);
  for (let i = 0; i < 10; i++) { await touchBitmap(page, 680, 395); await page.waitForTimeout(80); }
  await touchBitmap(page, 280, 340); await page.waitForTimeout(120);  // F
  await touchBitmap(page, 40, 395);  await page.waitForTimeout(120);  // Shift
  await touchBitmap(page, 680, 340); await page.waitForTimeout(120);  // l
  await touchBitmap(page, 600, 395); await page.waitForTimeout(120);  // m
  await touchBitmap(page, 700, 450); await page.waitForTimeout(400);  // ENTER
  await tapBitmap(page, 400, 50);    await page.waitForTimeout(300);

  // ── Type = Custom ─────────────────────────────────────────────────────────────
  await tapBitmap(page, 600, 140); await page.waitForTimeout(400);
  await tapBitmap(page, 320, 320); await page.waitForTimeout(700);

  // ── Points = 9 ────────────────────────────────────────────────────────────────
  await tapBitmap(page, 600, 220); await page.waitForTimeout(500);
  await cdpTouchSwipeBitmap(page, 320, 270, 90);
  await tapBitmap(page, 320, 300); await page.waitForTimeout(700);
  await snap('01-setup-done');

  // ── Smooth = ON ───────────────────────────────────────────────────────────────
  await tapBitmap(page, 600, 300); await page.waitForTimeout(300);
  await snap('02-smooth-on');

  // ── First 300px scroll → Points header at max scroll y≈453 ───────────────────
  await cdpTouchSwipeBitmap(page, 450, 420, 120);
  await snap('03-scroll-1');

  // ── Expand "Points >" at (400, 455) ──────────────────────────────────────────
  await tapBitmap(page, 400, 455);
  await page.waitForTimeout(600);
  await snap('04-expanded');

  // ── Second 300px scroll → rows into view ─────────────────────────────────────
  await cdpTouchSwipeBitmap(page, 450, 420, 120);
  await page.waitForTimeout(300);
  await snap('05-scroll-2');

  // ── Enter P1–P5 (confirmed separator-aware positions) ────────────────────────
  // After expand + 2nd scroll: P1=196, P2=239, [sep=282], P3=325, P4=368, [sep=411], P5=454
  // Y col x=650. Control bar: step-up=(395,456) 0.1%→1.0%, dec=(475,456), inc=(613,456).

  const adjustY = async (
    rowY: number, taps: number, dir: 'dec' | 'inc', label: string,
  ) => {
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

  await adjustY(196, 100, 'dec', '06-p1');   // P1 X=-100% → -100%
  await adjustY(239,  76, 'dec', '07-p2');   // P2 X=-75%  → -76%
  // skip y=282 (separator)
  await adjustY(325,  52, 'dec', '08-p3');   // P3 X=-50%  → -52%
  await adjustY(368,  27, 'dec', '09-p4');   // P4 X=-25%  → -27%
  // skip y=411 (separator)
  await adjustY(454,   3, 'dec', '10-p5');   // P5 X=0%    → -3%

  await snap('11-after-p1-p5');

  // ── Tiny scroll to bring P6 within reach ─────────────────────────────────────
  // P6 is currently off-screen bottom. 50px finger scroll reveals P7 at bottom.
  await cdpTouchSwipeBitmap(page, 450, 430, 380);
  await page.waitForTimeout(300);
  await snap('12-tiny-scroll');

  // ── Main 3rd scroll ───────────────────────────────────────────────────────────
  // After tiny+main scroll, confirmed positions from session-6 snaps:
  //   y=269 → P6 (X=25%)
  //   y=312 → P7 (X=50%)
  //   y=398 → P8 (X=75%)  [via separator pass-through]
  //   y=441 → P9 (X=100%) [estimated; 43px below P8 tap]
  await cdpTouchSwipeBitmap(page, 450, 300, 150);
  await page.waitForTimeout(300);
  await snap('13-scroll-3');

  await adjustY(269,  19, 'inc', '14-p6');   // P6 X=+25%  → +19%
  await adjustY(312,  44, 'inc', '15-p7');   // P7 X=+50%  → +44%
  // skip y=355 (separator between P7 and P8)
  await adjustY(398,  68, 'inc', '16-p8');   // P8 X=+75%  → +68%
  await adjustY(441,  86, 'inc', '17-p9');   // P9 X=+100% → +86% (y=441 estimated)

  await snap('18-all-done');

  // ── Back and download ─────────────────────────────────────────────────────────
  await goBack(page);
  await page.waitForTimeout(500);
  await snap('19-curves-list');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buf = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buf);
  console.log(`accumulated.bin saved: ${buf.length} bytes`);
  await snap('20-final');

  expect(buf.length).toBeGreaterThan(500);
});
