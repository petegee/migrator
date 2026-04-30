/**
 * Investigation: Outputs screen → Center/Subtrim field
 *
 * Baseline: CH1 subtrim = 0.
 * Change:   increment subtrim by 5 steps at default step size.
 *
 * Subtrim stored as int16 LE in microseconds.
 *
 * Findings saved to:
 *   findings/diffs/10-outputs-subtrim.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToOutputs, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: output subtrim 0 → +5 steps', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const baseline = await downloadModelBin(page);
  saveBin('10-outputs-subtrim-baseline', baseline);

  await navigateToOutputs(page);
  await tapBitmap(page, 200, 112); // CH1 row
  await page.waitForTimeout(400);

  const outputEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('output-editor', { body: outputEditor, contentType: 'image/png' });

  // Tap Center/Subtrim field (confirmed at bitmap y=440 from probe: outputs-field-tap-y440.png)
  await tapBitmap(page, 700, 440);
  await page.waitForTimeout(400);

  const controlBar = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('subtrim-control-bar', { body: controlBar, contentType: 'image/png' });

  // Increment 5× at default step (1 μs each → subtrim becomes +5 μs)
  for (let i = 0; i < 5; i++) {
    await tapBitmap(page, 630, 456); // "+" increment
    await page.waitForTimeout(200);
  }

  const afterChange = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-subtrim-change', { body: afterChange, contentType: 'image/png' });

  await goBack(page); // exit CH1 editor (auto-saves)
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('10-outputs-subtrim', changed);

  const record = saveDiff('10-outputs-subtrim', 'Output 1 subtrim: 0 → +5 steps', baseline, changed);
  logDiff(record);
});
