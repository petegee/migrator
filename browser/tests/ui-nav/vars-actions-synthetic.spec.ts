/**
 * Probe: Vars editor — synthetic click approaches on "+ Add a new action"
 *
 * Key insight from va14: after CDP touch swipe, the WASM still uses UNSCROLLED
 * hit-test coordinates. So touch at y=170 hit Name (unscrolled ~y=110), touch at
 * y=290 hit Values (unscrolled ~y=280). The button's unscrolled y is ~430-470.
 *
 * va14 tried touch(400,430) and it showed Name keyboard with "G" — the G was from
 * the dismiss-tap at (400,340) hitting keyboard G. So touch(400,430) likely hit
 * the "Actions" header (unscrolled ~y=400) or nothing.
 *
 * New approaches to try:
 * A. Verify unscrolled hit-test: open editor (no scroll), test tap at y≈430-470 directly
 * B. Synthetic dispatchEvent click on the canvas element
 * C. Tap the "Actions" header row (might be the real button target)
 * D. Try clicking at y=530 (below canvas — if WASM layout puts button there)
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

// Test A: no scroll — tap directly at unscrolled y values for the button area
// If y=430-470 works in unscrolled state, we have the coordinate.
// In unscrolled state, y=430-470 would be BELOW the screen bottom (480 px limit),
// but the editor shows Values near bottom, so button must be below screen in unscrolled view.
// Check: what IS at y=430 in the unscrolled editor?
test('vars synth A: unscrolled editor — tap y=380-470 to map layout', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'vss-a-00-unscrolled.png');

  for (const by of [380, 400, 420, 440, 460, 470]) {
    await tapBitmap(page, 400, by);
    await page.waitForTimeout(600);
    await snap(page, `vss-a-tap-y${by}.png`);
  }
});

// Test B: after CDP scroll, tap at y=430 (button's probable unscrolled y)
// in case WASM hit-test still uses unscrolled coords
test('vars synth B: after scroll — tap at unscrolled button y=430', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  // Scroll via CDP touch
  const client = await (page.context() as any).newCDPSession(page);
  const start = await bitmapToPage(page, 400, 440);
  const end = await bitmapToPage(page, 400, 150);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x, y: start.y, id: 0 }], modifiers: 0 });
  await page.waitForTimeout(20);
  for (let i = 1; i <= 20; i++) {
    const y = start.y + (end.y - start.y) * (i / 20);
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x, y, id: 0 }], modifiers: 0 });
    await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], modifiers: 0 });
  await page.waitForTimeout(600);
  await snap(page, 'vss-b-00-after-scroll.png');

  // Try tapBitmap at the unscrolled coords for the button (~y=430-470)
  for (const by of [400, 420, 440, 460]) {
    await tapBitmap(page, 400, by);
    await page.waitForTimeout(700);
    await snap(page, `vss-b-tap-y${by}.png`);
  }
});

// Test C: synthetic canvas dispatchEvent click
test('vars synth C: dispatchEvent click on canvas at scrolled button pos', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  // Scroll via wheel to focus the button (gets to y≈466 visual)
  const centre = await bitmapToPage(page, 400, 300);
  const cdpClient = await (page.context() as any).newCDPSession(page);
  for (let i = 0; i < 7; i++) {
    await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: centre.x, y: centre.y, deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse' });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
  await snap(page, 'vss-c-00-focused.png');

  // Dispatch a synthetic click event directly on canvas element
  const buttonPos = await bitmapToPage(page, 400, 466);
  await page.evaluate(([x, y]: [number, number]) => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return;
    const r = c.getBoundingClientRect();
    // Fire events at the canvas element, not the page
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };
    c.dispatchEvent(new MouseEvent('mousedown', opts));
    c.dispatchEvent(new MouseEvent('mouseup', opts));
    c.dispatchEvent(new MouseEvent('click', opts));
  }, [buttonPos.x, buttonPos.y]);
  await page.waitForTimeout(800);
  await snap(page, 'vss-c-01-after-dispatchEvent.png');
});
