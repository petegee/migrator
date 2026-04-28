/**
 * Investigation: Outputs screen → Direction toggle
 *
 * Baseline: channel 1 output, Direction = Normal.
 * Change:   toggle Direction to Reverse.
 *
 * Reveals which bit/byte encodes output direction.
 *
 * Findings saved to:
 *   findings/diffs/08-outputs-direction.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap } from '../helpers/navigate';
import { navigateToOutputs, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: output direction Normal → Reverse', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const baseline = await downloadModelBin(page);
  saveBin('08-outputs-direction-baseline', baseline);

  await navigateToOutputs(page);

  const outputsScreen = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('outputs-screen', { body: outputsScreen, contentType: 'image/png' });

  await tapBitmap(page, 200, 112); // CH1 top-left cell in outputs grid
  await page.waitForTimeout(400);

  const outputEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('output-editor', { body: outputEditor, contentType: 'image/png' });

  await tapBitmap(page, 600, 175); // Direction row, Reverse toggle
  await page.waitForTimeout(400);

  const afterToggle = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-direction-toggle', { body: afterToggle, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('08-outputs-direction', changed);

  const record = saveDiff('08-outputs-direction', 'Output 1 direction: Normal → Reverse', baseline, changed);
  logDiff(record);
});
