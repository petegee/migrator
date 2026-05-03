/**
 * Probe: Vars editor — tapBitmap on "+ Add a new action" after 2x drag scroll
 *
 * User confirmed: button responds to mouse click when scrolled to bottom.
 * Prior probe (va8) only did 1 drag scroll; button may still be at canvas edge.
 * Try 2 drag scrolls to push the button fully into view, then tapBitmap sweep.
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

async function dragScrollUp(page: any) {
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: HTMLCanvasElement) => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
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

test('vars actions10: 2x drag scroll then tapBitmap sweep for Add-a-new-action', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'va10-00-initial.png');

  await dragScrollUp(page);
  await snap(page, 'va10-01-after-scroll-1.png');

  await dragScrollUp(page);
  await snap(page, 'va10-02-after-scroll-2.png');

  // tapBitmap sweep — wide range to find the button
  for (const by of [340, 360, 380, 400, 420, 440, 460]) {
    await tapBitmap(page, 400, by);
    await page.waitForTimeout(700);
    await snap(page, `va10-03-tap-y${by}.png`);
  }
});
