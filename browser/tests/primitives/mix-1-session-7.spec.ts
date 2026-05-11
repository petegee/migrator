/**
 * mix-1 session-7: Add RSComp Free mix with Channel 8 source and Weight 25%.
 *
 * ETX primitive (mix-1):
 *   name: RSComp  srcRaw: ch(8)  destCh: 0  mltpx: ADD
 *   weight: 25  swtch: NONE  flightModes: 0
 *
 * Unknowns to discover this session:
 *   1. Source = Channel 8 — Channel picker flow (not Var, not Analog)
 *   2. Weight = 25% — weight adjustment in Free mix editor
 *
 * Rebuild approach: fresh Glider → Rudder var → Elevat var → mix-0 Elev → mix-1 RSComp
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, goBack, navigateToMixes } from '../helpers/navigate';
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

async function typeKeys(page: any, keys: [number, number][]) {
  for (const [x, y] of keys) {
    await touchBitmap(page, x, y);
    await page.waitForTimeout(150);
  }
}

// CDP touch swipe for reliable list scrolling inside dialog overlays.
async function cdpTouchSwipeBitmap(
  page: any, bx: number, byStart: number, byEnd: number, steps = 20,
) {
  const client = await (page.context() as any).newCDPSession(page);
  const rect = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')]
      .find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2'));
    const r = c!.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const cssX = rect.x + bx * (rect.w / 800);
  const cssYStart = rect.y + byStart * (rect.h / 480);
  const cssYEnd = rect.y + byEnd * (rect.h / 480);

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: cssX, y: cssYStart, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
    modifiers: 0,
  });
  for (let i = 1; i <= steps; i++) {
    const y = cssYStart + (cssYEnd - cssYStart) * i / steps;
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: cssX, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
      modifiers: 0,
    });
    await page.waitForTimeout(8);
  }
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ x: cssX, y: cssYEnd, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
    modifiers: 0,
  });
  await page.waitForTimeout(700);
}

// Keyboard key sequences
const KEYS_RUDDER: [number, number][] = [
  [280, 315], [40, 395],  [520, 315], [200, 340],
  [200, 340], [200, 315], [280, 315], [700, 450],
];
const KEYS_ELEVAT: [number, number][] = [
  [200, 315], [40, 395],  [680, 340], [200, 315],
  [360, 395], [40,  340], [360, 315], [700, 450],
];
// "Elev" = E + l + e + v (keyboard starts caps, Shift toggles lowercase)
const KEYS_ELEV: [number, number][] = [
  [200, 315], [40, 395],  [680, 340], [200, 315],
  [360, 395], [700, 450],
];
// "RSComp" = R + S + C (caps) + o + m + p (lowercase after Shift)
// Keyboard starts ALL-CAPS; first char auto-caps; caps stays until Shift toggles.
// Row 1 y=315: Q(40) W(120) E(200) R(280) T(360) Y(440) U(520) I(600) O(680) P(760)
// Row 2 y=340: A(40) S(120) D(200) F(280) G(360) H(440) J(520) K(600) L(680)
// Row 3 y=395: Shift(40) Z(120) X(200) C(280) V(360) B(440) N(520) M(600) Bksp(680)
// ENTER: (700, 450)
const KEYS_RSCOMP: [number, number][] = [
  [280, 315],   // R (auto-caps; stays in caps mode)
  [120, 340],   // S (caps)
  [280, 395],   // C (caps)
  [40, 395],    // Shift → lowercase
  [680, 315],   // o (lowercase)
  [600, 395],   // m (lowercase)
  [760, 315],   // p (lowercase)
];

// Var helpers
async function setVarName(page: any, keys: [number, number][]) {
  await tapBitmap(page, 738, 139);
  await page.waitForTimeout(700);
  await typeKeys(page, keys);
  await page.waitForTimeout(500);
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
}

async function setVarAnalogSource(page: any, rudderOnly: boolean) {
  await longHoldBitmap(page, 449, 390, 1200);
  await tapBitmap(page, 397, 308);        // "Use a source"
  await page.waitForTimeout(700);
  await touchBitmap(page, 510, 395);      // "--- ▼" button
  await page.waitForTimeout(700);
  await tapBitmap(page, 320, 207);        // "---" → full Category list
  await page.waitForTimeout(700);
  await tapBitmap(page, 440, 204);        // "Analogs"
  await page.waitForTimeout(700);
  if (!rudderOnly) {
    await tapBitmap(page, 500, 287);      // row 3 Member col → sub-list
    await page.waitForTimeout(500);
    await tapBitmap(page, 400, 194);      // Elevator
    await page.waitForTimeout(500);
  }
  await tapBitmap(page, 400, 50);         // commit
  await page.waitForTimeout(400);
}

async function setVarComment(page: any, keys: [number, number][]) {
  await tapBitmap(page, 600, 267);
  await page.waitForTimeout(500);
  await typeKeys(page, keys);
  await page.waitForTimeout(500);
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
}

// Mix name helper
async function setName(page: any, keys: [number, number][]) {
  await tapBitmap(page, 490, 80);         // cursor past end (right-aligned text)
  await page.waitForTimeout(700);
  for (let i = 0; i < 8; i++) {
    await touchBitmap(page, 680, 395);    // Backspace ×8
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(300);
  await typeKeys(page, keys);
  await page.waitForTimeout(200);
  await touchBitmap(page, 700, 450);      // ENTER
  await page.waitForTimeout(600);
  await tapBitmap(page, 400, 50);         // commit
  await page.waitForTimeout(400);
}

// Set Source = Var (confirmed mix-0 flow)
async function setMixVarSource(page: any, varY: number) {
  await tapBitmap(page, 350, 200);        // Source → compact popup
  await page.waitForTimeout(700);
  await tapBitmap(page, 320, 254);        // "---" → full Category list
  await page.waitForTimeout(700);
  await cdpTouchSwipeBitmap(page, 320, 290, 130);  // scroll to Vars
  await tapBitmap(page, 320, 261);        // "Vars" → 2-col picker
  await page.waitForTimeout(700);
  await tapBitmap(page, 510, 309);        // Member col row 3 → sub-list
  await page.waitForTimeout(700);
  await tapBitmap(page, 400, varY);       // target Var (Elevat=288)
  await page.waitForTimeout(700);
  await tapBitmap(page, 400, 50);         // commit
  await page.waitForTimeout(400);
}

// ─── test ────────────────────────────────────────────────────────────────────

test.setTimeout(300_000);

test('mix-1 session-7: RSComp Free mix (Channel 8 source, Weight 25%)', async ({ page }) => {
  const SC_DIR =
    '/home/pete/Source/ethos/migrator/test-results/mix-1-session-7';
  fs.mkdirSync(SC_DIR, { recursive: true });

  let snapIdx = 0;
  const snap = async (label: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    const file = `${String(snapIdx++).padStart(2, '0')}-${label}.png`;
    fs.writeFileSync(`${SC_DIR}/${file}`, buf);
    console.log(`snap: ${file}`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Fresh Glider model
  // ═══════════════════════════════════════════════════════════════════════════
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await tapBitmap(page, 54, 459);
  await page.waitForTimeout(800);
  await snap('00-home');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Vars: Rudder (confirmed flow)
  // ═══════════════════════════════════════════════════════════════════════════
  await tapBitmap(page, 194, 459);
  await page.waitForTimeout(800);
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(1000);
  await tapBitmap(page, 300, 330);
  await page.waitForTimeout(600);

  await tapBitmap(page, 400, 266);       // large + → editor
  await page.waitForTimeout(600);
  await setVarName(page, KEYS_RUDDER);
  await setVarAnalogSource(page, true);
  await setVarComment(page, KEYS_RUDDER);
  await tapBitmap(page, 400, 50);
  await goBack(page);
  await page.waitForTimeout(500);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Vars: Elevat (confirmed flow)
  // ═══════════════════════════════════════════════════════════════════════════
  await tapBitmap(page, 563, 69);        // list header +
  await page.waitForTimeout(600);
  await setVarName(page, KEYS_ELEVAT);
  await setVarAnalogSource(page, false);
  await setVarComment(page, KEYS_ELEVAT);
  await tapBitmap(page, 400, 50);
  await goBack(page);
  await page.waitForTimeout(500);
  await snap('03-vars-both-added');

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Navigate to Mixes
  // ═══════════════════════════════════════════════════════════════════════════
  await goBack(page);
  await page.waitForTimeout(500);
  await tapBitmap(page, 54, 459);
  await page.waitForTimeout(600);
  await navigateToMixes(page);
  await page.waitForTimeout(700);
  await snap('04-mixes-list');

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Add mix-0: Elev (confirmed flow from mix-0 session-1)
  // ═══════════════════════════════════════════════════════════════════════════
  await tapBitmap(page, 563, 69);          // list header +
  await page.waitForTimeout(700);
  await tapBitmap(page, 100, 101);         // Free mix r1c1
  await page.waitForTimeout(700);
  await touchBitmap(page, 320, 187);       // placement: Before Ailerons (first)
  await page.waitForTimeout(700);
  await snap('05a-free-mix-editor');

  // Name = "Elev"
  await setName(page, KEYS_ELEV);
  await snap('05b-name-elev-set');

  // Source = Elevat Var
  await setMixVarSource(page, 288);        // 288 = Elevat in sub-list
  await snap('05c-source-elevat-set');

  // Return to list
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(300);
  await goBack(page);
  await page.waitForTimeout(700);
  await snap('05d-mix0-added-to-list');

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Add mix-1: RSComp (NEW flow — Channel 8 source, Weight 25%)
  // ═══════════════════════════════════════════════════════════════════════════
  await tapBitmap(page, 563, 69);          // list header +
  await page.waitForTimeout(700);
  await tapBitmap(page, 100, 101);         // Free mix r1c1
  await page.waitForTimeout(700);

  // Placement popup: with 3 preset + 1 custom mix = 4 existing, "Last position"
  // should be ~187 + 4*46 = ~371. Try "Before Elev" at y≈187 first.
  // Actually let's use "Last position" this time. With 4 existing mixes:
  // Mix list order: Elev (custom), Ailerons, Elevators, Rudders
  // "Last position" puts it after Rudders. Try y = 187 + 4*46 = 371
  await touchBitmap(page, 320, 371);       // "Last position" (estimated)
  await page.waitForTimeout(700);
  await snap('06a-free-mix-editor-rscomp');

  // ── 6a. Set Name = "RSComp" ────────────────────────────────────────────────
  await setName(page, KEYS_RSCOMP);
  await snap('06b-name-rscomp-set');

  // ── 6b. Set Source = Channel 8 ─────────────────────────────────────────────
  // Flow: tap Source → compact popup → "---" → full Category list →
  //       CDP swipe → tap "Channels" (y≈212 after swipe) → pick CH8
  await tapBitmap(page, 350, 200);        // Source → compact popup
  await page.waitForTimeout(700);
  await snap('06c-source-compact-popup');

  await tapBitmap(page, 320, 254);        // "---" → full Category list
  await page.waitForTimeout(700);
  await snap('06d-source-fulllist-initial');

  // CDP touch swipe to reveal Channels (same as Var flow)
  // After swipe: Trims≈163, Channels≈212, Vars≈261, Gyro≈310, Trainer≈358
  await cdpTouchSwipeBitmap(page, 320, 290, 130);
  await snap('06e-source-fulllist-scrolled');

  // Tap "Channels" at bitmap y≈212
  await tapBitmap(page, 320, 212);
  await page.waitForTimeout(700);
  await snap('06f-channels-picker');

  // Need to select CH8. Channels picker should show a list of channels.
  // Try tapping CH8 directly — if visible in the Member column.
  // Channel list layout likely similar to other 2-col pickers (rows ~49px apart).
  // If CH1≈211, CH2≈260, CH3≈309... then CH8 would need scrolling.
  // Try opening the Member sub-list first: tap Member col row 3 at (510, 309)
  await tapBitmap(page, 510, 309);
  await page.waitForTimeout(700);
  await snap('06g-channel-sublist');

  // Channel sub-list: CH1, CH2, CH3, CH4, CH5, CH6, CH7, CH8, ...
  // Each row ~49px. CH1 at y≈143 (first visible), CH8 at y≈143+7*49≈486?
  // That seems too far — need to scroll. Let me try finding CH8 via scroll.
  // Swipe up to scroll channel list down
  await cdpTouchSwipeBitmap(page, 400, 290, 130);
  await snap('06ga-channel-sublist-scrolled');

  // After scroll: try tapping around where CH8 should be
  // If visible rows span ~6 items, CH8 might be around y≈300
  await tapBitmap(page, 400, 340);        // attempt CH8 (estimate)
  await page.waitForTimeout(700);
  await snap('06h-channel-ch8-tapped');

  // Commit
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
  await snap('06i-source-ch8-committed');

  // ── 6c. Set Weight = 25% ───────────────────────────────────────────────────
  // Actions section: "Always on Weight 100%" row
  // Tap on "Weight 100%" to open numeric control bar
  // The "Weight 100%" text is in the Actions row, right side, around y≈400-430
  await tapBitmap(page, 600, 410);        // tap weight field (estimate)
  await page.waitForTimeout(700);
  await snap('06j-weight-control-bar');

  // Numeric control bar at bottom (y≈468):
  //   < at (63,468)   decrease step size
  //   > at (338,468)  increase step size
  //   - at (475,468)  decrement
  //   + at (613,468)  increment
  //   ⋮ at (750,468)  options
  //
  // Default step = 0.1% → need to increase step to 10% first, then decrement.
  // Tap > to increase step: 0.1 → 1 → 10 (2 taps)
  await touchBitmap(page, 338, 468);      // > (increase step)
  await page.waitForTimeout(200);
  await touchBitmap(page, 338, 468);      // > (1% → 10%? or need more?)
  await page.waitForTimeout(200);
  await snap('06k-step-increased');

  // Decrement from 100% to 25%: need 7.5 steps of 10% = ~8 taps of -
  // Actually: 100% → 90% → 80% → 70% → 60% → 50% → 40% → 30% → 25%
  // If step=10%: 100→90→80→70→60→50→40→30 (7 taps) — need 5 more at step 1%
  // Let me try 7 taps at step 10% then reduce step and do 5 more
  for (let i = 0; i < 8; i++) {
    await touchBitmap(page, 475, 468);    // - (decrement)
    await page.waitForTimeout(150);
  }
  // Now at 20% if step=10%. Let me check.
  await snap('06l-after-decrement');

  // Try reducing step with < and going back up if we overshot
  // If we're at 20%, need to go up 5%. Reduce step to 1% and tap + 5 times.
  await touchBitmap(page, 63, 468);       // < (decrease step) — 10→1
  await page.waitForTimeout(200);
  for (let i = 0; i < 5; i++) {
    await touchBitmap(page, 613, 468);    // + (increment)
    await page.waitForTimeout(150);
  }
  await snap('06m-weight-25-set');

  // Dismiss control bar by tapping neutral area
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(400);
  await snap('06n-weight-25-confirmed');

  // ── 6d. Verify editor ──────────────────────────────────────────────────────
  await snap('06z-editor-final');

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Download and save
  // ═══════════════════════════════════════════════════════════════════════════
  await tapBitmap(page, 400, 50);
  await page.waitForTimeout(300);
  await goBack(page);
  await page.waitForTimeout(700);
  await snap('07-mixes-list-final');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buffer = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buffer);
  console.log(`Saved accumulated.bin: ${buffer.length} bytes`);
  await snap('08-final');

  expect(buffer.length).toBeGreaterThan(100);
});
