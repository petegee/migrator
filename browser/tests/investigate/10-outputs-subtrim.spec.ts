/**
 * Investigation: Outputs screen → Center/Subtrim field
 *
 * Baseline: channel 1, subtrim = 0.
 * Change:   increment subtrim to a non-zero value.
 *
 * Subtrim is stored in microseconds (μs) as int16 LE.
 * Reveals which bytes encode the subtrim offset.
 *
 * Findings saved to:
 *   findings/diffs/10-outputs-subtrim.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard, clickCanvasButton } from '../helpers/boot';
import { navigateToOutputs, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: output subtrim 0 → non-zero', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const baseline = await downloadModelBin(page);
  saveBin('10-outputs-subtrim-baseline', baseline);

  await navigateToOutputs(page);
  await clickCanvasButton(page, 'first output channel entry in the list');
  await page.waitForTimeout(400);

  const outputEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('output-editor', { body: outputEditor, contentType: 'image/png' });

  await clickCanvasButton(page, 'Center or Subtrim field');
  await page.waitForTimeout(400);

  const controlBar = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('number-control-bar', { body: controlBar, contentType: 'image/png' });

  // Increment subtrim 5 times at default step
  for (let i = 0; i < 5; i++) {
    await clickCanvasButton(page, 'plus or increment button in number control bar');
    await page.waitForTimeout(200);
  }

  const afterChange = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-subtrim-change', { body: afterChange, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('10-outputs-subtrim', changed);

  const record = saveDiff('10-outputs-subtrim', 'Output 1 subtrim: 0 → +5 steps', baseline, changed);
  logDiff(record);
});
