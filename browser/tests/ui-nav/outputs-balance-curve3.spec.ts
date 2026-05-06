/**
 * Probe: Outputs Balance curve — y-coordinate sweep
 * Stop guessing from screenshots. Sweep y=280 through y=460 in 20px steps
 * at x=730 (Add button right side) in the 150px scroll view.
 * Look for any screenshot that shows a change (highlight, dialog, etc).
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToOutputs } from '../helpers/navigate';
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

for (const y of [280, 300, 320, 340, 360, 380, 400, 420, 440, 460]) {
  test(`outputs-ch1: 150px scroll, tap (730, ${y})`, async ({ page }) => {
    await openCH1Editor150(page);
    await tapBitmap(page, 730, y);
    await page.waitForTimeout(500);
    await snap(page, `outbc3-tap-730-${y}.png`);
  });
}
