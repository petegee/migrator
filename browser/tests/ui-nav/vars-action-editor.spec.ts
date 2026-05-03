/**
 * Probe: Vars action editor — confirmed working sequence + field mapping
 *
 * BREAKTHROUGH: "+ Add a new action" is activated by:
 * 1. Open var editor (tapBitmap 400,266)
 * 2. Wheel to 2100 (7 × deltaY=300) to focus the button (orange highlight)
 * 3. CDP Input.dispatchKeyEvent keyDown+keyUp with windowsVirtualKeyCode=13 (Enter)
 *
 * Why page.keyboard.press('Enter') fails: canvas lacks DOM focus, so keydown
 * goes to body and WASM ignores it. CDP dispatch bypasses DOM focus.
 *
 * This probe: confirm the sequence, capture the action row, map its fields.
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

async function wheelToFocusButton(page: any) {
  const centre = await bitmapToPage(page, 400, 300);
  const client = await (page.context() as any).newCDPSession(page);
  for (let i = 0; i < 7; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: centre.x, y: centre.y,
      deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse',
    });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
}

async function cdpEnter(page: any) {
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
  await page.waitForTimeout(600);
}

test('vars action editor: confirm sequence and map fields', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'vae2-00-editor-open.png');

  // Wheel to focus "+ Add a new action"
  await wheelToFocusButton(page);
  await snap(page, 'vae2-01-button-focused.png');

  // Activate via CDP Enter
  await cdpEnter(page);
  await snap(page, 'vae2-02-action-added.png');

  // The action row is now at the bottom. Tap its fields to find coords.
  // Action row appears to have: [icon] | [condition ---▼] | [type Add(+)▼] | [value 0.0]
  // Sweep tap across the action row (y should be near bottom, ~y=440-460 after scroll)
  for (const by of [420, 430, 440, 450, 460]) {
    await tapBitmap(page, 100, by);  // left col (icon/condition)
    await page.waitForTimeout(600);
    await snap(page, `vae2-03-tap-x100-y${by}.png`);
    await tapBitmap(page, 300, by);  // mid-left (type dropdown)
    await page.waitForTimeout(600);
    await snap(page, `vae2-03-tap-x300-y${by}.png`);
    await tapBitmap(page, 600, by);  // right (value)
    await page.waitForTimeout(600);
    await snap(page, `vae2-03-tap-x600-y${by}.png`);
  }
});

test('vars action editor: also try canvas.focus then keyboard Enter', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await wheelToFocusButton(page);
  await snap(page, 'vae2-focus-00-focused.png');

  // Try giving canvas DOM focus then pressing Enter via Playwright
  await page.locator('canvas').first().focus();
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  await snap(page, 'vae2-focus-01-after-canvas-focus-enter.png');
});
