/**
 * Probe: Glider wizard navigation diagnostics.
 * Captures screenshots at each Next click to count Glider wizard pages.
 */
import { test } from '@playwright/test';
import { bootApp } from '../helpers/boot';
import { tapBitmap } from '../helpers/navigate';

test('probe: glider wizard step-by-step', async ({ page }) => {
  await bootApp(page);

  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  console.log('Canvas rect:', JSON.stringify(rect));

  const snap0 = await page.locator('canvas').first().screenshot({ type: 'png' });
  await test.info().attach('00-after-boot', { body: snap0, contentType: 'image/png' });

  // Select Glider (2nd icon, x=237)
  await tapBitmap(page, 237, 220);
  await page.waitForTimeout(400);
  const snap1 = await page.locator('canvas').first().screenshot({ type: 'png' });
  await test.info().attach('01-glider-selected', { body: snap1, contentType: 'image/png' });

  // Click Next 14 times with screenshot after each
  for (let i = 0; i < 14; i++) {
    await tapBitmap(page, 729, 449);
    await page.waitForTimeout(500);
    const snap = await page.locator('canvas').first().screenshot({ type: 'png' });
    await test.info().attach(`next-${String(i + 1).padStart(2, '0')}`, { body: snap, contentType: 'image/png' });
  }

  await page.waitForTimeout(800);
  const snapFinal = await page.locator('canvas').first().screenshot({ type: 'png' });
  await test.info().attach('final', { body: snapFinal, contentType: 'image/png' });
});
