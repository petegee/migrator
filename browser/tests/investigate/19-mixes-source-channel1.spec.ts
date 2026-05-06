/**
 * Investigation: Mixes screen → Mix Source field — Channels/CH1
 *
 * Same baseline setup as specs 06/17/18 (wizard + 1 Free mix, ~689 bytes).
 *
 * Change: Source "---" → Channels / CH1.
 * Specs 06/17/18 all use the Analogs category. This spec uses a different
 * category to expose the category-ID byte.
 *
 * Expected category list ordering (45px row spacing):
 *   ---       y≈162
 *   Analogs   y≈207
 *   Channels  y≈252   ← tap here to select Channels
 *   ...
 *
 * After selecting Channels the right column should show CH1 as first item (y≈204).
 *
 * Findings saved to:
 *   findings/diffs/19-mixes-source-channel1.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToMixes, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: Mix source --- → Channels/CH1', async ({ page }) => {
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
  saveBin('19-mixes-source-channel1-baseline', baseline);

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

  // Select Channels category (y≈252, one row below Analogs at y=207)
  await tapBitmap(page, 280, 252);
  await page.waitForTimeout(800);

  const twoColumnView = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('two-column-channels', { body: twoColumnView, contentType: 'image/png' });

  // Select CH1 — first item in right column (y≈204)
  await tapBitmap(page, 440, 204);
  await page.waitForTimeout(400);

  const afterSource = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-source-change', { body: afterSource, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('19-mixes-source-channel1', changed);

  const record = saveDiff('19-mixes-source-channel1', 'Mix source: "---" → Channels/CH1', baseline, changed);
  logDiff(record);
});
