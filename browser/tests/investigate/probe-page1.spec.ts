/**
 * Probe: Page-1 action coordinates.
 * Tests both mouse (tapBitmap) and touch (touchBitmap) events for
 * the Mixes "+", Flight modes "+", and Outputs Direction toggle.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap } from '../helpers/navigate';
import { navigateToMixes, navigateToFlightModes, navigateToOutputs, goBack } from '../helpers/navigate';
import { downloadModelBin } from '../helpers/diff';

async function snap(page: any, label: string) {
  const buf = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach(label, { body: buf, contentType: 'image/png' });
}

async function getCanvasSize(page: any): Promise<{ w: number; h: number }> {
  return page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return { w: 0, h: 0 };
    const r = c.getBoundingClientRect();
    return { w: r.width, h: r.height, x: r.x, y: r.y };
  });
}

test('probe: mixes touch vs mouse', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await downloadModelBin(page);

  const size = await getCanvasSize(page);
  console.log('Canvas CSS size:', JSON.stringify(size));

  await navigateToMixes(page);
  await page.waitForTimeout(500);
  await snap(page, '01-mixes-before');

  // Try TOUCH event at center of "+" button
  await touchBitmap(page, 563, 50);
  await page.waitForTimeout(400);
  await snap(page, '02-after-touch-563-50');
  await goBack(page); await page.waitForTimeout(300);

  // Re-navigate after goBack exited to Model grid
  await navigateToMixes(page);
  await page.waitForTimeout(400);

  // Try MOUSE click at same position
  await tapBitmap(page, 563, 50);
  await page.waitForTimeout(400);
  await snap(page, '03-after-mouse-563-50');
  await goBack(page); await page.waitForTimeout(300);

  // Try touch at different y values
  await navigateToMixes(page);
  await page.waitForTimeout(400);
  for (const by of [40, 50, 60, 70]) {
    await touchBitmap(page, 563, by);
    await page.waitForTimeout(300);
    await snap(page, `04-touch-y${by}`);
    if (by < 70) {
      await goBack(page);
      await page.waitForTimeout(200);
      await navigateToMixes(page);
      await page.waitForTimeout(400);
    }
  }
});

test('probe: outputs direction touch', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await downloadModelBin(page);

  await navigateToOutputs(page);
  await tapBitmap(page, 200, 112);
  await page.waitForTimeout(400);
  await snap(page, '01-ch1-editor');

  // Try TOUCH for direction toggle
  await touchBitmap(page, 563, 157);
  await page.waitForTimeout(400);
  await snap(page, '02-after-touch-direction');

  await goBack(page);
  await page.waitForTimeout(200);
  await navigateToOutputs(page);
  await tapBitmap(page, 200, 112);
  await page.waitForTimeout(400);

  // Try with mouse at a range of y values
  for (const by of [140, 150, 160, 170]) {
    await tapBitmap(page, 563, by);
    await page.waitForTimeout(300);
    await snap(page, `03-mouse-y${by}`);
  }
});
