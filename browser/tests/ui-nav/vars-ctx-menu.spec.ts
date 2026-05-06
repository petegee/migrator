/**
 * Probe: Vars list row context menu
 *
 * Goal: confirm the two-tap pattern to open the context menu on an existing
 * Var row, then confirm each menu item's coordinates (Edit / Clone / Delete).
 * Also capture what happens with single tap (highlight) vs second tap (context menu).
 *
 * No assertions — just screenshots as evidence.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToVars, goBack } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const saveSnap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Vars ctx menu — two-tap to open', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  // Add Var1 so the list is non-empty
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);

  // Return to list
  await goBack(page);
  await page.waitForTimeout(400);

  const snap = async (label: string) => saveSnap(page, label);

  await snap('01-vars-list');

  // First tap — should highlight Var1 row
  await tapBitmap(page, 200, 106);
  await page.waitForTimeout(400);
  await snap('02-after-first-tap-highlight');

  // Second tap — should open context menu
  await tapBitmap(page, 200, 106);
  await page.waitForTimeout(400);
  await snap('03-after-second-tap-ctx-menu');

  // Also try touch instead of tap for second tap in case tap missed
  // (dismissed popup first — tap neutral area)
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(300);

  await tapBitmap(page, 200, 106);   // highlight
  await page.waitForTimeout(300);
  await touchBitmap(page, 200, 106); // second interaction: touch
  await page.waitForTimeout(400);
  await snap('04-after-touch-second-tap-ctx-menu');
});

test('probe: Vars ctx menu — item coordinates', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  // Add Var1
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await goBack(page);
  await page.waitForTimeout(400);

  const snap = async (label: string) => saveSnap(page, label);

  // Helper: open context menu on Var1 row
  const openCtxMenu = async () => {
    await tapBitmap(page, 200, 106);
    await page.waitForTimeout(300);
    await tapBitmap(page, 200, 106);
    await page.waitForTimeout(400);
  };

  // ── Try Edit ──────────────────────────────────────────────────────────────
  await openCtxMenu();
  await snap('05-ctx-menu-open-for-edit');

  // Expected Edit item at y≈140 (same spacing pattern as Mixes context menu)
  await tapBitmap(page, 350, 140);
  await page.waitForTimeout(500);
  await snap('06-after-tap-edit-y140');

  await goBack(page);
  await page.waitForTimeout(300);

  // ── Try Clone ─────────────────────────────────────────────────────────────
  await openCtxMenu();
  await snap('07-ctx-menu-open-for-clone');

  await tapBitmap(page, 350, 187);
  await page.waitForTimeout(500);
  await snap('08-after-tap-clone-y187');

  await tapBitmap(page, 400, 50); // dismiss any popup
  await page.waitForTimeout(300);

  // ── Try Delete ────────────────────────────────────────────────────────────
  // Re-add a var if clone ate it or we ended up in editor
  await navigateToVars(page);
  await page.waitForTimeout(300);

  await snap('09-vars-list-before-delete');

  await openCtxMenu();
  await snap('10-ctx-menu-open-for-delete');

  // Delete expected at y≈233 or y≈279 depending on how many items
  await tapBitmap(page, 350, 233);
  await page.waitForTimeout(400);
  await snap('11-after-tap-delete-y233');

  // If confirm dialog appeared, capture it
  await snap('12-confirm-dialog');

  // Confirm "Yes" — expected at (520, 288) per skills file estimate
  await tapBitmap(page, 520, 288);
  await page.waitForTimeout(400);
  await snap('13-after-confirm-yes');
});
