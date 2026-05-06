/**
 * var-0 session-5: Create Rudder var with analog Values source.
 *
 * KEY FINDING: Mouse hold 1200ms on Values ≡ (x=449, y=390) opens popup:
 *   "Values" title / Maximum / Minimum / Use a source
 * Then "Use a source" → source category picker → Analogs → Rudder.
 *
 * ETX: name=Rudder, srcRaw=Rud, weight=80, swtch=NONE → single-rate.
 */

import { test, expect } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToVars, goBack } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';
import * as fs from 'fs';
import * as path from 'path';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';
const SC_DIR = path.join(__dirname, '../../../test-results/var-0-session-5');

test('var-0 session-5: Rudder var with analog source', async ({ page }) => {
  fs.mkdirSync(SC_DIR, { recursive: true });

  const snap = async (name: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    fs.writeFileSync(path.join(SC_DIR, name), buf);
    console.log(`snap: ${name}`);
  };

  async function longHoldBitmap(bx: number, by: number, holdMs = 1200): Promise<void> {
    const rect = await page.evaluate(() => {
      const c = [...document.querySelectorAll('canvas')]
        .find(cv => cv.getContext('webgl') || cv.getContext('webgl2'));
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

  // ── 1. Boot + fresh model ──────────────────────────────────────────────────
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await snap('s5-01-home.png');

  // ── 2. Navigate to Vars ────────────────────────────────────────────────────
  await navigateToVars(page);
  await page.waitForTimeout(500);
  await snap('s5-02-vars-empty.png');

  // ── 3. Open Var editor ─────────────────────────────────────────────────────
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(700);
  await snap('s5-03-editor-open.png');

  // ── 4. Set Name = "Rudder" ────────────────────────────────────────────────
  // The Name row has a pencil icon at the far right (bitmap x≈750, y≈107).
  // tapBitmap on the pencil icon opens the Name keyboard.
  // Must be done BEFORE Comment (which scrolls the editor).
  // Key presses use touchBitmap — same coords as Comment keyboard.
  await tapBitmap(page, 738, 139);
  await page.waitForTimeout(700);
  await snap('s5-04-name-keyboard.png');

  await touchBitmap(page, 280, 315);  // R (auto-caps)
  await page.waitForTimeout(150);
  await touchBitmap(page, 40, 395);   // Shift → lowercase
  await page.waitForTimeout(150);
  await touchBitmap(page, 520, 315);  // u
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 340);  // d
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 340);  // d
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 315);  // e
  await page.waitForTimeout(150);
  await touchBitmap(page, 280, 315);  // r
  await page.waitForTimeout(200);
  await touchBitmap(page, 700, 450);  // ENTER
  await page.waitForTimeout(600);
  await snap('s5-04b-name-set.png');

  await tapBitmap(page, 400, 50);    // commit focus
  await page.waitForTimeout(400);
  await snap('s5-04c-after-name.png');

  // ── 5. Long-hold Values ≡ → popup (1200ms required) ───────────────────────
  // Confirmed: x=449, y=390 (bitmap) is the ≡ icon in the Values row.
  // 1200ms opens: "Values" popup with Maximum / Minimum / Use a source.
  await longHoldBitmap(449, 390, 1200);
  await snap('s5-05-values-popup.png');
  // Expected: popup with title "Values" and items Maximum / Minimum / Use a source

  // ── 5. Tap "Use a source" ──────────────────────────────────────────────────
  // Popup layout (3 items, each ~43px CSS tall, starting at y≈140 CSS):
  //   "Maximum"     center ≈ y=201 bitmap
  //   "Minimum"     center ≈ y=255 bitmap
  //   "Use a source" center ≈ y=308 bitmap
  await tapBitmap(page, 397, 308);
  await page.waitForTimeout(700);
  await snap('s5-05-after-use-a-source.png');
  // Expected: source category picker opens

  // ── 6. Touch "--- ▼" to open source category picker ─────────────────────
  // After "Use a source", Values shows "--- ▼" source dropdown.
  // The dropdown button is in the left part of the Values right cell.
  // Confirmed x≈510, y≈395 (bitmap) from screenshot.
  await touchBitmap(page, 510, 395);
  await page.waitForTimeout(700);
  await snap('s5-06-source-picker.png');
  // Expected: source category picker (---/Analogs/Switches/Trims/...)

  // ── 7. Select Analogs category ────────────────────────────────────────────
  // Based on Mix source picker layout: Analogs at y≈207 bitmap.
  await tapBitmap(page, 320, 207);
  await page.waitForTimeout(700);
  await snap('s5-07-after-analogs.png');
  // Expected: two-column Category/Member view, or analog list

  // ── 8. Select Rudder (first analog item) ──────────────────────────────────
  // From Mix spec: first item in right column at x≈440, y≈204
  await tapBitmap(page, 440, 204);
  await page.waitForTimeout(700);
  await snap('s5-08-after-rudder.png');
  // Expected: Values field shows "Rudder" analog source

  // ── 9. Tap neutral area to commit ─────────────────────────────────────────
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
  await snap('s5-09-values-confirmed.png');

  // ── 10. Set Comment = "Rudder" ────────────────────────────────────────────
  await tapBitmap(page, 600, 267);
  await page.waitForTimeout(700);
  await snap('s5-09-keyboard-open.png');

  await touchBitmap(page, 280, 315);  // R (auto-caps)
  await page.waitForTimeout(150);
  await touchBitmap(page, 40, 395);   // Shift → lowercase
  await page.waitForTimeout(150);
  await touchBitmap(page, 520, 315);  // u
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 340);  // d
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 340);  // d
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 315);  // e
  await page.waitForTimeout(150);
  await touchBitmap(page, 280, 315);  // r
  await page.waitForTimeout(200);

  await touchBitmap(page, 700, 450);  // ENTER
  await page.waitForTimeout(600);
  await snap('s5-11-comment-set.png');

  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);

  // ── 11. Return to list ────────────────────────────────────────────────────
  await goBack(page);
  await page.waitForTimeout(500);
  await snap('s5-12-vars-list.png');

  // ── 11. Download ──────────────────────────────────────────────────────────
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);

  const buffer = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buffer);
  console.log(`Saved accumulated.bin (${buffer.length} bytes)`);

  await snap('s5-13-final.png');
  expect(buffer.length).toBeGreaterThan(100);
});
