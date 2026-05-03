/**
 * Probe: Vars editor — "+ Add a new action" via wheel-focus then Enter key
 *
 * va18/va19 showed: wheel at delta=2100 focuses the button (orange highlight),
 * but tapBitmap at any y defocuses it without activating.
 *
 * Hypothesis: Ethos is encoder-driven. Activation = wheel-focus + Enter key press.
 * Also test: wheel-focus + Space (common alternative for button activation).
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

async function wheelToFocus(page: any, totalDelta: number) {
  const centre = await bitmapToPage(page, 400, 300);
  const client = await (page.context() as any).newCDPSession(page);
  const steps = totalDelta / 300;
  for (let i = 0; i < steps; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: centre.x, y: centre.y,
      deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse',
    });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
}

// Test A: wheel to focus (2100) then press Enter
test('vars actions enter A: wheel 2100 then Enter key', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await wheelToFocus(page, 2100);
  await snap(page, 'vae-a-00-focused.png');

  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  await snap(page, 'vae-a-01-after-enter.png');
});

// Test B: wheel to focus (2100) then press Space
test('vars actions enter B: wheel 2100 then Space', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await wheelToFocus(page, 2100);
  await snap(page, 'vae-b-00-focused.png');

  await page.keyboard.press('Space');
  await page.waitForTimeout(800);
  await snap(page, 'vae-b-01-after-space.png');
});

// Test C: wheel to focus (2100) then tapBitmap directly ON the highlighted button
// The button highlight confirms it's at this y — try clicking the highlighted area precisely
test('vars actions enter C: wheel 2100 then precise tap on button center', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await wheelToFocus(page, 2100);
  await snap(page, 'vae-c-00-focused.png');

  // Try page.mouse.click directly at the button's page coordinates
  const pos = await bitmapToPage(page, 400, 466);
  await page.mouse.click(pos.x, pos.y, { button: 'left' });
  await page.waitForTimeout(800);
  await snap(page, 'vae-c-01-after-click.png');

  // If that put focus on button (orange), try clicking again
  await page.mouse.click(pos.x, pos.y, { button: 'left' });
  await page.waitForTimeout(800);
  await snap(page, 'vae-c-02-after-click2.png');
});
