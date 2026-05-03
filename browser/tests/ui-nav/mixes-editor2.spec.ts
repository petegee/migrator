/**
 * Probe: Mixes editor — Operation field, weight, context menu Edit
 *
 * Goals:
 * 1. Operation field y-coord (~240) — tap at y≥220 to skip Source row
 * 2. Always-on Weight row y-coord (~320) — tap vs touch
 * 3. Context menu Edit confirmed: open menu then tap Edit at measured (~350, 135)
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

async function openFreeMixEditor(page: any) {
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);   // + header → Mixes library
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 101);  // Free mix tile
  await page.waitForTimeout(500);
  await tapBitmap(page, 396, 186);  // Last position
  await page.waitForTimeout(700);
}

test('probe: Mixes editor — Operation field and Actions weight', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openFreeMixEditor(page);

  await snap(page, 'mixes3-01-editor-open.png');

  // Skip Source row (y≈165-212). Start sweep at y=230 (Operation row estimate ~240)
  for (const y of [230, 245, 260, 300, 320, 340, 360, 380]) {
    await tapBitmap(page, 350, y);
    await page.waitForTimeout(500);
    await snap(page, `mixes3-02-field-tap-y${y}.png`);
  }
});

test('probe: Mixes editor — Operation field with touch', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openFreeMixEditor(page);

  // Try touch on Operation (Add ▼) — same row, estimate y=245
  await touchBitmap(page, 350, 245);
  await page.waitForTimeout(500);
  await snap(page, 'mixes3-03-operation-touch-245.png');
});

test('probe: Mixes context menu — open then tap Edit', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openFreeMixEditor(page);

  // Go back to list (Free mix row will be pre-selected)
  await tapBitmap(page, 25, 25);
  await page.waitForTimeout(400);
  await snap(page, 'mixes3-04-list-preselected.png');

  // Tap on pre-selected row to open context menu (y=116 confirmed from first probe)
  await tapBitmap(page, 200, 116);
  await page.waitForTimeout(400);
  await snap(page, 'mixes3-05-context-menu.png');

  // Tap Edit: popup x-center ~350 (bitmap), Edit row y≈135 (bitmap)
  await tapBitmap(page, 350, 135);
  await page.waitForTimeout(600);
  await snap(page, 'mixes3-06-after-edit-tap.png');
});

test('probe: Mixes — placement picker coords', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);

  // Open Mixes library
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(500);

  // Tap Free mix
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(500);
  await snap(page, 'mixes3-07-placement-picker.png');

  // Tap "First position" (measured y≈131 bitmap from earlier screenshot)
  await tapBitmap(page, 320, 131);
  await page.waitForTimeout(600);
  await snap(page, 'mixes3-08-first-position.png');
});
