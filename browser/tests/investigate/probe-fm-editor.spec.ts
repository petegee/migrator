import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToFlightModes, goBack } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
const snap = async (page: any, name: string) =>
  fs.writeFileSync(path.join(OUT, name), await page.locator('canvas').first().screenshot({ type: 'png' }));

// Probe A: what does the FM1 editor look like just after auto-open, and does
// the Name edit icon actually open a keyboard?
test('probe: FM1 editor keyboard after auto-open', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  await navigateToFlightModes(page);
  await tapBitmap(page, 569, 69); // "+" → FM1 editor auto-opens
  await page.waitForTimeout(800);

  await snap(page, 'fmk-01-editor.png');

  // Tap Name edit icon — try both mouse and touch at different positions
  // First: touch at (750, 71)
  await touchBitmap(page, 750, 71);
  await page.waitForTimeout(800);
  await snap(page, 'fmk-02-touch-750-71.png');

  // Second: touch at (780, 80) — more to the right/lower
  await touchBitmap(page, 780, 80);
  await page.waitForTimeout(800);
  await snap(page, 'fmk-03-touch-780-80.png');

  // Third: tap anywhere on the Name ROW (center) to see if it opens inline edit
  await touchBitmap(page, 400, 71);
  await page.waitForTimeout(800);
  await snap(page, 'fmk-04-touch-400-71.png');

  // Fourth: try bitmap y=83 which is row center
  await touchBitmap(page, 750, 83);
  await page.waitForTimeout(800);
  await snap(page, 'fmk-05-touch-750-83.png');
});

// Probe B: test single Edit tap from FM1 context menu using centered x=400
// and the range y=128-142 where "Edit" should be
test('probe: FM1 context menu Edit at x=400', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add FM1, go back (save FM1 with default name)
  await navigateToFlightModes(page);
  await tapBitmap(page, 569, 69);
  await page.waitForTimeout(600);
  await goBack(page);
  await page.waitForTimeout(400);

  // Open FM1 context menu via 4-tap sequence
  await navigateToFlightModes(page);
  await tapBitmap(page, 200, 148); // FM0 popup
  await page.waitForTimeout(500);
  await tapBitmap(page, 200, 165); // dismiss FM0 popup
  await page.waitForTimeout(500);
  await tapBitmap(page, 200, 165); // select FM1
  await page.waitForTimeout(500);
  await tapBitmap(page, 200, 165); // FM1 context menu
  await page.waitForTimeout(600);

  await snap(page, 'fmc-01-ctx-menu.png');

  // Tap "Edit" using TOUCH instead of mouse — popup items may need touch events
  await touchBitmap(page, 400, 132);
  await page.waitForTimeout(1500);
  await snap(page, 'fmc-02-touch-edit-132.png');

  // If still showing popup, try y=134 (estimated center)
  // (The previous tap should have dismissed it if it landed anywhere on popup)
});
