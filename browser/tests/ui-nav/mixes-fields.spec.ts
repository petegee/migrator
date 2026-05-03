/**
 * Probe: Mixes editor field sweep (corrected)
 *
 * Goals:
 * 1. Field y-sweep at x=350 (left panel — x=600 is inside the graph panel)
 * 2. Confirm context menu Edit at corrected coords (~400, 135)
 * 3. Confirm Name field pencil icon (touch vs tap, like FM editor)
 * 4. Identify Source picker layout
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
  await tapBitmap(page, 563, 69);   // + header
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 101);  // Free mix
  await page.waitForTimeout(500);
  await tapBitmap(page, 396, 186);  // Last position
  await page.waitForTimeout(700);
}

test('probe: Mixes editor — field y-sweep at x=350', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openFreeMixEditor(page);

  await snap(page, 'mixes2-01-editor-open.png');

  // Sweep x=350 (left/centre of left panel) — no dismiss between taps
  // Each tap may open a picker or control bar; next tap at different y will close it
  for (const y of [80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 310, 340, 370]) {
    await tapBitmap(page, 350, y);
    await page.waitForTimeout(500);
    await snap(page, `mixes2-02-field-tap-y${y}.png`);
  }
});

test('probe: Mixes editor — Name field pencil (tap vs touch)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openFreeMixEditor(page);

  await snap(page, 'mixes2-03-name-field-before.png');

  // Try tapBitmap on the pencil/edit icon (right side of Name row, ~x=400 y=80)
  await tapBitmap(page, 400, 80);
  await page.waitForTimeout(500);
  await snap(page, 'mixes2-04-name-tap-400-80.png');

  // If no keyboard, try touchBitmap
  await touchBitmap(page, 400, 80);
  await page.waitForTimeout(500);
  await snap(page, 'mixes2-05-name-touch-400-80.png');
});

test('probe: Mixes editor — Source picker flow', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openFreeMixEditor(page);

  // Source field is the 3rd row — tap at x=350, estimated y=160
  await tapBitmap(page, 350, 160);
  await page.waitForTimeout(600);
  await snap(page, 'mixes2-06-source-picker-open.png');

  // Source picker shows compact list — second tap expands to full list
  await tapBitmap(page, 350, 160);
  await page.waitForTimeout(600);
  await snap(page, 'mixes2-07-source-picker-expanded.png');
});

test('probe: Mixes context menu — Edit at corrected coords', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openFreeMixEditor(page);

  // Go back to list — Free mix row will be pre-selected
  await tapBitmap(page, 25, 25);
  await page.waitForTimeout(400);
  await snap(page, 'mixes2-08-list-preselected.png');

  // Single tap on already-selected row → context menu
  await tapBitmap(page, 200, 95);
  await page.waitForTimeout(400);
  await snap(page, 'mixes2-09-context-menu.png');

  // Tap Edit at corrected estimate: x=400, y=135
  await tapBitmap(page, 400, 135);
  await page.waitForTimeout(600);
  await snap(page, 'mixes2-10-after-edit.png');
});
