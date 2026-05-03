/**
 * Probe: Inspect WASM key bindings and try ENT key alternatives
 *
 * The hardware ENT key in Ethos might map to a specific keyboard key in the WASM.
 * Test candidates: Enter, NumpadEnter, ' ' (space), 'e', 'Return', keyCode 13/32/101
 * Also intercept events to see what the WASM actually listens to.
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

async function wheelToFocus(page: any) {
  const centre = await bitmapToPage(page, 400, 300);
  const client = await (page.context() as any).newCDPSession(page);
  for (let i = 0; i < 7; i++) {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: centre.x, y: centre.y, deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse' });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
}

// Test A: inject a keydown event listener to see what keys the WASM tracks
test('vars wasm events A: intercept key events at boot', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  // Inject listener BEFORE pressing keys
  await page.evaluate(() => {
    (window as any).__keyLog = [];
    const orig = EventTarget.prototype.addEventListener;
    // Just log what we send
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      (window as any).__keyLog.push({ type: 'keydown', key: e.key, code: e.code, keyCode: e.keyCode });
    }, true);
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      (window as any).__keyLog.push({ type: 'keyup', key: e.key, code: e.code, keyCode: e.keyCode });
    }, true);
  });

  // Wheel to focus
  await wheelToFocus(page);
  await snap(page, 'vwe-a-00-focused.png');

  // Try several keys that might be ENT
  for (const key of ['Enter', 'NumpadEnter', ' ', 'e', 'E', 'Return', 'F1', 'F2']) {
    await page.keyboard.press(key === 'Return' ? 'Enter' : key);
    await page.waitForTimeout(500);
    const log = await page.evaluate(() => (window as any).__keyLog.splice(0));
    console.log(`[key:${key}]`, JSON.stringify(log));
    await snap(page, `vwe-a-key-${key.replace(' ', 'space')}.png`);
    // Re-focus if it was lost
    const focused = await page.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
      const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
      return c ? c.getBoundingClientRect().width > 0 : false;
    });
    if (focused) await wheelToFocus(page);
  }
});

// Test B: CDP dispatchKeyEvent with different key codes (simulate hardware ENT)
test('vars wasm events B: CDP key events for ENT', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await wheelToFocus(page);
  await snap(page, 'vwe-b-00-focused.png');

  const client = await (page.context() as any).newCDPSession(page);

  // Try different key codes for ENT
  for (const [keyCode, key, code] of [
    [13, 'Enter', 'Enter'],
    [32, ' ', 'Space'],
    [101, 'e', 'KeyE'],
    [10, 'Enter', 'NumpadEnter'],
  ]) {
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: keyCode, key: key as string, code: code as string, nativeVirtualKeyCode: keyCode });
    await page.waitForTimeout(100);
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: keyCode, key: key as string, code: code as string, nativeVirtualKeyCode: keyCode });
    await page.waitForTimeout(600);
    await snap(page, `vwe-b-key-${key}-${keyCode}.png`);
    // Re-focus
    await wheelToFocus(page);
  }
});
