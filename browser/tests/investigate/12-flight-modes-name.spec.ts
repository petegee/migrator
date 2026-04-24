/**
 * Investigation: Flight modes screen → flight mode name
 *
 * Baseline: 1 extra flight mode with default name.
 * Change:   rename it to "Cruise".
 *
 * Reveals how flight mode names are stored (likely length-prefixed ASCII).
 *
 * Findings saved to:
 *   findings/diffs/12-flight-modes-name.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard, clickCanvasButton } from '../helpers/boot';
import { navigateToFlightModes, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: flight mode name → "Cruise"', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  await navigateToFlightModes(page);
  await clickCanvasButton(page, 'plus button to add a new flight mode');
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(300);

  const baseline = await downloadModelBin(page);
  saveBin('12-flight-modes-name-baseline', baseline);

  await navigateToFlightModes(page);
  await clickCanvasButton(page, 'second flight mode entry in the list');
  await page.waitForTimeout(400);

  await clickCanvasButton(page, 'Name text field for the flight mode');
  await page.waitForTimeout(400);

  const keyboard = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('virtual-keyboard', { body: keyboard, contentType: 'image/png' });

  // Clear default name and type "Cruise"
  for (let i = 0; i < 6; i++) {
    await clickCanvasButton(page, 'backspace or delete key on virtual keyboard', { retries: 3, waitMs: 200 });
  }
  await clickCanvasButton(page, 'key C on virtual keyboard');
  await clickCanvasButton(page, 'key r on virtual keyboard');
  await clickCanvasButton(page, 'key u on virtual keyboard');
  await clickCanvasButton(page, 'key i on virtual keyboard');
  await clickCanvasButton(page, 'key s on virtual keyboard');
  await clickCanvasButton(page, 'key e on virtual keyboard');
  await clickCanvasButton(page, 'confirm or OK button to close the virtual keyboard', { retries: 3, waitMs: 400 });

  await goBack(page);
  await page.waitForTimeout(300);

  const changed = await downloadModelBin(page);
  saveBin('12-flight-modes-name', changed);

  const record = saveDiff('12-flight-modes-name', 'Flight mode name: default → "Cruise"', baseline, changed);
  logDiff(record);
});
