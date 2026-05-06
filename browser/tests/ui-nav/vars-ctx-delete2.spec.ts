/**
 * Probe: Find Vars ctx menu Delete touch coordinate — round 2.
 *
 * Prior probes tested y=285–310 and hit Clone zone (2 vars created).
 * Clone is confirmed at y≈268–310, so Delete must be at y>310.
 * This sweep tests y=320, 335, 350, 365, 380.
 *
 * Delete likely opens a confirm dialog ("Are you sure?").
 * After touching each y:
 *   1. Screenshot (shows dialog or result)
 *   2. Try confirming: tap (400, 290) and (500, 290) as likely OK positions
 *   3. Screenshot again
 *   4. Navigate back to Vars list — check var count
 *
 * 0 vars in list → Delete confirmed.
 * 1 var          → miss or Edit.
 * 2 vars         → still in Clone/Add zone.
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

async function confirmDialog(page: any) {
  // Confirm dialog "Are you sure?" — try common OK button positions.
  // Ethos dialogs typically center on screen with OK at right.
  await tapBitmap(page, 500, 290);
  await page.waitForTimeout(400);
}

async function toVarsList(page: any) {
  await goBack(page);
  await page.waitForTimeout(300);
  await navigateToVars(page);
  await page.waitForTimeout(400);
}

for (const y of [320, 335, 350, 365, 380]) {
  test(`delete2-probe: y=${y}`, async ({ page }) => {
    await setupWithOneVar(page);
    await openCtxMenu(page);
    await snap(page, `del2-01-menu-y${y}`);

    await touchBitmap(page, 300, y);
    await page.waitForTimeout(500);
    await snap(page, `del2-02-after-touch-y${y}`);

    // Attempt to confirm any dialog that appeared
    await confirmDialog(page);
    await snap(page, `del2-03-after-confirm-y${y}`);

    await toVarsList(page);
    await snap(page, `del2-04-list-y${y}`);
  });
}
