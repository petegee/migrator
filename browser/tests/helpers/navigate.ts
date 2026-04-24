import { Page } from '@playwright/test';
import { clickCanvasButton } from './boot';

// Default options for navigation clicks — more retries and wait time than the
// clickCanvasButton default because grid tiles are small and densely packed.
const NAV = { retries: 5, waitMs: 800 };

// ---------------------------------------------------------------------------
// Swipe gesture
// ---------------------------------------------------------------------------

/**
 * Swipe the canvas left or right.
 * Used to move between Model Setup pages (page 1 ↔ page 2).
 */
export async function swipeCanvas(
  page: Page,
  direction: 'left' | 'right',
  { steps = 20, distance = 250 }: { steps?: number; distance?: number } = {},
): Promise<void> {
  const rect = await page.evaluate(() => {
    const c = document.querySelector('canvas');
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

/** Tap the airplane icon in the bottom nav bar → Model Setup page 1. */
export async function navigateToModelSetup(page: Page): Promise<void> {
  await clickCanvasButton(
    page,
    'small airplane or aircraft icon in the row of navigation icons at the bottom of the screen',
    NAV,
  );
  await page.waitForTimeout(400);
}

/** Tap the house/home icon in the bottom nav bar → Home screen. */
export async function navigateHome(page: Page): Promise<void> {
  await clickCanvasButton(
    page,
    'house or home icon in the row of navigation icons at the bottom of the screen',
    NAV,
  );
  await page.waitForTimeout(300);
}

/** Tap the back arrow in the top-left → up one level. */
export async function goBack(page: Page): Promise<void> {
  await clickCanvasButton(
    page,
    'left-pointing arrow or chevron in the top-left corner of the screen',
    NAV,
  );
  await page.waitForTimeout(400);
}

// ---------------------------------------------------------------------------
// Model Setup — Page 1 grid (4 columns × 2 rows)
//
// Layout (left→right, top→bottom):
//   Row 1: Model select | Edit model | Flight modes | Mixes
//   Row 2: Outputs      | Timers     | Trims        | RF system
// ---------------------------------------------------------------------------

export async function navigateToEditModel(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await clickCanvasButton(
    page,
    'square button labeled "Edit model" with a pencil or edit icon, second from the left in the top row of a grid of 8 buttons',
    NAV,
  );
  await page.waitForTimeout(300);
}

export async function navigateToMixes(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await clickCanvasButton(
    page,
    'square button labeled "Mixes" with a mixer or settings icon, fourth from the left in the top row of a grid of 8 buttons',
    NAV,
  );
  await page.waitForTimeout(300);
}

export async function navigateToOutputs(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await clickCanvasButton(
    page,
    'square button labeled "Outputs" with a channel or output icon, first from the left in the bottom row of a grid of 8 buttons',
    NAV,
  );
  await page.waitForTimeout(300);
}

export async function navigateToFlightModes(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await clickCanvasButton(
    page,
    'square button labeled "Flight modes" with an airplane icon, third from the left in the top row of a grid of 8 buttons',
    NAV,
  );
  await page.waitForTimeout(300);
}

export async function navigateToTimers(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await clickCanvasButton(
    page,
    'square button labeled "Timers" with a clock or timer icon, second from the left in the bottom row of a grid of 8 buttons',
    NAV,
  );
  await page.waitForTimeout(300);
}

export async function navigateToTrims(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await clickCanvasButton(
    page,
    'square button labeled "Trims" with a trim icon, third from the left in the bottom row of a grid of 8 buttons',
    NAV,
  );
  await page.waitForTimeout(300);
}

export async function navigateToRFSystem(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await clickCanvasButton(
    page,
    'square button labeled "RF system" with an antenna or radio icon, fourth from the left in the bottom row of a grid of 8 buttons',
    NAV,
  );
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// Model Setup — Page 2 grid (swipe left from page 1 first)
//
// Layout (left→right, top→bottom):
//   Row 1: Telemetry | Checklist | Logic switches | Special functions
//   Row 2: Curves    | Vars      | Trainer        | Lua
// ---------------------------------------------------------------------------

export async function navigateToVars(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await clickCanvasButton(
    page,
    'square button labeled "Vars" with a variable or graph icon, second from the left in the bottom row of a grid of 8 buttons',
    NAV,
  );
  await page.waitForTimeout(300);
}

export async function navigateToCurves(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await clickCanvasButton(
    page,
    'square button labeled "Curves" with a curve or graph icon, first from the left in the bottom row of a grid of 8 buttons',
    NAV,
  );
  await page.waitForTimeout(300);
}

export async function navigateToLogicSwitches(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await clickCanvasButton(
    page,
    'square button labeled "Logic switches" with a logic or switch icon, third from the left in the top row of a grid of 8 buttons',
    NAV,
  );
  await page.waitForTimeout(300);
}

export async function navigateToSpecialFunctions(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await clickCanvasButton(
    page,
    'square button labeled "Special functions" or "Spec. funcs" with a star or special icon, fourth from the left in the top row of a grid of 8 buttons',
    NAV,
  );
  await page.waitForTimeout(300);
}

export async function navigateToTelemetry(page: Page): Promise<void> {
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await clickCanvasButton(
    page,
    'square button labeled "Telemetry" with a signal or antenna icon, first from the left in the top row of a grid of 8 buttons',
    NAV,
  );
  await page.waitForTimeout(300);
}
