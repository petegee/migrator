import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, goBack, swipeCanvas } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';

// ─── helpers ────────────────────────────────────────────────────────────────

async function longHoldBitmap(page: any, bx: number, by: number, holdMs = 1200) {
  const rect = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')]
      .find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2'));
    const r = c!.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const px = rect.x + bx * (rect.w / 800);
  const py = rect.y + by * (rect.h / 480);
  await page.mouse.move(px, py);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
  await page.waitForTimeout(700);
}

// Keyboard layout (bitmap):
//   Row 1 y=315: Q(40) W(120) E(200) R(280) T(360) Y(440) U(520) I(600) O(680) P(760)
//   Row 2 y=340: A(40) S(120) D(200) F(280) G(360) H(440) J(520) K(600) L(680)
//   Row 3 y=395: Shift(40) Z(120) X(200) C(280) V(360) B(440) N(520) M(600) Bksp(680)
//   ENTER: (700, 450)
// First char auto-caps; Shift at (40,395) toggles to lowercase.

// "Rudder": R(280,315) Shift u(520,315) d(200,340) d(200,340) e(200,315) r(280,315) ENTER
const KEYS_RUDDER: [number, number][] = [
  [280, 315], [40, 395],  [520, 315], [200, 340],
  [200, 340], [200, 315], [280, 315], [700, 450],
];

// "Elevat": E(200,315) Shift l(680,340) e(200,315) v(360,395) a(40,340) t(360,315) ENTER
const KEYS_ELEVAT: [number, number][] = [
  [200, 315], [40, 395],  [680, 340], [200, 315],
  [360, 395], [40,  340], [360, 315], [700, 450],
];

async function typeKeys(page: any, keys: [number, number][]) {
  for (const [x, y] of keys) {
    await touchBitmap(page, x, y);
    await page.waitForTimeout(150);
  }
}

// Set Name field via pencil icon at (738, 139).
// Name keyboard does NOT scroll the editor — Values ≡ stays at y=390.
async function setName(page: any, keys: [number, number][]) {
  await tapBitmap(page, 738, 139);
  await page.waitForTimeout(700);
  await typeKeys(page, keys);
  await page.waitForTimeout(500);
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
}

// Set analog source via long-hold Values ≡ → popup → "Use a source" → Analogs → item.
//
// After "Analogs" is selected from the full category list, the TWO-COLUMN PICKER
// reopens showing Category | Member.  Items appear in the LOWER canvas area:
//   Row 1 ("--- " | "Slider right"): bitmap y ≈ 298
//   Row 2 ("Analogs" | "Rudder"):    bitmap y ≈ 328  ← auto-highlighted
//   Row 3 ("Switches"| "Elevator"):  bitmap y ≈ 357
// Member column center x ≈ 510.
//
// rudderOnly=true  → Rudder is already auto-highlighted; just commit with neutral tap.
// rudderOnly=false → tap Elevator at (510, 357) before committing.
async function setAnalogSource(page: any, rudderOnly: boolean) {
  // Long-hold Values ≡ — 1200ms required (900ms opens control bar instead of popup)
  await longHoldBitmap(page, 449, 390, 1200);
  // Tap "Use a source" (popup: Maximum≈201, Minimum≈255, Use a source≈308)
  await tapBitmap(page, 397, 308);
  await page.waitForTimeout(700);
  // Touch "--- ▼" to open category/member picker
  await touchBitmap(page, 510, 395);
  await page.waitForTimeout(700);
  // Tap "---" in Category column → full category list opens
  await tapBitmap(page, 320, 207);
  await page.waitForTimeout(700);
  // Tap "Analogs" in full category list → two-column picker reopens, Rudder auto-highlighted
  await tapBitmap(page, 440, 204);
  await page.waitForTimeout(700);
  if (!rudderOnly) {
    // Two-column picker (after Analogs selected) layout, bitmap coords:
    //   Row 1 ("---"     | "Slider right"): y ≈ 207
    //   Row 2 ("Analogs" | "Rudder"):       y ≈ 247  ← Rudder auto-highlighted
    //   Row 3 ("Switches"| "Elevator"):     y ≈ 287
    // Member column right side: x ≈ 500.
    //
    // Tapping the Member side of Row 3 (Elevator) opens a single-column Member
    // sub-list: Rudder(highlighted), Elevator, Throttle, Aileron, Pot1.
    // A second tap on Elevator in that sub-list selects it.
    await tapBitmap(page, 500, 287);           // open Member sub-list
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/var1s2-picker-after-tap.png' });
    // Elevator in the single-column sub-list: y≈194, x≈400 (calibrated from screenshot)
    await tapBitmap(page, 400, 194);           // select Elevator
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/var1s2-picker-elevator-confirmed.png' });
  }
  // Commit with neutral-area tap (closes picker, commits highlighted member)
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
}

