/**
 * Investigation: Mixes screen → Mix source field
 *
 * Baseline: 1 default Mix.
 * Change:   set Source to Left Horizontal stick (aileron axis).
 *
 * Reveals which bytes encode the Mix source value.
 *
 * Findings saved to:
 *   findings/diffs/06-mixes-source.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard, clickCanvasButton } from '../helpers/boot';
import { navigateToMixes, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: Mix source → Left Horizontal stick', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  await navigateToMixes(page);
  await clickCanvasButton(page, 'plus button to add a new Mix');
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(300);

  const baseline = await downloadModelBin(page);
  saveBin('06-mixes-source-baseline', baseline);

  await navigateToMixes(page);
  await clickCanvasButton(page, 'first Mix entry in the list');
  await page.waitForTimeout(400);

  const mixEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('mix-editor', { body: mixEditor, contentType: 'image/png' });

  await clickCanvasButton(page, 'Source field in the Mix editor');
  await page.waitForTimeout(400);

  const sourcePicker = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('source-picker', { body: sourcePicker, contentType: 'image/png' });

  await clickCanvasButton(page, 'Left Horizontal stick or Aileron axis option in source picker');
  await page.waitForTimeout(400);

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('06-mixes-source', changed);

  const record = saveDiff('06-mixes-source', 'Mix source: default → Left Horizontal stick', baseline, changed);
  logDiff(record);
});
