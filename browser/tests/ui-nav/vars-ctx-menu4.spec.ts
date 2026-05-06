/**
 * Probe: Vars ctx menu — confirm item selection with touchBitmap
 *
 * Known working trigger (sticky state):
 *   tapBitmap(200,106) × 2  →  tapBitmap(350,140)  →  menu opens
 *
 * Menu items from screenshot (bitmap y estimates):
 *   Edit   ≈ y=140
 *   Add    ≈ y=187
 *   Clone  ≈ y=231
 *   Delete ≈ y=275
 *
 * Goal:
 * 1. Confirm touchBitmap selects Edit (opens editor)
 * 2. Confirm touchBitmap selects Add (opens new var editor)
 * 3. Confirm touchBitmap selects Clone (duplicates var)
 * 4. Confirm touchBitmap selects Delete (confirm dialog appears)
 * 5. Also try minimum trigger: 1 tap at (200,106) then tap at (350,140)
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToVars, goBack } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name + '.png'), buf);
}
const snap = async (page: any, label: string) =>
  save(label, await page.locator('canvas').first().screenshot({ type: 'png' }));

// Open Var editor and return to list (ensures sticky state)
async function ensureStickyState(page: any) {
  await tapBitmap(page, 400, 266); // open editor (add new or re-open via + on empty)
  await page.waitForTimeout(500);
  await goBack(page);              // return — row now sticky
  await page.waitForTimeout(400);
}

// Open context menu using confirmed 3-tap sequence
async function openCtxMenu(page: any) {
  await tapBitmap(page, 200, 106);
  await page.waitForTimeout(300);
  await tapBitmap(page, 200, 106);
  await page.waitForTimeout(400);
  await tapBitmap(page, 350, 140);
  await page.waitForTimeout(500);
}

test('probe: ctx menu Edit — touchBitmap to select', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await ensureStickyState(page);

  await openCtxMenu(page);
  await snap(page, 'ctx4-01-menu-open');

  // Try touchBitmap on Edit at various y values
  await touchBitmap(page, 300, 140);
  await page.waitForTimeout(600);
  await snap(page, 'ctx4-02-after-touch-edit-y140');
});

test('probe: ctx menu Add — touchBitmap', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await ensureStickyState(page);

  await openCtxMenu(page);
  await snap(page, 'ctx4-03-menu-for-add');

  await touchBitmap(page, 300, 187);
  await page.waitForTimeout(600);
  await snap(page, 'ctx4-04-after-touch-add-y187');
});

test('probe: ctx menu Clone — touchBitmap', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await ensureStickyState(page);

  await openCtxMenu(page);
  await snap(page, 'ctx4-05-menu-for-clone');

  await touchBitmap(page, 300, 231);
  await page.waitForTimeout(600);
  await snap(page, 'ctx4-06-after-touch-clone-y231');
});

test('probe: ctx menu Delete — touchBitmap', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await ensureStickyState(page);

  await openCtxMenu(page);
  await snap(page, 'ctx4-07-menu-for-delete');

  await touchBitmap(page, 300, 275);
  await page.waitForTimeout(600);
  await snap(page, 'ctx4-08-after-touch-delete-y275');

  // Confirm dialog expected — check Yes/No coords
  await snap(page, 'ctx4-09-confirm-dialog');
  // Try Yes at (520, 288)
  await tapBitmap(page, 520, 288);
  await page.waitForTimeout(400);
  await snap(page, 'ctx4-10-after-confirm-yes');
});

test('probe: ctx menu — minimum trigger (1 prior tap)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await ensureStickyState(page);

  await snap(page, 'ctx4-11-before-min-trigger');

  // Try just 1 tap at (200,106) then (350,140)
  await tapBitmap(page, 200, 106);
  await page.waitForTimeout(300);
  await tapBitmap(page, 350, 140);
  await page.waitForTimeout(500);
  await snap(page, 'ctx4-12-after-1prior-tap');

  // Dismiss
  await goBack(page);
  await page.waitForTimeout(300);
  await navigateToVars(page);
  await page.waitForTimeout(300);

  // Also try: 0 prior taps, just tap (350,140) directly
  await snap(page, 'ctx4-13-before-zero-prior');
  await tapBitmap(page, 350, 140);
  await page.waitForTimeout(500);
  await snap(page, 'ctx4-14-after-0prior-tap-350-140');
});
