/**
 * Probe: Trims confirm dialog — precise Yes/No button y sweep
 * Each test is a fresh boot to avoid contamination.
 * "Yes" bx estimated ≈478, "No" ≈550. Sweep by=220..270 to find correct y.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToTrims } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots/trims');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

for (const by of [220, 230, 240, 250, 260, 270]) {
  test(`probe: Trims dialog — tap Yes(x=478) at y=${by}`, async ({ page }) => {
    await bootApp(page);
    await navigateCreateModelWizard(page);
    await navigateToTrims(page);
    await tapBitmap(page, 400, 400);
    await page.waitForTimeout(600);
    await snap(page, `60-dialog-open-y${by}.png`);
    await tapBitmap(page, 478, by);
    await page.waitForTimeout(600);
    await snap(page, `61-after-tap-yes-y${by}.png`);
  });
}

test('probe: Trims dialog — tap No(x=550) at y=245', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToTrims(page);
  await tapBitmap(page, 400, 400);
  await page.waitForTimeout(600);
  await snap(page, '62-dialog-open-no.png');
  await tapBitmap(page, 550, 245);
  await page.waitForTimeout(600);
  await snap(page, '63-after-tap-no-550-245.png');
});
