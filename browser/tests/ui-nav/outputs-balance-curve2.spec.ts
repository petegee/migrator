/**
 * Probe: Outputs channel editor — Balance curve "Add" button, corrected y
 * 150px scroll snapshot shows Balance curve center at display y≈253 → bitmap y≈316.
 * "Add" button is at far right (bitmap x≈723). Try a range around y=316.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToOutputs } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function openCH1Editor150(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToOutputs(page);
  await tapBitmap(page, 200, 112);
  await page.waitForTimeout(500);
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: HTMLCanvasElement) => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) throw new Error('canvas not found');
  const cdp = await page.context().newCDPSession(page);
  const px = rect.x + 400 * (rect.w / 800);
  const pyStart = rect.y + 350 * (rect.h / 480);
  const pyEnd = rect.y + 200 * (rect.h / 480);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: px, y: pyStart, id: 0 }] });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: px, y: pyEnd, id: 0 }] });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
}

test('outputs-ch1: 150px scroll, tap Add at (730, 310)', async ({ page }) => {
  await openCH1Editor150(page);
  await tapBitmap(page, 730, 310);
  await page.waitForTimeout(500);
  await snap(page, 'outbc2-tap-730-310.png');
});

test('outputs-ch1: 150px scroll, tap Add at (730, 320)', async ({ page }) => {
  await openCH1Editor150(page);
  await tapBitmap(page, 730, 320);
  await page.waitForTimeout(500);
  await snap(page, 'outbc2-tap-730-320.png');
});

test('outputs-ch1: 150px scroll, touch Add at (730, 315)', async ({ page }) => {
  await openCH1Editor150(page);
  await touchBitmap(page, 730, 315);
  await page.waitForTimeout(500);
  await snap(page, 'outbc2-touch-730-315.png');
});

// Also try tapping the row centre (not just the button)
test('outputs-ch1: 150px scroll, tap row centre at (400, 315)', async ({ page }) => {
  await openCH1Editor150(page);
  await tapBitmap(page, 400, 315);
  await page.waitForTimeout(500);
  await snap(page, 'outbc2-tap-400-315.png');
});
