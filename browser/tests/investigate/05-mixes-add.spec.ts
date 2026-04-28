/**
 * Investigation: Mixes screen → add a Mix
 *
 * Baseline: fresh wizard model, no Mixes.
 * Change:   tap + on the Mixes screen to add one default Mix, then go back.
 *
 * Reveals the bytes that represent a single default Mix entry and where
 * Mix data begins in the file.
 *
 * Findings saved to:
 *   findings/diffs/05-mixes-add.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap } from '../helpers/navigate';
import { navigateToMixes, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: add one default Mix', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const baseline = await downloadModelBin(page);
  saveBin('05-mixes-baseline', baseline);

  await navigateToMixes(page);

  const mixesScreen = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('mixes-screen-before-add', { body: mixesScreen, contentType: 'image/png' });

  await tapBitmap(page, 569, 54); // header + (wizard pre-populates mixes)
  await page.waitForTimeout(500);

  const afterAdd = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-add-mix', { body: afterAdd, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('05-mixes-add', changed);

  const record = saveDiff('05-mixes-add', 'Added one default Mix (Mixes screen → +)', baseline, changed);
  logDiff(record);
});
