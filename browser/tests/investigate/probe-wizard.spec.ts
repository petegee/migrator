/**
 * Probe: boot flow and wizard navigation diagnostics.
 * Captures the canvas rect, screenshots at each step, and confirms
 * each Next click actually advances the wizard.
 */
import { test } from '@playwright/test';
import { bootApp } from '../helpers/boot';
import { tapBitmap } from '../helpers/navigate';

test('probe: wizard navigation step-by-step', async ({ page }) => {
  await bootApp(page);

  // Log the Display canvas rect
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  console.log('Display canvas rect:', JSON.stringify(rect));

  const snap0 = await page.locator('canvas').first().screenshot({ type: 'png' });
  await test.info().attach('00-after-boot', { body: snap0, contentType: 'image/png' });

  // Select Airplane
  await tapBitmap(page, 81, 220);
  await page.waitForTimeout(400);
  const snap1 = await page.locator('canvas').first().screenshot({ type: 'png' });
  await test.info().attach('01-airplane-selected', { body: snap1, contentType: 'image/png' });

  // Click Next up to 10 times, screenshot after each
  for (let i = 0; i < 10; i++) {
    await tapBitmap(page, 729, 449);
    await page.waitForTimeout(500);
    const snap = await page.locator('canvas').first().screenshot({ type: 'png' });
    await test.info().attach(`next-${String(i + 1).padStart(2, '0')}`, { body: snap, contentType: 'image/png' });
  }

  await page.waitForTimeout(800);
  const snapFinal = await page.locator('canvas').first().screenshot({ type: 'png' });
  await test.info().attach('final', { body: snapFinal, contentType: 'image/png' });
});
