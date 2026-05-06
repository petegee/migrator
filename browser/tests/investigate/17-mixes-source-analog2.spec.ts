/**
 * Investigation: Mixes screen → Mix Source field — Analogs 2nd item
 *
 * Identical setup to spec 06 (wizard glider model + 1 Free mix) to get the
 * same 689-byte baseline so offsets align perfectly with that run.
 *
 * Change: Source "---" → Analogs / 2nd item in the right column (y≈249).
 * Spec 06 selected the 1st item (y=204, Rudder, encoded as 8 at 0x019C).
 * This spec selects the 2nd item — if the encoding is sequential the byte
 * at 0x019C should become 9 (or whatever Rudder+1 is).
 *
 * Picker navigation (same as spec 06):
 *   1st tap (350,207) → compact popup
 *   2nd tap (350,207) → full category list: ---≈y162, Analogs≈y207
 *   tap (280,207)     → Analogs → two-column Category/Member view
 *   tap (440,249)     → 2nd item in right column
 *
 * Findings saved to:
 *   findings/diffs/17-mixes-source-analog2.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToMixes, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: Mix source --- → Analogs/2nd-item', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add one Free mix (same 3-tap flow as spec 06)
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);   // "+" header button
  await page.waitForTimeout(400);
  await tapBitmap(page, 100, 101);  // "Free mix" in library picker
  await page.waitForTimeout(400);
  await tapBitmap(page, 396, 186);  // "Last position" → mix editor opens
  await page.waitForTimeout(600);
  await goBack(page);
  await page.waitForTimeout(300);

  // Baseline: wizard mixes + 1 Free mix, Source = "---"
  const baseline = await downloadModelBin(page);
  saveBin('17-mixes-source-analog2-baseline', baseline);

  // Open Free mix editor via context menu
  await navigateToMixes(page);
  await tapBitmap(page, 200, 116);
  await page.waitForTimeout(400);

  const ctxMenu = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('context-menu', { body: ctxMenu, contentType: 'image/png' });

  await tapBitmap(page, 320, 167); // "Edit"
  await page.waitForTimeout(400);

  const mixEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('mix-editor', { body: mixEditor, contentType: 'image/png' });

  // Open source picker — two taps to reach full category list
  await tapBitmap(page, 350, 207);
  await page.waitForTimeout(500);
  await tapBitmap(page, 350, 207);
  await page.waitForTimeout(500);

  const categoryList = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('category-list', { body: categoryList, contentType: 'image/png' });

  // Select Analogs category → two-column view
  await tapBitmap(page, 280, 207);
  await page.waitForTimeout(800);

  const twoColumnView = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('two-column-analogs', { body: twoColumnView, contentType: 'image/png' });

  // Select 2nd item in right column (y≈249, ~45px below first item at y=204)
  await tapBitmap(page, 440, 249);
  await page.waitForTimeout(400);

  const afterSource = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-source-change', { body: afterSource, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('17-mixes-source-analog2', changed);

  const record = saveDiff('17-mixes-source-analog2', 'Mix source: "---" → Analogs/2nd-item', baseline, changed);
  logDiff(record);
});
