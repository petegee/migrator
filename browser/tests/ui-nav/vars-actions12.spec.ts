/**
 * Probe: Vars editor — no-hasTouch browser, drag scroll then mouse-click Add-a-new-action
 *
 * Hypothesis: with hasTouch:false, mouse click works on touch-only buttons.
 * We create a fresh browser context without hasTouch, use the real boot/nav
 * helpers (they just need a page object), drag-scroll to reveal the Actions
 * section, then click "+ Add a new action" with a plain mouse click.
 */
import { test, chromium } from '@playwright/test';
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

async function bitmapRect(page: any) {
  return page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
}

test('vars actions12: no-hasTouch — drag scroll then click Add-a-new-action', async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    hasTouch: false,
  });
  const page = await ctx.newPage();

  try {
    await bootApp(page);
    await navigateCreateModelWizard(page);
    await navigateToVars(page);

    // Add a var via the centred + button
    await tapBitmap(page, 400, 266);
    await page.waitForTimeout(600);
    await snap(page, 'va12-01-editor-initial.png');

    // Drag-scroll to reveal the Actions section
    const rect = await bitmapRect(page);
    if (rect) {
      const cx = rect.x + 400 * (rect.w / 800);
      const startY = rect.y + 440 * (rect.h / 480);
      const endY   = rect.y + 150 * (rect.h / 480);
      await page.mouse.move(cx, startY);
      await page.mouse.down();
      await page.mouse.move(cx, endY, { steps: 15 });
      await page.mouse.up();
      await page.waitForTimeout(600);
    }
    await snap(page, 'va12-02-after-scroll.png');

    // Mouse-click sweep for "+ Add a new action" button
    for (const by of [380, 400, 420, 440, 460]) {
      await tapBitmap(page, 400, by);
      await page.waitForTimeout(700);
      await snap(page, `va12-03-tap-y${by}.png`);
    }
  } finally {
    await browser.close();
  }
});
