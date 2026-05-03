/**
 * Probe: Vars editor — can a touch-drag snap the button to a higher y?
 *
 * All wheel/drag approaches leave the button at bitmap y≈466 (bottom edge).
 * Hypothesis: an aggressive CDP touch swipe (from near-bottom to near-top)
 * might cause the WASM list to snap with the button more centered — and then
 * a tapBitmap at that higher y would work.
 *
 * Also test: touchBitmap directly on the button in the snapped state.
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

async function cdpTouchSwipe(page: any, fromBy: number, toBy: number, steps = 30) {
  const client = await (page.context() as any).newCDPSession(page);
  const start = await bitmapToPage(page, 400, fromBy);
  const end   = await bitmapToPage(page, 400, toBy);

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: start.x, y: start.y, id: 0 }],
    modifiers: 0,
  });
  await page.waitForTimeout(20);

  for (let i = 1; i <= steps; i++) {
    const y = start.y + (end.y - start.y) * (i / steps);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: start.x, y, id: 0 }],
      modifiers: 0,
    });
    await page.waitForTimeout(15);
  }

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
    modifiers: 0,
  });
  await page.waitForTimeout(800);
}

// Test A: aggressive swipe (y=475→y=30) — maximum scroll
test('vars snap A: max touch swipe then tap sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'vs-a-00-initial.png');

  await cdpTouchSwipe(page, 475, 30);
  await snap(page, 'vs-a-01-after-swipe.png');

  // Sweep tapBitmap across wider range
  for (const by of [300, 350, 380, 410, 430, 450, 460, 470]) {
    await tapBitmap(page, 400, by);
    await page.waitForTimeout(700);
    await snap(page, `vs-a-02-tap-y${by}.png`);
    // If button activated (new screen), record and stop checking
  }
});

// Test B: two swipe passes then touch sweep
test('vars snap B: two touch swipes then touchBitmap sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await cdpTouchSwipe(page, 470, 50);
  await snap(page, 'vs-b-01-after-swipe1.png');

  await cdpTouchSwipe(page, 470, 50);
  await snap(page, 'vs-b-02-after-swipe2.png');

  for (const by of [350, 390, 420, 450, 460, 470]) {
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(700);
    await snap(page, `vs-b-03-touch-y${by}.png`);
  }
});
