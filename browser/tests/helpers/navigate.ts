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
