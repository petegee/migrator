/**
 * Probe: does downloadModelBin disrupt the canvas navigation state?
 * Steps through the exact 13-curves-add sequence with extra snapshots.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap } from '../helpers/navigate';
import { navigateToCurves, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

async function snapWebGL(page: any, label: string) {
  const idx = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const i = canvases.findIndex((c: HTMLCanvasElement) => c.getContext('webgl') !== null || c.getContext('webgl2') !== null);
    return i === -1 ? 0 : i;
  });
  const buf = await page.locator('canvas').nth(idx).screenshot({ type: 'png' });
  await test.info().attach(label, { body: buf, contentType: 'image/png' });
}

test('probe: download + curves sequence', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await snapWebGL(page, '01-after-wizard');

  // Download baseline
  const baseline = await downloadModelBin(page);
  saveBin('probe-dl-baseline', baseline);
  await snapWebGL(page, '02-after-download');

  // Navigate to Curves
  await navigateToCurves(page);
  await snapWebGL(page, '03-after-navigateToCurves');

  // Tap "+"
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(500);
  await snapWebGL(page, '04-after-plus-tap');

  // Go back
  await goBack(page);
  await page.waitForTimeout(300);
  await snapWebGL(page, '05-after-goBack');

  // Download changed
  const changed = await downloadModelBin(page);
  saveBin('probe-dl-changed', changed);

  const record = saveDiff('probe-download', 'probe: download + curves', baseline, changed);
  logDiff(record);
});
