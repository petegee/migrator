/**
 * Probe: where does the Angular download mat-menu appear on screen?
 * Captures a screenshot with the menu OPEN to see if it overlaps the canvas.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';

async function snapWebGL(page: any, label: string) {
  const idx = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const i = canvases.findIndex((c: HTMLCanvasElement) => c.getContext('webgl') !== null || c.getContext('webgl2') !== null);
    return i === -1 ? 0 : i;
  });
  const canvasBuf = await page.locator('canvas').nth(idx).screenshot({ type: 'png' });
  await test.info().attach(`${label}-canvas`, { body: canvasBuf, contentType: 'image/png' });
  // Full page screenshot to see the menu overlay
  const fullBuf = await page.screenshot({ type: 'png' });
  await test.info().attach(`${label}-fullpage`, { body: fullBuf, contentType: 'image/png' });
}

test('probe: download menu position', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Log the canvas bounding rect
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: HTMLCanvasElement) => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  console.log('Canvas rect:', JSON.stringify(rect));

  // Click the Download button but DON'T click the menu — snap with menu open
  await page.click('button[aria-label="Download"]');
  await page.waitForTimeout(400);

  // Get the menu panel bounding rect
  const menuRect = await page.evaluate(() => {
    const panel = document.querySelector('.mat-mdc-menu-panel');
    if (!panel) return null;
    const r = (panel as HTMLElement).getBoundingClientRect();
    const buttons = Array.from(panel.querySelectorAll('button'));
    return {
      panel: { x: r.x, y: r.y, w: r.width, h: r.height },
      buttonCount: buttons.length,
      buttons: buttons.map((b, i) => {
        const br = b.getBoundingClientRect();
        return { i, text: b.textContent?.trim().slice(0, 40), x: br.x, y: br.y, w: br.width, h: br.height };
      }),
    };
  });
  console.log('Menu rect:', JSON.stringify(menuRect, null, 2));

  const fullBuf = await page.screenshot({ type: 'png' });
  await test.info().attach('menu-open-fullpage', { body: fullBuf, contentType: 'image/png' });

  // Close menu by pressing Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await snapWebGL(page, 'after-menu-close');
});
