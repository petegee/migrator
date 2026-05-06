/**
 * Probe: Timers — editor field sweep with confirmed Edit coord (touchBitmap y=190)
 *
 * Context menu "Edit" item confirmed at touchBitmap(320, 190).
 * This probe sweeps all editor fields, captures Mode picker, and scrolls to hidden fields.
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

async function openTimer1Editor(page: any) {
  await tapBitmap(page, 400, 116);   // highlight Timer1
  await page.waitForTimeout(400);
  await tapBitmap(page, 400, 116);   // open context menu
  await page.waitForTimeout(400);
  await touchBitmap(page, 320, 190); // tap "Edit"
  await page.waitForTimeout(600);
}

async function cdpSwipeUp(page: any) {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) return;
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

test('probe: Timer edit — field sweep unscrolled', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);
  await openTimer1Editor(page);
  await snap(page, '20-timer-edit-unscrolled.png');

  // Fields visible without scroll: Value(~78), Name(~129), Mode(~180), Alarm(~231),
  // Start condition(~281), Stop condition(~334)
  for (const y of [78, 120, 160, 200, 240, 280, 320, 360, 400, 440]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(600);
    await snap(page, `21-tap-x600-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }
});

test('probe: Timer edit — Name field (touch vs tap)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);
  await openTimer1Editor(page);

  // Name has a pencil icon — likely needs touchBitmap like FM name
  await touchBitmap(page, 780, 129);
  await page.waitForTimeout(600);
  await snap(page, '22-name-touch-pencil.png');
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);

  // Also try tap on the row itself
  await tapBitmap(page, 600, 129);
  await page.waitForTimeout(600);
  await snap(page, '22-name-tap-row.png');
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
});

test('probe: Timer edit — Mode picker', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);
  await openTimer1Editor(page);

  await tapBitmap(page, 600, 180);
  await page.waitForTimeout(600);
  await snap(page, '23-mode-picker.png');
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
});

test('probe: Timer edit — Alarm field', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);
  await openTimer1Editor(page);

  await tapBitmap(page, 600, 231);
  await page.waitForTimeout(600);
  await snap(page, '24-alarm-tap.png');
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
});

test('probe: Timer edit — scroll and sweep hidden fields', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTimers(page);
  await openTimer1Editor(page);
  await snap(page, '25-before-scroll.png');

  await cdpSwipeUp(page);
  await snap(page, '26-after-scroll-1.png');

  for (const y of [80, 120, 160, 200, 240, 280, 320, 360, 400]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(600);
    await snap(page, `27-scrolled1-x600-y${y}.png`);
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  }

  // Second scroll to check if more fields exist
  await cdpSwipeUp(page);
  await snap(page, '28-after-scroll-2.png');
});
