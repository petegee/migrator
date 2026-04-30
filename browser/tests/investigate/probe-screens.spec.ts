/**
 * Probe: capture Mixes, Flight Modes, and Outputs screens to disk
 * so bitmap coordinates can be verified visually.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { navigateToMixes, navigateToFlightModes, navigateToOutputs, tapBitmap } from '../helpers/navigate';
import { downloadModelBin } from '../helpers/diff';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');

function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}

test('probe: mixes add free mix full flow', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await downloadModelBin(page);

  await navigateToMixes(page);
  await page.waitForTimeout(500);

  // Tap "+" → library picker
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(500);

  // Tap "Free mix" (top-left cell of grid): canvas ≈ (80, 81) → bitmap (100, 101)
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(500);
  save('mixes-add-after-dialog.png', await page.locator('canvas').first().screenshot({ type: 'png' }));

  // Tap "Last position" in the "Add after" dialog: canvas ≈ (317, 149) → bitmap (396, 186)
  await tapBitmap(page, 396, 186);
  await page.waitForTimeout(600);
  save('mixes-after-last-position.png', await page.locator('canvas').first().screenshot({ type: 'png' }));
});

test('probe: flight modes screen', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await downloadModelBin(page);

  await navigateToFlightModes(page);
  await page.waitForTimeout(500);
  const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
  save('flight-modes-screen.png', buf);

  const full = await page.screenshot({ type: 'png', fullPage: false });
  save('flight-modes-fullpage.png', full);
});

test('probe: outputs direction y sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await downloadModelBin(page);

  // Try a range of y values for the Direction toggle; save a screenshot after each
  for (const by of [205, 220, 235, 250, 265]) {
    await navigateToOutputs(page);
    await page.waitForTimeout(300);
    await tapBitmap(page, 200, 112); // open CH1 editor
    await page.waitForTimeout(400);
    await tapBitmap(page, 615, by);  // try Direction toggle at this y
    await page.waitForTimeout(400);
    save(`outputs-direction-tap-y${by}.png`, await page.locator('canvas').first().screenshot({ type: 'png' }));
    await tapBitmap(page, 25, 25); // back
    await page.waitForTimeout(200);
    await tapBitmap(page, 25, 25); // back to outputs list (dismiss keyboard first if open)
    await page.waitForTimeout(200);
  }
});
