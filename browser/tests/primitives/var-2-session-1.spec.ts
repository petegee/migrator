/**
 * var-2 session-1: Rebuild vars 0-2 from scratch, entering Thottl as the new var.
 *
 * Context: accumulated.bin is corrupted (var-1 session-1 left it in a bad state;
 * there was no session-2 to repair it). This session starts fresh and enters all
 * three vars that should exist in accumulated.bin at this stage:
 *   var-0: Rudder  (srcRaw=Rud, weight=80, swtch=NONE, flightModes=0)
 *   var-1: Elevat  (srcRaw=Ele, weight=55, swtch=NONE, flightModes=0)
 *   var-2: Thottl  (srcRaw=Thr, weight=100, swtch=NONE, flightModes=2359296)
 *
 * ETX→Ethos mapping for single-rate vars (swtch=NONE):
 *   name   → Comment field
 *   weight → Values default (the only numeric value needed)
 *   No conditional value lines needed (swtch=NONE, only one rate)
 *   srcRaw, curve, offset, mode, flightModes not mapped in Var editor
 *
 * Key unknowns this session resolves:
 *   - Does tapBitmap(600, 395) open the numeric Values control bar in unscrolled state?
 *   - Does > at (338, 468) increase step to 1% or 10%?
 *   - Does ⋮ at (750, 468) open a direct-value-entry dialog?
 */

import { test, expect } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToVars, goBack } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';
import * as fs from 'fs';
import * as path from 'path';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';

// Keyboard bitmap coords (800×480 space) — all keys use touchBitmap
// Row 1 y=315: Q(40) W(120) E(200) R(280) T(360) Y(440) U(520) I(600) O(680) P(760)
// Row 2 y=340: A(40) S(120) D(200) F(280) G(360) H(440) J(520) K(600) L(680)
// Row 3 y=395: Shift(40) Z(120) X(200) C(280) V(360) B(440) N(520) M(600) Bksp(680)
// ENTER: (700, 450)
const KEY: Record<string, [number, number]> = {
  A: [40, 340],  B: [440, 395], C: [280, 395], D: [200, 340],
  E: [200, 315], F: [280, 340], G: [360, 340], H: [440, 340],
  I: [600, 315], J: [520, 340], K: [600, 340], L: [680, 340],
  M: [600, 395], N: [520, 395], O: [680, 315], P: [760, 315],
  Q: [40, 315],  R: [280, 315], S: [120, 340], T: [360, 315],
  U: [520, 315], V: [360, 395], W: [120, 315], X: [200, 395],
  Y: [440, 315], Z: [120, 395],
};

test.setTimeout(300_000); // 5 min — allows up to ~235 control-bar taps across all 3 vars

