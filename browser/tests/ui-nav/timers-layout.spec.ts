/**
 * Probe: Timers screen — list layout, T1 editor fields, Mode picker
 *
 * Goals:
 * 1. Confirm Timers list screen layout (T1/T2 rows, [+] button)
 * 2. Open T1 editor — sweep all field rows to find Name, Mode, Start, Source, Switch, Persistence
 * 3. Open Mode picker — capture options (Countdown / Count-up)
 * 4. Check if any fields require scroll to reach
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToTimers, goBack } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots/timers');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Timers — list screen layout', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);

  await snap(page, '01-timers-list.png');
});

test('probe: Timers — open T1 editor (first tap)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);

  // T1 row is likely at y≈116 (same pattern as other list screens)
  // Try first tap to highlight, then second to open editor or context menu
  await tapBitmap(page, 400, 116);
  await page.waitForTimeout(600);
  await snap(page, '02-t1-first-tap.png');

  await tapBitmap(page, 400, 116);
  await page.waitForTimeout(600);
  await snap(page, '03-t1-second-tap.png');
});

test('probe: Timers — sweep T1 editor fields (x=600)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);

  // Open T1 editor — try double-tap pattern used by other list screens
  await tapBitmap(page, 400, 116);
  await page.waitForTimeout(400);
  await tapBitmap(page, 400, 116);
  await page.waitForTimeout(600);
  await snap(page, '04-t1-editor.png');

  // Sweep value column (x=600) for all visible field rows
  for (const y of [80, 120, 160, 200, 240, 280, 320, 360, 400, 440]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(600);
    await snap(page, `05-field-x600-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
});

test('probe: Timers — Mode picker contents', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);

  // Open T1 editor
  await tapBitmap(page, 400, 116);
  await page.waitForTimeout(400);
  await tapBitmap(page, 400, 116);
  await page.waitForTimeout(600);

  // Mode field expected near y≈160 (second field after Name)
  await tapBitmap(page, 600, 160);
  await page.waitForTimeout(600);
  await snap(page, '06-mode-picker.png');

  // Dismiss
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
});

test('probe: Timers — scroll to check hidden fields', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);

  // Open T1 editor
  await tapBitmap(page, 400, 116);
  await page.waitForTimeout(400);
  await tapBitmap(page, 400, 116);
  await page.waitForTimeout(600);
  await snap(page, '07-before-scroll.png');

  // CDP touch swipe up to reveal scrolled fields
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    const scaleX = box.width / 800;
    const scaleY = box.height / 480;
    const client = await page.context().newCDPSession(page);
    const cx = box.x + 400 * scaleX;
    const startY = box.y + 380 * scaleY;
    const endY = box.y + 100 * scaleY;
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: cx, y: startY, id: 0 }], modifiers: 0,
    });
    await page.waitForTimeout(50);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: cx, y: endY, id: 0 }], modifiers: 0,
    });
    await page.waitForTimeout(50);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd', touchPoints: [], modifiers: 0,
    });
  }
  await page.waitForTimeout(600);
  await snap(page, '08-after-scroll.png');

  // Sweep again after scroll
  for (const y of [80, 120, 160, 200, 240, 280, 320, 360, 400, 440]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(600);
    await snap(page, `09-scrolled-x600-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
});
