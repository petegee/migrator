/**
 * Probe: Outputs channel editor — Balance curve "Add" button
 * After a 100px scroll Balance curve is at the bottom edge (~y=460+, unresponsive).
 * Use a 150px scroll (byStart=350, byEnd=200) to bring it to mid-screen (~y=400).
 * The "Add" button sits at far right of the row.
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

async function openCH1EditorScrolled(page: any, byStart: number, byEnd: number) {
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
  const pyStart = rect.y + byStart * (rect.h / 480);
  const pyEnd = rect.y + byEnd * (rect.h / 480);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: px, y: pyStart, id: 0 }] });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: px, y: pyEnd, id: 0 }] });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
}

// 150px scroll snapshot — see where Balance curve lands
test('outputs-ch1: 150px scroll snapshot', async ({ page }) => {
  await openCH1EditorScrolled(page, 350, 200);
  await snap(page, 'outbc-150px-snapshot.png');
});

// Tap the Add button at right side, various y values
test('outputs-ch1: 150px scroll, tap Add at (730, 380)', async ({ page }) => {
  await openCH1EditorScrolled(page, 350, 200);
  await tapBitmap(page, 730, 380);
  await page.waitForTimeout(500);
  await snap(page, 'outbc-tap-730-380.png');
});

test('outputs-ch1: 150px scroll, tap Add at (730, 400)', async ({ page }) => {
  await openCH1EditorScrolled(page, 350, 200);
  await tapBitmap(page, 730, 400);
  await page.waitForTimeout(500);
  await snap(page, 'outbc-tap-730-400.png');
});

test('outputs-ch1: 150px scroll, tap Add at (730, 420)', async ({ page }) => {
  await openCH1EditorScrolled(page, 350, 200);
  await tapBitmap(page, 730, 420);
  await page.waitForTimeout(500);
  await snap(page, 'outbc-tap-730-420.png');
});

// Try touch as well in case Add needs touchBitmap
test('outputs-ch1: 150px scroll, touch Add at (730, 400)', async ({ page }) => {
  await openCH1EditorScrolled(page, 350, 200);
  await touchBitmap(page, 730, 400);
  await page.waitForTimeout(500);
  await snap(page, 'outbc-touch-730-400.png');
});
