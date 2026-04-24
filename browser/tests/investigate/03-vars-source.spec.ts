/**
 * Investigation: Vars screen → Var source field
 *
 * Baseline: 1 default Var (source = whatever the default is).
 * Change:   set Source to Left Horizontal stick (aileron axis).
 *
 * This reveals which bytes encode the Var source value.
 *
 * Findings saved to:
 *   findings/diffs/03-vars-source.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard, clickCanvasButton } from '../helpers/boot';
import { navigateToVars, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: Var source → Left Horizontal stick', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // --- set up: add one default Var ---
  await navigateToVars(page);
  await clickCanvasButton(page, 'plus button to add a new Var');
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(300);

  // --- baseline: 1 Var with default source ---
  const baseline = await downloadModelBin(page);
  saveBin('03-vars-source-baseline', baseline);

  // --- open the Var for editing ---
  await navigateToVars(page);
  await clickCanvasButton(page, 'first Var entry in the list');
  await page.waitForTimeout(400);

  const varEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('var-editor', { body: varEditor, contentType: 'image/png' });

  // --- change Source ---
  await clickCanvasButton(page, 'Source field in the Var editor');
  await page.waitForTimeout(400);

  const sourcePicker = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('source-picker', { body: sourcePicker, contentType: 'image/png' });

  await clickCanvasButton(page, 'Left Horizontal stick or Aileron axis option in source picker');
  await page.waitForTimeout(400);

  await goBack(page);
  await page.waitForTimeout(300);

  // --- download and diff ---
  const changed = await downloadModelBin(page);
  saveBin('03-vars-source', changed);

  const record = saveDiff('03-vars-source', 'Var source: default → Left Horizontal stick', baseline, changed);
  logDiff(record);
});
