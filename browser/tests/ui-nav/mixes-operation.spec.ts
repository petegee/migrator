/**
 * Probe: Mixes editor — Operation field and weight action edit
 * Operation center estimate y≈260 (based on 60px spacing: Name@80→ACtiveCond@140→Source@200)
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToMixes } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function openFreeMixEditor(page: any) {
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(500);
  await touchBitmap(page, 320, 186);  // Last position (touch for popup)
  await page.waitForTimeout(700);
}

test('probe: Operation field sweep y=245-275', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openFreeMixEditor(page);

  await snap(page, 'mixes5-01-editor.png');

  for (const y of [245, 255, 260, 265, 270, 275]) {
    await tapBitmap(page, 350, y);
    await page.waitForTimeout(500);
    await snap(page, `mixes5-02-op-tap-y${y}.png`);
  }
});

test('probe: Weight action Edit — open weight editor', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openFreeMixEditor(page);

  // Touch weight row to get Action popup
  await touchBitmap(page, 350, 390);
  await page.waitForTimeout(500);
  await snap(page, 'mixes5-03-weight-action-popup.png');

  // Touch Edit in the popup (estimate: popup header y≈90, Edit y≈140)
  await touchBitmap(page, 350, 140);
  await page.waitForTimeout(600);
  await snap(page, 'mixes5-04-weight-edit.png');
});
