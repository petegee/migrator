/**
 * Probe: SF action picker — scroll to lower items and confirm y-coords
 *
 * Known confirmed (from sf-action-picker.spec.ts + skills file):
 *   Reset y=170, Screenshot y=210, Set failsafe y=250
 *   Play audio y≈290 (estimated), Haptic y≈330 (estimated)
 *
 * Goal: use CDP touch swipe to scroll the picker overlay, then tap and
 * confirm each lower item: Play audio, Haptic, Write logs, Play text,
 * Go to screen, Lock touchscreen, Load model, Play vario.
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

/** Convert bitmap coords to page coords */
async function bitmapToPage(page: import('@playwright/test').Page, bx: number, by: number) {
  return page.evaluate(([bx, by]: number[]) => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: r.x + bx * (r.width / 800), y: r.y + by * (r.height / 480) };
  }, [bx, by]);
}

/**
 * Scroll inside the picker overlay using CDP touch events.
 * Swipes from (bx, byFrom) to (bx, byTo) in bitmap space.
 * Mouse drag dismisses overlays — must use touch.
 */
async function touchSwipeBitmap(
  page: import('@playwright/test').Page,
  bx: number,
  byFrom: number,
  byTo: number,
  steps = 15,
) {
  const client = await (page.context() as any).newCDPSession(page);
  const from = await bitmapToPage(page, bx, byFrom);
  const to = await bitmapToPage(page, bx, byTo);

  const touchPoint = (x: number, y: number) => [{ x, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }];

  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touchPoint(from.x, from.y) });
  for (let i = 1; i <= steps; i++) {
    const iy = from.y + (to.y - from.y) * (i / steps);
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPoint(from.x, iy) });
    await page.waitForTimeout(16);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: touchPoint(from.x, to.y) });
  await page.waitForTimeout(400);
}

async function openSFEditorAndPicker(page: import('@playwright/test').Page) {
  await navigateToSpecialFunctions(page);
  await tapBitmap(page, 400, 266);   // + on empty SF screen
  await page.waitForTimeout(600);
  await tapBitmap(page, 600, 100);   // open Action picker
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------

test('SF action picker: confirm Play audio and Haptic (no scroll)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openSFEditorAndPicker(page);

  await snap(page, 'sfscroll-01-picker-open.png');

  // Confirmed items occupy y=170/210/250; next two estimated at 290 and 330.
  // Tap Play audio first.
  await touchBitmap(page, 350, 290);
  await page.waitForTimeout(400);
  await snap(page, 'sfscroll-02-after-play-audio-290.png');

  // Reopen picker and try Haptic
  await tapBitmap(page, 600, 100);
  await page.waitForTimeout(400);
  await touchBitmap(page, 350, 330);
  await page.waitForTimeout(400);
  await snap(page, 'sfscroll-03-after-haptic-330.png');
});

test('SF action picker: scroll down and capture all remaining items', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openSFEditorAndPicker(page);

  await snap(page, 'sfscroll-04-picker-before-scroll.png');

  // Swipe upward inside picker: drag from y≈290 to y≈130 (moves list down → reveals lower items)
  await touchSwipeBitmap(page, 350, 290, 130);
  await snap(page, 'sfscroll-05-picker-after-scroll1.png');

  // Try tapping visible items after scroll. Spacing ≈40px; after one scroll
  // the first visible item should be around Play audio / Haptic / Write logs etc.
  // Tap at y=130, 170, 210, 250, 290 to see what's visible now.
  const probeYs = [130, 170, 210, 250, 290];
  for (const y of probeYs) {
    await openSFEditorAndPicker(page);
    await touchSwipeBitmap(page, 350, 290, 130);
    await snap(page, `sfscroll-06-scrolled-picker-y${y}.png`);
    await touchBitmap(page, 350, y);
    await page.waitForTimeout(400);
    await snap(page, `sfscroll-07-after-tap-y${y}.png`);
  }
});

test('SF action picker: scroll twice for bottom items', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Two scrolls should reach Load model / Play vario territory
  await openSFEditorAndPicker(page);
  await touchSwipeBitmap(page, 350, 290, 130);
  await page.waitForTimeout(200);
  await touchSwipeBitmap(page, 350, 290, 130);
  await snap(page, 'sfscroll-08-picker-after-scroll2.png');

  const probeYs = [130, 170, 210, 250, 290];
  for (const y of probeYs) {
    await openSFEditorAndPicker(page);
    await touchSwipeBitmap(page, 350, 290, 130);
    await page.waitForTimeout(200);
    await touchSwipeBitmap(page, 350, 290, 130);
    await snap(page, `sfscroll-09-scroll2-picker-y${y}.png`);
    await touchBitmap(page, 350, y);
    await page.waitForTimeout(400);
    await snap(page, `sfscroll-10-scroll2-after-tap-y${y}.png`);
  }
});
