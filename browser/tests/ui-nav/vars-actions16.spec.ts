/**
 * Probe: Vars editor — CDP touch swipe scroll, then tapBitmap (mouse click) on "+ Add a new action"
 *
 * User confirmed: the button responds to a regular left mouse click in the emulator.
 * Previous probes only tried touchBitmap after CDP swipe.
 * This probe uses tapBitmap (mouse click) at the scrolled button position.
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

async function touchSwipeUp(page: any) {
  const client = await (page.context() as any).newCDPSession(page);
  const start = await bitmapToPage(page, 400, 440);
  const end   = await bitmapToPage(page, 400, 150);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{ x: start.x, y: start.y, id: 0 }], modifiers: 0,
  });
  for (let i = 1; i <= 20; i++) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: start.x, y: start.y + (end.y - start.y) * (i / 20), id: 0 }],
      modifiers: 0,
    });
    await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd', touchPoints: [], modifiers: 0,
  });
  await page.waitForTimeout(600);
}

// Fresh boot per y — tapBitmap sweep on Actions button in scrolled state
const yValues = [400, 410, 420, 430, 440, 450, 460];

for (const by of yValues) {
  test(`vars actions16: tapBitmap y=${by} on Actions button after CDP swipe`, async ({ page }) => {
    await bootApp(page);
    await navigateCreateModelWizard(page);
    await navigateToVars(page);
    await tapBitmap(page, 400, 266);
    await page.waitForTimeout(600);

    await touchSwipeUp(page);
    await snap(page, `va16-00-scrolled-y${by}.png`);

    await tapBitmap(page, 400, by);
    await page.waitForTimeout(700);
    await snap(page, `va16-01-after-tap-y${by}.png`);
  });
}
