/**
 * hvar-0 session-1: ThmC Var — Right Slider source, SG2 condition, Add+Divide actions
 *
 * Architecture:
 *   ETX "high mixes" (Therma + FineAd → ch(8)) → Ethos Var "ThmC"
 *   RSComp mix references ThmC Var (NOT CH8), since ThmC replaces ch(8)
 *
 * Build order: Vars first (so ThmC exists before RSComp references it)
 *   Wizard → Rudder var → Elevat var → ThmC Var → Elev mix → RSComp mix
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, goBack, navigateToMixes } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';
const SC_DIR =
  '/home/pete/Source/ethos/migrator/test-results/hvar-0-session-1';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Keyboard key layouts ─────────────────────────────────────────────────────

// Keyboard: Row1(y=315) QWERTYUIOP, Row2(y=340) ASDFGHJKL, Row3(y=395) Shift ZXCVBNM Bksp, ENTER(700,450)
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
// ThmC: T=[360,315] h=[440,340] m=[600,395] C=[280,395]
const KEYS_THMC: [number, number][] = [
  [360, 315], [40, 395],  [440, 340], [600, 395],
  [40, 395],  [280, 395], [700, 450],
];

// ── Reusable building blocks ─────────────────────────────────────────────────

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

/**
 * Set a Mix source to a Var (by its position in the Var sub-list).
 * varY = bitmap y-coord of the Var in the single-column sub-list.
 * Elevat (2nd var) = 288.  ThmC (3rd var) ≈ 339 (288 + 51).
 */
async function setMixVarSource(page: any, varY: number) {
  await tapBitmap(page, 350, 200); await page.waitForTimeout(700);
  await tapBitmap(page, 320, 254); await page.waitForTimeout(700);
  await cdpTouchSwipeBitmap(page, 320, 290, 130);
  await tapBitmap(page, 320, 261); await page.waitForTimeout(700);
  await tapBitmap(page, 510, 309); await page.waitForTimeout(700);
  await tapBitmap(page, 400, varY); await page.waitForTimeout(700);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
}

/**
 * Create a Var with source=Right Slider.  Requires scrolling the analog sub-list
 * twice to reach Right Slider (y≈347 after 2 scrolls).
 */
async function setVarSourceRightSlider(page: any) {
  await longHoldBitmap(page, 449, 390, 1200);
  await tapBitmap(page, 397, 308); await page.waitForTimeout(700);
  await touchBitmap(page, 510, 395); await page.waitForTimeout(700);
  await tapBitmap(page, 320, 207); await page.waitForTimeout(700);
  await tapBitmap(page, 440, 204); await page.waitForTimeout(700);
  // Open Member sub-list
  await tapBitmap(page, 500, 287); await page.waitForTimeout(500);
  // 2 scrolls to reach Right Slider
  await cdpTouchSwipeBitmap(page, 400, 290, 130);
  await cdpTouchSwipeBitmap(page, 400, 290, 130);
  // Tap Right Slider (estimated y≈347 after 2 scrolls)
  await tapBitmap(page, 400, 347); await page.waitForTimeout(700);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
}

/**
 * Add an action to the current Var via wheel focus + CDP Enter.
 * Then tap function picker, optionally scroll, and select function type.
 * Then set value via control bar.
 */
async function addVarAction(
  page: any,
  centre: { x: number; y: number },
  client: any,
  fnPickerAction: (() => Promise<void>),
  valueTaps: number,
  useStepUp = false,
) {
  // Focus + activate "+ Add a new action"
  for (let i = 0; i < 7; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: centre.x, y: centre.y,
      deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse',
    });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
  await cdpEnterKey(page);

  // Select function type
  await fnPickerAction();

  // Set value
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

test.setTimeout(300_000);

