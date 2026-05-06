/**
 * Probe: Edit Model screen — field layout and coordinates
 *
 * Goal:
 * 1. Confirm navigation to Edit Model (Page 1 r1c2)
 * 2. Identify all field y-coords via tap sweep at x=600 (value side)
 * 3. Confirm Name field opens keyboard (tap vs touch)
 * 4. Confirm Model type field opens picker
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToEditModel } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Edit Model — screen layout', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToEditModel(page);

  await snap(page, 'em-01-screen.png');

  // Sweep field rows at x=600 (value side) to identify y-coords
  for (const y of [80, 120, 160, 200, 240, 280, 320, 360, 400, 440]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `em-02-tap-y${y}.png`);
    // Dismiss any picker/keyboard that opened by tapping neutral area
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(300);
  }
});

test('probe: Edit Model — Name field keyboard (tap vs touch)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToEditModel(page);

  await snap(page, 'em-03-before-name-tap.png');

  // Name field is likely y≈80–120; try tapBitmap first (works for Outputs name)
  await tapBitmap(page, 600, 100);
  await page.waitForTimeout(600);
  await snap(page, 'em-04-after-name-tap.png');

  // If keyboard didn't open, try touchBitmap (required for FM name pencil icon)
  // We'll capture both and compare
  await tapBitmap(page, 400, 50); // dismiss
  await page.waitForTimeout(300);

  await touchBitmap(page, 600, 100);
  await page.waitForTimeout(600);
  await snap(page, 'em-05-after-name-touch.png');
});

test('probe: Edit Model — Model type picker', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToEditModel(page);

  // Model type is likely the 3rd or 4th field — tap y=200 and y=240
  await tapBitmap(page, 600, 200);
  await page.waitForTimeout(500);
  await snap(page, 'em-06-tap-y200.png');

  await tapBitmap(page, 400, 50); // dismiss
  await page.waitForTimeout(300);

  await tapBitmap(page, 600, 240);
  await page.waitForTimeout(500);
  await snap(page, 'em-07-tap-y240.png');
});
