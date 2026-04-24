/**
 * Investigation: Vars screen → Var rate/weight field
 *
 * Baseline: 1 Var with default rate (100% = 1000‰).
 * Change:   decrement rate to approximately 50% using the number control bar.
 *
 * The rate is stored as int16 little-endian per-mille (‰):
 *   100% = 1000 = 0x03E8 → stored as E8 03
 *    50% =  500 = 0x01F4 → stored as F4 01
 * Seeing these exact bytes change confirms the encoding.
 *
 * Findings saved to:
 *   findings/diffs/04-vars-rate.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard, clickCanvasButton } from '../helpers/boot';
import { navigateToVars, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: Var rate 100% → ~50%', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // --- set up: add one default Var ---
  await navigateToVars(page);
  await clickCanvasButton(page, 'plus button to add a new Var');
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(300);

  // --- baseline: 1 Var, rate = 100% ---
  const baseline = await downloadModelBin(page);
  saveBin('04-vars-rate-baseline', baseline);

  // --- open the Var for editing ---
  await navigateToVars(page);
  await clickCanvasButton(page, 'first Var entry in the list');
  await page.waitForTimeout(400);

  // --- tap Rate/Weight field to open number control bar ---
  await clickCanvasButton(page, 'Weight or Rate field showing the current rate value');
  await page.waitForTimeout(400);

  const controlBar = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('number-control-bar', { body: controlBar, contentType: 'image/png' });

  // Set step size to 10% by tapping the < step control until we see 10
  // (default step is usually 1% — we want bigger steps for efficiency)
  await clickCanvasButton(page, 'right arrow or greater-than button to increase step size in number control bar');
  await page.waitForTimeout(200);
  await clickCanvasButton(page, 'right arrow or greater-than button to increase step size in number control bar');
  await page.waitForTimeout(200);

  // Decrement 5 times at 10% step = -50% → result: 50%
  for (let i = 0; i < 5; i++) {
    await clickCanvasButton(page, 'minus or decrement button in number control bar');
    await page.waitForTimeout(200);
  }

  const afterChange = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-rate-change', { body: afterChange, contentType: 'image/png' });

  await goBack(page);
  await page.waitForTimeout(300);

  // --- download and diff ---
  const changed = await downloadModelBin(page);
  saveBin('04-vars-rate', changed);

  const record = saveDiff('04-vars-rate', 'Var rate: 100% → ~50% (5× decrement at 10% step)', baseline, changed);
  logDiff(record);
});
