/**
 * Probe: Vars editor — fix interaction after drag scroll
 *
 * Finding: mouse drag scroll breaks subsequent touch/tap. Wheel scroll
 * preserves touch but only moves cursor highlight, not content.
 *
 * New hypotheses:
 * A) After drag scroll, move mouse off-canvas then click neutral area → reset state
 * B) After drag scroll, press Escape to clear any drag lock
 * C) Large wheel scroll (delta=3000) — does it actually scroll content at all?
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

async function openEditorScrolled(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  return rect;
}

// Test A: drag scroll then move mouse off-canvas (top-left corner of page)
test('vars actions5A: drag scroll + off-canvas mouse move + touch buttons', async ({ page }) => {
  const rect = await openEditorScrolled(page);
  if (!rect) return;

  // Drag scroll
  const cx = rect.x + 400 * (rect.w / 800);
  const startY = rect.y + 440 * (rect.h / 480);
  const endY   = rect.y + 150 * (rect.h / 480);
  await page.mouse.move(cx, startY);
  await page.mouse.down();
  await page.mouse.move(cx, endY, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  // Move mouse completely off canvas — top-left of viewport
  await page.mouse.move(5, 5);
  await page.waitForTimeout(400);
  await snap(page, 'va5a-01-after-scroll-mouse-offcanvas.png');

  // Try touching the "+Add a new value" button (scrolled state ~y=315)
  // and "+Add a new action" button (scrolled state ~y=440)
  for (const by of [315, 440, 455, 465]) {
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(600);
    await snap(page, `va5a-02-post-touch-y${by}.png`);
  }
});

// Test B: drag scroll then press Escape
test('vars actions5B: drag scroll + Escape key + touch buttons', async ({ page }) => {
  const rect = await openEditorScrolled(page);
  if (!rect) return;

  const cx = rect.x + 400 * (rect.w / 800);
  const startY = rect.y + 440 * (rect.h / 480);
  const endY   = rect.y + 150 * (rect.h / 480);
  await page.mouse.move(cx, startY);
  await page.mouse.down();
  await page.mouse.move(cx, endY, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await snap(page, 'va5b-01-after-scroll-escape.png');

  for (const by of [315, 440, 455]) {
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(600);
    await snap(page, `va5b-02-post-touch-y${by}.png`);
  }
});

// Test C: large wheel scroll — does it actually scroll content?
test('vars actions5C: large wheel scroll (delta=3000) layout check', async ({ page }) => {
  const rect = await openEditorScrolled(page);
  if (!rect) return;

  await snap(page, 'va5c-01-before-wheel.png');

  const cx = rect.x + 400 * (rect.w / 800);
  const cy = rect.y + 300 * (rect.h / 480);
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(600);
  await snap(page, 'va5c-02-after-wheel-3000.png');

  // If Actions section now visible, try touching "+Add a new action"
  for (const by of [400, 420, 440, 460]) {
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(600);
    await snap(page, `va5c-03-post-touch-y${by}.png`);
  }
});
