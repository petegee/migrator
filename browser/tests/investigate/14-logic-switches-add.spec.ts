/**
 * Investigation: Logic switches screen → add a Logic switch
 *
 * Baseline: fresh wizard model, no Logic switches.
 * Change:   tap + to add one default Logic switch.
 *
 * Reveals the bytes that represent a logic switch entry.
 *
 * Findings saved to:
 *   findings/diffs/14-logic-switches-add.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard, clickCanvasButton } from '../helpers/boot';
import { navigateToLogicSwitches, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: add one default Logic switch', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const baseline = await downloadModelBin(page);
  saveBin('14-logic-switches-baseline', baseline);

  await navigateToLogicSwitches(page);

  const lsScreen = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('logic-switches-screen', { body: lsScreen, contentType: 'image/png' });

  await clickCanvasButton(page, 'plus button to add a new Logic switch');
  await page.waitForTimeout(500);

  const afterAdd = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-add-logic-switch', { body: afterAdd, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('14-logic-switches-add', changed);

  const record = saveDiff('14-logic-switches-add', 'Added one default Logic switch (Logic switches → +)', baseline, changed);
  logDiff(record);
});
