/**
 * Investigation: Mixes screen → Mix "Always on Weight" field
 *
 * Baseline: 1 Free mix, weight = 100%.
 * Change:   decrement weight to ~50% (2× step-up to 10%, then 5× decrement).
 *
 * Reveals which bytes encode the Mix weight (expect int16 LE per-mille).
 *
 * Findings saved to:
 *   findings/diffs/07-mixes-weight.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToMixes, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: Mix weight 100% → ~50%', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // --- set up: add one Free mix ---
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(400);
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(400);
  await tapBitmap(page, 396, 186);
  await page.waitForTimeout(600);
  await goBack(page);
  await page.waitForTimeout(300);

  // --- baseline: 1 Free mix, weight = 100% ---
  const baseline = await downloadModelBin(page);
  saveBin('07-mixes-weight-baseline', baseline);

  // --- open Free mix editor ---
  // After navigateToMixes the Free mix row is already selected; ONE tap at x=200 opens menu.
  await navigateToMixes(page);
  await tapBitmap(page, 200, 116); // tap Name-column of Free mix → context menu
  await page.waitForTimeout(400);
  await tapBitmap(page, 320, 167); // "Edit"
  await page.waitForTimeout(400);

  const mixEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('mix-editor', { body: mixEditor, contentType: 'image/png' });

  // --- tap "Always on Weight  100%" to open control bar ---
  // Actions row: canvas y≈254 → bitmap y=318; "100%" at right of panel: canvas x≈397 → bitmap x=496
  await tapBitmap(page, 496, 318);
  await page.waitForTimeout(400);

  const controlBar = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('weight-control-bar', { body: controlBar, contentType: 'image/png' });

  // Increase step to 10%: default 0.1% → 1% → 10%
  await tapBitmap(page, 400, 456); // ">" step up
  await page.waitForTimeout(200);
  await tapBitmap(page, 400, 456); // ">" step up
  await page.waitForTimeout(200);

  // Decrement 5× at 10%: 100% → 90% → 80% → 70% → 60% → 50%
  for (let i = 0; i < 5; i++) {
    await tapBitmap(page, 480, 456); // "-" decrement
    await page.waitForTimeout(200);
  }

  const afterChange = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-weight-change', { body: afterChange, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('07-mixes-weight', changed);

  const record = saveDiff('07-mixes-weight', 'Mix weight: 100% → ~50% (5× decrement at 10% step)', baseline, changed);
  logDiff(record);
});
