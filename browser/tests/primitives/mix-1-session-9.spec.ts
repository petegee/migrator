/**
 * mix-1 session-9: RSComp mix — CH8 source + weight=25%
 *
 * Fixes vs session-8:
 *   CH8: ONE scroll (290→130) only, tap y=309 for CH8
 *   Weight: long-hold on weight value row in action editor to get control bar
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, goBack, navigateToMixes } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';
const SC_DIR =
  '/home/pete/Source/ethos/migrator/test-results/mix-1-session-9';

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

// ── Keyboard key layouts ──────────────────────────────────────────────────────
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

async function setName(page: any, keys: [number, number][]) {
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

// ── Test ─────────────────────────────────────────────────────────────────────

test.setTimeout(300_000);

test('mix-1 session-9: RSComp CH8 + weight=25%', async ({ page }) => {
  fs.mkdirSync(SC_DIR, { recursive: true });

  let snapIdx = 0;
  const snap = async (label: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    const file = `${String(snapIdx++).padStart(2, '0')}-${label}.png`;
    fs.writeFileSync(`${SC_DIR}/${file}`, buf);
    console.log(`snap: ${file}`);
  };

  // ── REBUILD ───────────────────────────────────────────────────────────────
  await bootApp(page);
  await navigateCreateModelWizard(page);
  // Accept wizard defaults
  await tapBitmap(page, 54, 459); await page.waitForTimeout(800);
  await tapBitmap(page, 194, 459); await page.waitForTimeout(800);
  await swipeCanvas(page, 'left'); await page.waitForTimeout(1000);

  // Open Vars
  await tapBitmap(page, 300, 330); await page.waitForTimeout(600);
  await tapBitmap(page, 400, 266); await page.waitForTimeout(600);

  // Rudder var
  await setVarName(page, KEYS_RUDDER);
  await setVarAnalogSource(page, true);
  await setVarComment(page, KEYS_RUDDER);
  await tapBitmap(page, 400, 50); await goBack(page); await page.waitForTimeout(500);

  // Elevat var
  await tapBitmap(page, 563, 69); await page.waitForTimeout(600);
  await setVarName(page, KEYS_ELEVAT);
  await setVarAnalogSource(page, false);
  await setVarComment(page, KEYS_ELEVAT);
  await tapBitmap(page, 400, 50); await goBack(page); await page.waitForTimeout(500);
  await goBack(page); await page.waitForTimeout(500);

  // Navigate to Mixes
  await tapBitmap(page, 54, 459); await page.waitForTimeout(600);
  await navigateToMixes(page); await page.waitForTimeout(700);

  // Elev mix (mix-0): first Free mix slot, source = Elevat var (y=288)
  await tapBitmap(page, 563, 69); await page.waitForTimeout(700);
  await tapBitmap(page, 100, 101); await page.waitForTimeout(700);
  await touchBitmap(page, 320, 187); await page.waitForTimeout(700);
  await setName(page, KEYS_ELEV);
  await setMixVarSource(page, 288);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(300);
  await goBack(page); await page.waitForTimeout(700);

  // ── RSComp mix ─────────────────────────────────────────────────────────────
  await tapBitmap(page, 563, 69); await page.waitForTimeout(700);
  await tapBitmap(page, 100, 101); await page.waitForTimeout(700);
  // Placement: 4 existing rows → y = 187 + 4×46 = 371
  await touchBitmap(page, 320, 371); await page.waitForTimeout(700);
  await snap('00-rscomp-placed');

  // Set name RSComp
  await setName(page, KEYS_RSCOMP);
  await snap('01-name-set');

  // Set source = CH8
  // Step 1: open source picker
  await tapBitmap(page, 350, 200); await page.waitForTimeout(700);
  await snap('02-source-picker-compact');

  // Step 2: tap "---" (bottom of compact list) to open full picker
  await tapBitmap(page, 320, 254); await page.waitForTimeout(700);
  await snap('03-source-picker-full');

  // Step 3: scroll to reveal Channels
  await cdpTouchSwipeBitmap(page, 320, 290, 130);
  await snap('04-after-scroll-categories');

  // Step 4: tap Channels category row (y=212 after scroll — confirmed session-8)
  await tapBitmap(page, 320, 212); await page.waitForTimeout(700);
  await snap('05-channels-category-tapped');

  // Step 5: tap "member" row to open channel sub-list (confirmed session-8 at y=309)
  await tapBitmap(page, 510, 309); await page.waitForTimeout(700);
  await snap('06-channel-sublist-opened');

  // Step 6: ONE scroll up to reveal higher channels
  await cdpTouchSwipeBitmap(page, 400, 290, 130);
  await snap('07-after-channel-scroll');

  // Step 7: tap CH8 — bottom of 5-row list after scroll; CH8 center ≈ bitmap y=360
  await tapBitmap(page, 400, 360); await page.waitForTimeout(700);
  await snap('08-ch8-selected');

  // Commit source selection
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
  await snap('09-source-committed');

  // ── Set weight = 25% ───────────────────────────────────────────────────────
  // Touch "Always on Weight 100%" row to open action editor
  await touchBitmap(page, 480, 440); await page.waitForTimeout(800);
  await snap('10-action-editor-opened');

  // The action editor shows:
  //   Active condition  y≈75
  //   Action: Weight ▼  y≈125
  //   Weight/Rates: 100%  y≈175
  //   + Add a new weight  y≈239
  //
  // Snap initial action editor state
  await snap('11a-action-editor-open');

  // CDP wheel navigation to focus Weight/Rates row, then Enter to edit.
  // 3 rows above Weight/Rates: Active condition, Action (each needs 1 wheel).
  await cdpWheelAt(page, 400, 200, 1, 300);
  await snap('11b-wheel-1');
  await cdpWheelAt(page, 400, 200, 1, 300);
  await snap('11c-wheel-2');
  await cdpWheelAt(page, 400, 200, 1, 300);
  await snap('11d-wheel-3');

  // Press Enter to activate the focused row (should be Weight/Rates)
  await cdpEnterKey(page);
  await snap('11-after-enter');

  // Control bar starts at 1% step (confirmed). Step buttons cycle 1%↔10% so two
  // presses cancel. Simplest: 75 decrements at 1% step → 100% → 25%.
  for (let i = 0; i < 75; i++) {
    await touchBitmap(page, 475, 468); // - at confirmed working coords
    await page.waitForTimeout(120);
  }
  await snap('15-weight-25pct');

  // Commit
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
  await snap('16-weight-committed');

  // ── Navigate back and verify ───────────────────────────────────────────────
  // Back out of action editor
  await tapBitmap(page, 25, 25); await page.waitForTimeout(700);
  await snap('17-back-from-action-editor');

  // Back out of mix editor
  await tapBitmap(page, 25, 25); await page.waitForTimeout(700);
  await snap('18-mix-editor-back');

  await tapBitmap(page, 400, 50); await page.waitForTimeout(300);
  await goBack(page); await page.waitForTimeout(700);
  await snap('19-mixes-list-final');

  // ── Download and save ──────────────────────────────────────────────────────
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buffer = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buffer);
  console.log(`Saved accumulated.bin: ${buffer.length} bytes`);
  await snap('20-final');

  expect(buffer.length).toBeGreaterThan(100);
});
