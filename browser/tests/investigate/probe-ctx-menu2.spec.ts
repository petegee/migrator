/**
 * Minimal verification: confirm that tapBitmap(200, 116) opens context menu
 * on an already-selected Var1 row, and determine correct Mixes/FM tap positions.
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
const snap = async (page: any, name: string) =>
  fs.writeFileSync(path.join(OUT, name), await page.locator('canvas').first().screenshot({ type: 'png' }));

// Vars: one tap at (200, 116) — already-selected row, Name-column X
test('probe: vars one tap at (200,116)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(1000);
  await goBack(page);
  await page.waitForTimeout(300);

  // Navigate away and back — row should still be selected
  await navigateToVars(page);
  await page.waitForTimeout(300);
  await snap(page, 'v2-01-after-navigate.png');

  // ONE tap at old probe's working position
  await tapBitmap(page, 200, 116);
  await page.waitForTimeout(400);
  await snap(page, 'v2-02-one-tap-200-116.png');  // context menu?

  // If menu opened: tap "Edit"
  await tapBitmap(page, 320, 167);  // Edit: canvas center of menu ≈ (320,167) → bitmap (400,209) but try center
  await page.waitForTimeout(400);
  await snap(page, 'v2-03-after-edit.png');  // var editor?

  // Tap Name ≡ (canvas y≈111 → bitmap y=139, but try y=125 canvas → y=156 bitmap too)
  await tapBitmap(page, 738, 139);
  await page.waitForTimeout(600);
  await snap(page, 'v2-04-keyboard.png');
});

// Mixes: find the right tap position for Free mix row
test('probe: mixes row tap positions', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(400);
  await tapBitmap(page, 100, 101);
  await page.waitForTimeout(400);
  await tapBitmap(page, 396, 186);
  await page.waitForTimeout(600);
  await goBack(page);
  await page.waitForTimeout(300);

  await navigateToMixes(page);
  await page.waitForTimeout(300);
  await snap(page, 'm2-01-after-navigate.png');  // Free mix selected?

  // Try (200, 116) first — same as Vars
  await tapBitmap(page, 200, 116);
  await page.waitForTimeout(400);
  await snap(page, 'm2-02-tap-200-116.png');  // context menu?

  // If needed, try (200, 134) — center of first data row (canvas center y=107 → bitmap=134)
  await tapBitmap(page, 200, 134);
  await page.waitForTimeout(400);
  await snap(page, 'm2-03-tap-200-134.png');

  // Tap Edit
  await tapBitmap(page, 320, 167);
  await page.waitForTimeout(400);
  await snap(page, 'm2-04-after-edit.png');

  // Tap Source dropdown (spec 06 uses 500, 179)
  await tapBitmap(page, 500, 179);
  await page.waitForTimeout(500);
  await snap(page, 'm2-05-source-picker.png');
});

// FM: TWO taps on FM1 without header tap, using confirmed old-probe positions
test('probe: fm1 two taps no header', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  await navigateToFlightModes(page);
  await tapBitmap(page, 569, 69);
  await page.waitForTimeout(600);
  await goBack(page);
  await page.waitForTimeout(300);

  await navigateToFlightModes(page);
  await page.waitForTimeout(300);
  await snap(page, 'f2-01-fm-list.png');  // FM0 selected, FM1 visible

  // Tap FM1 row — no header tap, use old probe's x=200
  // FM1 center: canvas y≈147 → bitmap y=184; use old probe x=200
  await tapBitmap(page, 200, 184);
  await page.waitForTimeout(300);
  await snap(page, 'f2-02-tap1-fm1.png');  // FM1 selected?

  await tapBitmap(page, 200, 184);
  await page.waitForTimeout(400);
  await snap(page, 'f2-03-tap2-fm1.png');  // context menu?

  // Tap "Edit" — FM menu has 5 items, Edit row at canvas y=139-171, center=155 → bitmap=194
  await tapBitmap(page, 320, 194);
  await page.waitForTimeout(400);
  await snap(page, 'f2-04-after-edit.png');  // FM editor?

  // Tap Name ≡ (spec used 750, 71 — try same)
  await tapBitmap(page, 750, 71);
  await page.waitForTimeout(600);
  await snap(page, 'f2-05-keyboard.png');
});
