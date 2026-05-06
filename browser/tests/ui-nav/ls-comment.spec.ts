/**
 * Probe: Logic Switches editor — Comment field (field 12)
 *
 * Comment is the last field in the LS editor. From the scrolled-fields probe:
 *   - after 1 scroll: y≈460 (partially visible)
 *   - after 2 scrolls: y≈340
 *
 * Expected: touchBitmap (pencil icon, same as FM name editor).
 * This probe tries both tap and touch to confirm which works.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToLogicSwitches } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function cdpTouchSwipe(
  page: any,
  bxStart: number, byStart: number,
  bxEnd: number, byEnd: number,
  steps = 20,
) {
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) throw new Error('cdpTouchSwipe: canvas not found');

  const toPage = (bx: number, by: number) => ({
    x: rect.x + bx * (rect.w / 800),
    y: rect.y + by * (rect.h / 480),
  });

  const client = await (page.context() as any).newCDPSession(page);
  const start = toPage(bxStart, byStart);
  const end   = toPage(bxEnd,   byEnd);

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: start.x, y: start.y, id: 0 }],
  });
  for (let i = 1; i <= steps; i++) {
    const px = start.x + (end.x - start.x) * (i / steps);
    const py = start.y + (end.y - start.y) * (i / steps);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: px, y: py, id: 0 }],
    });
    await page.waitForTimeout(16);
  }
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ x: end.x, y: end.y, id: 0 }],
  });
  await page.waitForTimeout(500);
}

test('probe: LS Comment — two scrolls then touchBitmap', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToLogicSwitches(page);

  // Add LS1
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'ls-comment-01-editor-open.png');

  // Scroll 1
  await cdpTouchSwipe(page, 400, 440, 400, 150);
  await snap(page, 'ls-comment-02-after-scroll1.png');

  // Scroll 2 — Comment should now be at y≈340
  await cdpTouchSwipe(page, 400, 440, 400, 150);
  await snap(page, 'ls-comment-03-after-scroll2.png');

  // Attempt touchBitmap at expected Comment field y=340
  await touchBitmap(page, 600, 340);
  await page.waitForTimeout(700);
  await snap(page, 'ls-comment-04-after-touch-y340.png');

  // Dismiss and try nearby y values if needed
  await tapBitmap(page, 100, 50);
  await page.waitForTimeout(300);

  // Also try y=360 and y=380 in case it shifted
  for (const y of [360, 380, 400]) {
    await touchBitmap(page, 600, y);
    await page.waitForTimeout(700);
    await snap(page, `ls-comment-05-touch-y${y}.png`);
    await tapBitmap(page, 100, 50);
    await page.waitForTimeout(300);
  }
});

test('probe: LS Comment — two scrolls then tapBitmap (compare)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToLogicSwitches(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await cdpTouchSwipe(page, 400, 440, 400, 150);
  await cdpTouchSwipe(page, 400, 440, 400, 150);
  await snap(page, 'ls-comment-06-scroll2-baseline.png');

  // Try tapBitmap at y=340 for comparison
  await tapBitmap(page, 600, 340);
  await page.waitForTimeout(700);
  await snap(page, 'ls-comment-07-after-tap-y340.png');
});
