/**
 * Investigation: Vars screen → add a Var
 *
 * Baseline: fresh wizard model, no Vars.
 * Change:   tap + on the Vars screen to add one default Var, then go back.
 *
 * This reveals:
 *   - The bytes that represent a single default Var entry
 *   - Where in the file Var data begins
 *   - How many bytes a Var occupies
 *
 * Findings saved to:
 *   findings/diffs/02-vars-add.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap } from '../helpers/navigate';
import { navigateToVars, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: add one default Var', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // --- baseline: no Vars ---
  const baseline = await downloadModelBin(page);
  saveBin('02-vars-baseline', baseline);

  // Diagnostic: state immediately after baseline download
  const snapAfterDownload = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('diag-1-after-baseline-download', { body: snapAfterDownload, contentType: 'image/png' });

  // --- navigate to Vars screen ---
  await navigateToVars(page);

  // Diagnostic: did we land on the Vars screen?
  const snapAfterNav = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('diag-2-after-navigate-to-vars', { body: snapAfterNav, contentType: 'image/png' });

  const varsScreen = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('vars-screen-before-add', { body: varsScreen, contentType: 'image/png' });

  // --- add one Var ---
  await tapBitmap(page, 400, 266); // large centred + on empty Vars screen
  await page.waitForTimeout(500);

  const afterAdd = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-add-var', { body: afterAdd, contentType: 'image/png' });

  // Go back to ensure the Var is saved (ETHOS auto-saves but back confirms)
  await goBack(page);
  await page.waitForTimeout(300);

  // --- download and diff ---
  const changed = await downloadModelBin(page);
  saveBin('02-vars-add', changed);

  const record = saveDiff('02-vars-add', 'Added one default Var (Vars screen → +)', baseline, changed);
  logDiff(record);
});
