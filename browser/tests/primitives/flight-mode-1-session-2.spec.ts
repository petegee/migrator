/**
 * flight-mode-1 session-2 (full rebuild)
 *
 * Uploads don't persist across sessions (uploading a .bin after bootApp triggers
 * wizard re-entry and the loaded model is ignored). Every session must rebuild
 * ALL previous primitives from scratch.
 *
 * Rebuild order:
 *   1. Fresh Glider model (navigateCreateModelWizard)
 *   2. Vars 0-2 (Comments only — weight control bar confirmed non-functional in prior sessions)
 *   3. FM1: name=LNCH1, condition=--- (L1 logical switch doesn't exist yet)
 *
 * Key findings confirmed this session:
 *   - touchBitmap(780, 80) opens FM Name keyboard ✓
 *   - FM Name keyboard is in CAPS mode — all letters output uppercase ✓
 *   - ?123 at (40, 450) switches to numbers keyboard ✓
 *   - "1" at (40, 315) in numbers keyboard ✓ → name "LNCH1" confirmed in snap 08
 *   - Tap Active condition (400, 128) after ENTER to commit name ✓
 *   - goBack × 2 to exit FM editor → FM list → Model Setup ✓
 *   - Comment field keyboard is also in CAPS mode (var-2 snaps show "RUDDER" all-caps) ✓
 */

import { test, expect } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import {
  tapBitmap, touchBitmap,
  navigateToVars, navigateToFlightModes, navigateHome, goBack,
} from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';
import * as fs from 'fs';
import * as path from 'path';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';

// Keyboard bitmap coords (all keys use touchBitmap, all produce UPPERCASE)
// Row 1 y=315: Q(40) W(120) E(200) R(280) T(360) Y(440) U(520) I(600) O(680) P(760)
// Row 2 y=340: A(40) S(120) D(200) F(280) G(360) H(440) J(520) K(600) L(680)
// Row 3 y=395: Shift(40) Z(120) X(200) C(280) V(360) B(440) N(520) M(600) Bksp(680)
// Numbers (after ?123): Row 1 y=315: 1(40) 2(120) 3(200) 4(280) ...
// ?123 button: (40, 450) — same y as ENTER (700, 450)
const KEY: Record<string, [number, number]> = {
  A: [40, 340],  B: [440, 395], C: [280, 395], D: [200, 340],
  E: [200, 315], F: [280, 340], G: [360, 340], H: [440, 340],
  I: [600, 315], J: [520, 340], K: [600, 340], L: [680, 340],
  M: [600, 395], N: [520, 395], O: [680, 315], P: [760, 315],
  Q: [40, 315],  R: [280, 315], S: [120, 340], T: [360, 315],
  U: [520, 315], V: [360, 395], W: [120, 315], X: [200, 395],
  Y: [440, 315], Z: [120, 395],
};

test.setTimeout(300_000); // 5 min for full rebuild

