import { test } from '@playwright/test';
import { bootApp } from '../helpers/boot';

test('probe: canvas rect', async ({ page }) => {
  await bootApp(page);
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  console.log('CANVAS_RECT=' + JSON.stringify(rect));
  const vp = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
  console.log('VIEWPORT=' + JSON.stringify(vp));
});
