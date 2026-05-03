/**
 * Probe: Vars editor — "+ Add a new action" via tapBitmap after full scroll to bottom
 *
 * User confirmed: the yellow "+ Add a new action" button responds to mouse click
 * (tapBitmap) when the editor is scrolled to the very bottom. Previous probes
 * only did 1-2 scroll passes and focused on touchBitmap — this probe does 3
 * scroll passes to reach the bottom, then sweeps tapBitmap across likely y values.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToVars } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, label: string) =>
  save(label, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function scrollDown(page: any) {
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) return;
  // Upward drag = scroll content down (reveal content below)
  const cx = rect.x + 400 * (rect.w / 800);
  const startY = rect.y + 430 * (rect.h / 480);
  const endY   = rect.y + 100 * (rect.h / 480);
  await page.mouse.move(cx, startY);
  await page.mouse.down();
  await page.mouse.move(cx, endY, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(600);
}

test('vars actions tap: 3× scroll to bottom then tapBitmap sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  // Open Var editor
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'vat-00-editor-open.png');

  // Scroll pass 1
  await scrollDown(page);
  await snap(page, 'vat-01-after-scroll-1.png');

  // Scroll pass 2
  await scrollDown(page);
  await snap(page, 'vat-02-after-scroll-2.png');

  // Scroll pass 3 — should be at (or near) bottom
  await scrollDown(page);
  await snap(page, 'vat-03-after-scroll-3.png');

  // Sweep tapBitmap across likely button y values
  // Button should be higher on screen now that we're fully scrolled
  for (const by of [300, 340, 380, 420, 450, 465, 475]) {
    await tapBitmap(page, 400, by);
    await page.waitForTimeout(700);
    await snap(page, `vat-04-tap-y${by}.png`);

    // Check if a new screen appeared (action editor opened)
    // If so, go back and record the y
    const title = await page.evaluate(() => document.title);
    const src = fs.readFileSync(path.join(OUT, `vat-04-tap-y${by}.png`));
    // We'll just capture — visual inspection will confirm
  }
});
