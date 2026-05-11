/**
 * mix-1 session-8 v9 (FINAL): Target the new action editor fields precisely.
 *
 * Layout: Title "Action", left panel fields, vertical orange line at x=425 (scrollbar),
 * bottom orange bar at x≈205-240, y≈288-320 (OK button).
 *
 * Try: tap action type selector at y≈80, weight field y≈160, OK button at y≈360.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, swipeCanvas, goBack, navigateToMixes } from '../helpers/navigate';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from '../helpers/download';

const ACCUMULATED_BIN =
  '/home/pete/Source/ethos/migrator/primitive-migration/sessions/BAMF2_Std/accumulated.bin';

async function longHoldBitmap(page: any, bx: number, by: number, holdMs = 1200) {
  const rect = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')]
      .find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2'));
    const r = c!.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const px = rect.x + bx * (rect.w / 800);
  const py = rect.y + by * (rect.h / 480);
  await page.mouse.move(px, py); await page.mouse.down();
  await page.waitForTimeout(holdMs); await page.mouse.up();
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

async function bitmapToPage(page: any, bx: number, by: number) {
  return page.evaluate((args: number[]) => {
    const [bx, by] = args;
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: r.x + bx * (r.width / 800), y: r.y + by * (r.height / 480) };
  }, [bx, by]);
}

async function cdpWheelFocusAddNewAction(page: any, wheelCount = 7) {
  const centre = await bitmapToPage(page, 400, 300);
  const client = await (page.context() as any).newCDPSession(page);
  for (let i = 0; i < wheelCount; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: centre.x, y: centre.y,
      deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse',
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

// ═══════════════════════════════════════════════════════════════════════════════

test.setTimeout(300_000);

test('mix-1 session-8 v9: Final targeted new action config', async ({ page }) => {
  const SC_DIR =
    '/home/pete/Source/ethos/migrator/test-results/mix-1-session-8';
  fs.mkdirSync(SC_DIR, { recursive: true });

  let snapIdx = 0;
  const snap = async (label: string) => {
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    const file = `${String(snapIdx++).padStart(2, '0')}-${label}.png`;
    fs.writeFileSync(`${SC_DIR}/${file}`, buf);
    console.log(`snap: ${file}`);
  };

  // Rebuild
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await tapBitmap(page, 54, 459); await page.waitForTimeout(800);
  await tapBitmap(page, 194, 459); await page.waitForTimeout(800);
  await swipeCanvas(page, 'left'); await page.waitForTimeout(1000);
  await tapBitmap(page, 300, 330); await page.waitForTimeout(600);
  await tapBitmap(page, 400, 266); await page.waitForTimeout(600);
  await setVarName(page, KEYS_RUDDER);
  await setVarAnalogSource(page, true);
  await setVarComment(page, KEYS_RUDDER);
  await tapBitmap(page, 400, 50); await goBack(page); await page.waitForTimeout(500);
  await tapBitmap(page, 563, 69); await page.waitForTimeout(600);
  await setVarName(page, KEYS_ELEVAT);
  await setVarAnalogSource(page, false);
  await setVarComment(page, KEYS_ELEVAT);
  await tapBitmap(page, 400, 50); await goBack(page); await page.waitForTimeout(500);
  await goBack(page); await page.waitForTimeout(500);
  await tapBitmap(page, 54, 459); await page.waitForTimeout(600);
  await navigateToMixes(page); await page.waitForTimeout(700);
  await tapBitmap(page, 563, 69); await page.waitForTimeout(700);
  await tapBitmap(page, 100, 101); await page.waitForTimeout(700);
  await touchBitmap(page, 320, 187); await page.waitForTimeout(700);
  await setName(page, KEYS_ELEV);
  await setMixVarSource(page, 288);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(300);
  await goBack(page); await page.waitForTimeout(700);
  await tapBitmap(page, 563, 69); await page.waitForTimeout(700);
  await tapBitmap(page, 100, 101); await page.waitForTimeout(700);
  await touchBitmap(page, 320, 371); await page.waitForTimeout(700);
  await setName(page, KEYS_RSCOMP);
  await tapBitmap(page, 350, 200); await page.waitForTimeout(700);
  await tapBitmap(page, 320, 254); await page.waitForTimeout(700);
  await cdpTouchSwipeBitmap(page, 320, 290, 130);
  await tapBitmap(page, 320, 212); await page.waitForTimeout(700);
  await tapBitmap(page, 510, 309); await page.waitForTimeout(700);
  await cdpTouchSwipeBitmap(page, 400, 350, 150);
  await cdpTouchSwipeBitmap(page, 400, 350, 150);
  await tapBitmap(page, 400, 340); await page.waitForTimeout(700);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);
  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);

  // Open new action editor via CDP wheel + Enter
  await cdpWheelFocusAddNewAction(page, 7);
  await cdpEnterKey(page);
  await snap('00-new-action-editor');

  // ═══════════════════════════════════════════════════════════════════════════
  // Based on layout analysis:
  //   y=68-80: First field (Action type?) — text at left, value at x≈350
  //   y=172-180: Text "Weight" at x≈50 — the action type label
  //   y=288-320 x=205-240: Orange OK button (bottom)
  //
  // Try: tap right side of first field (action type picker)
  // ═══════════════════════════════════════════════════════════════════════════
  await touchBitmap(page, 480, 80);       // right edge of first row
  await page.waitForTimeout(700);
  await snap('01-tap-action-type');

  // If picker opened, select "Weight"
  await touchBitmap(page, 320, 200);      // middle of picker list
  await page.waitForTimeout(700);
  await snap('02-select-weight');

  // Tap the weight value field (might be at y≈130-180 in the new action editor)
  await touchBitmap(page, 480, 160);      // right side of weight field
  await page.waitForTimeout(700);
  await snap('03-tap-weight-value');

  // If control bar appeared, adjust to 25%
  await touchBitmap(page, 338, 468); await page.waitForTimeout(150);
  await touchBitmap(page, 338, 468); await page.waitForTimeout(150);
  await touchBitmap(page, 338, 468); await page.waitForTimeout(200);
  for (let i = 0; i < 7; i++) {
    await touchBitmap(page, 475, 468); await page.waitForTimeout(150);
  }
  await touchBitmap(page, 63, 468); await page.waitForTimeout(200);
  for (let i = 0; i < 5; i++) {
    await touchBitmap(page, 475, 468); await page.waitForTimeout(150);
  }
  await snap('04-weight-25');

  await tapBitmap(page, 400, 50); await page.waitForTimeout(400);

  // Tap the OK button at bottom center (bitmap y≈360, x≈278)
  await touchBitmap(page, 278, 360);
  await page.waitForTimeout(700);
  await snap('05-ok-tapped');

  // Back and save
  await tapBitmap(page, 25, 25); await page.waitForTimeout(700);
  await snap('06-back1');
  await tapBitmap(page, 25, 25); await page.waitForTimeout(700);
  await snap('07-back2');
  await tapBitmap(page, 400, 50); await page.waitForTimeout(300);
  await goBack(page); await page.waitForTimeout(700);
  await snap('08-mixes-list');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buffer = await downloadToBuffer(download);
  fs.writeFileSync(ACCUMULATED_BIN, buffer);
  console.log(`Saved accumulated.bin: ${buffer.length} bytes`);
  await snap('09-final');

  expect(buffer.length).toBeGreaterThan(100);
});
