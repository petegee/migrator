/**
 * Probe: Timers — open editor via context menu "Edit", then sweep all fields
 *
 * The Timers list uses a list+side-panel layout. Tapping a row once highlights it
 * (side panel updates). Tapping again opens a context menu: Reset/Edit/Add/Move/Copy/Clone/Delete.
 * "Edit" opens the full timer editor. This probe finds the Edit item coords and maps all fields.
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

// Open context menu for Timer1
async function openTimer1CtxMenu(page: any) {
  await tapBitmap(page, 400, 116);  // highlight Timer1
  await page.waitForTimeout(400);
  await tapBitmap(page, 400, 116);  // open context menu
  await page.waitForTimeout(400);
}

test('probe: Timers — find Edit item in context menu (touch sweep)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);

  // Popup title "Timer1" is at ~y=110 bitmap, then Reset≈140, Edit≈180, Add≈225...
  // Try touchBitmap at x=320 across y=140..200 to locate Edit
  for (const y of [140, 160, 180, 190, 200]) {
    await openTimer1CtxMenu(page);
    await snap(page, `10-ctx-before-touch-y${y}.png`);
    await touchBitmap(page, 320, y);
    await page.waitForTimeout(700);
    await snap(page, `10-ctx-after-touch-y${y}.png`);
    // If editor opened, go back; if menu still showing, tap neutral area to dismiss
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
});

test('probe: Timers — open editor and sweep fields (x=600)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);

  // Open context menu then touch Edit (try y=180 first)
  await openTimer1CtxMenu(page);
  await touchBitmap(page, 320, 180);
  await page.waitForTimeout(700);
  await snap(page, '11-timer1-editor.png');

  // Sweep value column
  for (const y of [80, 120, 160, 200, 240, 280, 320, 360, 400, 440]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(600);
    await snap(page, `12-editor-x600-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
});

test('probe: Timers — Mode picker options', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);

  await openTimer1CtxMenu(page);
  await touchBitmap(page, 320, 180);
  await page.waitForTimeout(700);
  await snap(page, '13-editor-before-mode.png');

  // Mode field expected around y=160 (second field)
  for (const y of [120, 160, 200]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(600);
    await snap(page, `14-mode-picker-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
});

test('probe: Timers — scroll editor to check hidden fields', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);

  await openTimer1CtxMenu(page);
  await touchBitmap(page, 320, 180);
  await page.waitForTimeout(700);
  await snap(page, '15-editor-before-scroll.png');

  // Swipe up to reveal scrolled fields
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
    await page.waitForTimeout(600);
  }
  await snap(page, '16-editor-after-scroll.png');

  for (const y of [80, 120, 160, 200, 240, 280, 320, 360]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(600);
    await snap(page, `17-scrolled-x600-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
});
