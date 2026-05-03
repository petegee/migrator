/**
 * Probe: Vars editor — progressive wheel navigation to "+ Add a new action"
 *
 * CDP mouseWheel moves the encoder cursor through fields (va17 confirmed Values at 1500).
 * If we send enough wheel events, the cursor should reach "+ Add a new action" and
 * the view should auto-scroll to show it. Then a tapBitmap (mouse click) should activate it.
 *
 * Strategy: send wheel in steps and snapshot after each to find the scroll point.
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

test('vars actions18: progressive wheel navigation then tap', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'va18-00-initial.png');

  const centre = await bitmapToPage(page, 400, 300);
  const client = await (page.context() as any).newCDPSession(page);

  async function wheel(deltaY: number) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: centre.x, y: centre.y,
      deltaX: 0, deltaY, modifiers: 0, pointerType: 'mouse',
    });
    await page.waitForTimeout(300);
  }

  // Send progressive wheel steps and snapshot every 300 delta to watch for auto-scroll
  let total = 0;
  for (let i = 1; i <= 12; i++) {
    await wheel(300);
    total += 300;
    await snap(page, `va18-01-wheel-${total}.png`);
  }

  // Now try tapBitmap at all likely positions — the highlighted field should be clickable
  for (const by of [380, 400, 420, 430, 440, 450, 460, 470]) {
    await tapBitmap(page, 400, by);
    await page.waitForTimeout(700);
    await snap(page, `va18-02-tap-y${by}.png`);
  }
});
