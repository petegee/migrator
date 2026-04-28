/**
 * Investigation: Special functions screen → add a Special function
 *
 * Baseline: fresh wizard model, no Special functions.
 * Change:   tap + to add one default Special function.
 *
 * Reveals the bytes that represent a special function entry.
 *
 * Findings saved to:
 *   findings/diffs/15-special-functions-add.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap } from '../helpers/navigate';
import { navigateToSpecialFunctions, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: add one default Special function', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const baseline = await downloadModelBin(page);
  saveBin('15-special-functions-baseline', baseline);

  await navigateToSpecialFunctions(page);

  const sfScreen = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('special-functions-screen', { body: sfScreen, contentType: 'image/png' });

  await tapBitmap(page, 400, 266); // large centred + on empty Special funcs screen
  await page.waitForTimeout(500);

  const afterAdd = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-add-special-function', { body: afterAdd, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('15-special-functions-add', changed);

  const record = saveDiff('15-special-functions-add', 'Added one default Special function (Special functions → +)', baseline, changed);
  logDiff(record);
});
