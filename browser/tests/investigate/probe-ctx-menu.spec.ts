/**
 * Diagnostic probe: step-by-step screenshots for Vars / Mixes / FM context-menu
 * navigation, to identify where the two-tap "Edit" flow breaks down.
 *
 * Saved to: findings/screenshots/ctx-*
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import {
  tapBitmap,
  navigateToVars,
  navigateToMixes,
  navigateToFlightModes,
  goBack,
} from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

// ─────────────────────────────────────────────────────────────────────────────
// VARS: step-by-step context menu navigation
// ─────────────────────────────────────────────────────────────────────────────
test('probe: vars context-menu steps', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add one Var (editor auto-opens)
  await navigateToVars(page);
  await tapBitmap(page, 400, 266); // big centred "+"
  await page.waitForTimeout(1000);
  await goBack(page);             // returns to Vars list, Var1 selected
  await page.waitForTimeout(300);

  // Capture state just after goBack (before any navigation away)
  await snap(page, 'ctx-vars-01-after-goback.png');

  // Navigate away and back (as the real spec does, after downloadModelBin)
  await navigateToVars(page);
  await page.waitForTimeout(300);
  await snap(page, 'ctx-vars-02-after-navigate.png');  // is row selected?

  // Header tap to deselect (as used in spec 03)
  await tapBitmap(page, 200, 58);
  await page.waitForTimeout(200);
  await snap(page, 'ctx-vars-03-after-header-tap.png');

  // Tap 1 on row
  await tapBitmap(page, 300, 113);
  await page.waitForTimeout(300);
  await snap(page, 'ctx-vars-04-after-tap1.png');  // row selected, no menu?

  // Tap 2 on row
  await tapBitmap(page, 300, 113);
  await page.waitForTimeout(400);
  await snap(page, 'ctx-vars-05-after-tap2.png');  // context menu?

  // Tap "Edit" at the position used in spec 03
  await tapBitmap(page, 384, 196);
  await page.waitForTimeout(400);
  await snap(page, 'ctx-vars-06-after-edit-tap.png');  // editor opened?

  // Also try tapping Name ≡ icon (spec 03 uses 738, 139)
  await tapBitmap(page, 738, 139);
  await page.waitForTimeout(600);
  await snap(page, 'ctx-vars-07-name-keyboard.png');  // keyboard?
});

// ─────────────────────────────────────────────────────────────────────────────
// MIXES: step-by-step context menu navigation
// ─────────────────────────────────────────────────────────────────────────────
test('probe: mixes context-menu steps', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add a Free mix
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);   // "+"
  await page.waitForTimeout(400);
  await tapBitmap(page, 100, 101);  // "Free mix"
  await page.waitForTimeout(400);
  await tapBitmap(page, 396, 186);  // "Last position" → editor opens
  await page.waitForTimeout(600);
  await goBack(page);
  await page.waitForTimeout(300);
  await snap(page, 'ctx-mixes-01-after-goback.png');

  // Navigate away and back
  await navigateToMixes(page);
  await page.waitForTimeout(300);
  await snap(page, 'ctx-mixes-02-after-navigate.png');  // row selected?

  // Header tap
  await tapBitmap(page, 200, 58);
  await page.waitForTimeout(200);
  await snap(page, 'ctx-mixes-03-after-header-tap.png');

  // Tap 1 on Free mix row (spec 06 uses y=114)
  await tapBitmap(page, 200, 114);
  await page.waitForTimeout(300);
  await snap(page, 'ctx-mixes-04-after-tap1.png');

  // Tap 2 on Free mix row
  await tapBitmap(page, 200, 114);
  await page.waitForTimeout(400);
  await snap(page, 'ctx-mixes-05-after-tap2.png');  // context menu?

  // Tap "Edit" (spec 06 uses 384, 196)
  await tapBitmap(page, 384, 196);
  await page.waitForTimeout(400);
  await snap(page, 'ctx-mixes-06-after-edit-tap.png');  // editor?

  // Tap Source dropdown (spec 06 uses 500, 179)
  await tapBitmap(page, 500, 179);
  await page.waitForTimeout(500);
  await snap(page, 'ctx-mixes-07-source-picker.png');  // source list?
});

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHT MODES: verify FM editor layout and keyboard positions
// ─────────────────────────────────────────────────────────────────────────────
test('probe: fm editor and name keyboard', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add FM1
  await navigateToFlightModes(page);
  await tapBitmap(page, 569, 69); // "+" header button
  await page.waitForTimeout(600);
  await goBack(page);             // exit FM1 editor → FM list
  await page.waitForTimeout(300);
  await snap(page, 'ctx-fm-01-list.png');

  // Navigate away and back (as real spec does)
  await navigateToFlightModes(page);
  await page.waitForTimeout(300);
  await snap(page, 'ctx-fm-02-after-navigate.png');

  // Header tap + two taps on FM1 row (spec 12 uses 300, 184)
  await tapBitmap(page, 200, 58);
  await page.waitForTimeout(200);
  await tapBitmap(page, 300, 184);
  await page.waitForTimeout(300);
  await snap(page, 'ctx-fm-03-after-tap1.png');
  await tapBitmap(page, 300, 184);
  await page.waitForTimeout(400);
  await snap(page, 'ctx-fm-04-context-menu.png');  // context menu with Edit/Add/Move/Clone/Delete

  // Tap "Edit" — spec 12 uses (396, 213).
  // From fm1-second-tap.png, menu has 6 rows (title+5 items); "Edit" row ≈ canvas y 139-171.
  // tapBitmap(396, 213) → canvas y=170.4 which is right at Edit/Add boundary.
  // Try a safer position: center of Edit row ≈ canvas y=155 → bitmap y=194.
  await tapBitmap(page, 396, 155); // safer: canvas y=124 → middle of Edit
  await page.waitForTimeout(400);
  await snap(page, 'ctx-fm-05-after-edit-tap.png');  // FM editor?

  // Capture FM editor field layout
  await snap(page, 'ctx-fm-06-editor-fields.png');

  // Tap Name ≡ icon (spec 12 uses 750, 71)
  await tapBitmap(page, 750, 71);
  await page.waitForTimeout(600);
  await snap(page, 'ctx-fm-07-name-keyboard.png');  // keyboard?

  // Check backspace position: spec 12 uses (750, 340) for backspace
  // Take a screenshot BEFORE any typing to see keyboard layout clearly
  // (keyboard should show with name "Flight mode 1" visible in input field)
});
