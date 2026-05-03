/**
 * Probe: Mixes context menu Delete — confirm y=340
 *
 * y=325 missed the popup bottom edge. Try y=340 (and y=350 as backup).
 * Expect: confirm dialog appears, OR mix is removed from list.
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

async function setupOneMix(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(500);
  await touchBitmap(page, 320, 141); // First position → editor opens
  await page.waitForTimeout(700);
  await tapBitmap(page, 25, 25);     // back to list; row stays selected
  await page.waitForTimeout(400);
}

async function openContextMenu(page: any) {
  await tapBitmap(page, 200, 116);   // 1 tap on pre-selected row → context menu
  await page.waitForTimeout(400);
}

test('probe: Delete y=340 — touchBitmap', async ({ page }) => {
  await setupOneMix(page);
  await openContextMenu(page);
  await snap(page, 'mixes-del-01-menu-open.png');
  await touchBitmap(page, 350, 340);
  await page.waitForTimeout(800);
  await snap(page, 'mixes-del-02-after-y340.png');
});

test('probe: Delete y=350 — touchBitmap (backup)', async ({ page }) => {
  await setupOneMix(page);
  await openContextMenu(page);
  await snap(page, 'mixes-del-03-menu-open.png');
  await touchBitmap(page, 350, 350);
  await page.waitForTimeout(800);
  await snap(page, 'mixes-del-04-after-y350.png');
});
