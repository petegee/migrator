/**
 * Probe: Outputs screen — confirm CH3 editor opens at (200, 220)
 *
 * CH4 at (600, 220) is confirmed; CH3 (left col, same row) is estimated at same y.
 * Goal: verify tap at (200, 220) opens the CH3 editor.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToOutputs } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

test('probe: Outputs CH3 editor at (200, 220)', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToOutputs(page);

  await snap(page, 'outputs-ch3-before.png');

  await tapBitmap(page, 200, 220);
  await page.waitForTimeout(600);
  await snap(page, 'outputs-ch3-after.png');
});
