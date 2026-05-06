/**
 * Investigation: Mixes screen → Mix Source field — Analogs 4th item
 *
 * Same baseline setup as specs 06 and 17 (wizard + 1 Free mix, ~689 bytes).
 *
 * Change: Source "---" → Analogs / 4th item in right column (y≈339).
 * Spec 06 selected 1st item (y=204), spec 17 selects 2nd (y≈249).
 * Jumping to the 4th item here gives a wider spread so the member-index
 * pattern is unambiguous across all three runs.
 *
 * Picker navigation:
 *   tap (350,207) × 2  → full category list
 *   tap (280,207)       → Analogs → two-column view
 *   tap (440,339)       → 4th item in right column
 *
 * Findings saved to:
 *   findings/diffs/18-mixes-source-analog4.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToMixes, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: Mix source --- → Analogs/4th-item', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add one Free mix
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(400);
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(400);
  await tapBitmap(page, 396, 186);
  await page.waitForTimeout(600);
  await goBack(page);
  await page.waitForTimeout(300);

  const baseline = await downloadModelBin(page);
  saveBin('18-mixes-source-analog4-baseline', baseline);

  await navigateToMixes(page);
  await tapBitmap(page, 200, 116);
  await page.waitForTimeout(400);

  const ctxMenu = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('context-menu', { body: ctxMenu, contentType: 'image/png' });

  await tapBitmap(page, 320, 167);
  await page.waitForTimeout(400);

  const mixEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('mix-editor', { body: mixEditor, contentType: 'image/png' });

  await tapBitmap(page, 350, 207);
  await page.waitForTimeout(500);
  await tapBitmap(page, 350, 207);
  await page.waitForTimeout(500);

  const categoryList = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('category-list', { body: categoryList, contentType: 'image/png' });

  await tapBitmap(page, 280, 207);
  await page.waitForTimeout(800);

  const twoColumnView = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('two-column-analogs', { body: twoColumnView, contentType: 'image/png' });

  // Select 4th item in right column (y≈339, ~45px spacing: 204, 249, 294, 339)
  await tapBitmap(page, 440, 339);
  await page.waitForTimeout(400);

  const afterSource = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-source-change', { body: afterSource, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('18-mixes-source-analog4', changed);

  const record = saveDiff('18-mixes-source-analog4', 'Mix source: "---" → Analogs/4th-item', baseline, changed);
  logDiff(record);
});
