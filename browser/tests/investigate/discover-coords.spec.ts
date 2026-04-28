/**
 * Coordinate Discovery — pass 2
 *
 * Focused on what pass 1 missed:
 *   - Model Setup page 2 (swipe fix)
 *   - Edit model field rows + virtual keyboard
 *   - Vars / Mixes / Outputs / Flight modes editor screens
 *   - Number control bar
 *   - List first-item positions
 *
 * Run:
 *   cd browser && npx playwright test tests/investigate/discover-coords.spec.ts
 *   npx playwright show-report
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import {
  navigateToEditModel,
  navigateToVars,
  navigateToMixes,
  navigateToOutputs,
  navigateToFlightModes,
  navigateToCurves,
  navigateToLogicSwitches,
  navigateToSpecialFunctions,
  navigateToModelSetup,
  swipeCanvas,
} from '../helpers/navigate';

async function snap(page: any, name: string) {
  const buf = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach(name, { body: buf, contentType: 'image/png' });
}

async function tap(page: any, bx: number, by: number) {
  const rect = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) throw new Error('canvas not found');
  await page.mouse.click(
    rect.x + bx * (rect.w / 800),
    rect.y + by * (rect.h / 480),
  );
  await page.waitForTimeout(400);
}

// ---------------------------------------------------------------------------
// Page 2 swipe — test with increasing distances
// ---------------------------------------------------------------------------

test('p2: swipe left distance=400', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToModelSetup(page);
  await snap(page, 'before-swipe');
  await swipeCanvas(page, 'left', { distance: 400 });
  await page.waitForTimeout(300);
  await snap(page, 'after-swipe-400');
});

// ---------------------------------------------------------------------------
// Edit model — field rows
// ---------------------------------------------------------------------------

test('edit model: tap name edit icon', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToEditModel(page);
  await snap(page, 'edit-model-before-name-tap');
  // Name row edit icon — right edge of row 1
  await tap(page, 750, 77);
  await page.waitForTimeout(600);
  await snap(page, 'edit-model-name-keyboard');
});

test('edit model: tap model type dropdown', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToEditModel(page);
  await snap(page, 'edit-model-before-type-tap');
  // Model type row — right side (row 3, value area)
  await tap(page, 680, 202);
  await page.waitForTimeout(400);
  await snap(page, 'edit-model-type-dropdown');
});

// ---------------------------------------------------------------------------
// Vars
// ---------------------------------------------------------------------------

test('vars: empty + add', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await snap(page, 'vars-empty');
  await tap(page, 569, 54); // + button
  await page.waitForTimeout(400);
  await snap(page, 'vars-after-add');
});

test('vars: tap first item', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tap(page, 569, 54); // add
  await page.waitForTimeout(400);
  await snap(page, 'vars-list-with-one');
  await tap(page, 400, 100); // first list item (guess)
  await page.waitForTimeout(400);
  await snap(page, 'vars-editor');
});

// ---------------------------------------------------------------------------
// Mixes
// ---------------------------------------------------------------------------

test('mixes: list + add', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);
  await snap(page, 'mixes-list');
  await tap(page, 569, 54); // +
  await page.waitForTimeout(400);
  await snap(page, 'mixes-after-add');
});

test('mixes: tap first item → editor', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);
  await snap(page, 'mixes-list-for-tap');
  // First row below header — Ailerons
  await tap(page, 250, 100);
  await page.waitForTimeout(400);
  await snap(page, 'mixes-editor');
});

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

test('outputs: list + tap CH1', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToOutputs(page);
  await snap(page, 'outputs-list');
  // CH1 top-left cell
  await tap(page, 200, 112);
  await page.waitForTimeout(400);
  await snap(page, 'outputs-ch1-editor');
});

// ---------------------------------------------------------------------------
// Flight modes
// ---------------------------------------------------------------------------

test('flight modes: add + tap second item', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToFlightModes(page);
  await snap(page, 'flight-modes-list');
  await tap(page, 569, 54); // +
  await page.waitForTimeout(400);
  await snap(page, 'flight-modes-after-add');
  // Tap second item (FM1, newly added)
  await tap(page, 300, 140);
  await page.waitForTimeout(400);
  await snap(page, 'flight-modes-editor');
});

// ---------------------------------------------------------------------------
// Curves / Logic switches / Special functions (page 2)
// ---------------------------------------------------------------------------

test('curves: empty + add', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToCurves(page);
  await snap(page, 'curves-empty');
  await tap(page, 569, 54); // +
  await page.waitForTimeout(400);
  await snap(page, 'curves-after-add');
});

test('logic switches: empty + add', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToLogicSwitches(page);
  await snap(page, 'logic-switches-empty');
  await tap(page, 569, 54); // +
  await page.waitForTimeout(400);
  await snap(page, 'logic-switches-after-add');
});

test('special functions: empty + add', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToSpecialFunctions(page);
  await snap(page, 'special-functions-empty');
  await tap(page, 569, 54); // +
  await page.waitForTimeout(400);
  await snap(page, 'special-functions-after-add');
});
