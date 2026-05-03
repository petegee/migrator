/**
 * Probe: Logic Switches editor — scrolled fields (6–10)
 *
 * Fields 1–5 (Name → Active condition) are confirmed in ls-layout.spec.ts.
 * This probe scrolls the editor down to reveal:
 *   6. Delay before active
 *   7. Delay before inactive
 *   8. Confirmation before active (toggle)
 *   9. Confirmation before inactive (toggle)
 *  10. Min duration
 *
 * Scroll method: CDP touch swipe (same approach as Vars editor).
 * After scroll, sweep tap x=600 across candidate y values to find which
 * rows are interactive and what control opens.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToLogicSwitches } from '../helpers/navigate';
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

test('probe: LS editor — scroll down and sweep lower fields', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToLogicSwitches(page);

  // Add LS1
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'ls-scroll-01-editor-open.png');

  // Scroll editor upward (finger moves from y=440 to y=150 in bitmap space)
  // to push lower fields into view — same technique as Vars editor
  await cdpTouchSwipe(page, 400, 440, 400, 150);
  await snap(page, 'ls-scroll-02-after-scroll.png');

  // Sweep tap x=600 at y = 100..460 in 40px steps to locate fields
  for (const y of [100, 140, 180, 220, 260, 300, 340, 380, 420, 460]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `ls-scroll-03-tap-y${y}.png`);
    // Dismiss any picker/control that opened by tapping the back area
    await tapBitmap(page, 100, 240);
    await page.waitForTimeout(300);
  }

  // Final state
  await snap(page, 'ls-scroll-04-final.png');
});

test('probe: LS editor — second scroll to reach bottom', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToLogicSwitches(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  // Two scrolls to make sure we reach the very bottom
  await cdpTouchSwipe(page, 400, 440, 400, 150);
  await cdpTouchSwipe(page, 400, 440, 400, 150);
  await snap(page, 'ls-scroll-05-two-scrolls.png');

  // Sweep tap the full editor range
  for (const y of [80, 120, 160, 200, 240, 280, 320, 360, 400, 440]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `ls-scroll-06-tap2-y${y}.png`);
    await tapBitmap(page, 100, 240);
    await page.waitForTimeout(300);
  }

  await snap(page, 'ls-scroll-07-final.png');
});
