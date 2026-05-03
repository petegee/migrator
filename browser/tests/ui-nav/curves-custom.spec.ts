/**
 * Probe: Curves — Custom type editor field sweep (corrected y=320 for Custom)
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToCurves } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Curves Custom — select and field sweep', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToCurves(page);

  // Add curve
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  // Open Type picker
  await tapBitmap(page, 600, 140);
  await page.waitForTimeout(500);
  await snap(page, 'cust-01-picker-open.png');

  // Select Custom (y=320, confirmed from precision test)
  await tapBitmap(page, 320, 320);
  await page.waitForTimeout(600);
  await snap(page, 'cust-02-custom-selected.png');

  // Sweep x=600 across all field rows
  for (const y of [80, 140, 180, 220, 260, 300, 340, 380, 420]) {
    await tapBitmap(page, 600, y);
    await page.waitForTimeout(500);
    await snap(page, `cust-03-tap-y${y}.png`);
  }
});
