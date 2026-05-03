/**
 * Probe: SF action picker — Play vario via wheel focus + CDP Enter
 *
 * Negative wheel (-300) after 2 swipes highlights Play vario in the picker.
 * CDP Enter should confirm the focused item.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToSpecialFunctions } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function bitmapToPage(page: import('@playwright/test').Page, bx: number, by: number) {
  return page.evaluate(([bx, by]: number[]) => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: r.x + bx * (r.width / 800), y: r.y + by * (r.height / 480) };
  }, [bx, by]);
}

async function touchSwipeBitmap(
  page: import('@playwright/test').Page,
  bx: number, byFrom: number, byTo: number, steps = 15,
) {
  const client = await (page.context() as any).newCDPSession(page);
  const from = await bitmapToPage(page, bx, byFrom);
  const to = await bitmapToPage(page, bx, byTo);
  const tp = (x: number, y: number) => [{ x, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(from.x, from.y) });
  for (let i = 1; i <= steps; i++) {
    const iy = from.y + (to.y - from.y) * (i / steps);
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(from.x, iy) });
    await page.waitForTimeout(16);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: tp(from.x, to.y) });
  await page.waitForTimeout(400);
}

async function wheelAt(page: import('@playwright/test').Page, bx: number, by: number, deltaY: number) {
  const client = await (page.context() as any).newCDPSession(page);
  const pt = await bitmapToPage(page, bx, by);
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel', x: pt.x, y: pt.y,
    deltaX: 0, deltaY, modifiers: 0, pointerType: 'mouse',
  });
  await page.waitForTimeout(300);
}

async function cdpEnter(page: import('@playwright/test').Page) {
  const client = await (page.context() as any).newCDPSession(page);
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyDown', windowsVirtualKeyCode: 13,
    key: 'Enter', code: 'Enter', nativeVirtualKeyCode: 13,
  });
  await page.waitForTimeout(80);
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp', windowsVirtualKeyCode: 13,
    key: 'Enter', code: 'Enter', nativeVirtualKeyCode: 13,
  });
  await page.waitForTimeout(500);
}

test('Play vario: 2 swipes + negative wheel + CDP Enter', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToSpecialFunctions(page);
  await tapBitmap(page, 400, 266);   // + on empty SF list
  await page.waitForTimeout(600);
  await tapBitmap(page, 600, 100);   // open Action picker
  await page.waitForTimeout(500);

  await touchSwipeBitmap(page, 350, 290, 130);
  await page.waitForTimeout(200);
  await touchSwipeBitmap(page, 350, 290, 130);
  await snap(page, 'sfvario-enter-01-after-2swipes.png');

  await wheelAt(page, 350, 250, -300);
  await snap(page, 'sfvario-enter-02-play-vario-highlighted.png');

  // CDP Enter to confirm Play vario selection
  await cdpEnter(page);
  await snap(page, 'sfvario-enter-03-after-enter.png');
});
