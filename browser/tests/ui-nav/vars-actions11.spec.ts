/**
 * Probe: Vars editor — JS-injected WheelEvent for scroll, then tap button
 *
 * Hypothesis: physical scroll wheel works (user confirmed) but Playwright's
 * page.mouse.wheel() (CDP) doesn't scroll content. Try dispatching a real
 * WheelEvent via page.evaluate() on the canvas — this goes through the
 * browser's normal event path and may be processed identically to physical
 * scroll. If content scrolls AND interaction is preserved, we can reach
 * "+ Add a new action" with tapBitmap.
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

async function jsWheelScroll(page: any, deltaY: number) {
  await page.evaluate((dy: number) => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return;
    c.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: dy,
      deltaMode: 0,  // DOM_DELTA_PIXEL
    }));
  }, deltaY);
  await page.waitForTimeout(400);
}

test('vars actions11: JS WheelEvent scroll then tapBitmap sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'va11-00-initial.png');

  // Scroll with JS WheelEvent — try progressive amounts
  for (let i = 1; i <= 5; i++) {
    await jsWheelScroll(page, 300);
    await snap(page, `va11-0${i}-after-wheel-${i * 300}.png`);
  }

  // Now try tapBitmap sweep on the buttons
  for (const by of [340, 360, 380, 400, 420, 440, 460]) {
    await tapBitmap(page, 400, by);
    await page.waitForTimeout(700);
    await snap(page, `va11-tap-y${by}.png`);
  }
});