test('var-2 session-1: rebuild Rudder+Elevat+Thottl vars from scratch', async ({ page }) => {
  const SC_DIR = path.join(__dirname, '../../../test-results/var-2-session-1');
  fs.mkdirSync(SC_DIR, { recursive: true });

  let snapIdx = 0;
  const snap = async (label: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    const file = `${String(snapIdx++).padStart(2, '0')}-${label}.png`;
    fs.writeFileSync(path.join(SC_DIR, file), buf);
    console.log(`snap: ${file}`);
  };

  // Type a name string via the keyboard.
  // CRITICAL: keyboard auto-starts UPPERCASE for first character — do NOT press Shift first.
  // After first character the keyboard drops to lowercase automatically.
  // All key presses use touchBitmap (tapBitmap registers wrong keys).
  const typeText = async (text: string) => {
    for (let i = 0; i < text.length; i++) {
      const ch = text[i].toUpperCase(); // KEY map is indexed by uppercase
      const coords = KEY[ch];
      if (!coords) throw new Error(`No keyboard coord for character: "${ch}" in "${text}"`);
      await touchBitmap(page, coords[0], coords[1]);
      await page.waitForTimeout(150);
    }
  };

  // Open the Values default control bar and set value to target%.
  // Editor must be in UNSCROLLED state (fresh open, no wheel events).
  // Taps > once to increase step from 0.1% baseline.
  // Then taps + N times assuming the resulting step size equals 1%.
  // Screenshots before/after > tap reveal actual step size.
  const setValuesDefault = async (label: string, targetPct: number) => {
    // Values field is at y=395 in unscrolled editor; tapBitmap opens control bar
    await tapBitmap(page, 600, 395);
    await page.waitForTimeout(700);
    await snap(`${label}-a-control-bar-open`);

    // Test ⋮ first: may open a direct-value-entry dialog (fastest path if it works)
    await touchBitmap(page, 750, 468);
    await page.waitForTimeout(600);
    await snap(`${label}-b-after-ellipsis`);

    // Tap > once to try to increase step size (0.1% → 1% or 10% — unknown until screenshot)
    // If ⋮ opened a dialog, this tap may land on the dialog; screenshots will reveal.
    await tapBitmap(page, 338, 468);
    await page.waitForTimeout(400);
    await snap(`${label}-c-after-step-increase`);

    // Tap + targetPct times assuming step = 1%.
    // If step is actually 10%, value will exceed target and clamp at Range max (100%).
    // Screenshots of the control bar will show the actual resulting value.
    for (let i = 0; i < targetPct; i++) {
      await tapBitmap(page, 613, 468);
      if (i % 20 === 19) await page.waitForTimeout(100); // brief pause every 20 taps
    }
    await page.waitForTimeout(500);
    await snap(`${label}-d-value-set`);

    // Close control bar by tapping neutral area at top of screen
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(400);
  };

  // Set Comment field via keyboard.
  // Comment field is at y=267 in unscrolled editor.
  const setComment = async (label: string, text: string) => {
    await tapBitmap(page, 600, 267);
    await page.waitForTimeout(700);
    await snap(`${label}-e-keyboard-open`);

    await typeText(text);
    await snap(`${label}-f-typed`);

    // ENTER closes keyboard
    await touchBitmap(page, 700, 450);
    await page.waitForTimeout(600);
    await snap(`${label}-g-after-enter`);

    // Tap neutral area to commit focus before goBack
    await tapBitmap(page, 400, 50);
    await page.waitForTimeout(300);
  };

  // ── 1. Boot + fresh Glider model ──────────────────────────────────────────
  await bootApp(page);
  await navigateCreateModelWizard(page); // creates fresh Glider model
  await snap('00-home');

  // ── 2. Navigate to Vars ───────────────────────────────────────────────────
  await navigateToVars(page);
  await page.waitForTimeout(500);
  await snap('01-vars-empty');

  // ── 3. VAR 0: Rudder — weight=80% ─────────────────────────────────────────
  // First var: tap the large + button on the empty screen
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(700);
  await snap('var0-editor-open');

  await setValuesDefault('var0', 80);
  await setComment('var0', 'Rudder');

  await goBack(page);
  await page.waitForTimeout(500);
  await snap('var0-in-list');

  // ── 4. VAR 1: Elevat — weight=55% ─────────────────────────────────────────
  // Subsequent var: tap + button in list header
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(700);
  await snap('var1-editor-open');

  await setValuesDefault('var1', 55);
  await setComment('var1', 'Elevat');

  await goBack(page);
  await page.waitForTimeout(500);
  await snap('var1-in-list');

  // ── 5. VAR 2: Thottl — weight=100% (the new primitive for this session) ───
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(700);
  await snap('var2-editor-open');

  await setValuesDefault('var2', 100);
  await setComment('var2', 'Thottl');

  await goBack(page);
  await page.waitForTimeout(500);
  await snap('var2-in-list');

  // ── 6. Download and save accumulated.bin ──────────────────────────────────
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buffer = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buffer);
  console.log(`Saved accumulated.bin: ${buffer.length} bytes`);
  await snap('final');

  expect(buffer.length).toBeGreaterThan(100);
});
