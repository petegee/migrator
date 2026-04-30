/**
 * Probe: diagnose Var Name keyboard interaction step by step.
 * Saves screenshots to disk to see keyboard state after each keystroke.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToVars, goBack } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
const snap = async (page: any, name: string) =>
  fs.writeFileSync(path.join(OUT, name), await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: var name keyboard typing', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add one Var
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(1000);
  await goBack(page);
  await page.waitForTimeout(300);

  // Open editor
  await navigateToVars(page);
  await tapBitmap(page, 200, 116); // context menu
  await page.waitForTimeout(400);
  await snap(page, 'vk-01-context-menu.png');

  await tapBitmap(page, 320, 167); // Edit
  await page.waitForTimeout(400);
  await snap(page, 'vk-02-editor.png');

  // Open Name keyboard
  await tapBitmap(page, 738, 139);
  await page.waitForTimeout(600);
  await snap(page, 'vk-03-keyboard-open.png');

  // Type "T" — keyboard is ~50px lower in Var editor (Comment input row above keyboard)
  await tapBitmap(page, 360, 310);
  await page.waitForTimeout(200);
  await snap(page, 'vk-04-after-T.png');

  // Type "E"
  await tapBitmap(page, 200, 310);
  await page.waitForTimeout(200);
  await snap(page, 'vk-05-after-E.png');

  // Type "S"
  await tapBitmap(page, 160, 360);
  await page.waitForTimeout(200);
  await snap(page, 'vk-06-after-S.png');

  // Type "T"
  await tapBitmap(page, 360, 310);
  await page.waitForTimeout(200);
  await snap(page, 'vk-07-after-TEST.png');

  // Press ENTER
  await tapBitmap(page, 700, 455);
  await page.waitForTimeout(400);
  await snap(page, 'vk-08-after-enter.png');

  // Also try: Mixes source picker
});

test('probe: mixes source picker', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add Free mix
  const { navigateToMixes } = await import('../helpers/navigate');
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(400);
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(400);
  await tapBitmap(page, 396, 186);
  await page.waitForTimeout(600);
  await goBack(page);
  await page.waitForTimeout(300);

  // Open Free mix editor
  await navigateToMixes(page);
  await tapBitmap(page, 200, 116); // context menu
  await page.waitForTimeout(400);
  await snap(page, 'ms-01-ctx-menu.png');

  await tapBitmap(page, 320, 167); // Edit
  await page.waitForTimeout(400);
  await snap(page, 'ms-02-editor.png');

  // Tap Source dropdown — x=350 (CSS 280) inside "--- ▼" button, y=207 center of Source row
  await tapBitmap(page, 350, 207);
  await page.waitForTimeout(500);
  await snap(page, 'ms-03-source-picker.png');

  // Re-open picker to explore category items
  await tapBitmap(page, 350, 207);
  await page.waitForTimeout(500);
  await snap(page, 'ms-04-picker-reopen.png');

  // Picker shows: "---"(y≈162), "Analogs"(y≈207), "Switches"(y≈256), "Trims"(y≈306)
  // Tap "Analogs" at y≈207 (left/center of popup row)
  await tapBitmap(page, 280, 207);
  await page.waitForTimeout(800);
  await snap(page, 'ms-05-analogs-view.png');

  // Two-column view: tap right-column member at x≈440, first row y≈204 to select
  await tapBitmap(page, 440, 204);
  await page.waitForTimeout(500);
  await snap(page, 'ms-06-after-select.png');
});
