/**
 * Probe: Logic Switches screen layout
 *
 * Goal:
 * 1. Confirm navigation to Logic Switches (Page 2 swipe + r1c3)
 * 2. Confirm + button position (large centred, same as Vars)
 * 3. See LS1 editor layout after adding via +
 * 4. Identify all editor field y-coordinates via tap sweep
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToLogicSwitches } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: LS screen — list layout and + button position', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToLogicSwitches(page);

  await snap(page, 'ls-01-list.png');

  // Confirmed from 14-logic-switches-add.spec.ts: centred + at (400, 266)
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await snap(page, 'ls-02-after-plus-400-266.png');
});

test('probe: LS editor — field y-sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToLogicSwitches(page);

  // Add LS1 via centred + button
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await snap(page, 'ls-03-editor-open.png');

  // Tap value side (x=600) at candidate y positions for each field row
  for (const y of [120, 150, 180, 210, 240, 270, 300, 330, 360]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(400);
    await snap(page, `ls-04-field-tap-y${y}.png`);
  }
});
