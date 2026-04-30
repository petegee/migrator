/**
 * Investigation: Outputs screen → Max travel limit
 *
 * Baseline: CH1 output, Max = 100%.
 * Change:   set Max to 80% (step-up ×2 to 10%, decrement ×2).
 *
 * Reveals which bytes encode output travel limits.
 *
 * Findings saved to:
 *   findings/diffs/09-outputs-limits.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToOutputs, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: output Max limit 100% → 80%', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const baseline = await downloadModelBin(page);
  saveBin('09-outputs-limits-baseline', baseline);

  await navigateToOutputs(page);
  await tapBitmap(page, 200, 112); // CH1 row
  await page.waitForTimeout(400);

  const outputEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('output-editor', { body: outputEditor, contentType: 'image/png' });

  // Tap Max field (confirmed at bitmap y=380 from probe: outputs-field-tap-y380.png)
  await tapBitmap(page, 700, 380);
  await page.waitForTimeout(400);

  const controlBar = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('max-control-bar', { body: controlBar, contentType: 'image/png' });

  // Step up to 10%: 0.1% → 1% → 10%
  await tapBitmap(page, 400, 456); // ">" step up
  await page.waitForTimeout(200);
  await tapBitmap(page, 400, 456); // ">" step up
  await page.waitForTimeout(200);

  // Decrement 2×: 100% → 90% → 80%
  await tapBitmap(page, 480, 456); // "-" decrement
  await page.waitForTimeout(200);
  await tapBitmap(page, 480, 456); // "-" decrement
  await page.waitForTimeout(200);

  const afterChange = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-max-change', { body: afterChange, contentType: 'image/png' });

  await goBack(page); // exit CH1 editor (auto-saves)
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('09-outputs-limits', changed);

  const record = saveDiff('09-outputs-limits', 'Output 1 Max: 100% → 80%', baseline, changed);
  logDiff(record);
});
