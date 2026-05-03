/**
 * Probe: Vars editor — reset interaction after scroll
 *
 * Finding: mouse-drag scroll breaks canvas interaction. After scroll,
 * neither touchBitmap nor tapBitmap register on any button.
 *
 * Fix attempts:
 * A) Tap a neutral area (title bar y≈30) after scroll to reset focus,
 *    then try buttons.
 * B) Use mouse wheel (page.mouse.wheel) to scroll instead of drag —
 *    wheel scroll shouldn't disrupt touch/click state.
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

async function dragScroll(page: any) {
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) return;
  const cx = rect.x + 400 * (rect.w / 800);
  const startY = rect.y + 440 * (rect.h / 480);
  const endY   = rect.y + 150 * (rect.h / 480);
  await page.mouse.move(cx, startY);
  await page.mouse.down();
  await page.mouse.move(cx, endY, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(600);
}

async function wheelScroll(page: any) {
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) return;
  const cx = rect.x + 400 * (rect.w / 800);
  const cy = rect.y + 300 * (rect.h / 480);
  await page.mouse.move(cx, cy);
  // Wheel scroll down (positive deltaY = scroll down = content moves up)
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(600);
}

// Test A: drag scroll then tap neutral area (title bar) to reset focus
test('vars actions4A: drag scroll + neutral tap + touch Add-a-new-value', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await dragScroll(page);
  await snap(page, 'va4a-01-after-drag-scroll.png');

  // Neutral tap: title bar area (y≈30 bitmap, safe non-interactive zone)
  await tapBitmap(page, 400, 30);
  await page.waitForTimeout(400);
  await snap(page, 'va4a-02-after-neutral-tap.png');

  // Now try "+ Add a new value" at scrolled position (~y=315)
  for (const by of [305, 315, 325]) {
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(600);
    await snap(page, `va4a-03-post-touch-add-value-y${by}.png`);
  }
});

// Test B: wheel scroll (no drag) then touch Add-a-new-value
test('vars actions4B: wheel scroll + touch Add-a-new-value', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'va4b-01-before-scroll.png');

  await wheelScroll(page);
  await snap(page, 'va4b-02-after-wheel-scroll.png');

  // Touch sweep to find Add-a-new-value and Add-a-new-action
  for (const by of [300, 320, 340, 420, 440, 460]) {
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(600);
    await snap(page, `va4b-03-post-touch-y${by}.png`);
  }
});
