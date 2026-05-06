/**
 * Probe: Vars ctx menu — sticky state (fresh from editor)
 *
 * Probe 2 showed: after navigateToVars(), single taps deselect the row.
 * But probe 1 showed: after goBack() from editor, single taps keep it orange.
 * The context menu appeared in probe 1 after accumulating 2 taps at (200,106) + 1 tap at (350,140).
 *
 * Goal: reproduce the "sticky" state by returning from the editor, then try
 * various tap counts and positions to find the ctx menu trigger reliably.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToVars, goBack } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name + '.png'), buf);
}
const snap = async (page: any, label: string) =>
  save(label, await page.locator('canvas').first().screenshot({ type: 'png' }));

// Put row into "sticky" state: open editor and return
async function returnFromEditor(page: any) {
  await tapBitmap(page, 400, 266); // add Var1 or open if sticky
  await page.waitForTimeout(500);
  await goBack(page);              // back to list, row is now sticky-highlighted
  await page.waitForTimeout(400);
}

test('probe: ctx menu — sticky state, tap count sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  // Add Var1
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(400);

  await snap(page, 'ctx3-01-sticky-start');

  // Try 1 tap at (200,106)
  await tapBitmap(page, 200, 106);
  await page.waitForTimeout(500);
  await snap(page, 'ctx3-02-after-1tap-200-106');

  // Try 2nd tap at (200,106) — still on same session
  await tapBitmap(page, 200, 106);
  await page.waitForTimeout(500);
  await snap(page, 'ctx3-03-after-2tap-200-106');

  // Try 3rd tap at (200,106)
  await tapBitmap(page, 200, 106);
  await page.waitForTimeout(500);
  await snap(page, 'ctx3-04-after-3tap-200-106');

  // Dismiss whatever state we're in
  await goBack(page);
  await page.waitForTimeout(300);
});

test('probe: ctx menu — sticky state, try x=350 after prior taps', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  // Add Var1
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(400);

  await snap(page, 'ctx3-05-sticky-start2');

  // Replicate probe 1 exactly: 2 taps at (200,106) then tap at (350,140)
  await tapBitmap(page, 200, 106);
  await page.waitForTimeout(300);
  await tapBitmap(page, 200, 106);
  await page.waitForTimeout(400);
  await snap(page, 'ctx3-06-after-2taps-200-106');

  // The tap that opened the ctx menu in probe 1
  await tapBitmap(page, 350, 140);
  await page.waitForTimeout(600);
  await snap(page, 'ctx3-07-after-tap-350-140');

  // If menu is open, try clicking Edit at estimated y=144
  await tapBitmap(page, 350, 144);
  await page.waitForTimeout(500);
  await snap(page, 'ctx3-08-after-tap-edit-in-menu');
});

test('probe: ctx menu — sticky state, try x=350 without prior taps', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(400);

  await snap(page, 'ctx3-09-sticky-fresh');

  // Immediately try x=350 (no prior taps) — does a single tap open ctx menu?
  await tapBitmap(page, 350, 106);
  await page.waitForTimeout(500);
  await snap(page, 'ctx3-10-after-tap-350-106-no-prior');

  await tapBitmap(page, 350, 106);
  await page.waitForTimeout(500);
  await snap(page, 'ctx3-11-after-2tap-350-106');
});

test('probe: ctx menu — long press via CDP touch hold', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(400);

  await snap(page, 'ctx3-12-before-longpress');

  // Long press via CDP touch: touchStart, wait 800ms, touchEnd (no move)
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

  if (rect) {
    const px = rect.x + 200 * (rect.w / 800);
    const py = rect.y + 106 * (rect.h / 480);

    const client = await (page.context() as any).newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: px, y: py, id: 0 }],
    });
    await page.waitForTimeout(800); // hold for 800ms
    await snap(page, 'ctx3-13-during-longpress');
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await page.waitForTimeout(400);
    await snap(page, 'ctx3-14-after-longpress');
  }
});
