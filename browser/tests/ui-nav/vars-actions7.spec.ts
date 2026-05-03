/**
 * Probe: Vars editor — keyboard navigation to Actions section
 *
 * Finding: mouse drag breaks all interaction; touch/wheel events only move cursor.
 * New approach: use keyboard Tab / Down arrow to navigate the editor
 * field list, reaching the Actions section without scrolling.
 * Then check if touchBitmap / Enter key activates "+ Add a new action".
 *
 * Also: verify tapBitmap on back arrow (25,25) still works after drag scroll —
 * this tells us whether mouse clicks work at all post-drag.
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

// Test A: after drag scroll, does tapBitmap(25,25) back arrow work?
test('vars actions7A: drag scroll then tapBitmap back arrow', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: HTMLCanvasElement) => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) return;

  // Drag scroll
  const cx = rect.x + 400 * (rect.w / 800);
  const startY = rect.y + 440 * (rect.h / 480);
  const endY   = rect.y + 150 * (rect.h / 480);
  await page.mouse.move(cx, startY);
  await page.mouse.down();
  await page.mouse.move(cx, endY, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await snap(page, 'va7a-01-after-drag-scroll.png');

  // Try tapBitmap on back arrow — does mouse click work?
  await tapBitmap(page, 25, 25);
  await page.waitForTimeout(600);
  await snap(page, 'va7a-02-after-back-arrow-tap.png');
});

// Test B: keyboard Down arrow navigation in editor, capture layout at each step
test('vars actions7B: keyboard Down to navigate editor fields', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'va7b-01-editor-initial.png');

  // Press Down arrow 10 times, snapping each step
  for (let i = 1; i <= 10; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await snap(page, `va7b-02-down-${i}.png`);
  }
});

// Test C: Tab navigation
test('vars actions7C: Tab key navigation in editor', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'va7c-01-editor-initial.png');

  for (let i = 1; i <= 10; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    await snap(page, `va7c-02-tab-${i}.png`);
  }
});
