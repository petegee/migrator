/**
 * Probe: Vars ctx menu — find the exact trigger
 *
 * From vars-ctx-menu probe we know:
 * - Row already highlighted on arrival from editor
 * - 2x tap at (200, 106) does NOT open ctx menu
 * - tap at (350, 140) DID open ctx menu (in one run, not others)
 *
 * Goal: sweep x across the row (y=106) to find which zone opens ctx menu vs editor.
 * Also try a fresh (unhighlighted) row vs already-highlighted row.
 * Also try touchBitmap instead of tapBitmap.
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

// Returns to Vars list with a fresh unhighlighted state by navigating away and back
async function resetToVarsList(page: any) {
  await navigateToVars(page);
  await page.waitForTimeout(300);
}

test('probe: ctx menu — x sweep at y=106 (single tap, already highlighted)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  // Add Var1, return to list — row will be highlighted on return
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(400);

  await snap(page, 'ctx2-01-list-start');

  // Sweep x from 50 to 450 in steps, single tap, record what happens
  for (const x of [50, 100, 150, 200, 250, 300, 350, 400, 450]) {
    await resetToVarsList(page);
    await page.waitForTimeout(200);

    // State: row is highlighted (selected) on arrival
    await tapBitmap(page, x, 106);
    await page.waitForTimeout(500);
    await snap(page, `ctx2-02-single-tap-x${x}-y106`);

    // Dismiss whatever opened (go back or tap neutral)
    await tapBitmap(page, 400, 300); // neutral area
    await page.waitForTimeout(200);
    await goBack(page);
    await page.waitForTimeout(300);
  }
});

test('probe: ctx menu — y sweep at x=350 (y=80 to y=180)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(400);

  // Try different y values at x=350 to find where ctx menu triggers
  for (const y of [80, 90, 100, 106, 120, 130, 140, 150, 160]) {
    await resetToVarsList(page);
    await page.waitForTimeout(200);

    await tapBitmap(page, 350, y);
    await page.waitForTimeout(500);
    await snap(page, `ctx2-03-tap-x350-y${y}`);

    await tapBitmap(page, 400, 300);
    await page.waitForTimeout(200);
    await goBack(page);
    await page.waitForTimeout(300);
  }
});

test('probe: ctx menu — touchBitmap vs tapBitmap on row', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(400);

  await snap(page, 'ctx2-04-before-touch');

  // Try touchBitmap on the row centre
  await touchBitmap(page, 350, 106);
  await page.waitForTimeout(500);
  await snap(page, 'ctx2-05-after-touch-350-106');

  await tapBitmap(page, 400, 300);
  await page.waitForTimeout(200);

  await resetToVarsList(page);
  await page.waitForTimeout(200);

  // Try touchBitmap at y=140
  await touchBitmap(page, 350, 140);
  await page.waitForTimeout(500);
  await snap(page, 'ctx2-06-after-touch-350-140');
});
