/**
 * Probe: Vars editor scrolled state — tapBitmap sweep for all interactive rows
 *
 * Finding: after drag scroll, tapBitmap WORKS (back arrow confirmed in va7a).
 * Only touchBitmap breaks. So try tapBitmap on all rows to find what responds.
 * The "+Add" buttons need touch in unscrolled state — but maybe tap works too
 * in the scrolled state, or maybe Range/Values fields respond to tap for
 * opening numeric control bars (which only require tap anyway per Outputs screen).
 *
 * Sweep x=400, y=60..470 every 20px after drag scroll.
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

async function openEditorDragScrolled(page: any) {
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

  const cx = rect.x + 400 * (rect.w / 800);
  const startY = rect.y + 440 * (rect.h / 480);
  const endY   = rect.y + 150 * (rect.h / 480);
  await page.mouse.move(cx, startY);
  await page.mouse.down();
  await page.mouse.move(cx, endY, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(600);
}

test('vars actions8: tapBitmap sweep in scrolled state (y=60..470 every 20px)', async ({ page }) => {
  await openEditorDragScrolled(page);
  await snap(page, 'va8-00-scrolled-reference.png');

  for (let by = 60; by <= 470; by += 20) {
    await tapBitmap(page, 400, by);
    await page.waitForTimeout(500);
    const after = await page.locator('canvas').first().screenshot({ type: 'png' });
    save(`va8-tap-y${by}.png`, after);
  }
});
