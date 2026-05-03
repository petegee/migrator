/**
 * Probe: Vars editor — CDP touch events after drag scroll
 *
 * Finding: after drag scroll, page.touchscreen.tap() (touchBitmap) breaks.
 * page.mouse.click() (tapBitmap) works but only for tap-sensitive fields.
 * The "+Add a new action" button requires touch.
 *
 * Final attempt: use Chrome DevTools Protocol Input.dispatchTouchEvent to
 * send touch events at a lower level, bypassing whatever state the drag
 * scroll corrupts in Playwright's touchscreen implementation.
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

async function cdpTouch(page: any, bx: number, by: number) {
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: HTMLCanvasElement) => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) return;

  const px = rect.x + bx * (rect.w / 800);
  const py = rect.y + by * (rect.h / 480);

  const client = await (page.context() as any).newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: px, y: py, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1, id: 1 }],
    modifiers: 0,
  });
  await page.waitForTimeout(50);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
    modifiers: 0,
  });
  await client.detach();
}

test('vars actions9: CDP touch after drag scroll — sweep y=280..460', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  // Drag scroll to reveal Actions section
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: HTMLCanvasElement) => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) return;
  const cx = rect.x + 400 * (rect.w / 800);
  const startY = rect.y + 440 * (rect.h / 480);
  const endY   = rect.y + 150 * (rect.h / 480);
  await page.mouse.move(cx, startY);
  await page.mouse.down();
  await page.mouse.move(cx, endY, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await snap(page, 'va9-00-after-drag-scroll.png');

  // CDP touch sweep — y=280 to y=460 every 20px
  for (const by of [280, 300, 320, 340, 360, 380, 400, 420, 440, 460]) {
    await cdpTouch(page, 400, by);
    await page.waitForTimeout(600);
    const after = await page.locator('canvas').first().screenshot({ type: 'png' });
    save(`va9-cdp-touch-y${by}.png`, after);
  }
});
