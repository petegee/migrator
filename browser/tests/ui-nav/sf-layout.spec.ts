/**
 * Probe: Special Functions screen layout
 *
 * Goal:
 * 1. Confirm navigation to Special Functions (Page 2 swipe + r1c4)
 * 2. Find + header button position (guess: 569,69 like FM; alt: 400,266 like LS/Vars)
 * 3. See SF1 editor layout after adding via +
 * 4. Identify field y-coordinates — Action, State, Active condition, Global
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToSpecialFunctions } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: SF screen — list layout and + button position', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToSpecialFunctions(page);

  await snap(page, 'sf-01-list.png');

  // Try header + at (569, 69) first (same as FM/Mixes)
  await tapBitmap(page, 569, 69);
  await page.waitForTimeout(600);

  await snap(page, 'sf-02-after-tap-569-69.png');

  // If that failed (empty screen still), try centred + at (400, 266)
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await snap(page, 'sf-03-after-tap-400-266.png');
});

test('probe: SF editor — field y-sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToSpecialFunctions(page);

  // Try both + button positions to add SF1
  await tapBitmap(page, 569, 69);
  await page.waitForTimeout(400);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await snap(page, 'sf-04-editor-open.png');

  // Tap value side (x=600) at candidate y positions
  for (const y of [100, 130, 160, 190, 220, 250, 280, 310, 340, 370]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(400);
    await snap(page, `sf-05-field-tap-y${y}.png`);
  }
});
