/**
 * Probe: Trims screen — layout, field coords, and interaction types
 *
 * Goals:
 * 1. Confirm navigation to Trims (Model Setup Page 1 r2c3)
 * 2. Capture the initial Trims screen layout
 * 3. Sweep field rows to find Trim mode, Cross trim, Instant trim, Move to subtrims
 * 4. Open Trim mode picker — confirm options (Easy / Independent / Custom / OFF)
 * 5. Test interaction type (tap vs touch) for each field
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToTrims, goBack } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots/trims');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Trims — initial screen layout', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  await snap(page, '01-trims-screen.png');

  // Sweep all rows at x=600 (value/right side) to identify field positions
  for (const y of [80, 120, 160, 200, 240, 280, 320, 360, 400, 440]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(600);
    await snap(page, `02-tap-x600-y${y}.png`);
    // Dismiss by tapping neutral header area
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
});

test('probe: Trims — Trim mode picker (tap)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  await snap(page, '03-before-trim-mode.png');

  // Trim mode is expected to be the first/top field — try y=80, 120, 160
  for (const y of [80, 120, 160]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(600);
    await snap(page, `04-trim-mode-tap-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
});

test('probe: Trims — Cross trim field', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  // Cross trim expected around y=200–280 (second field group)
  for (const y of [200, 240, 280]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(600);
    await snap(page, `05-cross-trim-tap-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
});

test('probe: Trims — Instant trim and Move to subtrims', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  // These may be buttons rather than pickers — tap lower half of screen
  for (const y of [320, 360, 400, 440]) {
    await tapBitmap(page, 400, y);
    await page.waitForTimeout(600);
    await snap(page, `06-lower-tap-y${y}.png`);
    // Dismiss / go back if a dialog opened
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
});

test('probe: Trims — left side tap sweep (x=200)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  await snap(page, '07-before-left-sweep.png');

  // Some fields may have the value on the left; also check if there are per-axis rows
  for (const y of [80, 120, 160, 200, 240, 280, 320, 360, 400]) {
    await tapBitmap(page, 200, y);
    await page.waitForTimeout(600);
    await snap(page, `08-tap-x200-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
});
