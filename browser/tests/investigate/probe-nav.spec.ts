/**
 * Probe: step-by-step navigation from home screen.
 * Captures screenshot after each tap to identify where each nav bar icon leads.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, swipeCanvas } from '../helpers/navigate';

async function snap(page: any, label: string) {
  // Use WebGL canvas for screenshot
  const idx = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const i = canvases.findIndex((c: HTMLCanvasElement) => c.getContext('webgl') !== null || c.getContext('webgl2') !== null);
    return i === -1 ? 0 : i;
  });
  const buf = await page.locator('canvas').nth(idx).screenshot({ type: 'png' });
  await test.info().attach(label, { body: buf, contentType: 'image/png' });
}

test('probe: post-wizard navigation', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await snap(page, '00-after-wizard');

  // Tap navModelSetup (194, 459) → should open Model grid page 1
  await tapBitmap(page, 194, 459);
  await page.waitForTimeout(800);
  await snap(page, '01-model-grid-p1');

  // Swipe left → should go to Model grid page 2
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(500);
  await snap(page, '02-after-swipe-left');

  // Tap r2c1 = (100, 330) → should open Curves
  await tapBitmap(page, 100, 330);
  await page.waitForTimeout(500);
  await snap(page, '03-tap-r2c1');

  // Back
  await tapBitmap(page, 25, 25);
  await page.waitForTimeout(400);
  await snap(page, '04-back-from-r2c1');

  // Tap r1c1 = (100, 140) → should be the first cell on page 2
  await tapBitmap(page, 100, 140);
  await page.waitForTimeout(500);
  await snap(page, '05-tap-r1c1');

  // Back → Model grid
  await tapBitmap(page, 25, 25);
  await page.waitForTimeout(400);
  await snap(page, '06-back');

  // Navigate home and then go straight to Model Setup page 1
  await tapBitmap(page, 54, 459);
  await page.waitForTimeout(400);
  await tapBitmap(page, 194, 459);
  await page.waitForTimeout(600);
  await snap(page, '07-model-grid-fresh');

  // Tap Edit model (r1c2 = 300, 140)
  await tapBitmap(page, 300, 140);
  await page.waitForTimeout(500);
  await snap(page, '08-tap-edit-model');
});
