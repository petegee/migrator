/**
 * Probe: Edit Model — fill gaps: Rudders, Function switches, Persistent, Model runtime Reset
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
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', timestamp: ts / 1000, touchPoints: [{ x: px, y: pyStart, id: 0 }] });
  for (let i = 1; i <= 10; i++) {
    const y = pyStart + (pyEnd - pyStart) * (i / 10);
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', timestamp: (ts + i * 30) / 1000, touchPoints: [{ x: px, y, id: 0 }] });
    await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', timestamp: (ts + 330) / 1000, touchPoints: [{ x: px, y: pyEnd, id: 0 }] });
}

test('probe: Edit Model gaps — Rudders (after 1 scroll)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToEditModel(page);
  await cdpTouchSwipe(page, 400, 400, 150);
  await page.waitForTimeout(500);
  await snap(page, 'emg-01-scroll1.png');

  // Rudders should be between Elevators (y=240) and Flaps (y=360) — sweep 270-340
  for (const y of [270, 290, 300, 310, 330]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `emg-02-rudders-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(300);
  }
});

test('probe: Edit Model gaps — Function switches + Persistent (after 2 scrolls)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToEditModel(page);
  await cdpTouchSwipe(page, 400, 400, 150);
  await page.waitForTimeout(500);
  await cdpTouchSwipe(page, 400, 400, 150);
  await page.waitForTimeout(500);
  await snap(page, 'emg-03-scroll2.png');

  // Function switches between Analogs filter (y=240) and Persistent — sweep 270-340
  // Persistent between Function switches and S.Port connector (y=400) — sweep 340-380
  for (const y of [270, 290, 300, 310, 330, 350, 360, 370]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `emg-04-scroll2-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(300);
  }
});

test('probe: Edit Model gaps — Model runtime Reset (after 2+ scrolls)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToEditModel(page);
  await cdpTouchSwipe(page, 400, 400, 150);
  await page.waitForTimeout(500);
  await cdpTouchSwipe(page, 400, 400, 150);
  await page.waitForTimeout(500);
  await snap(page, 'emg-05-before-runtime.png');

  // Model runtime row is at the bottom, Reset button is on the right
  // Try tapping the Reset button side at various y near bottom
  for (const y of [440, 455, 465]) {
    await tapBitmap(page, 650, y);
    await page.waitForTimeout(500);
    await snap(page, `emg-06-runtime-reset-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(300);
  }
});
