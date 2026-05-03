/**
 * Probe: Vars editor — CDP touch swipe to scroll, then touchBitmap Add-a-new-action
 *
 * Mouse drag-scroll (all prior probes) corrupts subsequent touch handling.
 * Hypothesis: a touch-based swipe gesture (touchStart/touchMove/touchEnd via CDP)
 * scrolls the content without corrupting subsequent touch events.
 * If true, we can then touchBitmap the "+ Add a new action" button.
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

// Touch swipe via CDP — swipe up (scroll content down to reveal more below)
async function touchSwipeUp(page: any, steps = 20) {
  // Swipe from bitmap y=440 → y=150 (fingers move up = content scrolls up = reveals lower content)
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

test('vars actions13: CDP touch swipe scroll then touch Add-a-new-action', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'va13-00-editor-initial.png');

  // Touch swipe up to scroll content
  await touchSwipeUp(page);
  await snap(page, 'va13-01-after-touch-swipe.png');

  // Verify touch still works — tap the back arrow (tapBitmap = mouse click)
  // Don't actually go back, just use a known-good touch target to check touch is alive
  // Instead: try touchBitmap at the "+ Add a new action" button position
  for (const by of [380, 400, 420, 440, 460]) {
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(700);
    await snap(page, `va13-02-touch-y${by}.png`);
  }
});
