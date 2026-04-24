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
import { bootApp, navigateCreateModelWizard, clickCanvasButton } from '../helpers/boot';
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

  // Tap the name field — virtual keyboard should appear
  await clickCanvasButton(page, 'Name text input field showing the current model name');

  // Screenshot the keyboard for layout discovery (attach to report)
  const kbScreenshot = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('virtual-keyboard', { body: kbScreenshot, contentType: 'image/png' });

  // Clear existing text: tap backspace repeatedly to delete "New model" (9 chars)
  for (let i = 0; i < 9; i++) {
    await clickCanvasButton(page, 'backspace or delete key on virtual keyboard', { retries: 3, waitMs: 200 });
  }

  // Type "Test"
  await clickCanvasButton(page, 'key T on virtual keyboard');
  await clickCanvasButton(page, 'key e on virtual keyboard');
  await clickCanvasButton(page, 'key s on virtual keyboard');
  await clickCanvasButton(page, 'key t on virtual keyboard');

  // Confirm / close keyboard — look for a tick, Enter, or OK button
  await clickCanvasButton(page, 'confirm or OK button to close the virtual keyboard', { retries: 3, waitMs: 400 });

  // Screenshot after keyboard dismissed
  const afterScreenshot = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-name-change', { body: afterScreenshot, contentType: 'image/png' });

  await goBack(page);

  const changed = await downloadModelBin(page);
  saveBin('01-model-name-test', changed);

  const record = saveDiff('01-model-name-test', 'Model name: "New model" → "Test"', baseline, changed);
  logDiff(record);
});
