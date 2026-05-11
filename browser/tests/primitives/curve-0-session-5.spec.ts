/**
 * curve-0 session-5: enter curve "Flm" (Custom 9-pt smooth)
 *
 * KEY DISCOVERY from session-4: Points table has SEPARATOR ROWS every 2 data rows.
 * Separators are non-interactive — tapping them opens no control bar.
 * Must skip separator y positions when entering Y values.
 *
 * Row layout after expand + two 300px scrolls (bitmap y):
 *   P1 (X=-100%): y=196  P2 (X=-75%):  y=239
 *   [sep]:         y=282  ← skip
 *   P3 (X=-50%):  y=325  P4 (X=-25%):  y=368
 *   [sep]:         y=411  ← skip
 *   P5 (X=0%):    y=454
 *   (P6+ off-screen before 3rd scroll)
 *
 * Third scroll 150px → P5=304, P6=347, [sep=390 skip], P7=433
 * Fourth scroll 150px → P7=283, P8=326, [sep=369 skip], P9=412
 *
 * Control bar: step-up at (395,456) → 0.1%→1.0%; dec=(475,456); inc=(613,456)
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, goBack } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';
const SC_DIR =
  '/home/pete/Source/ethos/migrator/test-results/curve-0-session-5';

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

test('curve-0 session-5: enter curve "Flm" Custom 9-pt smooth', async ({ page }) => {
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

  // ── Points = 9 (scroll picker from default 5) ────────────────────────────────
  await tapBitmap(page, 600, 220); await page.waitForTimeout(500);
  await cdpTouchSwipeBitmap(page, 320, 270, 90);
  await tapBitmap(page, 320, 300); await page.waitForTimeout(700);
  await snap('01-setup-done');

  // ── Smooth = ON ───────────────────────────────────────────────────────────────
  await tapBitmap(page, 600, 300); await page.waitForTimeout(300);
  await snap('02-smooth-on');

  // ── First 300px scroll → "Points >" appears at y≈453 ─────────────────────────
  await cdpTouchSwipeBitmap(page, 450, 420, 120);
  await snap('03-scroll-1');

  // ── Expand "Points >" at (400, 455) ─────────────────────────────────────────
  // x=400 = label center (NOT x=760 which triggers Points count ▼ dropdown)
  await tapBitmap(page, 400, 455);
  await page.waitForTimeout(600);
  await snap('04-expanded');

  // ── Second 300px scroll → rows into view ─────────────────────────────────────
  await cdpTouchSwipeBitmap(page, 450, 420, 120);
  await page.waitForTimeout(300);
  await snap('05-scroll-2');

  // ── Enter Y values: separator-aware positions ─────────────────────────────────
  // Y column: x=650. Control bar: step-up=(395,456), dec=(475,456), inc=(613,456).
  // Step: 0.1% default → tap step-up once → 1.0% before each entry.

  const adjustY = async (
    rowY: number, taps: number, dir: 'dec' | 'inc', label: string,
  ) => {
    await tapBitmap(page, 650, rowY);
    await page.waitForTimeout(400);
    await snap(`${label}-bar-open`);
    await tapBitmap(page, 395, 456);  // step-up 0.1% → 1.0%
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

  // P1 (X=-100%): y=196, target=-100%
  await adjustY(196, 100, 'dec', '06-p1');
  // P2 (X=-75%):  y=239, target=-76%
  await adjustY(239,  76, 'dec', '07-p2');
  // y=282 = SEPARATOR — skip
  // P3 (X=-50%):  y=325, target=-52%
  await adjustY(325,  52, 'dec', '08-p3');
  // P4 (X=-25%):  y=368, target=-27%
  await adjustY(368,  27, 'dec', '09-p4');
  // y=411 = SEPARATOR — skip
  // P5 (X=0%):    y=454, target=-3%  (at bottom edge, still tappable)
  await adjustY(454,   3, 'dec', '10-p5');

  await snap('11-after-p1-p5');

  // ── Third scroll 150px → P6 and P7 into view ─────────────────────────────────
  // P5→304, P6→347, [sep→390 skip], P7→433, P8→476
  await cdpTouchSwipeBitmap(page, 450, 300, 150);
  await snap('12-scroll-3');

  // P6 (X=25%):  y=347, target=+19%
  await adjustY(347,  19, 'inc', '13-p6');
  // y=390 = SEPARATOR — skip
  // P7 (X=50%):  y=433, target=+44%
  await adjustY(433,  44, 'inc', '14-p7');

  await snap('15-after-p6-p7');

  // ── Fourth scroll 150px → P8 and P9 into view ────────────────────────────────
  // P7→283, P8→326, [sep→369 skip], P9→412
  await cdpTouchSwipeBitmap(page, 450, 300, 150);
  await snap('16-scroll-4');

  // P8 (X=75%):   y=326, target=+68%
  await adjustY(326,  68, 'inc', '17-p8');
  // y=369 = SEPARATOR — skip
  // P9 (X=100%):  y=412, target=+86%
  await adjustY(412,  86, 'inc', '18-p9');

  await snap('19-all-done');

  // ── Back and download ─────────────────────────────────────────────────────────
  await goBack(page);
  await page.waitForTimeout(500);
  await snap('20-curves-list');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buf = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buf);
  console.log(`accumulated.bin saved: ${buf.length} bytes`);
  await snap('21-final');

  expect(buf.length).toBeGreaterThan(500);
});
