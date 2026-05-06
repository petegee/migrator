/**
 * Probe: Trims — scroll through all axes, confirm dialog buttons, header tap behaviour
 *
 * Goals:
 * 1. Scroll down to find all trim axes (Rudder, Elevator, Aileron, Throttle?)
 * 2. Confirm axis header tap toggle (collapse/expand)
 * 3. Check if the trim value (0%) on the left of the header row is tappable
 * 4. Find "Move trim to subtrim" confirm dialog Yes/No button bitmap coords
 * 5. Check Mode picker item y-coords (Easy mode / Independent per FM / Custom / OFF)
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, navigateToTrims, goBack } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots/trims');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Trims — scroll to find all axes', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  await snap(page, '10-scroll-start.png');

  // Collapse Rudder first to make room — tap the ▼ at (780, 80)
  await tapBitmap(page, 780, 80);
  await page.waitForTimeout(500);
  await snap(page, '11-rudder-collapsed.png');

  // Scroll down to expose more axes
  await swipeCanvas(page, 'up');
  await page.waitForTimeout(500);
  await snap(page, '12-after-swipe-up.png');

  await swipeCanvas(page, 'up');
  await page.waitForTimeout(500);
  await snap(page, '13-after-swipe-up2.png');

  await swipeCanvas(page, 'up');
  await page.waitForTimeout(500);
  await snap(page, '14-after-swipe-up3.png');
});

test('probe: Trims — header row: tap on 0% trim value (left side)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  await snap(page, '15-before-trim-val-tap.png');

  // The "0%" on the left of the Trim Rudder header — tap at x=150, y=80
  await tapBitmap(page, 150, 80);
  await page.waitForTimeout(600);
  await snap(page, '16-after-trim-val-tap-x150-y80.png');
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);

  // Also try touch
  await touchBitmap(page, 150, 80);
  await page.waitForTimeout(600);
  await snap(page, '17-after-trim-val-touch-x150-y80.png');
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
});

test('probe: Trims — confirm dialog Yes/No button coords', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  // Open the confirm dialog via "Move trim to subtrim" (y≈400)
  await tapBitmap(page, 400, 400);
  await page.waitForTimeout(600);
  await snap(page, '18-confirm-dialog.png');

  // Tap "No" — visually the "No" button is to the right of "Yes" in the dialog
  // Estimate: Yes at ~(395, 215), No at ~(450, 215) in bitmap
  await tapBitmap(page, 450, 215);
  await page.waitForTimeout(500);
  await snap(page, '19-after-no-tap.png');

  // Open dialog again, confirm Yes position
  await tapBitmap(page, 400, 400);
  await page.waitForTimeout(600);
  await snap(page, '20-confirm-dialog-again.png');

  // Tap "Yes"
  await tapBitmap(page, 390, 215);
  await page.waitForTimeout(500);
  await snap(page, '21-after-yes-tap.png');
});

test('probe: Trims — Mode picker item y-coords', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  // Open Mode picker at (600, 280)
  await tapBitmap(page, 600, 280);
  await page.waitForTimeout(600);
  await snap(page, '22-mode-picker-open.png');

  // Picker shows: Easy mode / Independent per FM / Custom / OFF
  // Sweep y to find each item's tap target
  for (const y of [130, 160, 190, 220, 250]) {
    await tapBitmap(page, 600, 280);  // reopen picker
    await page.waitForTimeout(400);
    await tapBitmap(page, 320, y);
    await page.waitForTimeout(500);
    await snap(page, `23-mode-picker-item-y${y}.png`);
    await page.waitForTimeout(300);
  }
});
