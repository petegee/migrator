/**
 * Investigation: Vars screen → Var Values[0] field
 *
 * Repurposed: ETHOS Vars have a Values list (not a rate/weight field).
 * Baseline: 1 Var with Values[0] = 0.0%.
 * Change:   increment Values[0] by 5 steps using the number control bar.
 *
 * Findings saved to:
 *   findings/diffs/04-vars-value.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToVars, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: Var value[0] 0.0% → +5 steps', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // --- set up: add one Var ---
  await navigateToVars(page);
  await tapBitmap(page, 400, 266); // big centered "+"
  await page.waitForTimeout(1000);
  await goBack(page);
  await page.waitForTimeout(300);

  // --- baseline: 1 Var, Values[0] = 0.0% ---
  const baseline = await downloadModelBin(page);
  saveBin('04-vars-value-baseline', baseline);

  // --- open Var1 editor via context menu ---
  // After navigateToVars the row is already selected; ONE tap at x=200 opens context menu.
  await navigateToVars(page);
  await tapBitmap(page, 200, 116); // tap Name-column of Var1 → context menu
  await page.waitForTimeout(400);
  await tapBitmap(page, 320, 167); // "Edit"
  await page.waitForTimeout(400);

  const varEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('var-editor', { body: varEditor, contentType: 'image/png' });

  // --- tap Values[0] "0.0%" to open number control bar ---
  // Values section: list item "0.0%" at canvas y≈305 → bitmap y=381, x at right edge ≈738
  await tapBitmap(page, 738, 381);
  await page.waitForTimeout(400);

  const controlBar = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('values-control-bar', { body: controlBar, contentType: 'image/png' });

  // Increment 5 times at default step
  for (let i = 0; i < 5; i++) {
    await tapBitmap(page, 630, 456); // "+" increment button
    await page.waitForTimeout(200);
  }

  const afterChange = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-value-change', { body: afterChange, contentType: 'image/png' });

  await goBack(page); // exit Var editor (auto-saves)
  await page.waitForTimeout(300);

  // --- download and diff ---
  const changed = await downloadModelBin(page);
  saveBin('04-vars-value', changed);

  const record = saveDiff('04-vars-value', 'Var value[0]: 0.0% → +5 steps', baseline, changed);
  logDiff(record);
});
