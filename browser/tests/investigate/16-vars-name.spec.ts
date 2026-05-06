/**
 * Investigation: Vars screen → Var Name field
 *
 * Re-run of spec 03 with two fixes:
 *  1. touchBitmap for all keyboard input (tapBitmap registers wrong key in WASM)
 *  2. Tap a different field after ENTER, then goBack ×2 before downloading
 *     (mirrors FM1 name save pattern — one goBack alone does not flush the name)
 *
 * Baseline: 1 Var with default name (empty / "---").
 * Change:   set Name to "TEST" via virtual keyboard.
 *
 * Keyboard row y-values for the Var editor context (from spec 03 probe screenshots):
 *   Row 1 (QWERTYUIOP) y=310
 *   Row 2 (ASDFGHJKL)  y=360
 *   ENTER               y=455
 * x-positions: 80px spacing, A=40 → S=120, E=200, T=360
 *
 * Findings saved to:
 *   findings/diffs/16-vars-name.json
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToVars, goBack } from '../helpers/navigate';
import { downloadModelBin, saveBin, saveDiff, logDiff } from '../helpers/diff';

test('investigate: Var name empty → "TEST"', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add one Var; editor auto-opens, exit it immediately to get a clean baseline
  await navigateToVars(page);
  await tapBitmap(page, 400, 266); // big centered "+" on empty Vars screen
  await page.waitForTimeout(1000);
  await goBack(page);
  await page.waitForTimeout(300);

  // Baseline: 1 Var, name = empty ("---")
  const baseline = await downloadModelBin(page);
  saveBin('16-vars-name-baseline', baseline);

  // Open Var1 editor via context menu.
  // After navigateToVars the Var1 row is already selected (orange), so ONE tap opens the
  // context menu directly (no double-tap needed).
  await navigateToVars(page);
  await tapBitmap(page, 200, 116); // Var1 row → context menu
  await page.waitForTimeout(400);

  const ctxMenu = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('var-context-menu', { body: ctxMenu, contentType: 'image/png' });

  await tapBitmap(page, 320, 167); // "Edit"
  await page.waitForTimeout(400);

  const varEditor = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('var-editor', { body: varEditor, contentType: 'image/png' });

  // Open Name keyboard via the edit icon (≡) at far right of Name row.
  // touchBitmap required — same pattern as FM name pencil icon.
  await touchBitmap(page, 738, 139);
  await page.waitForTimeout(600);

  const keyboard = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('keyboard-open', { body: keyboard, contentType: 'image/png' });

  // Type "TEST" — all keys use touchBitmap (tapBitmap registers wrong key)
  await touchBitmap(page, 360, 310); // T  (Row 1)
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 310); // E  (Row 1)
  await page.waitForTimeout(150);
  await touchBitmap(page, 120, 360); // S  (Row 2, x=120 per 80px-spacing A=40 S=120)
  await page.waitForTimeout(150);
  await touchBitmap(page, 360, 310); // T  (Row 1)
  await page.waitForTimeout(150);
  await touchBitmap(page, 700, 455); // ENTER
  await page.waitForTimeout(600);

  const afterTyping = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-typing', { body: afterTyping, contentType: 'image/png' });

  // Tap Values[0] field to commit focus away from Name before exiting.
  // Without this the firmware does not flush the name to the binary.
  await tapBitmap(page, 738, 381);
  await page.waitForTimeout(300);

  // goBack ×2: Var editor → Vars list → Model Setup
  await goBack(page);
  await page.waitForTimeout(400);
  await goBack(page);
  await page.waitForTimeout(600);

  const changed = await downloadModelBin(page);
  saveBin('16-vars-name', changed);

  const record = saveDiff('16-vars-name', 'Var name: empty → "TEST"', baseline, changed);
  logDiff(record);
});
