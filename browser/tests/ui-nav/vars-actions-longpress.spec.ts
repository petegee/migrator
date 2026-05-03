/**
 * Probe: Vars editor — long-press on "+ Add a new action" and tap "Actions" header
 *
 * All short tap/touch approaches have failed. Two new hypotheses:
 * 1. The button needs a LONG PRESS to activate (hold touchStart then touchEnd)
 * 2. The "Actions" header row itself is tappable (shows a context menu with Add)
 * 3. After wheel-focus, a SECOND mouse click on the ALREADY-FOCUSED button activates it
 *    (first click defocused it in va19, maybe we need: wheel → tap to focus → tap again)
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

async function bitmapToPage(page: any, bx: number, by: number) {
  return page.evaluate(([bx, by]: [number, number]) => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: r.x + bx * (r.width / 800), y: r.y + by * (r.height / 480) };
  }, [bx, by]);
}

async function scrollToBottom(page: any) {
  const client = await (page.context() as any).newCDPSession(page);
  const start = await bitmapToPage(page, 400, 440);
  const end = await bitmapToPage(page, 400, 150);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x, y: start.y, id: 0 }], modifiers: 0 });
  await page.waitForTimeout(20);
  for (let i = 1; i <= 20; i++) {
    const y = start.y + (end.y - start.y) * (i / 20);
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x, y, id: 0 }], modifiers: 0 });
    await page.waitForTimeout(15);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], modifiers: 0 });
  await page.waitForTimeout(600);
}

async function wheelToFocus(page: any, totalDelta: number) {
  const centre = await bitmapToPage(page, 400, 300);
  const client = await (page.context() as any).newCDPSession(page);
  const steps = totalDelta / 300;
  for (let i = 0; i < steps; i++) {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: centre.x, y: centre.y, deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse' });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
}

// Test A: long press on button via CDP touch (1000ms hold)
test('vars longpress A: CDP long-press on button at y=466', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await scrollToBottom(page);
  await snap(page, 'vlp-a-00-scrolled.png');

  const client = await (page.context() as any).newCDPSession(page);
  const pos = await bitmapToPage(page, 400, 466);

  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pos.x, y: pos.y, id: 0 }], modifiers: 0 });
  await page.waitForTimeout(1200);  // long hold
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], modifiers: 0 });
  await page.waitForTimeout(800);
  await snap(page, 'vlp-a-01-after-longpress.png');
});

// Test B: tap "Actions" header row (y≈365 in scrolled view)
test('vars longpress B: tap Actions header row', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await scrollToBottom(page);
  await snap(page, 'vlp-b-00-scrolled.png');

  await tapBitmap(page, 400, 365);
  await page.waitForTimeout(700);
  await snap(page, 'vlp-b-01-tap-actions-header.png');
  await tapBitmap(page, 400, 365);
  await page.waitForTimeout(700);
  await snap(page, 'vlp-b-02-tap-actions-header-again.png');
});

// Test C: wheel focus the button → tap to defocus (sees button go grey) → tap again to refocus
// Trying: after second refocus tap, IMMEDIATELY tap one more time (triple tap pattern)
test('vars longpress C: wheel focus then triple-tap sequence', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await wheelToFocus(page, 2100);
  await snap(page, 'vlp-c-00-focused.png');

  // Triple tap at button center
  for (let i = 1; i <= 5; i++) {
    await tapBitmap(page, 400, 466);
    await page.waitForTimeout(500);
    await snap(page, `vlp-c-0${i}-tap${i}.png`);
  }
});

// Test D: pointer events instead of mouse events
test('vars longpress D: pointer events on focused button', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await wheelToFocus(page, 2100);
  await snap(page, 'vlp-d-00-focused.png');

  const pos = await bitmapToPage(page, 400, 466);
  await page.evaluate(([x, y]: [number, number]) => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, view: window };
    c.dispatchEvent(new PointerEvent('pointerdown', opts));
    c.dispatchEvent(new PointerEvent('pointerup', opts));
    c.dispatchEvent(new PointerEvent('click', opts));
  }, [pos.x, pos.y]);
  await page.waitForTimeout(800);
  await snap(page, 'vlp-d-01-after-pointer-events.png');

  // Also try pointerType='touch' for pointer events
  await wheelToFocus(page, 2100);
  await page.evaluate(([x, y]: [number, number]) => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 2, pointerType: 'touch', isPrimary: true, view: window };
    c.dispatchEvent(new PointerEvent('pointerdown', opts));
    c.dispatchEvent(new PointerEvent('pointerup', opts));
  }, [pos.x, pos.y]);
  await page.waitForTimeout(800);
  await snap(page, 'vlp-d-02-after-touch-pointer-events.png');
});
