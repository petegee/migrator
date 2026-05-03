/**
 * Probe: Vars editor — touch-event swipe for scrolling
 *
 * Finding: mouse drag scroll breaks touch interaction. Wheel scroll doesn't
 * scroll content. Need touch-based scroll (touchstart→touchmove→touchend)
 * dispatched via JS, which matches what a real touchscreen would send.
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

/** Scroll content up by dispatching raw touch events (swipe up gesture). */
async function touchSwipeUp(page: any, bxStart: number, byStart: number, byEnd: number, steps = 15) {
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: HTMLCanvasElement) => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) return;

  const px = rect.x + bxStart * (rect.w / 800);
  const pyStart = rect.y + byStart * (rect.h / 480);
  const pyEnd   = rect.y + byEnd   * (rect.h / 480);

  await page.evaluate(
    ({ px, pyStart, pyEnd, steps }: { px: number; pyStart: number; pyEnd: number; steps: number }) => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) return;

      const mkTouch = (x: number, y: number): Touch =>
        new Touch({ identifier: 1, target: canvas, clientX: x, clientY: y, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 });

      const fire = (type: string, t: Touch) =>
        canvas.dispatchEvent(new TouchEvent(type, {
          bubbles: true, cancelable: true,
          touches: type === 'touchend' ? [] : [t],
          targetTouches: type === 'touchend' ? [] : [t],
          changedTouches: [t],
        }));

      const t0 = mkTouch(px, pyStart);
      fire('touchstart', t0);
      for (let i = 1; i <= steps; i++) {
        const y = pyStart + (pyEnd - pyStart) * (i / steps);
        fire('touchmove', mkTouch(px, y));
      }
      fire('touchend', mkTouch(px, pyEnd));
    },
    { px, pyStart, pyEnd, steps },
  );
  await page.waitForTimeout(500);
}

test('vars actions6: touch-swipe scroll then probe Add-a-new-action', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'va6-01-editor-initial.png');

  // Touch swipe up (scroll down) to reveal Actions section
  await touchSwipeUp(page, 400, 440, 150);
  await snap(page, 'va6-02-after-touch-swipe.png');

  // Verify "+Add a new value" still responds (sanity check that interaction works)
  await touchBitmap(page, 400, 315);
  await page.waitForTimeout(600);
  await snap(page, 'va6-03-post-touch-add-value-y315.png');

  // Try "+Add a new action" at several y positions
  for (const by of [420, 440, 455, 465]) {
    await touchBitmap(page, 400, by);
    await page.waitForTimeout(600);
    await snap(page, `va6-04-post-touch-action-y${by}.png`);
  }
});
