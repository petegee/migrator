/**
 * Probe: capture editor screens needed to replace remaining clickCanvasButton calls.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import {
  tapBitmap,
  navigateToEditModel,
  navigateToVars,
  navigateToMixes,
  navigateToFlightModes,
  goBack,
} from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

// ---------------------------------------------------------------------------
test('probe: model type dropdown', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToEditModel(page);
  await snap(page, 'editmodel-before-dropdown.png');

  // "Model type" row is 3rd content row (after Name, Picture).
  // canvas row y estimates: title=0-33, Name=33-70, Picture=70-107, Model type=107-144
  // center canvas y≈125 → bitmap y = 125/0.8 = 156
  await tapBitmap(page, 700, 156); // tap Model type dropdown arrow
  await page.waitForTimeout(500);
  await snap(page, 'editmodel-type-dropdown.png');
});

// ---------------------------------------------------------------------------
test('probe: var editor and source picker', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add a Var
  await navigateToVars(page);
  await tapBitmap(page, 400, 266); // big centred +
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(300);

  // Re-enter Vars list
  await navigateToVars(page);
  await page.waitForTimeout(300);
  await snap(page, 'vars-one-entry.png');

  // Tap first row to select it (header row at canvas y≈43-73, first entry at y≈73+)
  // First entry center at canvas y≈93 → bitmap y = 93/0.8 = 116
  await tapBitmap(page, 200, 116);
  await page.waitForTimeout(300);
  await snap(page, 'vars-row1-selected.png');

  // Tap again to open context menu or editor
  await tapBitmap(page, 200, 116);
  await page.waitForTimeout(400);
  await snap(page, 'vars-row1-second-tap.png');
});

// ---------------------------------------------------------------------------
test('probe: mix editor', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add a Free mix (Free mix ends up at top of list, already selected)
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);  // "+"
  await page.waitForTimeout(400);
  await tapBitmap(page, 100, 101); // "Free mix"
  await page.waitForTimeout(400);
  await tapBitmap(page, 396, 186); // "Last position"
  await page.waitForTimeout(500);
  await snap(page, 'mix-editor-just-created.png'); // editor might be open already
  await goBack(page);
  await page.waitForTimeout(300);

  // Re-enter mixes list — Free mix should be at top (selected/orange)
  await navigateToMixes(page);
  await page.waitForTimeout(300);

  // Single tap on Free mix row (canvas y≈83 → bitmap y≈104) when it's already selected
  await tapBitmap(page, 200, 104); // first row
  await page.waitForTimeout(400);
  await snap(page, 'mix-row1-after-tap.png'); // might show context menu
});

// ---------------------------------------------------------------------------
test('probe: FM context menu and editor', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add FM1
  await navigateToFlightModes(page);
  await tapBitmap(page, 569, 69); // "+"
  await page.waitForTimeout(500);
  await snap(page, 'fm-after-plus.png'); // does "+" open editor or just add to list?

  // Check if we're in FM list or FM editor
  await goBack(page);
  await page.waitForTimeout(300);

  await navigateToFlightModes(page);
  await page.waitForTimeout(300);

  // Tap FM1 row (canvas y≈133 → bitmap y≈166) — single tap on unselected row
  await tapBitmap(page, 200, 166);
  await page.waitForTimeout(400);
  await snap(page, 'fm1-single-tap.png');

  // Tap FM1 again — might open context menu or editor
  await tapBitmap(page, 200, 166);
  await page.waitForTimeout(400);
  await snap(page, 'fm1-second-tap.png');
});

// ---------------------------------------------------------------------------
test('probe: number control bar buttons', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Open CH1 editor, tap Min field to get control bar open
  const { navigateToOutputs } = await import('../helpers/navigate');
  await navigateToOutputs(page);
  await tapBitmap(page, 200, 112); // CH1
  await page.waitForTimeout(400);

  await tapBitmap(page, 700, 340); // Min field
  await page.waitForTimeout(400);
  await snap(page, 'controlbar-min-open.png');

  // Tap ">" to increase step size
  // Control bar at canvas y≈365, ">" button at canvas x≈190 → bitmap (237, 456)
  await tapBitmap(page, 237, 456);
  await page.waitForTimeout(200);
  await snap(page, 'controlbar-after-step-increase.png');

  // Tap ">" again
  await tapBitmap(page, 237, 456);
  await page.waitForTimeout(200);
  await snap(page, 'controlbar-after-step-increase2.png');

  // Tap "-" to decrement
  await tapBitmap(page, 400, 456);
  await page.waitForTimeout(200);
  await snap(page, 'controlbar-after-decrement.png');
});
