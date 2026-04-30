/**
 * Final probe: captures remaining unknown screens.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import {
  tapBitmap, navigateToEditModel, navigateToVars, navigateToMixes, goBack,
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

// ---------------------------------------------------------------------------
test('probe: model type correct row', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToEditModel(page);

  // Rows are ~48px each, title=33px, so:
  // Name=33-81 (y=57), Picture=81-129 (y=105), Model type=129-177 (y=153) → bitmap y=191
  await tapBitmap(page, 700, 191); // Model type dropdown
  await page.waitForTimeout(500);
  await snap(page, 'editmodel-type-dropdown2.png');
});

// ---------------------------------------------------------------------------
test('probe: var editor from plus button', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await page.waitForTimeout(300);

  // Big "+" on empty Vars screen — wait 2s after tap to ensure editor loads
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(2000);
  await snap(page, 'var-editor-from-plus.png');
});

// ---------------------------------------------------------------------------
test('probe: mix source picker', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Add Free mix and land in editor
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);   // "+"
  await page.waitForTimeout(400);
  await tapBitmap(page, 100, 101);  // "Free mix"
  await page.waitForTimeout(400);
  await tapBitmap(page, 396, 186);  // "Last position"
  await page.waitForTimeout(600);
  await snap(page, 'mix-editor-open.png');

  // Tap Source field: canvas y≈153, bitmap y=191; x: center of "---▼" ≈ canvas 300, bitmap 375
  await tapBitmap(page, 375, 191);
  await page.waitForTimeout(500);
  await snap(page, 'mix-source-picker.png');
});

// ---------------------------------------------------------------------------
test('probe: outputs Max and Center/Subtrim fields', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const { navigateToOutputs } = await import('../helpers/navigate');
  await navigateToOutputs(page);
  await tapBitmap(page, 200, 112); // CH1
  await page.waitForTimeout(400);

  // Based on row spacing:
  // Direction at y=250 (confirmed), Min at y=295, Max at y=340, Center/Subtrim at y=385
  // But we saw bitmap y=340 opens Min and y=385 opens Max.
  // So actual row spacing is about 45, starting from Direction=250:
  //   Min=250+45=295? No — prior probe showed Min at 340.
  //
  // Let's just sweep y values for Max and Center/Subtrim
  for (const by of [340, 360, 380, 400, 420, 440]) {
    await navigateToOutputs(page);
    await tapBitmap(page, 200, 112); // CH1
    await page.waitForTimeout(300);
    await tapBitmap(page, 700, by);
    await page.waitForTimeout(400);
    save(`outputs-field-tap-y${by}.png`,
      await page.locator('canvas').first().screenshot({ type: 'png' }));
    await tapBitmap(page, 25, 25); // dismiss
    await page.waitForTimeout(200);
  }
});

// ---------------------------------------------------------------------------
test('probe: control bar step + decrement + increment', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const { navigateToOutputs } = await import('../helpers/navigate');
  await navigateToOutputs(page);
  await tapBitmap(page, 200, 112); // CH1
  await page.waitForTimeout(400);
  await tapBitmap(page, 700, 340); // open Min control bar
  await page.waitForTimeout(400);

  // The ">" step button confirmed at bitmap x≈400 (canvas x=320)
  // Sweep x values to find ">" precisely, then find "-" and "+"
  for (const bx of [50, 150, 270, 400, 480, 560, 630]) {
    await navigateToOutputs(page);
    await tapBitmap(page, 200, 112);
    await page.waitForTimeout(300);
    await tapBitmap(page, 700, 340); // open control bar for Min
    await page.waitForTimeout(300);
    await tapBitmap(page, bx, 456);  // tap the control bar button
    await page.waitForTimeout(200);
    save(`controlbar-tap-x${bx}.png`,
      await page.locator('canvas').first().screenshot({ type: 'png' }));
    await tapBitmap(page, 25, 25); // back
    await page.waitForTimeout(200);
  }
});
