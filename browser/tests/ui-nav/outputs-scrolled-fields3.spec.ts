/**
 * Probe: Outputs channel editor — Curve field and Balance curve Add button
 * Previous attempts failed at x=600 for both.
 * Hypothesis: Curve ▼ arrow is at bitmap x≈755; Balance curve Add button needs touchBitmap.
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

// Curve: tap the ▼ arrow at far right (bitmap x≈755)
test('outputs-ch1: tap Curve arrow at (755, 140)', async ({ page }) => {
  await openCH1EditorScrolled(page);
  await tapBitmap(page, 755, 140);
  await page.waitForTimeout(500);
  await snap(page, 'out3-curve-tap-arrow-755-140.png');
});

// Curve: touch the ▼ arrow
test('outputs-ch1: touch Curve arrow at (755, 140)', async ({ page }) => {
  await openCH1EditorScrolled(page);
  await touchBitmap(page, 755, 140);
  await page.waitForTimeout(500);
  await snap(page, 'out3-curve-touch-arrow-755-140.png');
});

// Curve: tap row centre (x=400 rather than x=600)
test('outputs-ch1: tap Curve row centre at (400, 140)', async ({ page }) => {
  await openCH1EditorScrolled(page);
  await tapBitmap(page, 400, 140);
  await page.waitForTimeout(500);
  await snap(page, 'out3-curve-tap-centre-400-140.png');
});

// Balance curve Add: try touchBitmap
test('outputs-ch1: touch Balance curve Add at (730, 215)', async ({ page }) => {
  await openCH1EditorScrolled(page);
  await touchBitmap(page, 730, 215);
  await page.waitForTimeout(500);
  await snap(page, 'out3-balance-curve-touch-730-215.png');
});

// Balance curve Add: try tap at row label side (400, 215) — maybe it opens an editor
test('outputs-ch1: tap Balance curve row at (400, 215)', async ({ page }) => {
  await openCH1EditorScrolled(page);
  await tapBitmap(page, 400, 215);
  await page.waitForTimeout(500);
  await snap(page, 'out3-balance-curve-tap-400-215.png');
});
