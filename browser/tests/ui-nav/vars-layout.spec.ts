/**
 * Probe: Vars screen layout and editor field coordinates
 *
 * Goal:
 * 1. Confirm navigation to Vars (Page 2 swipe + r2c2)
 * 2. Confirm + button position (large centred, same as LS/SF)
 * 3. See Var1 editor layout after adding via +
 * 4. Identify all editor field y-coordinates via tap sweep at x=600
 *    Expected fields: Value (read-only), Name, Comment, Range low/high,
 *    Values section, Actions section
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToVars, goBack } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Vars screen — list layout and + button', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  await snap(page, 'vars-01-list.png');

  // Centred + icon (same position as LS/SF on empty list)
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await snap(page, 'vars-02-after-plus-400-266.png');

  // Also try header + position (same as FM/Mixes) in case above did nothing
  await tapBitmap(page, 569, 69);
  await page.waitForTimeout(600);

  await snap(page, 'vars-03-after-plus-569-69.png');
});

test('probe: Vars editor — field y-sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  // Add Var1 via centred + button
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await snap(page, 'vars-04-editor-open.png');

  // Sweep value side (x=600) at candidate y positions.
  // If Name or Comment open a keyboard, subsequent taps land on keys —
  // that's still useful evidence of which field triggered the keyboard.
  // After each keyboard-opening field we do goBack to return to the editor.
  for (const y of [80, 120, 160, 200, 240, 280, 320, 360, 400, 440]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `vars-05-field-tap-y${y}.png`);

    // If a full-screen keyboard appeared, dismiss it and return to the editor.
    // We detect this by checking if the back arrow can get us back to the editor.
    // Just always goBack and re-enter — cost is a few extra steps but keeps
    // state clean between field taps.
    await goBack(page);
    await page.waitForTimeout(400);
    await snap(page, `vars-06-after-back-y${y}.png`);

    // If we're still in the editor, great. If we went back to the Vars list,
    // re-open the editor via the first Var row context menu.
    // Tap the Var1 row to highlight, then tap again to open context, then Edit.
    // First check — tap list area to see if we're on the list (no-op if in editor).
    // We do this conservatively: try to re-enter the editor after each field.
    // (Over-navigating is fine; we just capture screenshots to see state.)
  }
});

test('probe: Vars editor — lower fields with scroll', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  // Add Var1
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  await snap(page, 'vars-07-editor-before-scroll.png');

  // Try scrolling down inside the editor to reveal Values/Actions sections
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

  if (rect) {
    // Swipe up (scroll down) in the editor content area
    const cx = rect.x + 400 * (rect.w / 800);
    const startY = rect.y + 350 * (rect.h / 480);
    const endY = rect.y + 150 * (rect.h / 480);
    await page.mouse.move(cx, startY);
    await page.mouse.down();
    await page.mouse.move(cx, endY, { steps: 15 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  await snap(page, 'vars-08-editor-after-scroll.png');

  // Sweep again to find Values / Actions section buttons
  for (const y of [100, 150, 200, 250, 300, 350, 400]) {
    await tapBitmap(page, 400, y);
    await page.waitForTimeout(400);
    await snap(page, `vars-09-scrolled-tap-y${y}.png`);
  }
});
