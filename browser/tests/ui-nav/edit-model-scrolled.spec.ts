/**
 * Probe: Edit Model — scrolled fields below Tail
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToEditModel } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function cdpTouchSwipe(page: any, bx: number, byStart: number, byEnd: number) {
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: HTMLCanvasElement) => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const px = rect.x + bx * (rect.w / 800);
  const pyStart = rect.y + byStart * (rect.h / 480);
  const pyEnd = rect.y + byEnd * (rect.h / 480);
  const client = await (page.context() as any).newCDPSession(page);
  const ts = Date.now();
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart', timestamp: ts / 1000,
    touchPoints: [{ x: px, y: pyStart, id: 0 }],
  });
  for (let i = 1; i <= 10; i++) {
    const y = pyStart + (pyEnd - pyStart) * (i / 10);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove', timestamp: (ts + i * 30) / 1000,
      touchPoints: [{ x: px, y, id: 0 }],
    });
    await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd', timestamp: (ts + 330) / 1000,
    touchPoints: [{ x: px, y: pyEnd, id: 0 }],
  });
}

test('probe: Edit Model — scroll to see fields below Tail', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToEditModel(page);

  await snap(page, 'ems-01-before-scroll.png');

  // Scroll up (drag from bottom to top) to reveal fields below Tail
  await cdpTouchSwipe(page, 400, 400, 150);
  await page.waitForTimeout(500);
  await snap(page, 'ems-02-after-scroll1.png');

  // Sweep y at x=600 after scroll
  for (const y of [80, 160, 240, 320, 400]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `ems-03-scroll1-tap-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(300);
  }

  // Scroll again
  await cdpTouchSwipe(page, 400, 400, 150);
  await page.waitForTimeout(500);
  await snap(page, 'ems-04-after-scroll2.png');

  for (const y of [80, 160, 240, 320, 400]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `ems-05-scroll2-tap-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(300);
  }
});
