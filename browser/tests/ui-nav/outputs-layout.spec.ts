/**
 * Probe: Outputs screen layout and CH1 editor fields
 *
 * Goal:
 * 1. Confirm navigation to Outputs (Page 1 r2c1)
 * 2. Confirm CH1 row tap opens editor
 * 3. Identify all editor field y-coordinates via tap sweep
 * 4. Confirm direction toggle, control bar interactions
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToOutputs } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Outputs — list layout', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToOutputs(page);

  await snap(page, 'outputs-01-list.png');
});

test('probe: Outputs — CH1 editor field y-sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToOutputs(page);

  // Tap CH1 row to open editor — estimated x=200, y=112 (first row)
  await tapBitmap(page, 200, 112);
  await page.waitForTimeout(600);
  await snap(page, 'outputs-02-ch1-editor.png');

  // Tap value side (x=600) at candidate y positions to find each field
  for (const y of [100, 140, 180, 220, 260, 300, 340, 380, 420, 460]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `outputs-03-field-tap-y${y}.png`);
    // Dismiss any control bar with back arrow
    await tapBitmap(page, 25, 25);
    await page.waitForTimeout(400);
  }
});

test('probe: Outputs — direction toggle (x=615 y=250)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToOutputs(page);

  await tapBitmap(page, 200, 112);
  await page.waitForTimeout(600);
  await snap(page, 'outputs-04-before-toggle.png');

  // Direction toggle estimated at (615, 250)
  await tapBitmap(page, 615, 250);
  await page.waitForTimeout(500);
  await snap(page, 'outputs-05-after-toggle.png');
});
