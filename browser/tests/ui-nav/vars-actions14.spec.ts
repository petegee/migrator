/**
 * Probe: Vars editor — verify touch events survive CDP touch swipe
 *
 * va13 showed: CDP touch swipe scrolls content (Actions section visible).
 * But touchBitmap at y=380-460 showed no change (button not activated).
 * Question: is touch broken after the swipe, or are the coordinates wrong?
 *
 * Test: after touch swipe, attempt touchBitmap at y=170 (Range row in scrolled view).
 * In the unscrolled view, Range is at y≈320. After scroll of ~150px, it should be at y≈170.
 * If the control bar appears at y=170 → touch is alive and coordinates are correct.
 * If no change → touch is broken after CDP swipe.
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

async function bitmapToPage(page: any, bx: number, by: number) {
  return page.evaluate(([bx, by]: [number, number]) => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: r.x + bx * (r.width / 800), y: r.y + by * (r.height / 480) };
  }, [bx, by]);
}

async function touchSwipeUp(page: any, steps = 20) {
  const client = await (page.context() as any).newCDPSession(page);
  const start = await bitmapToPage(page, 400, 440);
  const end   = await bitmapToPage(page, 400, 150);

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: start.x, y: start.y, id: 0 }],
    modifiers: 0,
  });
  await page.waitForTimeout(30);

  for (let i = 1; i <= steps; i++) {
    const y = start.y + (end.y - start.y) * (i / steps);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: start.x, y, id: 0 }],
      modifiers: 0,
    });
    await page.waitForTimeout(20);
  }

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
    modifiers: 0,
  });
  await page.waitForTimeout(600);
}

test('vars actions14: touch alive check after CDP swipe', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'va14-00-initial.png');

  await touchSwipeUp(page);
  await snap(page, 'va14-01-after-swipe.png');

  // Test touch events at several y positions in scrolled view:
  // Range low should be at ~y=170, Range high at x=640 y=170
  // Values at ~y=240, + Add a new value at ~y=290
  // Actions header at ~y=340, + Add a new action at ~y=400-455
  for (const [bx, by] of [[450, 170], [450, 200], [450, 240], [450, 290], [400, 400], [400, 430], [400, 455]]) {
    await touchBitmap(page, bx, by);
    await page.waitForTimeout(600);
    await snap(page, `va14-02-touch-x${bx}-y${by}.png`);
    // Dismiss control bar if it appeared (tap neutral area)
    await tapBitmap(page, 400, 340);
    await page.waitForTimeout(400);
  }
});
