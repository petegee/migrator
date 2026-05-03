/**
 * Probe: Vars editor — navigate to "+ Add a new action" via arrow keys
 *
 * All pointer approaches fail. The WASM is encoder-driven hardware.
 * In the browser, arrow keys / PageDown might navigate the list focus.
 * Strategy: open editor, press ArrowDown repeatedly to reach the button,
 * then press Enter to activate.
 *
 * Also test: Tab key (cycles focusable elements in browser), which might
 * land on the button and allow Enter to activate.
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

// Test A: ArrowDown × N then Enter — find N that activates the button
test('vars arrow A: ArrowDown to navigate then Enter', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  // Click canvas to ensure focus on the WASM element
  await page.locator('canvas').first().click();
  await page.waitForTimeout(300);
  await snap(page, 'vak-a-00-initial.png');

  // Navigate down through list items — take a snap every 2 presses
  for (let i = 1; i <= 14; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    if (i % 2 === 0) {
      await snap(page, `vak-a-0${i}-down${i}.png`);
    }
  }
  await snap(page, 'vak-a-14-at-14-presses.png');

  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  await snap(page, 'vak-a-15-after-enter.png');
});

// Test B: Tab to cycle to button, then Enter
test('vars arrow B: Tab navigation to button', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await page.locator('canvas').first().click();
  await page.waitForTimeout(300);

  for (let i = 1; i <= 10; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await snap(page, `vak-b-tab${i}.png`);
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  await snap(page, 'vak-b-after-enter.png');
});

// Test C: touchBitmap directly on the button BEFORE any scroll
// (button is below canvas edge in unscrolled view — this should confirm no-response)
// Then: touchBitmap at the exact center of +Add a new value (to re-confirm that works)
// as a sanity check before declaring +Add a new action unreachable
test('vars arrow C: sanity check +Add new value touch, then attempt action button', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'vak-c-00-initial.png');

  // Scroll down via CDP touch
  const client = await (page.context() as any).newCDPSession(page);
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (rect) {
    const sx = rect.x + 400 * (rect.w / 800);
    const sy = rect.y + 440 * (rect.h / 480);
    const ey = rect.y + 150 * (rect.h / 480);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 0 }], modifiers: 0 });
    await page.waitForTimeout(20);
    for (let i = 1; i <= 20; i++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx, y: sy + (ey - sy) * i / 20, id: 0 }], modifiers: 0 });
      await page.waitForTimeout(15);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], modifiers: 0 });
    await page.waitForTimeout(600);
  }
  await snap(page, 'vak-c-01-scrolled.png');

  // Sanity: try touchBitmap at y=340 for +Add new value
  const { touchBitmap } = await import('../helpers/navigate');
  await touchBitmap(page, 400, 340);
  await page.waitForTimeout(700);
  await snap(page, 'vak-c-02-touch-y340-addvalue.png');

  // After: dismiss (go back to editor)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Now try touchBitmap at specific y values for the action button
  for (const by of [430, 445, 455, 465]) {
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(700);
    await snap(page, `vak-c-03-touch-action-y${by}.png`);
  }
});
