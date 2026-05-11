/**
 * curve-0 session-2: enter curve "Flm" (Custom 9-pt smooth)
 *
 * Fixes from session-1:
 *   1. Points picker: cdpTouchSwipeBitmap(320,270,90) WITHIN picker to scroll to "9", then tap y=300
 *   2. Right panel scroll: x=450 (fields panel), NOT x=200 (graph area)
 *   3. Y deltas from 0.0% default (all points default to 0%, not linear)
 *   4. Control bar: tap > once (0.1%→1% step) then decrement/increment
 *   5. Points section collapsible: must tap ">" to expand before rows appear
 *
 * ETX: name=flm, type=0 (custom), points=4 (+midpoints=9 total), smooth=1
 * Y values (from 0.0% default): [-100, -76, -52, -27, -3, 19, 44, 68, 86]
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, goBack } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';
const SC_DIR =
  '/home/pete/Source/ethos/migrator/test-results/curve-0-session-2';

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

test('curve-0 session-2: enter curve "Flm" Custom 9-pt smooth', async ({ page }) => {
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
  await tapBitmap(page, 54, 459);   // Home nav
  await page.waitForTimeout(800);

  // ── Phase 2: Navigate to Curves ──────────────────────────────────────────────
  await tapBitmap(page, 194, 459);  // Model Setup
  await page.waitForTimeout(800);
  await swipeCanvas(page, 'left');  // page 1 → page 2
  await page.waitForTimeout(1000);
  await tapBitmap(page, 100, 330);  // Curves tile (r2c1)
  await page.waitForTimeout(600);
  await snap('00-curves-empty');

  // ── Phase 3: Open curve editor ────────────────────────────────────────────────
  await tapBitmap(page, 400, 266);  // large + on empty list
  await page.waitForTimeout(700);
  await snap('01-editor-open');

  // ── Phase 4: Set Name = "Flm" ─────────────────────────────────────────────────
  await tapBitmap(page, 600, 80);   // name field → keyboard (no pencil icon needed)
  await page.waitForTimeout(600);
  await snap('02-kb-open');
  for (let i = 0; i < 10; i++) {
    await touchBitmap(page, 680, 395);  // Bksp
    await page.waitForTimeout(80);
  }
  await touchBitmap(page, 280, 340);  // F (auto-caps)
  await page.waitForTimeout(120);
  await touchBitmap(page, 40, 395);   // Shift → lowercase
  await page.waitForTimeout(120);
  await touchBitmap(page, 680, 340);  // l
  await page.waitForTimeout(120);
  await touchBitmap(page, 600, 395);  // m
  await page.waitForTimeout(120);
  await touchBitmap(page, 700, 450);  // ENTER
  await page.waitForTimeout(400);
  await tapBitmap(page, 400, 50);     // commit
  await page.waitForTimeout(300);
  await snap('03-name-set');

  // ── Phase 5: Set Type = Custom ────────────────────────────────────────────────
  await tapBitmap(page, 600, 140);  // Type field → picker
  await page.waitForTimeout(400);
  await snap('04-type-picker');
  await tapBitmap(page, 320, 320);  // Custom (confirmed session-1)
  await page.waitForTimeout(700);
  await snap('05-type-custom');

  // ── Phase 6: Set Points count = 9 ────────────────────────────────────────────
  // Picker shows 2–21, default 5 (visible: 2,3,4,5,6). "9" is off-screen below.
  // Scroll the picker DOWN (finger up) to bring "9" into view.
  await tapBitmap(page, 600, 220);  // Points count field → picker opens
  await page.waitForTimeout(500);
  await snap('06-points-picker-open');
  // Scroll picker: finger from y=270 to y=90 → 180px → "9" moves to ~y=300
  await cdpTouchSwipeBitmap(page, 320, 270, 90);
  await snap('07-picker-scrolled');
  await tapBitmap(page, 320, 300);  // tap "9"
  await page.waitForTimeout(700);
  await snap('08-points-9-selected');

  // ── Phase 7: Set Smooth = ON ──────────────────────────────────────────────────
  // Default is OFF. One tap → ON.
  await tapBitmap(page, 600, 300);  // Smooth toggle
  await page.waitForTimeout(300);
  await snap('09-smooth-on');

  // ── Phase 8: Snapshot editor overview ─────────────────────────────────────────
  await snap('10-editor-overview');

  // ── Phase 9: Scroll right panel to reveal Points section ─────────────────────
  // Use x=450 (fields panel center). Finger from y=420 to y=120 = 300px scroll.
  await cdpTouchSwipeBitmap(page, 450, 420, 120);
  await snap('11-after-scroll');

  // ── Phase 10: Expand Points section ──────────────────────────────────────────
  // Points header shows "Points >" (collapsed). Tap the ">" to expand.
  // After 300px scroll, header estimated at y≈197.
  await tapBitmap(page, 760, 197);  // tap ">" to expand
  await page.waitForTimeout(500);
  await snap('12-points-expanded');

  // ── Phase 11: Enter Y values ─────────────────────────────────────────────────
  // After expand, rows at y=183,226,269,312,355,398 (spacing 43px, x=650 for Y column).
  // Control bar: step-up at (395,456), decrement at (475,456), increment at (613,456).
  // Step: tap > once to go 0.1%→1%, then N taps at 1%/tap.

  const adjustY = async (
    rowY: number, taps: number, dir: 'dec' | 'inc', label: string,
  ) => {
    await tapBitmap(page, 650, rowY);   // tap Y column
    await page.waitForTimeout(400);
    await snap(`${label}-bar-open`);
    await tapBitmap(page, 395, 456);    // > step-up (0.1% → 1%)
    await page.waitForTimeout(200);
    const btnX = dir === 'dec' ? 475 : 613;
    for (let i = 0; i < taps; i++) {
      await tapBitmap(page, btnX, 456);
      await page.waitForTimeout(80);
    }
    await snap(`${label}-adjusted`);
    await tapBitmap(page, 400, 50);     // close bar
    await page.waitForTimeout(200);
  };

  // P1 (X=-100%): target=-100%, delta=-100, y=183
  await adjustY(183, 100, 'dec', '13-p1');

  // P2 (X=-75%): target=-76%, delta=-76, y=226
  await adjustY(226, 76, 'dec', '14-p2');

  // P3 (X=-50%): target=-52%, delta=-52, y=269
  await adjustY(269, 52, 'dec', '15-p3');

  // P4 (X=-25%): target=-27%, delta=-27, y=312
  await adjustY(312, 27, 'dec', '16-p4');

  // P5 (X=0%): target=-3%, delta=-3, y=355
  await adjustY(355, 3, 'dec', '17-p5');

  // P6 (X=25%): target=+19%, delta=+19, y=398
  await adjustY(398, 19, 'inc', '18-p6');

  await snap('19-after-p1-p6');

  // ── Phase 12: Second scroll for P7-P9 ────────────────────────────────────────
  await cdpTouchSwipeBitmap(page, 450, 420, 205);  // ~215px more scroll
  await page.waitForTimeout(500);
  await snap('20-scroll-2');

  // After 215px more scroll: P7≈y270, P8≈y313, P9≈y356
  // P7 (X=50%): target=+44%, delta=+44
  await adjustY(270, 44, 'inc', '21-p7');

  // P8 (X=75%): target=+68%, delta=+68
  await adjustY(313, 68, 'inc', '22-p8');

  // P9 (X=100%): target=+86%, delta=+86
  await adjustY(356, 86, 'inc', '23-p9');

  await snap('24-all-points-done');

  // ── Phase 13: Back and download ───────────────────────────────────────────────
  await goBack(page);               // exit curve editor → curves list
  await page.waitForTimeout(500);
  await snap('25-curves-list');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buf = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buf);
  console.log(`accumulated.bin saved: ${buf.length} bytes`);
  await snap('26-final');

  expect(buf.length).toBeGreaterThan(500);
});
