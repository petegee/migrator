/**
 * Probe: Vars editor — CDP mouseWheel scroll then tapBitmap on "+ Add a new action"
 *
 * The user confirms clicking the button with a real mouse click works.
 * Prior probes used CDP touch swipe to scroll (which may scroll visually but
 * differently from a real scroll wheel). This probe uses CDP Input.dispatchMouseEvent
 * with type 'mouseWheel' — closer to what a real browser user does with a scroll wheel.
 * Then tapBitmap (mouse click) on the button.
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

test('vars actions17: CDP mouseWheel scroll then tapBitmap Add-a-new-action', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'va17-00-initial.png');

  // CDP mouseWheel scroll — send several large wheel events over the canvas centre
  const centre = await bitmapToPage(page, 400, 300);
  const client = await (page.context() as any).newCDPSession(page);

  for (let i = 0; i < 5; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: centre.x,
      y: centre.y,
      deltaX: 0,
      deltaY: 300,
      modifiers: 0,
      pointerType: 'mouse',
    });
    await page.waitForTimeout(200);
  }
  await snap(page, 'va17-01-after-wheel.png');

  // tapBitmap sweep across the button area
  for (const by of [400, 420, 430, 440, 450]) {
    await tapBitmap(page, 400, by);
    await page.waitForTimeout(700);
    await snap(page, `va17-02-tap-y${by}.png`);
  }
});
