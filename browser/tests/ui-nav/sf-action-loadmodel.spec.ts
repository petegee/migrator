/**
 * Probe: SF action picker — Load model and Play vario
 *
 * After 2 swipes (290→130 each), picker shows:
 *   Write logs(170), Go to screen(210), Lock touchscreen(250), Load model(?), Play vario(?)
 *
 * Goal: confirm y-coords for Load model and Play vario and capture their editor fields.
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

async function openFreshSFAndPicker(page: import('@playwright/test').Page) {
  // Navigate to SF from home to ensure we start clean (not mid-editor)
  await tapBitmap(page, 54, 459);   // Home
  await page.waitForTimeout(300);
  await navigateToSpecialFunctions(page);
  await tapBitmap(page, 400, 266);  // + on empty SF screen (only works when list is empty)
  await page.waitForTimeout(600);
  await tapBitmap(page, 600, 100);  // open Action picker
  await page.waitForTimeout(500);
}

test('SF action picker: Load model and Play vario after 2 swipes', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // --- Load model at y=290 ---
  await openFreshSFAndPicker(page);
  await touchSwipeBitmap(page, 350, 290, 130);
  await page.waitForTimeout(200);
  await touchSwipeBitmap(page, 350, 290, 130);
  await snap(page, 'sflm-01-picker-2swipes.png');

  await touchBitmap(page, 350, 290);
  await page.waitForTimeout(400);
  await snap(page, 'sflm-02-after-tap-y290.png');

  // --- Play vario at y=330 ---
  // Navigate back to home, then create a new SF
  await tapBitmap(page, 54, 459);   // Home
  await page.waitForTimeout(300);
  await navigateToSpecialFunctions(page);
  await page.waitForTimeout(300);
  // SF list now has 1 item; use header + button to add a new one
  await tapBitmap(page, 563, 69);   // + in list header
  await page.waitForTimeout(600);
  await tapBitmap(page, 600, 100);  // open Action picker
  await page.waitForTimeout(500);

  await touchSwipeBitmap(page, 350, 290, 130);
  await page.waitForTimeout(200);
  await touchSwipeBitmap(page, 350, 290, 130);
  await snap(page, 'sflm-03-picker-2swipes-for-vario.png');

  await touchBitmap(page, 350, 330);
  await page.waitForTimeout(400);
  await snap(page, 'sflm-04-after-tap-y330.png');

  // Also try y=310 in case Play vario is between 290 and 330
  await tapBitmap(page, 54, 459);
  await page.waitForTimeout(300);
  await navigateToSpecialFunctions(page);
  await page.waitForTimeout(300);
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(600);
  await tapBitmap(page, 600, 100);
  await page.waitForTimeout(500);
  await touchSwipeBitmap(page, 350, 290, 130);
  await page.waitForTimeout(200);
  await touchSwipeBitmap(page, 350, 290, 130);
  await snap(page, 'sflm-05-picker-2swipes-for-310.png');
  await touchBitmap(page, 350, 310);
  await page.waitForTimeout(400);
  await snap(page, 'sflm-06-after-tap-y310.png');
});
