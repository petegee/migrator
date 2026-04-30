/**
 * Investigation: Mixes screen → Mix Source field
 *
 * Baseline: 1 Free mix with default Source "---".
 * Change:   open Source dropdown → Analogs category → select Rudder.
 *
 * Picker navigation (confirmed via probe screenshots):
 *   1st tap (350,207) → compact popup (current selection shown)
 *   2nd tap (350,207) → full category list: "---"≈y162, "Analogs"≈y207
 *   tap (280,207)     → two-column view: Category left / Member right
 *   tap (440,204)     → commits "Rudder" (first Analog in view)
 *
 * Findings saved to:
 *   findings/diffs/06-mixes-source.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToMixes, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: Mix source --- → Analogs/Rudder', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // --- set up: add one Free mix (3-tap flow → editor auto-opens) ---
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);   // "+" header button
  await page.waitForTimeout(400);
  await tapBitmap(page, 100, 101);  // "Free mix" in library picker
  await page.waitForTimeout(400);
  await tapBitmap(page, 396, 186);  // "Last position" → mix editor opens
  await page.waitForTimeout(600);
  await goBack(page);               // save, return to Mixes list
  await page.waitForTimeout(300);

  // --- baseline: 1 Free mix, Source = "---" ---
  const baseline = await downloadModelBin(page);
  saveBin('06-mixes-source-baseline', baseline);

  // --- open Free mix editor via context menu ---
  await navigateToMixes(page);
  await tapBitmap(page, 200, 116); // tap Name-column of Free mix → context menu
  await page.waitForTimeout(400);

  const ctxMenu = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('mix-context-menu', { body: ctxMenu, contentType: 'image/png' });

  await tapBitmap(page, 320, 167); // "Edit"
  await page.waitForTimeout(400);

  const mixEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('mix-editor', { body: mixEditor, contentType: 'image/png' });

  // --- select Source: "---" → Analogs/Rudder ---
  // Step 1: first tap opens compact popup; second tap shows full category list
  await tapBitmap(page, 350, 207); // open source picker (compact)
  await page.waitForTimeout(500);
  await tapBitmap(page, 350, 207); // re-open → full list: ---≈y162, Analogs≈y207
  await page.waitForTimeout(500);

  const categoryPicker = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('category-picker', { body: categoryPicker, contentType: 'image/png' });

  // Step 2: tap Analogs → two-column Category/Member view
  await tapBitmap(page, 280, 207); // "Analogs" row in category list
  await page.waitForTimeout(800);

  const twoColumnPicker = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('two-column-picker', { body: twoColumnPicker, contentType: 'image/png' });

  // Step 3: tap right-column member (Rudder) to commit selection
  await tapBitmap(page, 440, 204);
  await page.waitForTimeout(400);

  const afterSource = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-source-change', { body: afterSource, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('06-mixes-source', changed);

  const record = saveDiff('06-mixes-source', 'Mix source: "---" → Analogs/Rudder', baseline, changed);
  logDiff(record);
});
