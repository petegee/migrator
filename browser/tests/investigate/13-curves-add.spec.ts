/**
 * Investigation: Curves screen → add a Curve
 *
 * Baseline: fresh wizard model, no custom Curves.
 * Change:   tap + to add one default Curve.
 *
 * Reveals the bytes that represent a curve entry and where curve data lives.
 *
 * Findings saved to:
 *   findings/diffs/13-curves-add.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap } from '../helpers/navigate';
import { navigateToCurves, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: add one default Curve', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const baseline = await downloadModelBin(page);
  saveBin('13-curves-baseline', baseline);

  await navigateToCurves(page);

  const curvesScreen = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('curves-screen-before-add', { body: curvesScreen, contentType: 'image/png' });

  await tapBitmap(page, 400, 266); // large centred + on empty Curves screen
  await page.waitForTimeout(500);

  const afterAdd = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-add-curve', { body: afterAdd, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('13-curves-add', changed);

  const record = saveDiff('13-curves-add', 'Added one default Curve (Curves → +)', baseline, changed);
  logDiff(record);
});
