/**
 * Probe: Vars editor — "+ Add a new action" button, focused follow-up
 *
 * Prior probe (vars-actions): one scroll reveals Actions section, but
 * touchBitmap at y=380/400/420/440/460 x=400 all had no effect.
 *
 * Hypotheses to test:
 * 1. Button is at y≈455-475 (closer to canvas bottom edge than expected)
 * 2. Button responds to tapBitmap (mouse click) rather than touch
 * 3. x=400 may not be centered on the button — try x=300 and x=500 also
 *
 * Strategy: single scroll, then alternate tap/touch at precise y values.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToVars } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, label: string) =>
  save(label, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function openEditorAndScroll(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);   // open Var editor via centred +
  await page.waitForTimeout(600);

  // One scroll — enough to reveal Actions section
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (rect) {
    const cx = rect.x + 400 * (rect.w / 800);
    const startY = rect.y + 440 * (rect.h / 480);
    const endY   = rect.y + 150 * (rect.h / 480);
    await page.mouse.move(cx, startY);
    await page.mouse.down();
    await page.mouse.move(cx, endY, { steps: 15 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }
  await snap(page, 'va2-00-after-single-scroll.png');
}

// Test 1: tapBitmap sweep at higher y values (455–475)
test('vars actions2: tapBitmap at y=455,465,475 x=400', async ({ page }) => {
  await openEditorAndScroll(page);
  for (const by of [455, 465, 475]) {
    await snap(page, `va2-tap-pre-y${by}.png`);
    await tapBitmap(page, 400, by);
    await page.waitForTimeout(600);
    await snap(page, `va2-tap-post-y${by}.png`);
  }
});

// Test 2: touchBitmap sweep at higher y values
test('vars actions2: touchBitmap at y=455,465,475 x=400', async ({ page }) => {
  await openEditorAndScroll(page);
  for (const by of [455, 465, 475]) {
    await snap(page, `va2-touch-pre-y${by}.png`);
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(600);
    await snap(page, `va2-touch-post-y${by}.png`);
  }
});

// Test 3: tapBitmap at the range y=430–470 with x=300 (left-aligned button text area)
test('vars actions2: tapBitmap x=300 sweep y=430-470', async ({ page }) => {
  await openEditorAndScroll(page);
  for (const by of [430, 445, 460]) {
    await snap(page, `va2-tap-x300-pre-y${by}.png`);
    await tapBitmap(page, 300, by);
    await page.waitForTimeout(600);
    await snap(page, `va2-tap-x300-post-y${by}.png`);
  }
});
