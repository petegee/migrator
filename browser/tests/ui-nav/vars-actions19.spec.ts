/**
 * Probe: Vars editor — wheel to focus "+Add a new action", then direct tap on it
 *
 * va18 confirmed: 7×300 = 2100 total wheel delta focuses the button (orange highlight).
 * The tap sweep then deselected it with the y=380 tap before reaching y=440+.
 * This probe: wheel to 2100, then ONE tap directly at the orange button y-position.
 * Also try: two taps at the button (first tap = highlight, second = activate).
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

async function wheelNav(page: any, totalDelta: number) {
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
  await page.waitForTimeout(300);
}

// Test A: wheel to 2100 then single tap at button center (y=455)
test('vars actions19a: wheel 2100 then single tap y=455', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await wheelNav(page, 2100);
  await snap(page, 'va19a-00-highlighted.png');

  await tapBitmap(page, 400, 455);
  await page.waitForTimeout(800);
  await snap(page, 'va19a-01-after-tap.png');
});

// Test B: wheel to 2100 then double tap at y=455
test('vars actions19b: wheel 2100 then double-tap y=455', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await wheelNav(page, 2100);
  await snap(page, 'va19b-00-highlighted.png');

  await tapBitmap(page, 400, 455);
  await page.waitForTimeout(400);
  await tapBitmap(page, 400, 455);
  await page.waitForTimeout(800);
  await snap(page, 'va19b-01-after-double-tap.png');
});

// Test C: wheel to 2100, tap at y=455, snap, tap again, snap (track each tap)
test('vars actions19c: wheel 2100 then tap-snap-tap-snap at y=455', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await wheelNav(page, 2100);
  await snap(page, 'va19c-00-highlighted.png');

  await tapBitmap(page, 400, 455);
  await page.waitForTimeout(600);
  await snap(page, 'va19c-01-after-tap1.png');

  await tapBitmap(page, 400, 455);
  await page.waitForTimeout(600);
  await snap(page, 'va19c-02-after-tap2.png');

  await tapBitmap(page, 400, 455);
  await page.waitForTimeout(600);
  await snap(page, 'va19c-03-after-tap3.png');
});