// Set Comment field at (600, 267) — unscrolled editor position.
// Comment keyboard scrolls the editor (Values moves to y≈290 after).
async function setComment(page: any, keys: [number, number][]) {
  await tapBitmap(page, 600, 267);
  await page.waitForTimeout(500);
  await typeKeys(page, keys);
  await page.waitForTimeout(500);
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
}

// ─── test ───────────────────────────────────────────────────────────────────

test('var-1-session-2: enter Rudder and Elevat vars from scratch', async ({ page }) => {
  test.setTimeout(180_000);

  // Boot emulator and create a fresh Glider model (upload is broken — rebuild both vars)
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // The wizard can leave the firmware on a Model Setup sub-page (e.g. Timers).
  // Navigate to Home first, then explicitly to Vars with generous waits so the
  // swipe from page 1 → page 2 of Model Setup reliably lands on the Vars tile.
  await tapBitmap(page, 54, 459);    // Home nav — ensures clean starting state
  await page.waitForTimeout(800);
  await tapBitmap(page, 194, 459);   // Model Setup nav → page 1 grid
  await page.waitForTimeout(800);
  await swipeCanvas(page, 'left');   // page 1 → page 2
  await page.waitForTimeout(1000);   // long wait: page animation must finish
  await tapBitmap(page, 300, 330);   // Vars tile (page 2, row 2, col 2)
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/var1s2-01-vars-empty.png' });

  // ── VAR 1: Rudder (srcRaw=Rud, swtch=NONE, weight=80 — weight not set in Var) ──
  await tapBitmap(page, 400, 266);       // large centred + → editor opens
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/var1s2-02-var1-editor-open.png' });

  await setName(page, KEYS_RUDDER);
  await page.screenshot({ path: 'test-results/var1s2-03-var1-name-set.png' });

  await setAnalogSource(page, true);      // Rudder = auto-highlighted, no extra tap
  await page.screenshot({ path: 'test-results/var1s2-04-var1-source-set.png' });

  await setComment(page, KEYS_RUDDER);
  await page.screenshot({ path: 'test-results/var1s2-05-var1-comment-set.png' });

  await tapBitmap(page, 400, 50);        // deselect before goBack
  await goBack(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/var1s2-06-vars-list-after-rudder.png' });

  // ── VAR 2: Elevat (srcRaw=Ele, swtch=NONE, weight=55 — weight not set in Var) ──
  await tapBitmap(page, 563, 69);        // + in list header → fresh var editor
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/var1s2-07-var2-editor-open.png' });

  await setName(page, KEYS_ELEVAT);
  await page.screenshot({ path: 'test-results/var1s2-08-var2-name-set.png' });

  await setAnalogSource(page, false);     // Elevator = tap 3rd row in picker (510, 357)
  await page.screenshot({ path: 'test-results/var1s2-09-var2-source-set.png' });

  await setComment(page, KEYS_ELEVAT);
  await page.screenshot({ path: 'test-results/var1s2-10-var2-comment-set.png' });

  await tapBitmap(page, 400, 50);        // deselect before goBack
  await goBack(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/var1s2-11-vars-list-final.png' });

  // Download model and overwrite accumulated.bin
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buf = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buf);
  console.log(`accumulated.bin saved: ${buf.length} bytes`);

  expect(buf.length).toBeGreaterThan(500);
});
