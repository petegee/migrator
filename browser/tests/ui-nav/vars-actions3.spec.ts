/**
 * Probe: Vars editor — does scroll break interaction?
 *
 * Hypothesis: after mouse-drag scroll, the canvas stops accepting input.
 * Test: after one scroll, try touchBitmap on "+ Add a new value" (known
 * working in unscrolled state at (600,440)) at its scrolled-state position
 * (~y=320). If it still works, the scroll doesn't break interaction —
 * meaning "+ Add a new action" is simply a WASM limitation.
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

test('vars actions3: confirm + Add a new value still works after scroll', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'va3-01-editor-unscrolled.png');

  // Scroll to reveal Actions section
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
  await snap(page, 'va3-02-after-scroll.png');

  // "+ Add a new value" in scrolled state — visually at ~y=320 bitmap
  // Sweep y=290,310,330 to find it
  for (const by of [290, 310, 330]) {
    await snap(page, `va3-03-pre-touch-add-value-y${by}.png`);
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(600);
    await snap(page, `va3-04-post-touch-add-value-y${by}.png`);
  }
});
