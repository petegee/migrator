/**
 * curve-0 session-1: enter curve "flm" (Custom 9-pt smooth)
 *
 * ETX: name=flm, type=0 (custom), points=4 (+midpoints → 9 total), smooth=1
 * Y values: [-100, -76, -52, -27, -3, 19, 44, 68, 86]
 *
 * Upload is broken (goes to wrong slot) — fresh model each session.
 * Focused session: wizard + curve only (no prior primitive rebuild).
 *
 * Key unknowns documented via screenshots:
 *   - Points picker item positions
 *   - Points table row positions after scroll
 *   - Whether endpoint Y values are editable
 *   - Default Y values for new Custom curve
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, goBack } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';
const SC_DIR =
  '/home/pete/Source/ethos/migrator/test-results/curve-0-session-1';

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

test('curve-0 session-1: enter curve "flm" Custom 9-pt smooth', async ({ page }) => {
  fs.mkdirSync(SC_DIR, { recursive: true });
  let si = 0;
  const snap = async (label: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    fs.writeFileSync(`${SC_DIR}/${String(si++).padStart(2, '0')}-${label}.png`, buf);
    console.log(`snap: ${String(si - 1).padStart(2, '0')}-${label}`);
  };

  // ── Phase 1: Boot + fresh Glider model ───────────────────────────────────
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await tapBitmap(page, 54, 459);   // Home nav
  await page.waitForTimeout(800);
  await snap('00-home');

  // ── Phase 2: Navigate to Curves ──────────────────────────────────────────
  await tapBitmap(page, 194, 459);  // Model Setup
  await page.waitForTimeout(800);
  await swipeCanvas(page, 'left');  // page 1 → page 2
  await page.waitForTimeout(1000);
  await tapBitmap(page, 100, 330);  // Curves tile (r2c1)
  await page.waitForTimeout(600);
  await snap('01-curves-empty');

  // ── Phase 3: Open curve editor ────────────────────────────────────────────
  await tapBitmap(page, 400, 266);  // large + on empty list
  await page.waitForTimeout(700);
  await snap('02-editor-open');

  // ── Phase 4: Set Name ─────────────────────────────────────────────────────
  // tapBitmap opens keyboard directly (unlike Vars pencil icon)
  await tapBitmap(page, 600, 80);   // name field → keyboard
  await page.waitForTimeout(600);
  await snap('03-kb-open');
  // Clear any default name
  for (let i = 0; i < 10; i++) {
    await touchBitmap(page, 680, 395);  // Bksp
    await page.waitForTimeout(80);
  }
  // Type "Flm" — F auto-caps, then shift→lowercase for l m
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
  await snap('04-name-set');

  // ── Phase 5: Set Type = Custom ────────────────────────────────────────────
  await tapBitmap(page, 600, 140);  // Type field → picker
  await page.waitForTimeout(400);
  await snap('05-type-picker');
  await tapBitmap(page, 320, 320);  // Custom (confirmed y=320)
  await page.waitForTimeout(700);
  await snap('06-type-custom');

  // ── Phase 6: Set Points count = 9 (default is 5) ─────────────────────────
  // Picker: 2–21. Estimated with 5 centered:
  //   5=y≈280, 6=325, 7=370, 8=415, 9=460
  await tapBitmap(page, 600, 220);  // Points count field
  await page.waitForTimeout(400);
  await snap('07-points-picker');
  await tapBitmap(page, 400, 460);  // try "9" at y=460
  await page.waitForTimeout(600);
  await snap('08-points-selected');

  // ── Phase 7: Toggle Smooth ON ─────────────────────────────────────────────
  // Smooth is at y=300. Default unknown — tap once (expect OFF→ON).
  await tapBitmap(page, 600, 300);  // Smooth toggle
  await page.waitForTimeout(300);
  await snap('09-smooth-after-toggle');

  // Snapshot full editor state (check Points count, Smooth, Easy mode values)
  await snap('10-editor-overview');

  // ── Phase 8: Scroll to reveal points table ────────────────────────────────
  // Offset at y=420 unscrolled. Scroll 320px finger up to reveal table.
  await cdpTouchSwipeBitmap(page, 200, 420, 100);
  await page.waitForTimeout(700);
  await snap('11-scroll-1');

  // ── Phase 9: Enter Y values ───────────────────────────────────────────────
  // Estimated row positions after 320px scroll (rows start at ~y=170, 50px apart):
  //   P1(y≈170) P2(y≈220) P3(y≈270) P4(y≈320) P5(y≈370) P6(y≈420) P7+(off-screen)
  //
  // Control bar (confirmed output-0): > step-up at bx=395, - at bx=475, y=456
  // NOTE: Endpoints (P1, P9) may be locked and non-editable.

  const adjustY = async (rowY: number, decrements: number, label: string) => {
    await tapBitmap(page, 380, rowY);   // tap Y column in row
    await page.waitForTimeout(400);
    await snap(`${label}-bar-open`);
    if (decrements > 0) {
      await tapBitmap(page, 395, 456);  // > step-up (0.1%→1%)
      await page.waitForTimeout(200);
      for (let i = 0; i < decrements; i++) {
        await tapBitmap(page, 475, 456);  // - decrement
        await page.waitForTimeout(80);
      }
      await snap(`${label}-adjusted`);
    }
    await tapBitmap(page, 400, 50);     // close bar
    await page.waitForTimeout(200);
  };

  // P1 (X=-100): default -100, target -100 → no change (endpoint may be locked)
  await adjustY(170, 0, '12-p1');

  // P2 (X=-75): target=-76, default=-75, delta=-1
  await adjustY(220, 1, '13-p2');

  // P3 (X=-50): target=-52, default=-50, delta=-2
  await adjustY(270, 2, '14-p3');

  // P4 (X=-25): target=-27, default=-25, delta=-2
  await adjustY(320, 2, '15-p4');

  // P5 (X=0): target=-3, default=0, delta=-3
  await adjustY(370, 3, '16-p5');

  // P6 (X=25): target=19, default=25, delta=-6
  await adjustY(420, 6, '17-p6');

  await snap('18-after-p1-p6');

  // ── Phase 10: Second scroll for P7, P8, P9 ───────────────────────────────
  await cdpTouchSwipeBitmap(page, 200, 400, 200);  // 200px more
  await page.waitForTimeout(700);
  await snap('19-scroll-2');

  // After 200px more scroll, rows shift up ~200px:
  //   P7 was at ≈470 (off), now ≈270
  //   P8 was at ≈520 (off), now ≈320
  //   P9 was at ≈570 (off), now ≈370

  // P7 (X=50): target=44, default=50, delta=-6
  await adjustY(270, 6, '20-p7');

  // P8 (X=75): target=68, default=75, delta=-7
  await adjustY(320, 7, '21-p8');

  // P9 (X=100): target=86, default=100, delta=-14 (endpoint — may be locked)
  await adjustY(370, 14, '22-p9');

  await snap('23-all-points-attempted');

  // ── Phase 11: Download + save ─────────────────────────────────────────────
  await tapBitmap(page, 400, 50);   // deselect
  await goBack(page);               // exit curve editor → curves list
  await page.waitForTimeout(400);
  await snap('24-curves-list');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buf = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buf);
  console.log(`accumulated.bin saved: ${buf.length} bytes`);

  expect(buf.length).toBeGreaterThan(500);
});
