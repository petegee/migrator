/**
 * Probe: Vars editor Values ≡ — find hold duration that triggers type popup.
 *
 * Confirmed: ≡ icon is at bitmap x≈449, y≈390 (unscrolled state).
 * Mouse/touch hold at 900ms opens the control bar, NOT the type popup.
 *
 * Tests: longer hold durations (1200ms, 1500ms, 2000ms) for both mouse and touch.
 * Also tests the scrolled-state position (y≈290 after scroll).
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToVars } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, label: string) =>
  save(label, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function bitmapToPage(page: any, bx: number, by: number) {
  return page.evaluate(([bx, by]: [number, number]) => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: r.x + bx * (r.width / 800), y: r.y + by * (r.height / 480) };
  }, [bx, by]);
}

async function mouseHold(page: any, bx: number, by: number, holdMs: number) {
  const pos = await bitmapToPage(page, bx, by);
  await page.mouse.move(pos.x, pos.y);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
  await page.waitForTimeout(800);
}

async function touchHold(page: any, bx: number, by: number, holdMs: number) {
  const pos = await bitmapToPage(page, bx, by);
  const client = await (page.context() as any).newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: pos.x, y: pos.y, id: 0, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 }],
    modifiers: 0,
  });
  await page.waitForTimeout(holdMs);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ x: pos.x, y: pos.y, id: 0, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 }],
    modifiers: 0,
  });
  await page.waitForTimeout(800);
}

async function openVarEditor(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToVars(page);
  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(700);
}

// ── 1. Mouse hold 1200ms at confirmed ≡ position ────────────────────────────
test('hold-1200ms-mouse', async ({ page }) => {
  await openVarEditor(page);
  await snap(page, 'hd-1200-mouse-00-editor.png');
  await mouseHold(page, 449, 390, 1200);
  await snap(page, 'hd-1200-mouse-01-after.png');
});

// ── 2. Mouse hold 1500ms ──────────────────────────────────────────────────
test('hold-1500ms-mouse', async ({ page }) => {
  await openVarEditor(page);
  await mouseHold(page, 449, 390, 1500);
  await snap(page, 'hd-1500-mouse-01-after.png');
});

// ── 3. Mouse hold 2000ms ──────────────────────────────────────────────────
test('hold-2000ms-mouse', async ({ page }) => {
  await openVarEditor(page);
  await mouseHold(page, 449, 390, 2000);
  await snap(page, 'hd-2000-mouse-01-after.png');
});

// ── 4. Touch hold 1200ms ──────────────────────────────────────────────────
test('hold-1200ms-touch', async ({ page }) => {
  await openVarEditor(page);
  await touchHold(page, 449, 390, 1200);
  await snap(page, 'hd-1200-touch-01-after.png');
});

// ── 5. Touch hold 1500ms ──────────────────────────────────────────────────
test('hold-1500ms-touch', async ({ page }) => {
  await openVarEditor(page);
  await touchHold(page, 449, 390, 1500);
  await snap(page, 'hd-1500-touch-01-after.png');
});

// ── 6. Touch hold 2000ms ──────────────────────────────────────────────────
test('hold-2000ms-touch', async ({ page }) => {
  await openVarEditor(page);
  await touchHold(page, 449, 390, 2000);
  await snap(page, 'hd-2000-touch-01-after.png');
});

// ── 7. Mouse hold 1500ms at scrolled-state position (y≈290) ─────────────
// After scrolling editor down, Values ≡ moves to y≈290.
// Try long-hold there in case scroll state matters.
test('hold-1500ms-mouse-scrolled-y', async ({ page }) => {
  await openVarEditor(page);
  // Scroll down to expose Actions section (same as nav skills recipe)
  const centre = await bitmapToPage(page, 400, 300);
  const client = await (page.context() as any).newCDPSession(page);
  for (let i = 0; i < 3; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: centre.x, y: centre.y,
      deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse',
    });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
  await snap(page, 'hd-scrolled-00-after-scroll.png');
  // Values ≡ at y≈290 in scrolled state
  await mouseHold(page, 449, 290, 1500);
  await snap(page, 'hd-scrolled-01-after-hold.png');
});
