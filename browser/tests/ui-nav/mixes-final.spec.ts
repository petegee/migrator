/**
 * Probe: Mixes — popup interaction and remaining fields
 *
 * Goals:
 * 1. Placement picker items: try touchBitmap (tapBitmap missed at y=131)
 * 2. Context menu "Edit": try touchBitmap at y=140
 * 3. Operation field: tap y=310 (fresh editor, skip Source range)
 * 4. Always on Weight field: tap then touch at y=390
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToMixes } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: placement picker — touchBitmap for First position', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);

  await tapBitmap(page, 563, 69);    // + header
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 101);   // Free mix
  await page.waitForTimeout(500);

  await snap(page, 'mixes4-01-placement-popup.png');

  // touchBitmap "First position" (center y≈141)
  await touchBitmap(page, 320, 141);
  await page.waitForTimeout(600);
  await snap(page, 'mixes4-02-first-position-touch.png');
});

test('probe: context menu Edit — touchBitmap at y=140', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);

  // Add free mix, go back to list (row pre-selected)
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(500);
  await tapBitmap(page, 396, 186);
  await page.waitForTimeout(700);
  await tapBitmap(page, 25, 25);     // back to list
  await page.waitForTimeout(400);

  // Tap pre-selected row → context menu
  await tapBitmap(page, 200, 116);
  await page.waitForTimeout(400);
  await snap(page, 'mixes4-03-context-menu.png');

  // touchBitmap "Edit" at y=140
  await touchBitmap(page, 350, 140);
  await page.waitForTimeout(600);
  await snap(page, 'mixes4-04-after-edit-touch.png');
});

test('probe: Operation field — tap y=310 (fresh, skip Source)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);

  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(500);
  await tapBitmap(page, 396, 186);
  await page.waitForTimeout(700);

  await snap(page, 'mixes4-05-editor-fresh.png');

  // Tap Operation field directly (y=310, skipping Source range 165-275)
  await tapBitmap(page, 350, 310);
  await page.waitForTimeout(500);
  await snap(page, 'mixes4-06-operation-tap-310.png');
});

test('probe: Always on Weight — tap then touch at y=390', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);

  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(500);
  await tapBitmap(page, 396, 186);
  await page.waitForTimeout(700);

  // tapBitmap on weight (y=390)
  await tapBitmap(page, 350, 390);
  await page.waitForTimeout(500);
  await snap(page, 'mixes4-07-weight-tap-390.png');

  // touchBitmap on weight (y=390)
  await touchBitmap(page, 350, 390);
  await page.waitForTimeout(500);
  await snap(page, 'mixes4-08-weight-touch-390.png');
});
