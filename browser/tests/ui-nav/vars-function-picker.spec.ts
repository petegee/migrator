/**
 * Probe: Vars action Function picker — items below Divide(/)
 *
 * The picker shows 5 items at a time. Confirmed so far: Assign(=) Add(+) Subtract(-) Multiply(*) Divide(/)
 * Expected below: Percent / Min / Max / Repurpose trim
 *
 * Strategy: open picker, touch-swipe upward inside picker to scroll down, screenshot each step.
 * Mouse drag dismisses the picker — must use CDP touch events for the scroll.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import {
  tapBitmap, navigateToVars,
  focusAddNewAction, cdpEnterKey,
} from '../helpers/navigate';
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
  return page.evaluate((args: number[]) => {
    const [bx, by] = args;
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: r.x + bx * (r.width / 800), y: r.y + by * (r.height / 480) };
  }, [bx, by]);
}

/** Touch-swipe inside the picker (from by_start down to by_end in bitmap space). */
async function touchSwipeInPicker(page: any, bx: number, byStart: number, byEnd: number) {
  const start = await bitmapToPage(page, bx, byStart);
  const end = await bitmapToPage(page, bx, byEnd);
  const client = await (page.context() as any).newCDPSession(page);
  const steps = 10;
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: start.x, y: start.y, id: 0, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 }],
    modifiers: 0,
  });
  for (let i = 1; i <= steps; i++) {
    const x = start.x + (end.x - start.x) * (i / steps);
    const y = start.y + (end.y - start.y) * (i / steps);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y, id: 0, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 }],
      modifiers: 0,
    });
    await page.waitForTimeout(30);
  }
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ x: end.x, y: end.y, id: 0, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 }],
    modifiers: 0,
  });
  await page.waitForTimeout(400);
}

async function openFunctionPicker(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await focusAddNewAction(page);
  await cdpEnterKey(page);
  await page.waitForTimeout(300);
  // Open the Function picker
  await tapBitmap(page, 290, 465);
  await page.waitForTimeout(600);
}

// Test A: capture the picker as-is (baseline, should match earlier probe)
test('vfp A: function picker baseline', async ({ page }) => {
  await openFunctionPicker(page);
  await snap(page, 'vfp-A-00-picker-open.png');
});

// Test B: scroll picker down once (swipe upward: y=280→140 in bitmap, centred on picker)
test('vfp B: scroll picker once — reveal items below Divide', async ({ page }) => {
  await openFunctionPicker(page);
  await snap(page, 'vfp-B-00-before-scroll.png');

  await touchSwipeInPicker(page, 320, 280, 140);
  await snap(page, 'vfp-B-01-after-scroll1.png');

  // Scroll again in case more items
  await touchSwipeInPicker(page, 320, 280, 140);
  await snap(page, 'vfp-B-02-after-scroll2.png');
});

// Test C: scroll then tap each visible row to identify items
test('vfp C: scroll and tap each item', async ({ page }) => {
  await openFunctionPicker(page);
  await touchSwipeInPicker(page, 320, 280, 140);
  await snap(page, 'vfp-C-00-scrolled.png');

  // Sweep all item y positions in the picker overlay
  for (const by of [100, 130, 160, 190, 220, 250, 280, 310, 340]) {
    // Re-open picker fresh for each tap (picker closes on selection)
    await openFunctionPicker(page);
    await touchSwipeInPicker(page, 320, 280, 140);
    await tapBitmap(page, 400, by);
    await page.waitForTimeout(600);
    await snap(page, `vfp-C-01-tap-y${by}.png`);
  }
});
