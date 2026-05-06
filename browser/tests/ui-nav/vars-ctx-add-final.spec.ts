/**
 * Probe: Vars ctx menu — definitively identify the "Add" item y-coordinate.
 *
 * Known from prior probes:
 *   y=231 → Clone: creates Var2 (shows "< Var2" in editor) ✓
 *   y=187 → something: shows "< Var1" editor (existing var or new var with same title?)
 *   y=155 → Edit (model settings page) — but ctx5 state was corrupted, needs recheck
 *
 * Strategy: fresh boot per test, touch a single y, then EXPLICITLY navigate to Vars
 * list and screenshot it. Count vars:
 *   1 var  → existing var was edited or model settings opened (Edit or no-op)
 *   2 vars → new var was created (Add or Clone)
 *   0 vars → var was deleted (Delete)
 *
 * Sticky state trigger: tapBitmap(400,266) to create Var1, goBack to list,
 * then tapBitmap(350,140) to open context menu (0-prior-tap method, confirmed 2026-05-04).
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

async function setupWithOneVar(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  // Create Var1 (tap + on empty screen → editor opens → go back → sticky state)
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(500);
  await goBack(page);
  await page.waitForTimeout(400);
}

async function openCtxMenu(page: any) {
  // 0-prior-tap method (confirmed 2026-05-04): single tap on sticky row opens menu
  await tapBitmap(page, 350, 140);
  await page.waitForTimeout(500);
}

// After touching a ctx menu item, navigate EXPLICITLY to Vars list.
// We may be on: var editor, model settings, Vars list, or Model page.
// Go back twice to be safe, then navigate to Vars.
async function backToVarsList(page: any) {
  await goBack(page);
  await page.waitForTimeout(300);
  await navigateToVars(page);
  await page.waitForTimeout(400);
}

// ──────────────────────────────────────────────────────────────────────────────
// Test y=187 — what we labelled "Add" in prior probe but result was "< Var1"
// ──────────────────────────────────────────────────────────────────────────────
test('ctx-add-final: y=187 — count vars after touch', async ({ page }) => {
  await setupWithOneVar(page);
  await snap(page, 'cadd-01-list-before-y187');

  await openCtxMenu(page);
  await snap(page, 'cadd-02-menu-open-y187');

  await touchBitmap(page, 300, 187);
  await page.waitForTimeout(600);
  await snap(page, 'cadd-03-result-y187');

  await backToVarsList(page);
  await snap(page, 'cadd-04-list-after-y187');
});

// ──────────────────────────────────────────────────────────────────────────────
// Test y=195 — midpoint between visual Edit(~151) and Clone(~231)
// ──────────────────────────────────────────────────────────────────────────────
test('ctx-add-final: y=195 — count vars after touch', async ({ page }) => {
  await setupWithOneVar(page);
  await openCtxMenu(page);
  await snap(page, 'cadd-05-menu-open-y195');

  await touchBitmap(page, 300, 195);
  await page.waitForTimeout(600);
  await snap(page, 'cadd-06-result-y195');

  await backToVarsList(page);
  await snap(page, 'cadd-07-list-after-y195');
});

// ──────────────────────────────────────────────────────────────────────────────
// Test y=210 — further toward Clone boundary
// ──────────────────────────────────────────────────────────────────────────────
test('ctx-add-final: y=210 — count vars after touch', async ({ page }) => {
  await setupWithOneVar(page);
  await openCtxMenu(page);
  await snap(page, 'cadd-08-menu-open-y210');

  await touchBitmap(page, 300, 210);
  await page.waitForTimeout(600);
  await snap(page, 'cadd-09-result-y210');

  await backToVarsList(page);
  await snap(page, 'cadd-10-list-after-y210');
});

// ──────────────────────────────────────────────────────────────────────────────
// Recheck y=155 — confirm Edit opens model settings (not var editor)
// ──────────────────────────────────────────────────────────────────────────────
test('ctx-add-final: y=155 — recheck Edit item', async ({ page }) => {
  await setupWithOneVar(page);
  await openCtxMenu(page);
  await snap(page, 'cadd-11-menu-open-y155');

  await touchBitmap(page, 300, 155);
  await page.waitForTimeout(600);
  await snap(page, 'cadd-12-result-y155');

  await backToVarsList(page);
  await snap(page, 'cadd-13-list-after-y155');
});
