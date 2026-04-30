/**
 * Investigation: Vars screen → Var Name field
 *
 * Repurposed: ETHOS Vars are a value store (not GVar-style with source/weight).
 * Baseline: 1 Var with default name "---".
 * Change:   set Name to "TEST" via virtual keyboard.
 *
 * Findings saved to:
 *   findings/diffs/03-vars-name.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToVars, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: Var name "---" → "TEST"', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // --- set up: add one Var via big centered "+" (editor opens automatically) ---
  await navigateToVars(page);
  await tapBitmap(page, 400, 266); // big centered "+" on empty Vars screen
  await page.waitForTimeout(1000); // Var editor auto-opens; wait for it
  await goBack(page);              // save, return to Vars list
  await page.waitForTimeout(300);

  // --- baseline: 1 Var, Name = "---" (empty) ---
  const baseline = await downloadModelBin(page);
  saveBin('03-vars-name-baseline', baseline);

  // --- open Var1 editor via context menu ---
  // After navigateToVars the Var1 row is already selected (orange), so ONE tap
  // at x=200 (Name column) opens the context menu directly.
  await navigateToVars(page);
  await tapBitmap(page, 200, 116); // tap Name-column of Var1 row → context menu
  await page.waitForTimeout(400);

  const ctxMenu = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('var-context-menu', { body: ctxMenu, contentType: 'image/png' });

  // "Edit" is the first item below the title; canvas y≈122-157, bitmap y=167
  await tapBitmap(page, 320, 167); // "Edit"
  await page.waitForTimeout(400);

  const varEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('var-editor', { body: varEditor, contentType: 'image/png' });

  // --- tap Name field edit icon (≡) to open keyboard ---
  // Name row: canvas y≈111 → bitmap y=139; ≡ icon at far right: canvas x≈590 → bitmap x=738
  await tapBitmap(page, 738, 139);
  await page.waitForTimeout(600);

  const keyboard = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('var-name-keyboard', { body: keyboard, contentType: 'image/png' });

  // Type "TEST"
  // Var editor shows Value + Name + Comment label + Comment input above keyboard,
  // pushing keyboard rows ~50px lower than in the Edit model screen.
  // Row 1 QWERTYUIOP y=310: T=360, E=200
  // Row 2 ASDFGHJKL  y=360: S=160
  // Row 4 ENTER      y=455
  await tapBitmap(page, 360, 310); // T
  await page.waitForTimeout(100);
  await tapBitmap(page, 200, 310); // E
  await page.waitForTimeout(100);
  await tapBitmap(page, 160, 360); // S
  await page.waitForTimeout(100);
  await tapBitmap(page, 360, 310); // T
  await page.waitForTimeout(100);
  await tapBitmap(page, 700, 455); // ENTER
  await page.waitForTimeout(400);

  const afterChange = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-name-change', { body: afterChange, contentType: 'image/png' });

  await goBack(page); // exit Var editor (auto-saves)
  await page.waitForTimeout(300);

  // --- download and diff ---
  const changed = await downloadModelBin(page);
  saveBin('03-vars-name', changed);

  const record = saveDiff('03-vars-name', 'Var name: "---" → "TEST"', baseline, changed);
  logDiff(record);
});