test('flight-mode-1 session-2: rebuild vars + FM1 LNCH1', async ({ page }) => {
  const SC_DIR = path.join(__dirname, '../../../test-results/flight-mode-1-session-2');
  fs.mkdirSync(SC_DIR, { recursive: true });

  let snapIdx = 0;
  const snap = async (label: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    const file = `${String(snapIdx++).padStart(2, '0')}-${label}.png`;
    fs.writeFileSync(path.join(SC_DIR, file), buf);
    console.log(`snap: ${file}`);
  };

  const typeKeys = async (text: string) => {
    for (const ch of text.toUpperCase()) {
      const coords = KEY[ch];
      if (!coords) throw new Error(`No keyboard coord for: "${ch}"`);
      await touchBitmap(page, coords[0], coords[1]);
      await page.waitForTimeout(120);
    }
  };

  // Type a Comment field value: tap field → keyboard → type → ENTER → commit
  const setComment = async (text: string, snapLabel: string) => {
    await tapBitmap(page, 600, 267);   // Comment field
    await page.waitForTimeout(600);
    await snap(`${snapLabel}-kb-open`);
    await typeKeys(text);
    await snap(`${snapLabel}-typed`);
    await touchBitmap(page, 700, 450); // ENTER
    await page.waitForTimeout(400);
    await tapBitmap(page, 400, 50);    // commit focus
    await page.waitForTimeout(200);
  };

  // ── 1. Boot + exit wizard ────────────────────────────────────────────────────
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await snap('00-home');

  // ── 2. Navigate to Vars ──────────────────────────────────────────────────────
  await navigateToVars(page);
  await page.waitForTimeout(500);
  await snap('01-vars-empty');

  // ── 3. Var-0: Rudder ────────────────────────────────────────────────────────
  await tapBitmap(page, 400, 266);      // large + on empty screen
  await page.waitForTimeout(600);
  await snap('02-var0-editor');
  await setComment('RUDDER', 'var0');
  await goBack(page);
  await page.waitForTimeout(400);
  await snap('03-var0-in-list');

  // ── 4. Var-1: Elevat ────────────────────────────────────────────────────────
  await tapBitmap(page, 563, 69);       // + in list header
  await page.waitForTimeout(600);
  await snap('04-var1-editor');
  await setComment('ELEVAT', 'var1');
  await goBack(page);
  await page.waitForTimeout(400);
  await snap('05-var1-in-list');

  // ── 5. Var-2: Thottl ────────────────────────────────────────────────────────
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(600);
  await snap('06-var2-editor');
  await setComment('THOTTL', 'var2');
  await goBack(page);
  await page.waitForTimeout(400);
  await snap('07-var2-in-list');

  // ── 6. Navigate to Flight Modes ──────────────────────────────────────────────
  // Vars list has no bottom nav — goBack lands on Model Setup Page 2.
  // Tap Home first to reset, then navigateToFlightModes from a clean state.
  await goBack(page);               // Vars list → Model Setup Page 2
  await page.waitForTimeout(400);
  await navigateHome(page);         // Model Setup has bottom nav → Home
  await page.waitForTimeout(400);
  await navigateToFlightModes(page); // Home → Model Setup Page 1 → Flight Modes
  await page.waitForTimeout(600);
  await snap('08-fm-list');

  // ── 7. Add FM1 ───────────────────────────────────────────────────────────────
  // + header button at (569, 69) → FM1 editor auto-opens
  await tapBitmap(page, 569, 69);
  await page.waitForTimeout(800);
  await snap('09-fm1-editor');

  // Open Name keyboard via touch on pencil icon at (780, 80)
  await touchBitmap(page, 780, 80);
  await page.waitForTimeout(700);
  await snap('10-fm1-kb-open');

  // Type "LNCH" (all caps — FM Name keyboard is in CAPS mode)
  await touchBitmap(page, KEY.L[0], KEY.L[1]);  // L
  await page.waitForTimeout(120);
  await touchBitmap(page, KEY.N[0], KEY.N[1]);  // N
  await page.waitForTimeout(120);
  await touchBitmap(page, KEY.C[0], KEY.C[1]);  // C
  await page.waitForTimeout(120);
  await touchBitmap(page, KEY.H[0], KEY.H[1]);  // H
  await page.waitForTimeout(120);
  await snap('11-after-lnch');

  // Switch to numbers keyboard and type "1"
  await touchBitmap(page, 40, 450);    // ?123
  await page.waitForTimeout(500);
  await snap('12-numbers-kb');
  await touchBitmap(page, 40, 315);    // "1" key (first key in top row)
  await page.waitForTimeout(200);
  await snap('13-after-1');

  // Close keyboard
  await touchBitmap(page, 700, 450);   // ENTER
  await page.waitForTimeout(600);
  await snap('14-after-enter');

  // Tap Active condition to commit name field before navigating away
  await tapBitmap(page, 400, 128);
  await page.waitForTimeout(400);
  await snap('15-name-committed');

  // goBack × 2: FM editor → FM list → Model Setup
  await goBack(page);
  await page.waitForTimeout(400);
  await snap('16-fm-list');
  await goBack(page);
  await page.waitForTimeout(600);
  await snap('17-model-setup');

  // ── 8. Download and save ─────────────────────────────────────────────────────
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buffer = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buffer);
  console.log(`Saved accumulated.bin: ${buffer.length} bytes`);
  await snap('18-final');

  expect(buffer.length).toBeGreaterThan(662); // must be larger than fresh+FM1 alone
});
