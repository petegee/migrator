/**
 * Probe: Curves screen layout and editor field map
 *
 * Goals:
 * 1. Confirm navigation to Curves (Page 2 swipe + r2c1)
 * 2. Confirm + button position (large centred, y=266 expected by pattern)
 * 3. See Curve editor layout after adding via +
 * 4. Identify all editor field y-coordinates via tap sweep
 * 5. Open the Type picker and capture picker item positions
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToCurves } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Curves — list and + button', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToCurves(page);

  await snap(page, 'curves-01-list.png');

  // Pattern from Vars/LS/SF: empty-list + is a large centred icon at (400, 266)
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await snap(page, 'curves-02-after-plus.png');
});

test('probe: Curves — editor field y-sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToCurves(page);

  // Add Curve1
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await snap(page, 'curves-03-editor-open.png');

  // Tap value side (x=600) at candidate y positions to map field rows
  for (const y of [80, 110, 140, 170, 200, 230, 260, 290, 320, 350, 380, 410]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `curves-04-field-tap-y${y}.png`);
  }
});

test('probe: Curves — Type picker (Expo/Function/Custom)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToCurves(page);

  // Add Curve1
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await snap(page, 'curves-05-editor-for-type.png');

  // Type field is expected near the top (row 2 in editor, after Name)
  // Try x=600 across likely y range for the Type field
  for (const y of [110, 140, 160]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `curves-06-type-tap-y${y}.png`);
  }
});
