/**
 * Investigation: Edit model → Name field (virtual keyboard)
 *
 * The wizard creates a model named "New model".  We navigate to the Name
 * field and attempt to change it, capturing whatever binary change results.
 *
 * NOTE: The virtual keyboard layout is not yet fully mapped.  This test
 * uses vision-guided clicks and will attach a screenshot to the test report
 * at each keyboard interaction so you can see the keyboard layout.
 *
 * Findings are saved to:
 *   findings/bins/01-model-name-changed.bin
 *   findings/diffs/01-model-name-changed.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap } from '../helpers/navigate';
import { navigateToEditModel, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: model name change via virtual keyboard', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // --- baseline: model named "New model" ---
  const baseline = await downloadModelBin(page);
  saveBin('baseline', baseline);

  // --- change: tap Name field, clear, type "Test" ---
  await navigateToEditModel(page);

  // Tap the Name row edit icon (right edge of row 1 in Edit model)
  await tapBitmap(page, 750, 77);
  await page.waitForTimeout(600);

  // Screenshot the keyboard
  const kbScreenshot = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('virtual-keyboard', { body: kbScreenshot, contentType: 'image/png' });

  // Clear "New model" (9 chars) — backspace ⌫ is far-right of row 3 (y≈340), NOT row 4
  for (let i = 0; i < 9; i++) {
    await tapBitmap(page, 750, 340);
    await page.waitForTimeout(150);
  }

  // Type "TEST":
  //   Row 1 (QWERTYUIOP): y≈262  — T=360, E=200
  //   Row 2 (ASDFGHJKL):  y≈302  — S=160
  await tapBitmap(page, 360, 262); // T
  await page.waitForTimeout(100);
  await tapBitmap(page, 200, 262); // E
  await page.waitForTimeout(100);
  await tapBitmap(page, 160, 302); // S
  await page.waitForTimeout(100);
  await tapBitmap(page, 360, 262); // T
  await page.waitForTimeout(100);

  // ENTER (row 4, right portion): y≈418
  await tapBitmap(page, 700, 418);
  await page.waitForTimeout(400);

  // Screenshot after keyboard dismissed
  const afterScreenshot = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-name-change', { body: afterScreenshot, contentType: 'image/png' });

  await goBack(page);

  const changed = await downloadModelBin(page);
  saveBin('01-model-name-test', changed);

  const record = saveDiff('01-model-name-test', 'Model name: "New model" → "Test"', baseline, changed);
  logDiff(record);
});
