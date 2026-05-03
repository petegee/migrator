/**
 * Probe: Vars editor — Actions section (scroll required)
 *
 * Goal: confirm that scrolling down in the Var editor reveals an Actions
 * section, and find the coords + interaction type for "+ Add a new action".
 *
 * Based on prior work:
 * - Values section confirmed: touchBitmap at (600, 395) / (600, 440)
 * - Scroll approach: mouse drag from by≈440 → by≈150, 15 steps
 * - After one scroll pass, Values section becomes visible; Actions section
 *   may require a second scroll pass.
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

async function scrollUp(page: any) {
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
  await page.waitForTimeout(500);
}

test('vars actions: scroll to Actions section and probe + Add a new action', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  // Open Var editor via centred +
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'va-01-editor-initial.png');

  // First scroll — should reveal Values section
  await scrollUp(page);
  await snap(page, 'va-02-after-scroll-1.png');

  // Second scroll — should reveal Actions section
  await scrollUp(page);
  await snap(page, 'va-03-after-scroll-2.png');

  // Sweep touch at several y-values to find "+ Add a new action"
  // Expect it to be near the bottom, similar to "+ Add a new value" at y≈440
  for (const by of [380, 400, 420, 440, 460]) {
    await snap(page, `va-04-pre-touch-y${by}.png`);
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(600);
    await snap(page, `va-05-post-touch-y${by}.png`);
  }
});
