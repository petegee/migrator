/**
 * Probe: Find Vars ctx menu Delete touch coordinate.
 *
 * From sweep2: y=280 still creates Var2 (Clone/Add zone).
 * Visual estimate puts Delete center at bitmap y≈285.
 * Trying y=285, 290, 295, 300, 310.
 *
 * 0 vars in list after → Delete confirmed.
 * 2 vars → still in Clone/Add zone.
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
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(500);
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

for (const y of [285, 290, 295, 300, 310]) {
  test(`delete-probe: y=${y}`, async ({ page }) => {
    await setupWithOneVar(page);
    await openCtxMenu(page);
    await snap(page, `del-01-menu-y${y}`);
    await touchBitmap(page, 300, y);
    await page.waitForTimeout(600);
    await snap(page, `del-02-result-y${y}`);
    await toVarsList(page);
    await snap(page, `del-03-list-y${y}`);
  });
}
