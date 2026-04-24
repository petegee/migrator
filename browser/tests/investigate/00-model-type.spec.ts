/**
 * Investigation: Edit model → Model type dropdown
 *
 * Hypothesis: changing Model type (Airplane → Glider) writes a single byte
 * somewhere in the Model Config block.
 *
 * Only Glider is investigated — all subsequent tests assume a Glider model.
 *
 * Findings are saved to:
 *   findings/bins/baseline.bin
 *   findings/bins/00-model-type-glider.bin
 *   findings/diffs/00-model-type-glider.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { navigateToEditModel, goBack } from '../helpers/navigate';
import { clickCanvasButton } from '../helpers/boot';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: model type Airplane → Glider', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // --- baseline: wizard default is Airplane ---
  const baseline = await downloadModelBin(page);
  saveBin('baseline', baseline);

  // --- change: Model type → Glider ---
  await navigateToEditModel(page);
  await clickCanvasButton(page, 'Model type dropdown field');
  await clickCanvasButton(page, 'Glider option in the dropdown list');
  await goBack(page);

  const changed = await downloadModelBin(page);
  saveBin('00-model-type-glider', changed);

  // --- diff ---
  const record = saveDiff('00-model-type-glider', 'Model type: Airplane → Glider', baseline, changed);
  logDiff(record);
});

