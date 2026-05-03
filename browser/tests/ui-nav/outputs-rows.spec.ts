/**
 * Probe: Outputs list — row 4 and page swipe
 *
 * Goal:
 * 1. Confirm CH7 (left col row 4) and CH8 (right col row 4) open editors
 * 2. Confirm swipe-left reaches page 2 (CH9–CH16)
 * 3. Confirm CH9/CH10 editors open on page 2
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, swipeCanvas, navigateToOutputs } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Outputs row 4 — CH7 (left col) y-sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToOutputs(page);

  // Sweep row 4 left column at x=200, trying several y values
  for (const y of [330, 350, 370, 390, 410]) {
    await tapBitmap(page, 200, y);
    await page.waitForTimeout(600);
    await snap(page, `outputs-row4-left-y${y}.png`);
    await tapBitmap(page, 25, 25); // back to list
    await page.waitForTimeout(400);
  }
});

test('probe: Outputs row 4 — CH8 (right col) y-sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToOutputs(page);

  // Sweep row 4 right column at x=600, trying several y values
  for (const y of [330, 350, 370, 390, 410]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(600);
    await snap(page, `outputs-row4-right-y${y}.png`);
    await tapBitmap(page, 25, 25); // back to list
    await page.waitForTimeout(400);
  }
});

test('probe: Outputs page 2 — swipe left and open CH9/CH10', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToOutputs(page);

  await snap(page, 'outputs-page1.png');

  // Swipe left to reveal page 2 (CH9–CH16)
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(600);
  await snap(page, 'outputs-page2.png');

  // Try opening CH9 (left col row 1 of page 2, same y as CH1)
  await tapBitmap(page, 200, 112);
  await page.waitForTimeout(600);
  await snap(page, 'outputs-page2-ch9-editor.png');
  await tapBitmap(page, 25, 25);
  await page.waitForTimeout(400);

  // Try opening CH10 (right col row 1 of page 2)
  await tapBitmap(page, 600, 140);
  await page.waitForTimeout(600);
  await snap(page, 'outputs-page2-ch10-editor.png');
  await tapBitmap(page, 25, 25);
  await page.waitForTimeout(400);

  // Swipe left again to page 3 (CH17+)
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(600);
  await snap(page, 'outputs-page3.png');
});
