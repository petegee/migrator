/**
 * Investigation: Flight modes screen → add a Flight mode
 *
 * Baseline: fresh wizard model (FM0 default only).
 * Change:   tap + to add a new flight mode.
 *
 * Reveals the bytes that represent a flight mode entry.
 *
 * Findings saved to:
 *   findings/diffs/11-flight-modes-add.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap } from '../helpers/navigate';
import { navigateToFlightModes, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: add one Flight mode', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const baseline = await downloadModelBin(page);
  saveBin('11-flight-modes-baseline', baseline);

  await navigateToFlightModes(page);

  const fmScreen = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('flight-modes-screen', { body: fmScreen, contentType: 'image/png' });

  await tapBitmap(page, 569, 54); // header + (FM0 default always exists)
  await page.waitForTimeout(500);

  const afterAdd = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-add-flight-mode', { body: afterAdd, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('11-flight-modes-add', changed);

  const record = saveDiff('11-flight-modes-add', 'Added one Flight mode (Flight modes → +)', baseline, changed);
  logDiff(record);
});
