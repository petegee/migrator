/**
 * Probe: Distinguish Add / Clone / Delete in Vars ctx menu.
 *
 * Known: y=165-210 → Edit (opens existing var editor, 1 var count)
 *        y=215-310 → all seem to create Var2, but which item?
 *
 * Strategy: Set a COMMENT on Var1 ("AAAA") using the keyboard.
 * Then trigger ctx menu and touch different y values.
 * After each touch, check the result:
 *   - If 0 vars in list → Delete confirmed
 *   - If 2 vars AND new var editor Comment shows "AAAA" → Clone
 *   - If 2 vars AND new var editor Comment is empty → Add (fresh var)
 *
 * Comment field: (600, 267) with tapBitmap (from skills file).
 * Keyboard ENTER: touchBitmap(700, 450).
 * Keyboard Row 1 (QWERTYUIOP) y=315, x=40+(col*80). A=col1 in row2 (y=340, x=40).
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

// Create Var1, set its Comment to "A" so we can distinguish Clone from Add
async function setupWithNamedVar(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  // Open Var1 editor (tap + on empty screen)
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(500);

  // Open Comment keyboard (tapBitmap — confirmed works)
  await tapBitmap(page, 600, 267);
  await page.waitForTimeout(500);

  // Type 'A' — Row 2 (ASDFGHJKL), x=40 for A, y=340
  await touchBitmap(page, 40, 340);
  await page.waitForTimeout(300);

  // Confirm with Enter
  await touchBitmap(page, 700, 450);
  await page.waitForTimeout(400);

  // Go back to list — sticky state
  await goBack(page);
  await page.waitForTimeout(400);
}

async function openCtxMenu(page: any) {
  await tapBitmap(page, 350, 140);
  await page.waitForTimeout(500);
}

async function toVarsList(page: any) {
  await goBack(page);
  await page.waitForTimeout(300);
  await navigateToVars(page);
  await page.waitForTimeout(400);
}

// Test y=215 (first "new var" zone) — expect Add (blank comment)
test('distinguish: y=215 (Add?)', async ({ page }) => {
  await setupWithNamedVar(page);
  await snap(page, 'dist-00-var1-list');
  await openCtxMenu(page);
  await touchBitmap(page, 300, 215);
  await page.waitForTimeout(600);
  await snap(page, 'dist-01-result-y215');
  // If editor opened, scroll to Comment to check
  await toVarsList(page);
  await snap(page, 'dist-02-list-y215');
});

// Test y=250 (mid-point between Add visual center ~193 and Clone visual center ~238)
test('distinguish: y=250 (Clone?)', async ({ page }) => {
  await setupWithNamedVar(page);
  await openCtxMenu(page);
  await touchBitmap(page, 300, 250);
  await page.waitForTimeout(600);
  await snap(page, 'dist-03-result-y250');
  await toVarsList(page);
  await snap(page, 'dist-04-list-y250');
});

// Test y=285 (Delete visual center)
test('distinguish: y=285 (Delete?)', async ({ page }) => {
  await setupWithNamedVar(page);
  await openCtxMenu(page);
  await touchBitmap(page, 300, 285);
  await page.waitForTimeout(600);
  await snap(page, 'dist-05-result-y285');
  await toVarsList(page);
  await snap(page, 'dist-06-list-y285');
});

// Verify the named var setup worked — check Var1's comment in editor
test('verify: Var1 comment is set', async ({ page }) => {
  await setupWithNamedVar(page);
  // Open Var1 editor (sticky state)
  await tapBitmap(page, 350, 140);
  await page.waitForTimeout(500);
  await snap(page, 'dist-07-var1-editor-check');
});
