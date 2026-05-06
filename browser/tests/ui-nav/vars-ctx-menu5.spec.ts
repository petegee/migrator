/**
 * Probe: Vars ctx menu — find Edit, Add, Delete exact y-coords
 *
 * Strategy: after each touchBitmap on menu item, go back to list and count vars.
 * - 1 var = Edit was triggered (editor for existing var)
 * - 2 vars = Add or Clone (created a new var)
 * - confirm dialog = Delete
 *
 * Trigger: tapBitmap(350, 140) in sticky state (0 prior taps needed).
 *
 * From prior probes:
 * - y=187 → editor opened (Edit or Add?)
 * - y=231 → Clone (Var2 created) ✓
 * - y=275 → also Clone (within Clone touch area)
 * - Delete not found yet
 *
 * Try: y=155,165,175 to isolate Edit.
 * Try: y=245,255,265 for between-Clone and Delete.
 * Try: y=285,300,315 to find Delete (confirm dialog).
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

async function ensureStickyState(page: any) {
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(400);
}

async function openMenu(page: any) {
  await tapBitmap(page, 350, 140);
  await page.waitForTimeout(500);
}

test('probe: ctx menu item sweep — y=155 to y=185 (Edit zone)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await ensureStickyState(page);

  for (const y of [155, 165, 175, 185]) {
    // Re-enter sticky state each iteration
    await openMenu(page);
    await snap(page, `ctx5-edit-menu-y${y}`);

    await touchBitmap(page, 300, y);
    await page.waitForTimeout(500);
    await snap(page, `ctx5-edit-result-y${y}`);

    // Go back to list to count vars
    await goBack(page);
    await page.waitForTimeout(300);
    await snap(page, `ctx5-edit-list-after-y${y}`);

    // Navigate away and back to reset sticky state
    await navigateToVars(page);
    await page.waitForTimeout(300);
  }
});

test('probe: ctx menu item sweep — y=245 to y=325 (Delete zone)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await ensureStickyState(page);

  for (const y of [245, 265, 285, 300, 315, 325]) {
    await openMenu(page);
    await snap(page, `ctx5-del-menu-y${y}`);

    await touchBitmap(page, 300, y);
    await page.waitForTimeout(500);
    await snap(page, `ctx5-del-result-y${y}`);

    // Dismiss confirm dialog (if present) or go back
    await tapBitmap(page, 400, 50);  // tap header area to dismiss
    await page.waitForTimeout(200);
    await goBack(page);
    await page.waitForTimeout(300);
    await snap(page, `ctx5-del-list-after-y${y}`);

    await navigateToVars(page);
    await page.waitForTimeout(300);
  }
});
