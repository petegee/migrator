/**
 * Probe: Outputs channel editor — scrolled fields, second pass
 * From probe 1: Slow up (600,320) ✓, Slow down (600,400) ✓
 * Still needed: Curve field (try y=140 and touchBitmap), Balance curve Add button (~730,215),
 * and 3 bottom action buttons (Balance channels, Swap channels, Reset settings).
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

async function openCH1EditorScrolled(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToOutputs(page);
  await tapBitmap(page, 200, 112);
  await page.waitForTimeout(500);
  // One CDP touch scroll
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
  const pyStart = rect.y + 400 * (rect.h / 480);
  const pyEnd = rect.y + 150 * (rect.h / 480);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: px, y: pyStart, id: 0 }] });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: px, y: pyEnd, id: 0 }] });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
}

// Curve field — try tap at y=140 (closer to row center)
test('outputs-ch1: tap Curve at (600, 140)', async ({ page }) => {
  await openCH1EditorScrolled(page);
  await tapBitmap(page, 600, 140);
  await page.waitForTimeout(500);
  await snap(page, 'out2-curve-tap140.png');
});

// Curve field — try touchBitmap at y=140
test('outputs-ch1: touch Curve at (600, 140)', async ({ page }) => {
  await openCH1EditorScrolled(page);
  await touchBitmap(page, 600, 140);
  await page.waitForTimeout(500);
  await snap(page, 'out2-curve-touch140.png');
});

// Balance curve "Add" button — displayed at far right, try bitmap (730, 215)
test('outputs-ch1: tap Balance curve Add at (730, 215)', async ({ page }) => {
  await openCH1EditorScrolled(page);
  await tapBitmap(page, 730, 215);
  await page.waitForTimeout(500);
  await snap(page, 'out2-balance-curve-add-730-215.png');
});

// Bottom action buttons — "Balance channels" at left third, "Swap channels" centre, "Reset settings" right third
test('outputs-ch1: tap Balance channels button (~133, 450)', async ({ page }) => {
  await openCH1EditorScrolled(page);
  await tapBitmap(page, 133, 450);
  await page.waitForTimeout(500);
  await snap(page, 'out2-balance-channels-133-450.png');
});

test('outputs-ch1: tap Swap channels button (~400, 450)', async ({ page }) => {
  await openCH1EditorScrolled(page);
  await tapBitmap(page, 400, 450);
  await page.waitForTimeout(500);
  await snap(page, 'out2-swap-channels-400-450.png');
});

test('outputs-ch1: tap Reset settings button (~666, 450)', async ({ page }) => {
  await openCH1EditorScrolled(page);
  await tapBitmap(page, 666, 450);
  await page.waitForTimeout(500);
  await snap(page, 'out2-reset-settings-666-450.png');
});
