/**
 * var-1 session-1: Add Var2 ("Elevat") to the accumulated model.
 *
 * ETX data (expoData index 1):
 *   name: Elevat, srcRaw: Ele, weight: 55, swtch: NONE, mode: 3
 *   curve: {type: 0, value: 0}, offset: 0, flightModes: 0
 *
 * Single expoData line (swtch: NONE) → no conditional Value lines needed.
 * Fields to set:
 *   Comment  = "Elevat"  (tapBitmap keyboard entry)
 *   Values default = 55%  (wheel-focus 5 steps → cdpEnterKey → 55 wheel increments → cdpEnterKey)
 *
 * Accumulated state: 671 bytes, has Var1="rudder" (set in var-0 session-3).
 */

import { test } from '@playwright/test';
import { bootApp } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToVars, goBack, cdpEnterKey } from '../helpers/navigate';
import { uploadFile } from '../helpers/upload';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';
import * as fs from 'fs';
import * as path from 'path';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';
const SC_DIR = path.join(__dirname, '../../../test-results/var-1-session-1');

/** Send N CDP mouseWheel events (deltaY=300 each) at the canvas centre. */
async function wheelNav(page: any, steps: number): Promise<void> {
  const pos = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x + 400 * (r.width / 800), y: r.y + 300 * (r.height / 480) };
  });
  if (!pos) throw new Error('wheelNav: canvas not found');
  const client = await (page.context() as any).newCDPSession(page);
  for (let i = 0; i < steps; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: pos.x, y: pos.y,
      deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse',
    });
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(400);
}

test('var-1 session-1: add Var2 Elevat', async ({ page }) => {
  fs.mkdirSync(SC_DIR, { recursive: true });

  const snap = async (name: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    fs.writeFileSync(path.join(SC_DIR, name), buf);
    console.log(`snap: ${name}`);
  };

  // ── 1. Boot + dismiss Create Model wizard ────────────────────────────────
  // bootApp leaves the Create Model wizard on-canvas (its dialog-dismiss clicks
  // accidentally land on wizard icons, not on any dialog OK button).
  // navigateCreateModelWizard dismisses the wizard by creating a dummy Glider
  // model and landing on the Home screen — then we overwrite it with the upload.
  await bootApp(page);
  await snap('01-after-boot.png');

  // Import navigateCreateModelWizard inline (not re-exported from navigate.ts)
  const { navigateCreateModelWizard } = await import('../helpers/boot');
  await navigateCreateModelWizard(page);
  await snap('01b-after-wizard.png');

  // ── 2. Upload accumulated.bin (has Var1 = "rudder") ───────────────────────
  await uploadFile(page, 'model', ACCUMULATED_BIN);
  await page.waitForTimeout(3000);
  await snap('02-after-upload.png');

  // Tap Home to ensure clean canvas state after upload (dismiss any dialogs).
  await tapBitmap(page, 54, 459);
  await page.waitForTimeout(700);
  await snap('02b-home-after-upload.png');

  // ── 3. Navigate to Vars list ──────────────────────────────────────────────
  await navigateToVars(page);
  await page.waitForTimeout(500);
  await snap('03-vars-list-with-var1.png');

  // ── 4. Add Var2 via list-header + button ──────────────────────────────────
  // Confirmed from vf-C-01: tapBitmap(563,69) opens Var2 editor directly.
  await tapBitmap(page, 563, 69);
  await page.waitForTimeout(700);
  await snap('04-var2-editor-open.png');

  // ── 5. Set Values default = 55% ───────────────────────────────────────────
  // 5 wheel events focus the Values default field (confirmed orange in va17-01 screenshot).
  await wheelNav(page, 5);
  await snap('05-values-focused.png');

  // CDP Enter = encoder press = enter value-editing mode for the highlighted field.
  await cdpEnterKey(page);
  await snap('06-after-enter-edit-mode.png');

  // Increment from 0.0% to 55% — assuming 1% per wheel step.
  await wheelNav(page, 10);
  await snap('06b-after-10-steps.png');
  await wheelNav(page, 10);
  await snap('06c-after-20-steps.png');
  await wheelNav(page, 10);
  await snap('06d-after-30-steps.png');
  await wheelNav(page, 10);
  await snap('06e-after-40-steps.png');
  await wheelNav(page, 10);
  await snap('06f-after-50-steps.png');
  await wheelNav(page, 5);
  await snap('07-after-55-steps.png');

  // Confirm value with encoder press.
  await cdpEnterKey(page);
  await snap('08-after-confirm-value.png');

  // ── 6. Set Comment = "Elevat" ─────────────────────────────────────────────
  // Comment field is at (600,267). Tap to open keyboard.
  // Keyboard auto-starts UPPERCASE — do NOT press Shift before first char.
  await tapBitmap(page, 600, 267);
  await page.waitForTimeout(700);
  await snap('09-keyboard-open.png');

  // "Elevat": E (auto-caps) then l, e, v, a, t (lowercase after first char)
  // All key presses use touchBitmap — tapBitmap registers wrong keys.
  // Row 1 y=315: Q(40) W(120) E(200) R(280) T(360) Y(440) U(520) I(600) O(680) P(760)
  // Row 2 y=340: A(40)  S(120) D(200) F(280) G(360) H(440) J(520) K(600) L(680)
  // Row 3 y=395: Shift(40) Z(120) X(200) C(280) V(360) B(440) N(520) M(600) Bksp(680)
  await touchBitmap(page, 200, 315); // E (auto-uppercase, first char)
  await page.waitForTimeout(150);
  await touchBitmap(page, 680, 340); // l
  await page.waitForTimeout(150);
  await touchBitmap(page, 200, 315); // e
  await page.waitForTimeout(150);
  await touchBitmap(page, 360, 395); // v
  await page.waitForTimeout(150);
  await touchBitmap(page, 40, 340);  // a
  await page.waitForTimeout(150);
  await touchBitmap(page, 360, 315); // t
  await page.waitForTimeout(200);
  await snap('10-typed-elevat.png');

  // Close keyboard with ENTER, then tap neutral area to commit focus.
  await touchBitmap(page, 700, 450); // ENTER
  await page.waitForTimeout(600);
  await snap('11-comment-set.png');

  await tapBitmap(page, 400, 50); // commit focus, neutral area
  await page.waitForTimeout(300);

  // ── 7. Return to Vars list ────────────────────────────────────────────────
  await goBack(page);
  await page.waitForTimeout(500);
  await snap('12-vars-list-with-var2.png');

  // ── 8. Download model .bin ────────────────────────────────────────────────
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);

  const buffer = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buffer);
  console.log(`Saved accumulated.bin (${buffer.length} bytes)`);

  await snap('13-final.png');
});
