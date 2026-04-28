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

  // Clear "New model" (9 chars) — backspace key is far-right of row 3, y=400
  for (let i = 0; i < 9; i++) {
    await tapBitmap(page, 740, 400);
    await page.waitForTimeout(150);
  }

  // Type "TEST" — row 1 y=280: T=360, E=200, S is row 2 y=340: S=160, T=360
  await tapBitmap(page, 360, 280); // T
  await tapBitmap(page, 200, 280); // E
  await tapBitmap(page, 160, 340); // S
  await tapBitmap(page, 360, 280); // T

  // ENTER to confirm
  await tapBitmap(page, 680, 460);
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
