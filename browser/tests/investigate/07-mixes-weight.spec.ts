/**
 * Investigation: Mixes screen → Mix weight/rate field
 *
 * Baseline: 1 default Mix (weight = 100% = 1000‰).
 * Change:   decrement weight to ~50% using the number control bar.
 *
 * Reveals which bytes encode the Mix weight (expect int16 LE per-mille).
 *
 * Findings saved to:
 *   findings/diffs/07-mixes-weight.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard, clickCanvasButton } from '../helpers/boot';
import { navigateToMixes, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: Mix weight 100% → ~50%', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  await navigateToMixes(page);
  await clickCanvasButton(page, 'plus button to add a new Mix');
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(300);

  const baseline = await downloadModelBin(page);
  saveBin('07-mixes-weight-baseline', baseline);

  await navigateToMixes(page);
  await clickCanvasButton(page, 'first Mix entry in the list');
  await page.waitForTimeout(400);

  await clickCanvasButton(page, 'Weight or Rate field showing the current weight value');
  await page.waitForTimeout(400);

  const controlBar = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('number-control-bar', { body: controlBar, contentType: 'image/png' });

  await clickCanvasButton(page, 'right arrow or greater-than button to increase step size in number control bar');
  await page.waitForTimeout(200);
  await clickCanvasButton(page, 'right arrow or greater-than button to increase step size in number control bar');
  await page.waitForTimeout(200);

  for (let i = 0; i < 5; i++) {
    await clickCanvasButton(page, 'minus or decrement button in number control bar');
    await page.waitForTimeout(200);
  }

  const afterChange = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-weight-change', { body: afterChange, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('07-mixes-weight', changed);

  const record = saveDiff('07-mixes-weight', 'Mix weight: 100% → ~50% (5× decrement at 10% step)', baseline, changed);
  logDiff(record);
});
