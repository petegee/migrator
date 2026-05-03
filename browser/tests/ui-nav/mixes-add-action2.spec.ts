/**
 * Probe: Mixes editor — "+ Add a new action" follow-up
 *
 * Prior probe (mixes-add-action):
 * - tap/touch at y=430 → opened "Always on Weight" action row editor
 * - 5 wheels + Enter → "Action" context menu (Edit/Clone/Add/Delete)
 *
 * Now testing:
 * 1. Tap at y=450/460/470 to directly hit "+ Add a new action"
 * 2. 6 wheels + Enter (one past the action row to reach the button)
 * 3. Context menu "Add" position (from the 5-wheel path)
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToMixes, cdpEnterKey } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function openMixEditor(page: any) {
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(500);
  await touchBitmap(page, 320, 141);
  await page.waitForTimeout(700);
}

async function wheelAt(page: any, n: number) {
  const centre = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return { x: 400, y: 300 };
    const r = c.getBoundingClientRect();
    return { x: r.x + 400 * (r.width / 800), y: r.y + 300 * (r.height / 480) };
  });
  const client = await (page.context() as any).newCDPSession(page);
  for (let i = 0; i < n; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: centre.x, y: centre.y,
      deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse',
    });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
}

test('probe: tap y=450 directly on + Add a new action', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openMixEditor(page);
  await snap(page, 'mixes-add-action2-01-before.png');
  await tapBitmap(page, 350, 450);
  await page.waitForTimeout(600);
  await snap(page, 'mixes-add-action2-02-tap-450.png');
});

test('probe: tap y=460 directly on + Add a new action', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openMixEditor(page);
  await tapBitmap(page, 350, 460);
  await page.waitForTimeout(600);
  await snap(page, 'mixes-add-action2-03-tap-460.png');
});

test('probe: 6 wheels + Enter (one past Always on Weight)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openMixEditor(page);
  await wheelAt(page, 6);
  await snap(page, 'mixes-add-action2-04-after-6-wheels.png');
  await cdpEnterKey(page);
  await snap(page, 'mixes-add-action2-05-after-enter.png');
});

test('probe: action ctx menu Add item (5 wheels + Enter then tap Add)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openMixEditor(page);
  await wheelAt(page, 5);
  await cdpEnterKey(page);  // opens Edit/Clone/Add/Delete popup
  await page.waitForTimeout(400);
  await snap(page, 'mixes-add-action2-06-ctx-menu.png');
  await tapBitmap(page, 320, 230);   // "Add" is approx y=230 in popup
  await page.waitForTimeout(600);
  await snap(page, 'mixes-add-action2-07-after-ctx-add.png');
});
