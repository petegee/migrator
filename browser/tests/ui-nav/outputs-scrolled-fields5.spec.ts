/**
 * Probe: Outputs Curve field — partial scroll, target y near bottom
 * After a 100px scroll (byStart=300, byEnd=200), Curve appears near the bottom
 * of the screen at approx bitmap y=410-440. Test that range.
 * Also test Balance curve Add at the very bottom edge.
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

async function openCH1EditorPartialScroll(page: any) {
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
  const pyStart = rect.y + 300 * (rect.h / 480);
  const pyEnd = rect.y + 200 * (rect.h / 480);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: px, y: pyStart, id: 0 }] });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: px, y: pyEnd, id: 0 }] });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
}

test('outputs-ch1: partial scroll, tap Curve at (600, 400)', async ({ page }) => {
  await openCH1EditorPartialScroll(page);
  await tapBitmap(page, 600, 400);
  await page.waitForTimeout(500);
  await snap(page, 'out5-curve-partial-tap-400.png');
});

test('outputs-ch1: partial scroll, tap Curve at (600, 420)', async ({ page }) => {
  await openCH1EditorPartialScroll(page);
  await tapBitmap(page, 600, 420);
  await page.waitForTimeout(500);
  await snap(page, 'out5-curve-partial-tap-420.png');
});

test('outputs-ch1: partial scroll, tap Curve at (600, 440)', async ({ page }) => {
  await openCH1EditorPartialScroll(page);
  await tapBitmap(page, 600, 440);
  await page.waitForTimeout(500);
  await snap(page, 'out5-curve-partial-tap-440.png');
});

test('outputs-ch1: partial scroll, touch Curve at (600, 420)', async ({ page }) => {
  await openCH1EditorPartialScroll(page);
  await touchBitmap(page, 600, 420);
  await page.waitForTimeout(500);
  await snap(page, 'out5-curve-partial-touch-420.png');
});
