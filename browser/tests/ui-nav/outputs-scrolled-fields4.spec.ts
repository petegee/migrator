/**
 * Probe: Outputs Curve field — partial scroll attempt
 * Hypothesis: full 250px scroll positions Curve right at the subtitle header edge,
 * where the fixed overlay blocks interaction. Try smaller scroll (100px travel)
 * so Curve lands in the middle of the screen.
 * Also try a double-tap pattern (first tap to highlight, second to open picker).
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

async function openCH1Editor(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToOutputs(page);
  await tapBitmap(page, 200, 112);
  await page.waitForTimeout(500);
}

async function cdpScrollBy(page: any, byStart: number, byEnd: number) {
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
  const pyStart = rect.y + byStart * (rect.h / 480);
  const pyEnd = rect.y + byEnd * (rect.h / 480);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: px, y: pyStart, id: 0 }] });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: px, y: pyEnd, id: 0 }] });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
}

// Small scroll (100px): Center/Subtrim scrolls up, Curve appears low on screen
test('outputs-ch1: small scroll (300→200), snapshot', async ({ page }) => {
  await openCH1Editor(page);
  await cdpScrollBy(page, 300, 200);
  await snap(page, 'out4-small-scroll-snapshot.png');
});

// After small scroll, tap where Curve should appear (~300px down from top)
test('outputs-ch1: small scroll then tap Curve at (600, 300)', async ({ page }) => {
  await openCH1Editor(page);
  await cdpScrollBy(page, 300, 200);
  await tapBitmap(page, 600, 300);
  await page.waitForTimeout(500);
  await snap(page, 'out4-small-scroll-tap600-300.png');
});

// Two smaller scrolls (instead of one big one), then tap Curve at (600, 160)
test('outputs-ch1: two small scrolls, tap (600, 160)', async ({ page }) => {
  await openCH1Editor(page);
  await cdpScrollBy(page, 380, 280);  // 100px
  await cdpScrollBy(page, 380, 280);  // 100px
  await snap(page, 'out4-two-small-scrolls.png');
  await tapBitmap(page, 600, 160);
  await page.waitForTimeout(500);
  await snap(page, 'out4-two-small-scrolls-tap160.png');
});

// Double-tap Curve row after full scroll (tap to highlight, tap again for picker)
test('outputs-ch1: full scroll, double-tap Curve at (600, 160)', async ({ page }) => {
  await openCH1Editor(page);
  await cdpScrollBy(page, 400, 150);
  await tapBitmap(page, 600, 160);
  await page.waitForTimeout(200);
  await tapBitmap(page, 600, 160);
  await page.waitForTimeout(500);
  await snap(page, 'out4-full-scroll-doubletap-curve.png');
});
