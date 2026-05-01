/**
 * Probe: Vars Name field — final attempt
 * Previous attempts (all no response): tap(400,110), tap(600,110), tap(600,95),
 *   touch(780,110), touch(620,110), touch(610,110), touch(600,90-100)
 * Hypothesis: pencil icon is at bitmap x≈740-760, y≈100-115.
 * Also test: double-tap on the Name row (row-tap-tap pattern like Ethos lists).
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToVars } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function openVarEditor(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
}

// Pencil icon at bitmap x=740-760 (just left of scrollbar zone x≈780+)
test('vars: Name pencil touch at (740, 110)', async ({ page }) => {
  await openVarEditor(page);
  await touchBitmap(page, 740, 110);
  await page.waitForTimeout(600);
  await snap(page, 'vfn-touch-740-110.png');
});

test('vars: Name pencil touch at (755, 110)', async ({ page }) => {
  await openVarEditor(page);
  await touchBitmap(page, 755, 110);
  await page.waitForTimeout(600);
  await snap(page, 'vfn-touch-755-110.png');
});

test('vars: Name pencil touch at (760, 100)', async ({ page }) => {
  await openVarEditor(page);
  await touchBitmap(page, 760, 100);
  await page.waitForTimeout(600);
  await snap(page, 'vfn-touch-760-100.png');
});

// Double-tap the Name row (tap to highlight, tap again to confirm/open)
test('vars: Name double-tap (400, 110)', async ({ page }) => {
  await openVarEditor(page);
  await tapBitmap(page, 400, 110);
  await page.waitForTimeout(200);
  await tapBitmap(page, 400, 110);
  await page.waitForTimeout(600);
  await snap(page, 'vfn-doubletap-400-110.png');
});
