/**
 * flight-mode-2 session-1
 *
 * Rebuilds all prior primitives from scratch — uploads don't persist
 * (confirmed FM1 session-2).
 *
 * Rebuild order:
 *   1. Fresh Glider model (navigateCreateModelWizard)
 *   2. Vars 0-2 (Comments only — weight control bar non-functional in prior sessions)
 *   3. FM1: name=LNCH1, condition=--- (L1 doesn't exist yet)
 *   4. FM2: name=LNCH2, condition=--- (L3 doesn't exist yet)
 *
 * Numbers keyboard: row y=315, "1"=(40,315) "2"=(120,315) etc (80px spacing)
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
// ?123 button: (40, 450) — same row as ENTER (700, 450)
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

test('flight-mode-2 session-1: rebuild vars + FM1 + FM2 LNCH2', async ({ page }) => {
  const SC_DIR = path.join(__dirname, '../../../test-results/flight-mode-2-session-1');
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

  const setComment = async (text: string, snapLabel: string) => {
    await tapBitmap(page, 600, 267);    // Comment field
    await page.waitForTimeout(600);
    await snap(`${snapLabel}-kb-open`);
    await typeKeys(text);
    await snap(`${snapLabel}-typed`);
    await touchBitmap(page, 700, 450);  // ENTER
    await page.waitForTimeout(400);
    await tapBitmap(page, 400, 50);     // commit focus
    await page.waitForTimeout(200);
  };

  // ── 1. Boot + fresh Glider model ─────────────────────────────────────────────
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await snap('00-home');

  // ── 2. Vars 0-2 ──────────────────────────────────────────────────────────────
  await navigateToVars(page);
  await page.waitForTimeout(500);
  await snap('01-vars-empty');

  // Var-0: RUDDER
  await tapBitmap(page, 400, 266);      // large + on empty screen
  await page.waitForTimeout(600);
  await setComment('RUDDER', 'var0');
  await goBack(page);
  await page.waitForTimeout(400);

  // Var-1: ELEVAT
  await tapBitmap(page, 563, 69);       // + in list header
  await page.waitForTimeout(600);
  await setComment('ELEVAT', 'var1');
  await goBack(page);
  await page.waitForTimeout(400);

  // Var-2: THOTTL
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(600);
  await setComment('THOTTL', 'var2');
  await goBack(page);
  await page.waitForTimeout(400);
  await snap('02-vars-done');

  // ── 3. Navigate to Flight Modes ───────────────────────────────────────────────
  // Vars list has no bottom nav — goBack lands on Model Setup Page 2.
  await goBack(page);                    // Vars list → Model Setup Page 2
  await page.waitForTimeout(400);
  await navigateHome(page);             // MS Page 2 → Home
  await page.waitForTimeout(400);
  await navigateToFlightModes(page);    // Home → MS Page 1 → Flight Modes
  await page.waitForTimeout(600);
  await snap('03-fm-list-empty');

  // ── 4. Add FM1: LNCH1 ────────────────────────────────────────────────────────
  await tapBitmap(page, 569, 69);       // + header → FM1 editor auto-opens
  await page.waitForTimeout(800);
  await snap('04-fm1-editor');

  await touchBitmap(page, 780, 80);     // Name pencil icon → keyboard opens
  await page.waitForTimeout(700);
  await snap('05-fm1-kb-open');

  await typeKeys('LNCH');
  await touchBitmap(page, 40, 450);     // ?123 → numbers keyboard
  await page.waitForTimeout(500);
  await touchBitmap(page, 40, 315);     // "1"
  await page.waitForTimeout(200);
  await touchBitmap(page, 700, 450);    // ENTER — keyboard closes
  await page.waitForTimeout(600);

  await tapBitmap(page, 400, 128);      // tap Active condition to commit name
  await page.waitForTimeout(400);
  await snap('06-fm1-named');

  await goBack(page);                   // FM1 editor → FM list
  await page.waitForTimeout(400);
  await snap('07-fm-list-has-fm1');
  await goBack(page);                   // FM list → Model Setup Page 1
  await page.waitForTimeout(400);

  // ── 5. Navigate to Flight Modes again for FM2 ─────────────────────────────────
  await navigateToFlightModes(page);    // MS Page 1 → Flight Modes
  await page.waitForTimeout(600);
  await snap('08-fm-list-before-fm2');

  // ── 6. Add FM2: LNCH2 ────────────────────────────────────────────────────────
  await tapBitmap(page, 569, 69);       // + header → FM2 editor auto-opens
  await page.waitForTimeout(800);
  await snap('09-fm2-editor');           // capture all visible FM editor fields

  await touchBitmap(page, 780, 80);     // Name pencil icon → keyboard opens
  await page.waitForTimeout(700);
  await snap('10-fm2-kb-open');

  await typeKeys('LNCH');
  await touchBitmap(page, 40, 450);     // ?123 → numbers keyboard
  await page.waitForTimeout(500);
  await snap('11-fm2-numbers-kb');
  await touchBitmap(page, 120, 315);    // "2" (80px right of "1" at x=40)
  await page.waitForTimeout(200);
  await touchBitmap(page, 700, 450);    // ENTER — keyboard closes
  await page.waitForTimeout(600);

  // Tap Active condition to commit name; leave condition as "---" (L3 doesn't exist yet)
  await tapBitmap(page, 400, 128);
  await page.waitForTimeout(400);
  await snap('12-fm2-named');

  await goBack(page);                   // FM2 editor → FM list
  await page.waitForTimeout(400);
  await snap('13-fm-list-fm1-fm2');
  await goBack(page);                   // FM list → Model Setup Page 1
  await page.waitForTimeout(600);
  await snap('14-model-setup');

  // ── 7. Download and save ──────────────────────────────────────────────────────
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buffer = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buffer);
  console.log(`Saved accumulated.bin: ${buffer.length} bytes`);
  await snap('15-final');

  expect(buffer.length).toBeGreaterThan(722); // must be larger than FM1-only build
});
