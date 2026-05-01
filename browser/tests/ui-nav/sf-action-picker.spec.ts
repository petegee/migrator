/**
 * Probe: Special Functions action picker — read all picker item y-coords
 *
 * Prereqs: sf-layout confirmed
 *   + button: (400, 266)
 *   Action field: (600, 100)
 *
 * Goal:
 * 1. Open Action picker and capture the list with all visible items
 * 2. Tap each item to confirm its y-coord and see which action it selects
 * 3. Capture the resulting editor for each action type to see action-specific fields
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToSpecialFunctions } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function openSFEditor(page: import('@playwright/test').Page): Promise<void> {
  await navigateToSpecialFunctions(page);
  await tapBitmap(page, 400, 266); // confirmed centred + button
  await page.waitForTimeout(600);
}

test('probe: SF action picker — capture picker list and tap each item', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openSFEditor(page);

  await snap(page, 'sfap-01-editor.png');

  // Open action picker: confirmed at (600, 100)
  await tapBitmap(page, 600, 100);
  await page.waitForTimeout(500);

  await snap(page, 'sfap-02-picker-open.png');

  // Tap each visible item. From picker screenshot, items start at ~y=100 bitmap,
  // spaced ~40px each: Reset(~130), Screenshot(~170), Set failsafe(~210),
  // Play audio(~250), Haptic(~290). Each tap closes picker; reopen to try next.
  const items = [
    { label: 'Reset',        y: 130 },
    { label: 'Screenshot',   y: 170 },
    { label: 'Set-failsafe', y: 210 },
    { label: 'Play-audio',   y: 250 },
    { label: 'Haptic',       y: 290 },
  ];

  for (const item of items) {
    // Reopen picker
    await tapBitmap(page, 600, 100);
    await page.waitForTimeout(400);
    await snap(page, `sfap-03-picker-before-${item.label}.png`);

    // Tap the item
    await tapBitmap(page, 350, item.y);
    await page.waitForTimeout(400);
    await snap(page, `sfap-04-after-select-${item.label}.png`);
  }
});

test('probe: SF action picker — scroll to see remaining action types', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openSFEditor(page);

  // Open picker
  await tapBitmap(page, 600, 100);
  await page.waitForTimeout(500);

  await snap(page, 'sfap-05-picker-before-scroll.png');

  // Scroll picker using swipeCanvas helper equivalent: touch drag inside picker
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    // Convert bitmap (350, 280→120) to page coords
    const x = box.x + (350 / 800) * box.width;
    const y1 = box.y + (280 / 480) * box.height;
    const y2 = box.y + (120 / 480) * box.height;
    await page.touchscreen.tap(x, y1);
    await page.waitForTimeout(100);
    // Use mouse drag as scroll (may not work for touch-only scroll)
    await page.mouse.move(x, y1);
    await page.mouse.down();
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(x, y1 + (y2 - y1) * (i + 1) / 10);
      await page.waitForTimeout(20);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  await snap(page, 'sfap-06-picker-after-scroll.png');
});
