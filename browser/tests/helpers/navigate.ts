import { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Bitmap coordinate map (800×480 framebuffer space)
//
// Derived from discover-coords screenshots — no vision API calls needed.
// All positions confirmed against actual ETHOS 1.6.6 X18RS_FCC layout.
// ---------------------------------------------------------------------------
const B = {
  // Bottom nav bar (y=459 for all icons)
  navHome:       { x:  54, y: 459 },
  navModelSetup: { x: 194, y: 459 },

  // Back arrow — top-left, present on every sub-screen
  backArrow:     { x:  25, y:  25 },

  // Model Setup grid — identical positions on Page 1 and Page 2.
  //
  // Page 1  Row 1: Model select | Edit model  | Flight modes | Mixes
  // Page 1  Row 2: Outputs      | Timers      | Trims        | RF system
  // Page 2  Row 1: Telemetry    | Checklist   | Logic sw.    | Spec. funcs
  // Page 2  Row 2: Curves       | Vars        | Trainer      | Lua
  r1c1: { x: 100, y: 140 },
  r1c2: { x: 300, y: 140 },
  r1c3: { x: 500, y: 140 },
  r1c4: { x: 700, y: 140 },
  r2c1: { x: 100, y: 330 },
  r2c2: { x: 300, y: 330 },
  r2c3: { x: 500, y: 330 },
  r2c4: { x: 700, y: 330 },
} as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Click a point in 800×480 bitmap space, mapped to current page coords. */
export async function tapBitmap(page: Page, bx: number, by: number): Promise<void> {
  const rect = await page.evaluate(() => {
    // Identify the ETHOS Display canvas by its WebGL context (WASM renderer).
    // The Controls canvas uses a 2D context and will be skipped.
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null)
           ?? canvases[0]; // fallback before WASM initialises
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) throw new Error('tapBitmap: canvas not found');
  await page.mouse.click(
    rect.x + bx * (rect.w / 800),
    rect.y + by * (rect.h / 480),
  );
}

/** Touch a point in 800×480 bitmap space using touch events (for small controls). */
export async function touchBitmap(page: Page, bx: number, by: number): Promise<void> {
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null)
           ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) throw new Error('touchBitmap: canvas not found');
  await page.touchscreen.tap(
    rect.x + bx * (rect.w / 800),
    rect.y + by * (rect.h / 480),
  );
}

// ---------------------------------------------------------------------------
// Swipe gesture (page 1 ↔ page 2 in Model Setup)
// ---------------------------------------------------------------------------

export async function swipeCanvas(
  page: Page,
  direction: 'left' | 'right',
  { steps = 20, distance = 400 }: { steps?: number; distance?: number } = {},
): Promise<void> {
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null)
           ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) throw new Error('swipeCanvas: canvas not found');
  const startX = rect.x + rect.w / 2;
  const centerY = rect.y + rect.h / 2;
  const endX = direction === 'left' ? startX - distance : startX + distance;
  await page.mouse.move(startX, centerY);
  await page.mouse.down();
  await page.mouse.move(endX, centerY, { steps });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

// ---------------------------------------------------------------------------
// Top-level navigation (bottom bar)
// ---------------------------------------------------------------------------

export async function navigateToModelSetup(page: Page): Promise<void> {
  await tapBitmap(page, B.navModelSetup.x, B.navModelSetup.y);
  await page.waitForTimeout(400);
}

export async function navigateHome(page: Page): Promise<void> {
  await tapBitmap(page, B.navHome.x, B.navHome.y);
  await page.waitForTimeout(300);
}

export async function goBack(page: Page): Promise<void> {
  await tapBitmap(page, B.backArrow.x, B.backArrow.y);
  await page.waitForTimeout(400);
}

// ---------------------------------------------------------------------------
// Model Setup — Page 1
// ---------------------------------------------------------------------------

export async function navigateToEditModel(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await tapBitmap(page, B.r1c2.x, B.r1c2.y);
  await page.waitForTimeout(300);
}

export async function navigateToFlightModes(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await tapBitmap(page, B.r1c3.x, B.r1c3.y);
  await page.waitForTimeout(300);
}

export async function navigateToMixes(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await tapBitmap(page, B.r1c4.x, B.r1c4.y);
  await page.waitForTimeout(300);
}

export async function navigateToOutputs(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await tapBitmap(page, B.r2c1.x, B.r2c1.y);
  await page.waitForTimeout(300);
}

export async function navigateToTimers(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await tapBitmap(page, B.r2c2.x, B.r2c2.y);
  await page.waitForTimeout(300);
}

export async function navigateToTrims(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await tapBitmap(page, B.r2c3.x, B.r2c3.y);
  await page.waitForTimeout(300);
}

export async function navigateToRFSystem(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await tapBitmap(page, B.r2c4.x, B.r2c4.y);
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// Model Setup — Page 2 (swipe left from page 1 first)
// ---------------------------------------------------------------------------

export async function navigateToTelemetry(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await tapBitmap(page, B.r1c1.x, B.r1c1.y);
  await page.waitForTimeout(300);
}

export async function navigateToLogicSwitches(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await tapBitmap(page, B.r1c3.x, B.r1c3.y);
  await page.waitForTimeout(300);
}

export async function navigateToSpecialFunctions(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await tapBitmap(page, B.r1c4.x, B.r1c4.y);
  await page.waitForTimeout(300);
}

export async function navigateToCurves(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await tapBitmap(page, B.r2c1.x, B.r2c1.y);
  await page.waitForTimeout(300);
}

export async function navigateToVars(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await tapBitmap(page, B.r2c2.x, B.r2c2.y);
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// Vars action helpers
// ---------------------------------------------------------------------------

/**
 * Wheel-navigate inside the Var editor to focus the "+ Add a new action" button.
 * Opens the editor first (tapBitmap 400,266 on empty Vars screen), then sends
 * 7 wheel clicks to reach the button (orange highlight).
 *
 * WHY: The button renders at bitmap y≈452–479 (canvas bottom edge). tapBitmap and
 * touchBitmap both fail there. Wheel navigation focuses the item; CDP Enter activates.
 */
export async function focusAddNewAction(page: Page): Promise<void> {
  const centre = await bitmapToPage(page, 400, 300);
  const client = await (page.context() as any).newCDPSession(page);
  for (let i = 0; i < 7; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: centre.x, y: centre.y,
      deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse',
    });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
}

/**
 * Activate the currently wheel-focused item via CDP key dispatch (Enter, keyCode 13).
 * page.keyboard.press('Enter') does NOT work because the WASM canvas has no DOM focus.
 * CDP Input.dispatchKeyEvent bypasses DOM focus and reaches the WASM directly.
 */
export async function cdpEnterKey(page: Page): Promise<void> {
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

async function bitmapToPage(page: Page, bx: number, by: number) {
  return page.evaluate((args: number[]) => {
    const [bx, by] = args;
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: r.x + bx * (r.width / 800), y: r.y + by * (r.height / 480) };
  }, [bx, by]);
}
