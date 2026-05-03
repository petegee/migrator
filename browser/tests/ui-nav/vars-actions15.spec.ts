/**
 * Probe: Vars editor — direct touch on "+ Add a new action" after CDP swipe
 *
 * va14 found: touch events survive CDP swipe (y=240 Range, y=290 Values both responded).
 * But y=400/430/455 showed no change — likely because the dismiss between tests
 * (tapBitmap y=340) didn't close the open control bar, corrupting the layout.
 *
 * This probe: fresh boot per test, one CDP swipe, ONE touch per test directly at
 * the Actions button — no other field activations, no dismiss needed.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToVars } from '../helpers/navigate';
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

async function openVarEditorScrolled(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  const client = await (page.context() as any).newCDPSession(page);
  const start = await bitmapToPage(page, 400, 440);
  const end   = await bitmapToPage(page, 400, 150);

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: start.x, y: start.y, id: 0 }],
    modifiers: 0,
  });
  await page.waitForTimeout(30);
  for (let i = 1; i <= 20; i++) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: start.x, y: start.y + (end.y - start.y) * (i / 20), id: 0 }],
      modifiers: 0,
    });
    await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
    modifiers: 0,
  });
  await page.waitForTimeout(600);
}

// One test per y position — fresh boot each time, no prior field activations
const yValues = [380, 390, 400, 410, 420, 430, 440, 450, 460, 470];

for (const by of yValues) {
  test(`vars actions15: touch y=${by} on Actions button (fresh boot)`, async ({ page }) => {
    await openVarEditorScrolled(page);
    await snap(page, `va15-00-scrolled-y${by}.png`);  // confirm scroll position
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(700);
    await snap(page, `va15-01-after-touch-y${by}.png`);
  });
}
