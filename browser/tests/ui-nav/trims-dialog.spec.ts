/**
 * Probe: Trims confirm dialog — pin Yes/No button coords
 * Estimated from screenshot: Yes ≈ (490, 235), No ≈ (555, 235)
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToTrims } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots/trims');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function openDialog(page: any) {
  await tapBitmap(page, 400, 400);
  await page.waitForTimeout(600);
}

test('probe: Trims dialog — sweep x at y=235 for Yes/No', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  // Sweep x=460..580 at y=235 to find Yes then No
  for (const x of [460, 490, 520, 555, 580]) {
    await openDialog(page);
    await snap(page, `50-dialog-before-tap-x${x}.png`);
    await tapBitmap(page, x, 235);
    await page.waitForTimeout(500);
    await snap(page, `51-dialog-after-tap-x${x}-y235.png`);
  }
});

test('probe: Trims dialog — try touchBitmap for Yes at x=490', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);

  await openDialog(page);
  await snap(page, '52-dialog-before-touch.png');
  await touchBitmap(page, 490, 235);
  await page.waitForTimeout(500);
  await snap(page, '53-dialog-after-touch-490-235.png');
});
