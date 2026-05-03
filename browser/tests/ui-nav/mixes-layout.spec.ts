/**
 * Probe: Mixes screen — full layout confirmation
 *
 * Goals:
 * 1. Confirm navigation to Mixes (Model Setup Page 1, r1c4)
 * 2. Confirm + header button position → type picker
 * 3. Confirm "Free mix" item in type picker
 * 4. Confirm placement picker → mix editor opens
 * 5. Field sweep to identify all mix editor field y-coords
 * 6. Back to list → context menu via double-tap
 * 7. Context menu "Edit" opens editor
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToMixes, goBack } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Mixes — empty list and + button', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);

  await snap(page, 'mixes-01-empty-list.png');

  // Tap + header button (estimated same pattern as other screens: x=563, y=69)
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(600);

  await snap(page, 'mixes-02-after-plus.png');
});

test('probe: Mixes — type picker and placement picker', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);

  // Open type picker
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(600);
  await snap(page, 'mixes-03-type-picker.png');

  // Select "Free mix" (estimated x=100, y=101 — first item in picker)
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(600);
  await snap(page, 'mixes-04-after-free-mix.png');

  // Placement picker: try "Last position" (estimated x=396, y=186)
  await tapBitmap(page, 396, 186);
  await page.waitForTimeout(600);
  await snap(page, 'mixes-05-after-placement.png');
});

test('probe: Mixes — mix editor field y-sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);

  // Add a free mix via + → type picker → placement picker
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(600);
  await tapBitmap(page, 100, 101);  // "Free mix"
  await page.waitForTimeout(600);
  await tapBitmap(page, 396, 186);  // "Last position"
  await page.waitForTimeout(800);

  await snap(page, 'mixes-06-editor-open.png');

  // Sweep x=600 across y positions to identify field rows
  for (const y of [80, 120, 160, 200, 240, 280, 320, 360, 400, 430]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(400);
    await snap(page, `mixes-07-field-tap-y${y}.png`);
    // Dismiss any opened picker/control-bar by tapping the back arrow area
    await tapBitmap(page, 25, 25);
    await page.waitForTimeout(300);
    // If back dismissed the editor entirely, re-enter it
    // (We'll check the screenshots — just keep going for now)
  }
});

test('probe: Mixes — list context menu', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);

  // Add a free mix so there's a row to tap
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(600);
  await tapBitmap(page, 100, 101);  // "Free mix"
  await page.waitForTimeout(600);
  await tapBitmap(page, 396, 186);  // placement
  await page.waitForTimeout(600);

  // Go back to the list
  await goBack(page);
  await page.waitForTimeout(400);
  await snap(page, 'mixes-08-list-with-mix.png');

  // First tap → highlight the row (estimated x=200, y=116)
  await tapBitmap(page, 200, 116);
  await page.waitForTimeout(400);
  await snap(page, 'mixes-09-row-highlighted.png');

  // Second tap → context menu
  await tapBitmap(page, 200, 116);
  await page.waitForTimeout(400);
  await snap(page, 'mixes-10-context-menu.png');

  // Tap "Edit" (estimated x=320, y=167)
  await tapBitmap(page, 320, 167);
  await page.waitForTimeout(600);
  await snap(page, 'mixes-11-after-edit.png');
});
