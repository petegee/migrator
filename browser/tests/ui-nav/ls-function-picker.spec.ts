/**
 * Probe: Logic Switch function picker
 *
 * Goal: Open the Function picker from the LS editor and read y-coords for
 * each of the 15 function types. Then confirm selection by choosing A>X.
 *
 * Functions: A~X · A=X · A>X · A<X · |A|>X · |A|<X · Δ>X · |Δ|>X ·
 *            Range · AND · OR · XOR · Timer gen · Sticky · Edge
 *
 * Prereq: ls-layout confirmed Function field at (600, 160), + at (400, 266).
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToLogicSwitches } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function openLSEditor(page: import('@playwright/test').Page): Promise<void> {
  await navigateToLogicSwitches(page);
  await tapBitmap(page, 400, 266); // confirmed centred + button
  await page.waitForTimeout(600);
}

test('probe: LS function picker — read all items and scroll', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openLSEditor(page);

  await snap(page, 'lsfp-01-editor.png');

  // Open function picker: confirmed at (600, 160)
  await tapBitmap(page, 600, 160);
  await page.waitForTimeout(500);

  await snap(page, 'lsfp-02-picker-open.png');

  // Tap each visible item to read its y-coord (items in the picker list)
  // From ls-layout we saw: A~X y≈130, A=X y≈170, A>X y≈210, A<X y≈250, |A|>X y≈290
  for (const y of [130, 170, 210, 250, 290, 330, 370, 410]) {
    await tapBitmap(page, 350, y);
    await page.waitForTimeout(400);
    await snap(page, `lsfp-03-item-y${y}.png`);
  }
});

test('probe: LS function picker — scroll down to see remaining items', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openLSEditor(page);

  // Open picker
  await tapBitmap(page, 600, 160);
  await page.waitForTimeout(500);

  await snap(page, 'lsfp-04-picker-before-scroll.png');

  // Scroll down in the picker to reveal items below |A|>X
  // Try swipe up (finger moves up = scroll content down)
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    const cx = box.x + box.width * 0.4;  // x=320 bx approx
    const startY = box.y + (350 / 480) * box.height;
    const endY = box.y + (150 / 480) * box.height;
    await page.touchscreen.tap(cx, startY);
    await page.mouse.move(cx, startY);
    await page.mouse.down();
    await page.mouse.move(cx, endY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  await snap(page, 'lsfp-05-picker-after-scroll.png');
});
