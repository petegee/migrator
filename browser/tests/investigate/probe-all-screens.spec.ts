/**
 * Probe: capture every screen needed to replace clickCanvasButton calls.
 * Saves PNGs to findings/screenshots/ for coordinate measurement.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import {
  tapBitmap,
  navigateToEditModel,
  navigateToVars,
  navigateToMixes,
  navigateToOutputs,
  navigateToFlightModes,
  goBack,
} from '../helpers/navigate';
import { downloadModelBin } from '../helpers/diff';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

// ---------------------------------------------------------------------------
test('probe: edit model screen', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToEditModel(page);
  await snap(page, 'edit-model.png');
});

// ---------------------------------------------------------------------------
test('probe: vars screens', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add a Var using big centred "+" (same as Curves)
  await navigateToVars(page);
  await tapBitmap(page, 400, 266); // big centred +
  await page.waitForTimeout(500);
  await snap(page, 'vars-after-add.png');
  await goBack(page);
  await page.waitForTimeout(300);

  // Re-enter to see the list with one var
  await navigateToVars(page);
  await snap(page, 'vars-list-with-entry.png');

  // Open the first entry: single tap to select, then tap again to open editor
  await tapBitmap(page, 300, 112); // first row
  await page.waitForTimeout(300);
  await tapBitmap(page, 300, 112); // second tap to open
  await page.waitForTimeout(400);
  await snap(page, 'var-editor.png');
});

// ---------------------------------------------------------------------------
test('probe: mixes editor screens', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add a Free mix using known flow
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);  // "+" header
  await page.waitForTimeout(400);
  await tapBitmap(page, 100, 101); // "Free mix"
  await page.waitForTimeout(400);
  await tapBitmap(page, 396, 186); // "Last position"
  await page.waitForTimeout(500);
  await goBack(page); // save, back to list
  await page.waitForTimeout(300);

  // Back to Mixes list (Free mix is row 1 — added with "Last" shows at top as selected)
  await navigateToMixes(page);
  await snap(page, 'mixes-list-4entries.png');

  // Free mix is row 1 and already selected (orange). Tap it again to open editor.
  await tapBitmap(page, 200, 83); // row 1 center (canvas y≈83 → bitmap y≈104, but use y=83 in bitmap)
  await page.waitForTimeout(300);
  await tapBitmap(page, 200, 83); // second tap to open
  await page.waitForTimeout(400);
  await snap(page, 'mix-editor-freemix.png');
});

// ---------------------------------------------------------------------------
test('probe: outputs number controls', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  await navigateToOutputs(page);
  await tapBitmap(page, 200, 112); // CH1
  await page.waitForTimeout(400);
  await snap(page, 'outputs-ch1-full.png');

  // Tap Max field (guess: bitmap y≈340)
  await tapBitmap(page, 700, 340);
  await page.waitForTimeout(400);
  await snap(page, 'outputs-max-control-bar.png');

  await tapBitmap(page, 25, 25); // dismiss / back
  await page.waitForTimeout(200);

  await navigateToOutputs(page);
  await tapBitmap(page, 200, 112); // CH1 again
  await page.waitForTimeout(400);

  // Tap Center/Subtrim field (guess: bitmap y≈385)
  await tapBitmap(page, 700, 385);
  await page.waitForTimeout(400);
  await snap(page, 'outputs-subtrim-control-bar.png');
});

// ---------------------------------------------------------------------------
test('probe: flight modes second entry and editor', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add a flight mode
  await navigateToFlightModes(page);
  await tapBitmap(page, 569, 69); // "+" header
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(300);

  // Re-enter to see FM list
  await navigateToFlightModes(page);
  await snap(page, 'flight-modes-list-2entries.png');

  // Tap second entry (FM1): roughly row 2, bitmap y ≈ 155
  await tapBitmap(page, 300, 155);
  await page.waitForTimeout(400);
  await snap(page, 'flight-mode-editor.png');

  // Tap Name field to open keyboard
  await tapBitmap(page, 300, 95); // guess: Name field is near top
  await page.waitForTimeout(400);
  await snap(page, 'flight-mode-name-keyboard.png');
});
