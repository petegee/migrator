/**
 * Probe: Vars — finish mapping remaining unconfirmed fields
 *
 * Targets:
 *  A) Action row fields: enable toggle (bx≈25), condition picker (bx≈150),
 *     type picker (bx≈290) — all at y≈465 after action is added
 *  B) Values section: condition picker after "+ Add a new value"
 *  C) List header + button (563,69) — add a second var when one already exists
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import {
  tapBitmap, touchBitmap, navigateToVars,
  focusAddNewAction, cdpEnterKey,
} from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, label: string) =>
  save(label, await page.locator('canvas').first().screenshot({ type: 'png' }));

// ── A: Action row fields ─────────────────────────────────────────────────────

test('vars-finish A1: action row — enable toggle (bx=25)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  // Open var editor and add an action
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await focusAddNewAction(page);
  await cdpEnterKey(page);
  await snap(page, 'vf-A1-00-action-added.png');

  // Tap the enable/disable toggle (leftmost icon in action row)
  await tapBitmap(page, 25, 465);
  await page.waitForTimeout(600);
  await snap(page, 'vf-A1-01-after-toggle.png');

  // Tap again to re-enable
  await tapBitmap(page, 25, 465);
  await page.waitForTimeout(400);
  await snap(page, 'vf-A1-02-after-retoggle.png');
});

test('vars-finish A2: action row — condition picker (bx=150)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await focusAddNewAction(page);
  await cdpEnterKey(page);
  await snap(page, 'vf-A2-00-action-added.png');

  // Tap the condition/switch picker dropdown
  await tapBitmap(page, 150, 465);
  await page.waitForTimeout(800);
  await snap(page, 'vf-A2-01-after-tap-condition.png');

  // If a picker opened, try tapping y=130 (first visible item, likely "Always on")
  await tapBitmap(page, 400, 130);
  await page.waitForTimeout(600);
  await snap(page, 'vf-A2-02-after-picker-item.png');
});

test('vars-finish A3: action row — type picker (bx=290)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await focusAddNewAction(page);
  await cdpEnterKey(page);
  await snap(page, 'vf-A3-00-action-added.png');

  // Tap the action type picker (shows "Add(+)")
  await tapBitmap(page, 290, 465);
  await page.waitForTimeout(800);
  await snap(page, 'vf-A3-01-after-tap-type.png');

  // Sweep y to find items in the picker
  for (const by of [100, 130, 160, 190, 220, 250, 280, 310]) {
    await tapBitmap(page, 400, by);
    await page.waitForTimeout(400);
    await snap(page, `vf-A3-02-picker-y${by}.png`);
  }
});

// ── B: Values section — conditional value condition picker ───────────────────

test('vars-finish B: values section — condition picker after Add new value', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  await snap(page, 'vf-B-00-editor-open.png');

  // Tap "+ Add a new value" at y≈440 (non-scrolled, confirmed touch)
  await touchBitmap(page, 600, 440);
  await page.waitForTimeout(800);
  await snap(page, 'vf-B-01-after-add-value.png');

  // The new row has [condition "---" ▼] [value 0.0%]
  // Condition dropdown is on the left side — try tapBitmap sweeping x and y
  for (const by of [420, 430, 440, 450, 460, 470]) {
    await tapBitmap(page, 200, by);
    await page.waitForTimeout(500);
    await snap(page, `vf-B-02-cond-x200-y${by}.png`);
  }
});

// ── C: List header + button (second var) ─────────────────────────────────────

test('vars-finish C: list header + button when vars exist', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);

  // Create first var via empty-screen + icon
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(400);
  // Go back to list
  await tapBitmap(page, 25, 25);
  await page.waitForTimeout(500);
  await snap(page, 'vf-C-00-list-with-var1.png');

  // Tap header + button (estimated 563,69)
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(800);
  await snap(page, 'vf-C-01-after-header-plus.png');
});
