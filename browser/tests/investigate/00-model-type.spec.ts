/**
 * Investigation: Edit model → Model type dropdown
 *
 * Wizard creates Glider. Change Model type to Airplane.
 * Hypothesis: a single byte encodes model type in the Model Config block.
 *
 * Findings saved to:
 *   findings/diffs/00-model-type-glider.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToEditModel, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: model type Glider → Airplane', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const baseline = await downloadModelBin(page);
  saveBin('baseline', baseline);

  await navigateToEditModel(page);

  // Model type row is the 3rd content row (after Name, Picture).
  // Title=33px, rows ~58.5px each → Model type center at canvas y≈179 → bitmap y=224
  await tapBitmap(page, 700, 224); // open Model type dropdown
  await page.waitForTimeout(500);

  const dropdown = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('model-type-dropdown', { body: dropdown, contentType: 'image/png' });

  // Airplane is the first non-Glider option; dropdown options start at canvas y≈100
  // First option center canvas y≈124 → bitmap y=155; Airplane expected to be first alphabetically
  await tapBitmap(page, 400, 155); // first dropdown option (Airplane)
  await page.waitForTimeout(500);

  const afterChange = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-model-type-change', { body: afterChange, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('00-model-type-glider', changed);

  const record = saveDiff('00-model-type-glider', 'Model type: Glider → Airplane', baseline, changed);
  logDiff(record);
});
