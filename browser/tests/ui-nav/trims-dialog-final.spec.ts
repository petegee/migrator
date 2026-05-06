/**
 * Probe: Trims confirm dialog — exact button coords from pixel analysis
 * Yes: bitmap (471, 289), No: bitmap (559, 289)
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToTrims } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots/trims');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Trims dialog — tap No at (559, 289)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);
  await tapBitmap(page, 400, 400);
  await page.waitForTimeout(600);
  await snap(page, '70-dialog-open.png');
  await tapBitmap(page, 559, 289);
  await page.waitForTimeout(600);
  await snap(page, '71-after-no-559-289.png');
});

test('probe: Trims dialog — tap Yes at (471, 289)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);
  await tapBitmap(page, 400, 400);
  await page.waitForTimeout(600);
  await snap(page, '72-dialog-before-yes.png');
  await tapBitmap(page, 471, 289);
  await page.waitForTimeout(600);
  await snap(page, '73-after-yes-471-289.png');
});
