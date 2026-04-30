/**
 * Investigation: Flight modes screen → flight mode name
 *
 * Baseline: fresh model with FM0 only (no FM1).
 * Change:   add FM1 and rename it to "CRUISE" via virtual keyboard.
 *
 * The FM1 editor auto-opens when FM1 is added via "+". The Name edit icon
 * responds to touchscreen tap at bitmap (780, 80). Keyboard y-values confirmed
 * from probe screenshots (fmk-03-touch-780-80.png).
 *
 * Note: the diff includes the full FM1 data block insertion. The name field
 * is identified by searching for the "CRUISE" ASCII bytes (43 52 55 49 53 45)
 * in the changed binary.
 *
 * Findings saved to:
 *   findings/diffs/12-flight-modes-name.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToFlightModes, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: flight mode name → "CRUISE"', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Baseline: FM0 only — download before adding FM1
  await navigateToFlightModes(page);
  const baseline = await downloadModelBin(page);
  saveBin('12-flight-modes-name-baseline', baseline);

  // Add FM1 → FM1 editor auto-opens
  await tapBitmap(page, 569, 69); // "+" header button
  await page.waitForTimeout(600);

  const fmEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('fm-editor', { body: fmEditor, contentType: 'image/png' });

  // Open Name keyboard: touch the edit icon at bitmap (780, 80)
  // (Confirmed from probe: touchBitmap required; mouse click misses the small icon)
  await touchBitmap(page, 780, 80);
  await page.waitForTimeout(600);

  const keyboard = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('fm-name-keyboard', { body: keyboard, contentType: 'image/png' });

  // Type "CRUISE" — all keys use touchBitmap (tapBitmap registers wrong key)
  // Confirmed row y-values and x-positions from keyboard probe:
  //   Row 1 (QWERTYUIOP) y=315: E=200, R=280, U=520, I=600
  //   Row 2 (ASDFGHJKL)  y=340: S=120
  //   Row 3 (ZXCVBNM)    y=395: C=280
  //   ENTER touchBitmap (700, 450)
  await touchBitmap(page, 280, 395); // C
  await page.waitForTimeout(150);
  await touchBitmap(page, 280, 315); // R
  await page.waitForTimeout(150);
  await touchBitmap(page, 520, 315); // U
  await page.waitForTimeout(150);
  await touchBitmap(page, 600, 315); // I
  await page.waitForTimeout(150);
  await touchBitmap(page, 120, 340); // S
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 315); // E
  await page.waitForTimeout(150);
  await touchBitmap(page, 700, 450); // ENTER
  await page.waitForTimeout(600);

  const afterChange = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-name-change', { body: afterChange, contentType: 'image/png' });

  // Tap "Active condition" row to shift focus away from Name field before exiting.
  // Without this, some firmware builds only commit the name when focus leaves the field.
  await tapBitmap(page, 400, 128);
  await page.waitForTimeout(400);

  // goBack ×2: first exits FM editor → FM list; second exits FM list → Model Setup.
  // The full two-level exit ensures pending writes are flushed before downloading.
  await goBack(page);
  await page.waitForTimeout(400);
  await goBack(page);
  await page.waitForTimeout(600);

  const changed = await downloadModelBin(page);
  saveBin('12-flight-modes-name', changed);

  const record = saveDiff('12-flight-modes-name', 'Flight mode name: (empty) → "CRUISE"', baseline, changed);
  logDiff(record);
});
