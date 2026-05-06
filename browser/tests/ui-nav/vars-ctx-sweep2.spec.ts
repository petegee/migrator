/**
 * Probe: Vars ctx menu — sweep remaining unknowns.
 *
 * From cadd probe (clean sticky-state data):
 *   y=155 → miss (menu still open)
 *   y=187-210 → var field editor, 1 var in list = "Edit" item
 *   y=231 → Clone (creates Var2) — confirmed earlier
 *
 * Still unknown:
 *   - Where is "Add" (should create NEW var, count 1→2 without cloning)?
 *   - Where is "Delete" (count 1→0)?
 *   - Is there a gap between Edit (≤210) and Clone (≥231)?
 *
 * Strategy: fresh boot per test, sticky state, touch one y, then navigate
 * explicitly to Vars list and count vars.
 *   0 vars → Delete
 *   1 var  → Edit (existing var opened) or miss
 *   2 vars → Add or Clone (new var created)
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
  await tapBitmap(page, 400, 266);   // create Var1 via + on empty screen
  await page.waitForTimeout(500);
  await goBack(page);                 // back to list — sticky state
  await page.waitForTimeout(400);
}

async function openCtxMenu(page: any) {
  await tapBitmap(page, 350, 140);   // 0-prior-tap sticky trigger
  await page.waitForTimeout(500);
}

async function toVarsList(page: any) {
  // Navigate explicitly back to Vars list regardless of current screen
  await goBack(page);
  await page.waitForTimeout(300);
  await navigateToVars(page);
  await page.waitForTimeout(400);
}

// Gap between Edit (≤210) and Clone (≥231) — test y=215, 220, 225
test('sweep2: y=215', async ({ page }) => {
  await setupWithOneVar(page);
  await openCtxMenu(page);
  await snap(page, 'sw2-01-menu-y215');
  await touchBitmap(page, 300, 215);
  await page.waitForTimeout(600);
  await snap(page, 'sw2-02-result-y215');
  await toVarsList(page);
  await snap(page, 'sw2-03-list-y215');
});

test('sweep2: y=220', async ({ page }) => {
  await setupWithOneVar(page);
  await openCtxMenu(page);
  await touchBitmap(page, 300, 220);
  await page.waitForTimeout(600);
  await snap(page, 'sw2-04-result-y220');
  await toVarsList(page);
  await snap(page, 'sw2-05-list-y220');
});

test('sweep2: y=225', async ({ page }) => {
  await setupWithOneVar(page);
  await openCtxMenu(page);
  await touchBitmap(page, 300, 225);
  await page.waitForTimeout(600);
  await snap(page, 'sw2-06-result-y225');
  await toVarsList(page);
  await snap(page, 'sw2-07-list-y225');
});

// Delete zone — test y=260, 270, 280, 290
test('sweep2: y=260', async ({ page }) => {
  await setupWithOneVar(page);
  await openCtxMenu(page);
  await touchBitmap(page, 300, 260);
  await page.waitForTimeout(600);
  await snap(page, 'sw2-08-result-y260');
  await toVarsList(page);
  await snap(page, 'sw2-09-list-y260');
});

test('sweep2: y=270', async ({ page }) => {
  await setupWithOneVar(page);
  await openCtxMenu(page);
  await touchBitmap(page, 300, 270);
  await page.waitForTimeout(600);
  await snap(page, 'sw2-10-result-y270');
  await toVarsList(page);
  await snap(page, 'sw2-11-list-y270');
});

test('sweep2: y=280', async ({ page }) => {
  await setupWithOneVar(page);
  await openCtxMenu(page);
  await touchBitmap(page, 300, 280);
  await page.waitForTimeout(600);
  await snap(page, 'sw2-12-result-y280');
  await toVarsList(page);
  await snap(page, 'sw2-13-list-y280');
});

// Also recheck y=165, 170, 175 — these supposedly hit Delete in prior probes
// but those probes had state issues
test('sweep2: y=165', async ({ page }) => {
  await setupWithOneVar(page);
  await openCtxMenu(page);
  await snap(page, 'sw2-14-menu-y165');
  await touchBitmap(page, 300, 165);
  await page.waitForTimeout(600);
  await snap(page, 'sw2-15-result-y165');
  await toVarsList(page);
  await snap(page, 'sw2-16-list-y165');
});

test('sweep2: y=175', async ({ page }) => {
  await setupWithOneVar(page);
  await openCtxMenu(page);
  await touchBitmap(page, 300, 175);
  await page.waitForTimeout(600);
  await snap(page, 'sw2-17-result-y175');
  await toVarsList(page);
  await snap(page, 'sw2-18-list-y175');
});
