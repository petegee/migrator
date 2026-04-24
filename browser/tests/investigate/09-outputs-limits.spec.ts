/**
 * Investigation: Outputs screen → Min/Max travel limits
 *
 * Baseline: channel 1 output, Min = -100%, Max = 100% (defaults).
 * Change:   set Max to 80% using the number control bar.
 *
 * Reveals which bytes encode output travel limits.
 *
 * Findings saved to:
 *   findings/diffs/09-outputs-limits.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard, clickCanvasButton } from '../helpers/boot';
import { navigateToOutputs, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: output Max limit 100% → 80%', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const baseline = await downloadModelBin(page);
  saveBin('09-outputs-limits-baseline', baseline);

  await navigateToOutputs(page);
  await clickCanvasButton(page, 'first output channel entry in the list');
  await page.waitForTimeout(400);

  const outputEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('output-editor', { body: outputEditor, contentType: 'image/png' });

  await clickCanvasButton(page, 'Max travel limit field');
  await page.waitForTimeout(400);

  const controlBar = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('number-control-bar', { body: controlBar, contentType: 'image/png' });

  // Decrement Max from 100% to 80% — 2 steps at 10%
  await clickCanvasButton(page, 'right arrow or greater-than button to increase step size in number control bar');
  await page.waitForTimeout(200);
  await clickCanvasButton(page, 'right arrow or greater-than button to increase step size in number control bar');
  await page.waitForTimeout(200);
  await clickCanvasButton(page, 'minus or decrement button in number control bar');
  await page.waitForTimeout(200);
  await clickCanvasButton(page, 'minus or decrement button in number control bar');
  await page.waitForTimeout(200);

  const afterChange = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-max-change', { body: afterChange, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('09-outputs-limits', changed);

  const record = saveDiff('09-outputs-limits', 'Output 1 Max: 100% → 80%', baseline, changed);
  logDiff(record);
});
