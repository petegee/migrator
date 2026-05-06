/**
 * Probe: Trims — scroll list to find all axes + confirm remaining unknowns
 *
 * Goals:
 * 1. Use CDP touch swipe to scroll the Trims list and find all 4 axes
 * 2. Confirm how many axes exist (Rudder, Elevator, Aileron, Throttle?)
 * 3. Check the trim value (0%) on the left of headers — is it tappable?
 * 4. Confirm confirm-dialog Yes/No button bitmap coords
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToTrims } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots/trims');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function bitmapToPage(page: any, bx: number, by: number) {
  return page.evaluate(([bx, by]: [number, number]) => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    const r = c.getBoundingClientRect();
    return { x: r.x + bx * (r.width / 800), y: r.y + by * (r.height / 480) };
  }, [bx, by]);
}

async function touchSwipeBitmap(page: any, bx: number, byFrom: number, byTo: number, steps = 15) {
  const client = await (page.context() as any).newCDPSession(page);
  const from = await bitmapToPage(page, bx, byFrom);
  const to = await bitmapToPage(page, bx, byTo);
  const pt = (x: number, y: number) => [{ x, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from.x, from.y) });
  for (let i = 1; i <= steps; i++) {
    const iy = from.y + (to.y - from.y) * (i / steps);
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(from.x, iy) });
    await page.waitForTimeout(16);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: pt(from.x, to.y) });
  await page.waitForTimeout(400);
}

test('probe: Trims — collapse all then scroll to see all axes', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  await snap(page, '30-start.png');

  // Collapse Rudder (tap ▼ arrow at right)
  await tapBitmap(page, 780, 80);
  await page.waitForTimeout(400);
  await snap(page, '31-rudder-collapsed.png');

  // Now we see Rudder (collapsed) + Elevator (expanded).
  // Collapse Elevator too by tapping its header ▼ arrow
  // Elevator header should be at y≈120 now (second row after Rudder)
  await tapBitmap(page, 780, 120);
  await page.waitForTimeout(400);
  await snap(page, '32-elevator-collapsed.png');

  // Now swipe up (drag from y=380 to y=80) using CDP touch to scroll list
  await touchSwipeBitmap(page, 400, 380, 80);
  await page.waitForTimeout(400);
  await snap(page, '33-after-scroll1.png');

  await touchSwipeBitmap(page, 400, 380, 80);
  await page.waitForTimeout(400);
  await snap(page, '34-after-scroll2.png');

  await touchSwipeBitmap(page, 400, 380, 80);
  await page.waitForTimeout(400);
  await snap(page, '35-after-scroll3.png');
});

test('probe: Trims — tap trim value (0%) on header left side', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  await snap(page, '36-before-val-tap.png');

  // Collapse Rudder to see Elevator header
  await tapBitmap(page, 780, 80);
  await page.waitForTimeout(400);
  await snap(page, '37-rudder-collapsed-elevator-visible.png');

  // Try tapping the "0%" value on Rudder header (x≈150, y≈80)
  await tapBitmap(page, 150, 80);
  await page.waitForTimeout(600);
  await snap(page, '38-tap-rudder-0pct.png');
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);

  // Try on Elevator header (x≈150, y≈120 when Rudder is collapsed)
  await tapBitmap(page, 150, 120);
  await page.waitForTimeout(600);
  await snap(page, '39-tap-elevator-0pct.png');
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
});

test('probe: Trims — confirm dialog Yes/No sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  // Open "Move trim to subtrim" dialog
  await tapBitmap(page, 400, 400);
  await page.waitForTimeout(600);
  await snap(page, '40-dialog-open.png');

  // Sweep x across y≈215 to find Yes and No buttons
  for (const x of [300, 350, 390, 430, 470]) {
    await tapBitmap(page, 400, 400);  // reopen dialog
    await page.waitForTimeout(500);
    await tapBitmap(page, x, 215);
    await page.waitForTimeout(500);
    await snap(page, `41-dialog-tap-x${x}-y215.png`);
  }
});
