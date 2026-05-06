/**
 * Probe v2: LS Comment field — target the bottom edge after 2 scrolls
 *
 * From ls-comment probe:
 *   - After 2 scrolls, Comment label is at y≈400-450, value row at y≈450-480
 *   - touchBitmap(600, 340) hit Max duration (not Comment)
 *   - touchBitmap(600, 360+) escaped the editor (dismiss at (100,50) hit back-nav)
 *
 * This probe:
 *   1. Does a 3rd scroll to bring Comment up to a safer y (~190 bitmap)
 *   2. Tries touchBitmap and tapBitmap at y=160..220 range
 *   3. Uses safe dismiss (400, 50 = well away from back arrow and all fields)
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

test('probe: LS Comment — 3 scrolls, sweep y=140..240 with touchBitmap', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToLogicSwitches(page);

  // Add LS1
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'ls-comment2-01-editor-open.png');

  // 3 scrolls — Comment should now be near y≈190 (well within reach)
  await cdpTouchSwipe(page, 400, 440, 400, 150);
  await cdpTouchSwipe(page, 400, 440, 400, 150);
  await cdpTouchSwipe(page, 400, 440, 400, 150);
  await snap(page, 'ls-comment2-02-after-3-scrolls.png');

  // Sweep touchBitmap across y=140..240 to find Comment value row
  for (const y of [140, 160, 180, 200, 220, 240]) {
    await touchBitmap(page, 600, y);
    await page.waitForTimeout(700);
    await snap(page, `ls-comment2-03-touch-y${y}.png`);
    // Safe dismiss: tap centre header (away from back arrow and all fields)
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
    await snap(page, `ls-comment2-04-after-dismiss-y${y}.png`);
  }
});

test('probe: LS Comment — 2 scrolls, direct hit at y=455 and y=465', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToLogicSwitches(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  // 2 scrolls — Comment value row visible at y≈450-480
  await cdpTouchSwipe(page, 400, 440, 400, 150);
  await cdpTouchSwipe(page, 400, 440, 400, 150);
  await snap(page, 'ls-comment2-05-2scroll-baseline.png');

  // Try touching the very bottom of the canvas where the pencil icon lives
  for (const y of [445, 455, 465, 470]) {
    await touchBitmap(page, 600, y);
    await page.waitForTimeout(700);
    await snap(page, `ls-comment2-06-touch-bottom-y${y}.png`);
    // Dismiss by tapping centre-top area safely (NOT near back arrow)
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
  await snap(page, 'ls-comment2-07-final.png');
});
