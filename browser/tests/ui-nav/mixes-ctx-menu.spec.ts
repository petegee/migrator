/**
 * Probe: Mixes context menu — Add / Move / Clone / Delete
 *
 * Edit (y=140) is already confirmed with touchBitmap.
 * These 4 items sit below it at ~47px spacing (estimated).
 * Each test: fresh model → add Free mix → back to list (row pre-selected) →
 * open context menu → touch estimated y → screenshot result.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToMixes } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

/**
 * Boot, create model, navigate to Mixes, add a Free mix at First position,
 * then back-arrow to the list. Row remains pre-selected (orange highlight).
 */
async function setupOneMix(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);    // + header button → library grid
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 101);   // Free mix (r1c1)
  await page.waitForTimeout(500);
  await touchBitmap(page, 320, 141); // First position → mix editor opens
  await page.waitForTimeout(700);
  await tapBitmap(page, 25, 25);     // back to list; Free mix row stays selected
  await page.waitForTimeout(400);
}

/** Open context menu on the Free mix row (1 tap on pre-selected row). */
async function openContextMenu(page: any) {
  await tapBitmap(page, 200, 116);
  await page.waitForTimeout(400);
}

test('probe: ctx menu baseline — all items visible', async ({ page }) => {
  await setupOneMix(page);
  await openContextMenu(page);
  await snap(page, 'mixes-ctx-01-menu-open.png');
});

test('probe: ctx menu Add (y=187) — touchBitmap', async ({ page }) => {
  await setupOneMix(page);
  await openContextMenu(page);
  await snap(page, 'mixes-ctx-02-before-add.png');
  await touchBitmap(page, 350, 187);
  await page.waitForTimeout(600);
  await snap(page, 'mixes-ctx-03-after-add.png');
});

test('probe: ctx menu Move (y=233) — touchBitmap', async ({ page }) => {
  await setupOneMix(page);
  await openContextMenu(page);
  await snap(page, 'mixes-ctx-04-before-move.png');
  await touchBitmap(page, 350, 233);
  await page.waitForTimeout(600);
  await snap(page, 'mixes-ctx-05-after-move.png');
});

test('probe: ctx menu Clone (y=279) — touchBitmap', async ({ page }) => {
  await setupOneMix(page);
  await openContextMenu(page);
  await snap(page, 'mixes-ctx-06-before-clone.png');
  await touchBitmap(page, 350, 279);
  await page.waitForTimeout(600);
  await snap(page, 'mixes-ctx-07-after-clone.png');
});

test('probe: ctx menu Delete (y=325) — touchBitmap', async ({ page }) => {
  await setupOneMix(page);
  await openContextMenu(page);
  await snap(page, 'mixes-ctx-08-before-delete.png');
  await touchBitmap(page, 350, 325);
  await page.waitForTimeout(600);
  await snap(page, 'mixes-ctx-09-after-delete.png');
});
