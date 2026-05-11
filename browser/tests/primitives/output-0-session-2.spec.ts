/**
 * output-0 session-2: CH1 "Elev" output channel configuration (encoding fix)
 *
 * ETX limitData[0]:
 *   name: Elev, min: 350, max: 0, revert: 0, offset: 0, ppmCenter: -24,
 *   symetrical: 1, curve: 0
 *
 * CORRECTION vs session-1: ETX min encoding is -(100 - N/10)%, not -(N/10)%.
 *   min: 350 → -(100 - 35)% = -65%   (session-1 had -35%, WRONG)
 *
 * So for CH1:
 *   Min: -65.0%  (increase from -100% default by 35 × 1% steps)
 *   Max: +100.0% (default, no change)
 *   Center: 0    (default, no change)
 *   PWM center: -24μs
 *   Direction: Normal (revert=0, default)
 *   Curve: none (curve=0, default)
 *
 * Build strategy: rebuild-from-scratch (navigateCreateModelWizard).
 * Upload was broken in session-1 (doesn't exit wizard).
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, goBack, navigateToMixes } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';
const SC_DIR =
  '/home/pete/Source/ethos/migrator/test-results/output-0-session-2';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

async function cdpWheelAt(page: any, bx: number, by: number, count = 1, deltaY = 300) {
  const client = await (page.context() as any).newCDPSession(page);
  const rect = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')]
      .find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2'));
    const r = c!.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const cssX = rect.x + bx * (rect.w / 800);
  const cssY = rect.y + by * (rect.h / 480);
  for (let i = 0; i < count; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: cssX, y: cssY,
      deltaX: 0, deltaY, modifiers: 0, pointerType: 'mouse',
    });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
}

async function cdpEnterKey(page: any) {
  const client = await (page.context() as any).newCDPSession(page);
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyDown', windowsVirtualKeyCode: 13,
    key: 'Enter', code: 'Enter', nativeVirtualKeyCode: 13,
  });
  await page.waitForTimeout(80);
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp', windowsVirtualKeyCode: 13,
    key: 'Enter', code: 'Enter', nativeVirtualKeyCode: 13,
  });
  await page.waitForTimeout(500);
}

// ── Key sequences ─────────────────────────────────────────────────────────────

const KEYS_RUDDER: [number, number][] = [
  [280, 315], [40, 395],  [520, 315], [200, 340],
  [200, 340], [200, 315], [280, 315], [700, 450],
];
const KEYS_ELEVAT: [number, number][] = [
  [200, 315], [40, 395],  [680, 340], [200, 315],
  [360, 395], [40,  340], [360, 315], [700, 450],
];
const KEYS_ELEV: [number, number][] = [
  [200, 315], [40, 395],  [680, 340], [200, 315],
  [360, 395], [700, 450],
];
const KEYS_RSCOMP: [number, number][] = [
  [280, 315], [120, 340], [280, 395],
  [40, 395], [680, 315], [600, 395], [760, 315],
];
const KEYS_THMC: [number, number][] = [
  [360, 315], [40, 395],  [440, 340], [600, 395],
  [40, 395],  [280, 395], [700, 450],
];
const KEYS_CH_ELEV: [number, number][] = [
  [200, 315],  // E (auto-caps)
  [40, 395],   // Shift → lowercase
  [680, 340],  // l
  [200, 315],  // e
  [360, 395],  // v
  [700, 450],  // ENTER
];

// ── Reusable building blocks ──────────────────────────────────────────────────

async function setVarName(page: any, keys: [number, number][]) {
  await tapBitmap(page, 738, 139); await page.waitForTimeout(700);
  await typeKeys(page, keys); await page.waitForTimeout(500);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
}

async function setVarAnalogSource(page: any, rudderOnly: boolean) {
  await longHoldBitmap(page, 449, 390, 1200);
  await tapBitmap(page, 397, 308); await page.waitForTimeout(700);
  await touchBitmap(page, 510, 395); await page.waitForTimeout(700);
  await tapBitmap(page, 320, 207); await page.waitForTimeout(700);
  await tapBitmap(page, 440, 204); await page.waitForTimeout(700);
  if (!rudderOnly) {
    await tapBitmap(page, 500, 287); await page.waitForTimeout(500);
    await tapBitmap(page, 400, 194); await page.waitForTimeout(500);
  }
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
}

async function setVarComment(page: any, keys: [number, number][]) {
  await tapBitmap(page, 600, 267); await page.waitForTimeout(500);
  await typeKeys(page, keys); await page.waitForTimeout(500);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
}

async function clearAndTypeName(page: any, keys: [number, number][]) {
  await tapBitmap(page, 490, 80); await page.waitForTimeout(700);
  for (let i = 0; i < 8; i++) {
    await touchBitmap(page, 680, 395); await page.waitForTimeout(100);
  }
  await page.waitForTimeout(300);
  await typeKeys(page, keys); await page.waitForTimeout(200);
  await touchBitmap(page, 700, 450); await page.waitForTimeout(600);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
}

async function setMixVarSource(page: any, varY: number) {
  await tapBitmap(page, 350, 200); await page.waitForTimeout(700);
  await tapBitmap(page, 320, 254); await page.waitForTimeout(700);
  await cdpTouchSwipeBitmap(page, 320, 290, 130);
  await tapBitmap(page, 320, 261); await page.waitForTimeout(700);
  await tapBitmap(page, 510, 309); await page.waitForTimeout(700);
  await tapBitmap(page, 400, varY); await page.waitForTimeout(700);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
}

async function setVarSourceRightSlider(page: any) {
  await longHoldBitmap(page, 449, 390, 1200);
  await tapBitmap(page, 397, 308); await page.waitForTimeout(700);
  await touchBitmap(page, 510, 395); await page.waitForTimeout(700);
  await tapBitmap(page, 320, 207); await page.waitForTimeout(700);
  await tapBitmap(page, 440, 204); await page.waitForTimeout(700);
  await tapBitmap(page, 500, 287); await page.waitForTimeout(500);
  await cdpTouchSwipeBitmap(page, 400, 290, 130);
  await cdpTouchSwipeBitmap(page, 400, 290, 130);
  await tapBitmap(page, 400, 347); await page.waitForTimeout(700);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
}

async function addVarAction(
  page: any,
  centre: { x: number; y: number },
  client: any,
  fnPickerAction: (() => Promise<void>),
  valueTaps: number,
  useStepUp = false,
) {
  for (let i = 0; i < 7; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: centre.x, y: centre.y,
      deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse',
    });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
  await cdpEnterKey(page);
  await fnPickerAction();
  await touchBitmap(page, 600, 465); await page.waitForTimeout(700);
  if (useStepUp) {
    await touchBitmap(page, 338, 468); await page.waitForTimeout(200);
  }
  for (let i = 0; i < valueTaps; i++) {
    await touchBitmap(page, 613, 468);
    await page.waitForTimeout(100);
  }
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
}

// ── Test ─────────────────────────────────────────────────────────────────────

test.setTimeout(360_000);

test('output-0 session-2: rebuild + CH1 Elev output config (corrected Min -65%)', async ({ page }) => {
  fs.mkdirSync(SC_DIR, { recursive: true });

  let snapIdx = 0;
  const snap = async (label: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    const file = `${String(snapIdx++).padStart(2, '0')}-${label}.png`;
    fs.writeFileSync(`${SC_DIR}/${file}`, buf);
    console.log(`snap: ${file}`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: BOOT + WIZARD
  // ═══════════════════════════════════════════════════════════════════════════

  await bootApp(page);
  await navigateCreateModelWizard(page);
  await tapBitmap(page, 54, 459); await page.waitForTimeout(800);
  await tapBitmap(page, 194, 459); await page.waitForTimeout(800);
  await swipeCanvas(page, 'left'); await page.waitForTimeout(1000);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: VARS (Rudder, Elevat, ThmC)
  // ═══════════════════════════════════════════════════════════════════════════

  await tapBitmap(page, 300, 330); await page.waitForTimeout(600);
  await tapBitmap(page, 400, 266); await page.waitForTimeout(600);

  // Var 1: Rudder
  await setVarName(page, KEYS_RUDDER);
  await setVarAnalogSource(page, true);
  await setVarComment(page, KEYS_RUDDER);
  await tapBitmap(page, 400, 50); await goBack(page); await page.waitForTimeout(500);

  // Var 2: Elevat
  await tapBitmap(page, 563, 69); await page.waitForTimeout(600);
  await setVarName(page, KEYS_ELEVAT);
  await setVarAnalogSource(page, false);
  await setVarComment(page, KEYS_ELEVAT);
  await tapBitmap(page, 400, 50); await goBack(page); await page.waitForTimeout(500);

  // Var 3: ThmC — Right Slider source, SG2 condition, Divide/25 + Add/100
  await tapBitmap(page, 563, 69); await page.waitForTimeout(600);
  await setVarName(page, KEYS_THMC);
  await setVarSourceRightSlider(page);
  await setVarComment(page, KEYS_THMC);

  // SG2 condition
  await touchBitmap(page, 600, 440); await page.waitForTimeout(800);
  await tapBitmap(page, 200, 430); await page.waitForTimeout(700);
  await cdpTouchSwipeBitmap(page, 320, 290, 130);
  await tapBitmap(page, 400, 200); await page.waitForTimeout(700);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);

  // Scroll to Actions
  await cdpTouchSwipeBitmap(page, 400, 440, 150);

  const centre = await page.evaluate((args: number[]) => {
    const [bx, by] = args;
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: r.x + bx * (r.width / 800), y: r.y + by * (r.height / 480) };
  }, [400, 300]);
  const client = await (page.context() as any).newCDPSession(page);

  // Action 1: Divide /25
  await addVarAction(page, centre, client, async () => {
    await tapBitmap(page, 290, 465); await page.waitForTimeout(700);
    await cdpTouchSwipeBitmap(page, 320, 280, 140);
    await tapBitmap(page, 400, 180); await page.waitForTimeout(700);
  }, 25);

  // Action 2: Add +100
  await addVarAction(page, centre, client, async () => {
    await tapBitmap(page, 290, 465); await page.waitForTimeout(700);
    await tapBitmap(page, 400, 180); await page.waitForTimeout(700);
  }, 10, true);

  await tapBitmap(page, 400, 50); await page.waitForTimeout(300);
  await goBack(page); await page.waitForTimeout(700);
  await snap('01-vars-done');

  await goBack(page); await page.waitForTimeout(500);
  await tapBitmap(page, 54, 459); await page.waitForTimeout(600);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: MIXES (Elev, RSComp)
  // ═══════════════════════════════════════════════════════════════════════════

  await navigateToMixes(page); await page.waitForTimeout(700);

  // Mix 1: Elev (source = Elevat var, 2nd var → y=288)
  await tapBitmap(page, 563, 69); await page.waitForTimeout(700);
  await tapBitmap(page, 100, 101); await page.waitForTimeout(700);
  await touchBitmap(page, 320, 187); await page.waitForTimeout(700);
  await clearAndTypeName(page, KEYS_ELEV);
  await setMixVarSource(page, 288);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(300);
  await goBack(page); await page.waitForTimeout(700);

  // Mix 2: RSComp (source = ThmC var, 3rd var → y≈339, weight=25%)
  await tapBitmap(page, 563, 69); await page.waitForTimeout(700);
  await tapBitmap(page, 100, 101); await page.waitForTimeout(700);
  await touchBitmap(page, 320, 187); await page.waitForTimeout(700);
  await clearAndTypeName(page, KEYS_RSCOMP);
  await setMixVarSource(page, 339);

  // Set weight = 25%
  await touchBitmap(page, 480, 440); await page.waitForTimeout(800);
  await cdpWheelAt(page, 400, 200, 3, 300);
  await cdpEnterKey(page);
  for (let i = 0; i < 75; i++) {
    await touchBitmap(page, 475, 468);
    await page.waitForTimeout(120);
  }
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
  await tapBitmap(page, 25, 25); await page.waitForTimeout(700);
  await tapBitmap(page, 25, 25); await page.waitForTimeout(700);
  await tapBitmap(page, 400, 50); await goBack(page); await page.waitForTimeout(700);
  await snap('02-mixes-done');

  // Home
  await tapBitmap(page, 54, 459); await page.waitForTimeout(600);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: OUTPUTS — CH1 config
  // ═══════════════════════════════════════════════════════════════════════════

  await tapBitmap(page, 194, 459); await page.waitForTimeout(600); // Model Setup
  await tapBitmap(page, 100, 330); await page.waitForTimeout(500); // Outputs tile
  await snap('03-outputs-list');

  // Open CH1 editor (left col, row 1)
  await tapBitmap(page, 200, 112); await page.waitForTimeout(600);
  await snap('04-ch1-default');

  // ── Name: "Elev" ─────────────────────────────────────────────────────────
  await tapBitmap(page, 738, 196); await page.waitForTimeout(800);
  await snap('05-ch1-name-keyboard');

  for (let i = 0; i < 10; i++) {
    await touchBitmap(page, 680, 395); await page.waitForTimeout(100);
  }
  await typeKeys(page, KEYS_CH_ELEV);
  await page.waitForTimeout(600);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(600);
  await snap('06-ch1-after-name');

  // ── Min: -65.0% (ETX min=350 → -(100-35)% = -65%) ───────────────────────
  // From default -100%, increment by 35 × 1% steps to reach -65%.
  // CORRECTION: session-1 incremented 65× (gave -35%) — the encoding is
  //   -(100 - N/10)%, not -(N/10)%.
  await tapBitmap(page, 600, 340); await page.waitForTimeout(500);
  await snap('07-ch1-min-bar');

  await tapBitmap(page, 395, 456); await page.waitForTimeout(300); // > step 0.1%→1%
  await snap('07b-ch1-min-stepped');
  for (let i = 0; i < 35; i++) {
    await tapBitmap(page, 675, 456); await page.waitForTimeout(60); // + increment
  }
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
  await snap('08-ch1-after-min');

  // ── Max: 0 → default +100% (no change) ───────────────────────────────────
  // ── Center/Subtrim: offset=0 (no change) ─────────────────────────────────

  // ── PWM center: ppmCenter=-24 → 1476μs ───────────────────────────────────
  await cdpTouchSwipeBitmap(page, 400, 300, 200);
  await page.waitForTimeout(600);
  await snap('09-ch1-scrolled');

  await tapBitmap(page, 600, 413); await page.waitForTimeout(500); // PWM center (ONE-SCROLL state)
  await snap('10-ch1-ppm-bar');

  for (let i = 0; i < 24; i++) {
    await tapBitmap(page, 562, 456); await page.waitForTimeout(80); // − decrement
  }
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
  await snap('11-ch1-after-ppm');

  // Exit channel editor → Outputs list → Model Setup
  await goBack(page); await page.waitForTimeout(500);
  await snap('12-outputs-list-after');
  await goBack(page); await page.waitForTimeout(400);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5: DOWNLOAD
  // ═══════════════════════════════════════════════════════════════════════════

  await tapBitmap(page, 54, 459); await page.waitForTimeout(600); // Home

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buffer = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buffer);
  console.log(`Saved accumulated.bin: ${buffer.length} bytes`);
  await snap('13-downloaded');

  expect(buffer.length).toBeGreaterThan(100);
});
