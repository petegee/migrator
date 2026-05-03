/**
 * Probe: Curves — type-specific editor layouts
 *
 * Goals:
 * 1. Select Expo type → screenshot field layout
 * 2. Sweep y-coords on Expo editor to map fields (Weight, Offset, Expo%)
 * 3. Select Custom type → screenshot field layout
 * 4. Confirm Type picker item y-coords
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToCurves, goBack } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

// Helper: open Type picker (fresh from editor-open state)
async function openTypePicker(page: any) {
  await tapBitmap(page, 600, 140);   // Type field
  await page.waitForTimeout(500);
}

test('probe: Curves Expo — field layout', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToCurves(page);

  // Add curve
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await snap(page, 'curves-expo-01-editor-base.png');

  // Open Type picker
  await openTypePicker(page);
  await snap(page, 'curves-expo-02-type-picker-open.png');

  // Select Expo (picker item 2, estimated y≈225)
  await tapBitmap(page, 320, 225);
  await page.waitForTimeout(600);
  await snap(page, 'curves-expo-03-expo-selected.png');

  // Sweep value-side (x=600) to map Expo editor fields
  for (const y of [80, 140, 180, 220, 260, 300, 340, 380]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `curves-expo-04-tap-y${y}.png`);
  }
});

test('probe: Curves Function — field layout', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToCurves(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await openTypePicker(page);

  // Select Function (picker item 3, estimated y≈270)
  await tapBitmap(page, 320, 270);
  await page.waitForTimeout(600);
  await snap(page, 'curves-func-01-selected.png');

  // Sweep y to map fields
  for (const y of [80, 140, 180, 220, 260, 300]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `curves-func-02-tap-y${y}.png`);
  }
});

test('probe: Curves Custom — field layout', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToCurves(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await openTypePicker(page);

  // Select Custom (picker item 4, estimated y≈315)
  await tapBitmap(page, 320, 315);
  await page.waitForTimeout(600);
  await snap(page, 'curves-custom-01-selected.png');

  // Sweep y to map fields (Custom has more: Points count, Smooth, Easy mode, Offset, point table)
  for (const y of [80, 140, 180, 220, 260, 300, 340, 380, 420]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `curves-custom-02-tap-y${y}.png`);
  }
});

test('probe: Curves — Type picker item y-coords (precise)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToCurves(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  // Open Type picker
  await openTypePicker(page);
  await snap(page, 'curves-picker-01-open.png');

  // Try each candidate y to confirm what gets selected
  for (const y of [150, 160, 170, 210, 225, 240, 255, 270, 290, 310, 320]) {
    // Need to re-open picker each time
    await openTypePicker(page);
    await page.waitForTimeout(300);
    await tapBitmap(page, 320, y);
    await page.waitForTimeout(600);
    await snap(page, `curves-picker-02-tap-y${y}.png`);
  }
});
