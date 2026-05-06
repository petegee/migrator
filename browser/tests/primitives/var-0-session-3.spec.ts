/**
 * var-0 session-3: Enter the "Rudder" expoData primitive into Ethos Vars screen.
 *
 * ETX data:
 *   name: Rudder, srcRaw: Rud, weight: 80, offset: 0
 *   curve: {type: 0, value: 0}, swtch: NONE, mode: 3
 *
 * Ethos Var editor fields (confirmed from nav file):
 *   - Name: non-interactive in WASM
 *   - Comment: tap (600,267) → keyboard opens; touchBitmap for keys
 *   - Range low/high: touch fields
 *   - Default value: touch field
 *   - Actions: scroll-only, not needed for this primitive
 *
 * Approach: set Comment = "Rudder" (only text-settable field).
 * Source/Weight/Curve have no corresponding Var editor field — documented in result.
 */

import { test, expect } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToVars, goBack } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';
import * as fs from 'fs';
import * as path from 'path';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';

test('var-0 session-3: create Rudder var', async ({ page }) => {
  const SC_DIR = path.join(__dirname, '../../../test-results/var-0-session-3');
  fs.mkdirSync(SC_DIR, { recursive: true });

  const snap = async (name: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    fs.writeFileSync(path.join(SC_DIR, name), buf);
    console.log(`snap: ${name}`);
  };

  // ── 1. Boot and create fresh model ────────────────────────────────────────
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // ── 2. Navigate to Vars (Model Setup → swipe left → Vars r2c2) ────────────
  await navigateToVars(page);
  await page.waitForTimeout(500);
  await snap('01-vars-empty.png');

  // ── 3. Create first var ───────────────────────────────────────────────────
  // Empty Vars screen shows a large "+" at centre (400, 266)
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(700);
  await snap('02-var-editor-open.png');

  // ── 4. Set Comment = "Rudder" ─────────────────────────────────────────────
  // Tap Comment textarea to open keyboard
  await tapBitmap(page, 600, 267);
  await page.waitForTimeout(700);
  await snap('03-keyboard-open.png');

  // Type "Rudder" — all keyboard keys must use touchBitmap
  // Keyboard layout (confirmed coords from ethos-ui-navigation.md):
  //   Row 1 y=315: Q(40) W(120) E(200) R(280) T(360) Y(440) U(520) I(600) O(680) P(760)
  //   Row 2 y=340: A(40) S(120) D(200) F(280) G(360) H(440) J(520) K(600) L(680)
  //   Row 3 y=395: shift(40) Z(120) X(200) C(280) V(360) B(440) N(520) M(600) bksp(680)
  //   ENTER y=450, x=700
  await touchBitmap(page, 40, 395);   // Shift → next char uppercase
  await page.waitForTimeout(150);
  await touchBitmap(page, 280, 315);  // R
  await page.waitForTimeout(150);
  await touchBitmap(page, 520, 315);  // u
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 340);  // d
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 340);  // d
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 315);  // e
  await page.waitForTimeout(150);
  await touchBitmap(page, 280, 315);  // r
  await page.waitForTimeout(200);
  await snap('04-typed-rudder.png');

  // Confirm / close keyboard
  await touchBitmap(page, 700, 450);  // ENTER
  await page.waitForTimeout(600);
  await snap('05-comment-set.png');

  // Tap neutral area to commit focus before navigating back
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(300);

  // ── 5. Return to Vars list ────────────────────────────────────────────────
  await goBack(page);
  await page.waitForTimeout(500);
  await snap('06-var-in-list.png');

  // ── 6. Download model .bin ────────────────────────────────────────────────
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);

  const buffer = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buffer);
  console.log(`Saved accumulated.bin (${buffer.length} bytes)`);

  await snap('07-final.png');

  expect(buffer.length).toBeGreaterThan(100);
});