test('hvar-0 session-1: ThmC Var with Right Slider, SG2, Add+Divide', async ({ page }) => {
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
  // PHASE 2: CREATE ALL VARS (Rudder, Elevat, ThmC)
  // ═══════════════════════════════════════════════════════════════════════════

  // Open Vars → empty list
  await tapBitmap(page, 300, 330); await page.waitForTimeout(600);
  await tapBitmap(page, 400, 266); await page.waitForTimeout(600);

  // ── Var 1: Rudder ───────────────────────────────────────────────────────
  await setVarName(page, KEYS_RUDDER);
  await setVarAnalogSource(page, true);  // Rudder auto-highlighted
  await setVarComment(page, KEYS_RUDDER);
  await tapBitmap(page, 400, 50); await goBack(page); await page.waitForTimeout(500);

  // ── Var 2: Elevat ───────────────────────────────────────────────────────
  await tapBitmap(page, 563, 69); await page.waitForTimeout(600);
  await setVarName(page, KEYS_ELEVAT);
  await setVarAnalogSource(page, false);  // select Elevator from sub-list
  await setVarComment(page, KEYS_ELEVAT);
  await tapBitmap(page, 400, 50); await goBack(page); await page.waitForTimeout(500);
  await snap('01-vars-rudder-elevat');

  // ── Var 3: ThmC — Right Slider source, SG2 condition, Add+Divide actions ─
  await tapBitmap(page, 563, 69); await page.waitForTimeout(600);
  await snap('02-thmc-editor-fresh');

  // Name
  await setVarName(page, KEYS_THMC);
  await snap('03-thmc-name');

  // Source = Right Slider
  await setVarSourceRightSlider(page);
  await snap('04-thmc-source');

  // Comment
  await setVarComment(page, KEYS_THMC);
  await snap('05-thmc-comment');

  // SG2 condition on Values row (via "+ Add a new value")
  await touchBitmap(page, 600, 440); await page.waitForTimeout(800);
  await snap('06-thmc-add-value-row');

  await tapBitmap(page, 200, 430); await page.waitForTimeout(700);
  await snap('07-thmc-condition-picker');

  // Scroll to reveal switches
  await cdpTouchSwipeBitmap(page, 320, 290, 130);
  await snap('08-thmc-condition-scrolled');

  // Tap SG2 in switch list (estimated position)
  await tapBitmap(page, 400, 200); await page.waitForTimeout(700);
  await snap('09-thmc-sg2-attempt');

  // Dismiss picker / commit
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);

  // Scroll editor to reveal Actions section
  await cdpTouchSwipeBitmap(page, 400, 440, 150);
  await snap('10-thmc-scrolled-to-actions');

  // Cache coords for wheel
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
    // Open function picker
    await tapBitmap(page, 290, 465); await page.waitForTimeout(700);
    await snap('11-thmc-fn-picker');
    // Scroll to reveal Divide
    await cdpTouchSwipeBitmap(page, 320, 280, 140);
    await snap('12-thmc-fn-picker-scrolled');
    // Tap Divide (slot 2 after 1 scroll, y≈180)
    await tapBitmap(page, 400, 180); await page.waitForTimeout(700);
    await snap('13-thmc-divide-selected');
  }, 25); // 25 taps of + = 25
  await snap('14-thmc-divide-25');

  // Action 2: Add +100
  await addVarAction(page, centre, client, async () => {
    // Open function picker, Add is default at slot 2 (y≈180)
    await tapBitmap(page, 290, 465); await page.waitForTimeout(700);
    await snap('15-thmc-fn-picker2');
    await tapBitmap(page, 400, 180); await page.waitForTimeout(700);
    await snap('16-thmc-add-selected');
  }, 10, true); // 10 taps at 10% step = 100
  await snap('17-thmc-both-actions');

  // Exit Var editor
  await tapBitmap(page, 400, 50); await page.waitForTimeout(300);
  await goBack(page); await page.waitForTimeout(700);
  await snap('18-vars-list-all-three');

  // Back to Model Setup, then to Mixes
  await goBack(page); await page.waitForTimeout(500);
  await tapBitmap(page, 54, 459); await page.waitForTimeout(600);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: CREATE MIXES (Elev → Elevat var, RSComp → ThmC var)
  // ═══════════════════════════════════════════════════════════════════════════

  await navigateToMixes(page); await page.waitForTimeout(700);

  // ── Mix 1: Elev (source = Elevat var, 2nd var → y=288) ─────────────────
  await tapBitmap(page, 563, 69); await page.waitForTimeout(700);
  await tapBitmap(page, 100, 101); await page.waitForTimeout(700);
  await touchBitmap(page, 320, 187); await page.waitForTimeout(700);  // first position
  await clearAndTypeName(page, KEYS_ELEV);
  await setMixVarSource(page, 288);  // Elevat = 2nd var
  await tapBitmap(page, 400, 50); await page.waitForTimeout(300);
  await goBack(page); await page.waitForTimeout(700);
  await snap('19-elev-mix-done');

  // ── Mix 2: RSComp (source = ThmC var, 3rd var → y≈339, weight=25%) ────
  await tapBitmap(page, 563, 69); await page.waitForTimeout(700);
  await tapBitmap(page, 100, 101); await page.waitForTimeout(700);
  // Placement: use "Last position" (y=187) to put RSComp at end of mix list
  await touchBitmap(page, 320, 187); await page.waitForTimeout(700);
  await clearAndTypeName(page, KEYS_RSCOMP);
  await snap('20-rscomp-named');

  // Set source = ThmC Var (3rd var, y≈339)
  await setMixVarSource(page, 339);
  await snap('21-rscomp-source-thmc');

  // Set weight = 25%
  await touchBitmap(page, 480, 440); await page.waitForTimeout(800);
  await cdpWheelAt(page, 400, 200, 3, 300);
  await cdpEnterKey(page);
  for (let i = 0; i < 75; i++) {
    await touchBitmap(page, 475, 468);
    await page.waitForTimeout(120);
  }
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
  // Back out of action editor and mix editor
  await tapBitmap(page, 25, 25); await page.waitForTimeout(700);
  await tapBitmap(page, 25, 25); await page.waitForTimeout(700);
  await tapBitmap(page, 400, 50); await goBack(page); await page.waitForTimeout(700);
  await snap('22-rscomp-done');

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: DOWNLOAD
  // ═══════════════════════════════════════════════════════════════════════════

  // Home
  await tapBitmap(page, 54, 459); await page.waitForTimeout(600);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buffer = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buffer);
  console.log(`Saved accumulated.bin: ${buffer.length} bytes`);
  await snap('23-final-downloaded');

  expect(buffer.length).toBeGreaterThan(100);
});
