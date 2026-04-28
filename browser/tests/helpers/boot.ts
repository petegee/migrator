import 'dotenv/config';
import { Page, expect } from '@playwright/test';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';

/** App path relative to baseURL. */
export const APP_PATH = '/1.6.6/X18RS_FCC';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Known bitmap-space coordinates for stable boot/wizard elements.
 * These are fixed in the 800×480 WASM framebuffer and do not need vision.
 * Source: wasm-browser-driver.md
 */
const BITMAP = {
  langOk:      { x: 565, y: 297 },
  storageOk:   { x: 639, y: 292 },
  // Model type icons on the wizard first page (bitmap x, y=220)
  wizAirplane: { x:  81, y: 220 },
  wizGlider:   { x: 237, y: 220 },  // 2nd icon; confirmed from pixel analysis
  wizNext:     { x: 729, y: 449 },
} as const;

/**
 * Return the bounding rect of the ETHOS Display canvas.
 *
 * The simulator page has two canvases: the ETHOS Display (WebGL, WASM renderer)
 * and the Controls panel (2D canvas, joystick visualisation). They are similar
 * in area so we identify the Display canvas by its WebGL rendering context.
 */
async function getDisplayRect(page: Page): Promise<{ x: number; y: number; w: number; h: number; index: number }> {
  const result = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    if (!canvases.length) return null;

    // Prefer the canvas that already holds a WebGL context (the ETHOS WASM renderer).
    let idx = canvases.findIndex(c => c.getContext('webgl') !== null || c.getContext('webgl2') !== null);

    // Fallback: largest by area (safety net before WASM initialises).
    if (idx === -1) {
      let bestArea = 0;
      canvases.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const area = r.width * r.height;
        if (area > bestArea) { bestArea = area; idx = i; }
      });
    }

    const r = canvases[idx].getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, index: idx };
  });
  if (!result) throw new Error('getDisplayRect: no canvas elements found');
  return result;
}

/** Capture a PNG screenshot of only the ETHOS Display canvas. */
async function canvasScreenshot(page: Page): Promise<Buffer> {
  const { index } = await getDisplayRect(page);
  return page.locator('canvas').nth(index).screenshot({ type: 'png' });
}

/** MD5 of a buffer — used to detect canvas changes after a click. */
function md5(buf: Buffer): string {
  return createHash('md5').update(buf).digest('hex');
}

/** Return a function that converts 800×480 bitmap coords to page coords. */
async function getCanvasMapper(page: Page) {
  const { x, y, w, h } = await getDisplayRect(page);
  return (bx: number, by: number) => ({
    x: x + bx * (w / 800),
    y: y + by * (h / 480),
  });
}

/**
 * Ask Claude vision to locate a UI element inside a canvas screenshot.
 * Returns pixel coordinates relative to the top-left of the canvas image,
 * or null if the element could not be found.
 *
 * Uses claude-haiku-4-5 — sufficient for element localisation, cheaper,
 * and has higher rate limits than Sonnet.
 */
async function visionLocate(
  imageBuffer: Buffer,
  description: string,
): Promise<{ x: number; y: number } | null> {
  const base64 = imageBuffer.toString('base64');

  let message: Awaited<ReturnType<typeof client.messages.create>> | null = null;
  for (let apiAttempt = 1; apiAttempt <= 4; apiAttempt++) {
    try {
      message = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/png', data: base64 },
              },
              {
                type: 'text',
                text:
                  `Locate the following UI element in this screenshot: "${description}".\n` +
                  'Reply with ONLY a JSON object like {"x": 123, "y": 456} containing the ' +
                  'pixel coordinates of the centre of that element (relative to the top-left ' +
                  'corner of the image). If you cannot find the element, reply with {"x": null, "y": null}.',
              },
            ],
          },
        ],
      });
      break;
    } catch (err: any) {
      if (err?.status === 429 && apiAttempt < 4) {
        const delay = apiAttempt * 5000;
        console.log(`visionLocate: rate limited, retrying in ${delay / 1000}s (attempt ${apiAttempt}/4)`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  if (!message) return null;

  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  const match = text.match(/\{[^}]*"x"\s*:\s*(-?\d+(?:\.\d+)?|null)[^}]*"y"\s*:\s*(-?\d+(?:\.\d+)?|null)[^}]*\}/);
  if (!match) return null;

  const x = match[1] === 'null' ? null : parseFloat(match[1]);
  const y = match[2] === 'null' ? null : parseFloat(match[2]);
  if (x === null || y === null) return null;

  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Click a canvas element identified by a natural-language description.
 *
 * Workflow per attempt:
 *   1. Screenshot the canvas (before hash).
 *   2. Ask Claude vision for the pixel coordinates of the described element.
 *   3. Convert canvas-relative coords to page coords via getBoundingClientRect.
 *   4. Click.
 *   5. Wait briefly, then hash the canvas again.
 *   6. If the hash changed → success; otherwise retry.
 *
 * On total failure the canvas screenshot is attached to the test report.
 */
export async function clickCanvasButton(
  page: Page,
  description: string,
  { retries = 3, waitMs = 800 }: { retries?: number; waitMs?: number } = {},
): Promise<void> {
  let lastScreenshot: Buffer | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const before = await canvasScreenshot(page);
    lastScreenshot = before;
    const beforeHash = md5(before);

    const coords = await visionLocate(before, description);
    if (!coords) {
      if (attempt === retries) break;
      await page.waitForTimeout(waitMs);
      continue;
    }

    const { x: rx, y: ry, w: rw, h: rh } = await getDisplayRect(page);
    const rect = { x: rx, y: ry, w: rw, h: rh };
    if (!rect) throw new Error(`clickCanvasButton: canvas element not found (attempt ${attempt})`);

    const pageX = rect.x + coords.x;
    const pageY = rect.y + coords.y;

    await page.mouse.click(pageX, pageY);
    await page.waitForTimeout(waitMs);

    const after = await canvasScreenshot(page);
    if (md5(after) !== beforeHash) return;

    lastScreenshot = after;
  }

  if (lastScreenshot) {
    try {
      const { test } = await import('@playwright/test');
      await test.info().attach(`clickCanvasButton failed: ${description}`, {
        body: lastScreenshot,
        contentType: 'image/png',
      });
    } catch { /* not in a test context */ }
  }

  throw new Error(
    `clickCanvasButton: element not found or click had no effect after ${retries} attempts — "${description}"`,
  );
}

/**
 * Boot the ETHOS simulator and dismiss all canvas-drawn initialisation dialogs.
 *
 * Uses hardcoded bitmap coordinates for the two boot dialogs — these are stable
 * and documented in wasm-browser-driver.md. No API calls are made during boot.
 */
export async function bootApp(page: Page): Promise<void> {
  await page.goto(APP_PATH);
  await page.locator('canvas').waitFor({ state: 'visible' });

  try {
    await page.locator('mat-progress-bar').waitFor({ state: 'visible', timeout: 5_000 });
  } catch { /* WASM loaded before bar appeared */ }
  await page.locator('mat-progress-bar').waitFor({ state: 'hidden', timeout: 30_000 });

  // Poll until the ETHOS Display canvas (WebGL) is non-black.
  // Identify the Display canvas by its WebGL context, not by size.
  await page.waitForFunction(
    () => {
      const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
      for (const c of canvases) {
        const gl = (c.getContext('webgl') ?? c.getContext('webgl2')) as WebGLRenderingContext | null;
        if (!gl) continue;
        const px = new Uint8Array(4);
        gl.readPixels(400, 240, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        if (px[0] > 30 || px[1] > 30 || px[2] > 30) return true;
      }
      return false;
    },
    { timeout: 20_000 },
  );

  const toPage = await getCanvasMapper(page);

  // Dismiss all informational boot dialogs (language, storage error, and any
  // others that may appear). All observed OK buttons fall in the bitmap range
  // x: 520–660, y: 280–310. We loop until no click causes a canvas change,
  // which means the wizard or main menu has been reached.
  //
  // Each iteration tries the known positions in order and breaks as soon as
  // one causes a canvas change (dialog dismissed). If none of the positions
  // trigger a change, there are no more dialogs and we stop.
  const OK_CANDIDATES = [
    BITMAP.langOk,            // "Select language"        (565, 297)
    BITMAP.storageOk,         // "Radio data load: storage error" (639, 292)
    { x: 528, y: 280 },       // "Model data load: starting wizard" (confirmed via pixel analysis)
    { x: 600, y: 295 },       // generic centre fallback
  ];

  for (let iteration = 0; iteration < 15; iteration++) {
    // Brief wait for an animated dialog to finish appearing before sampling.
    await page.waitForTimeout(500);

    const before = await canvasScreenshot(page);
    const beforeHash = md5(before);
    let dismissed = false;

    for (const pos of OK_CANDIDATES) {
      const pt = toPage(pos.x, pos.y);
      await page.mouse.click(pt.x, pt.y);
      await page.waitForTimeout(700);
      const after = await canvasScreenshot(page);
      if (md5(after) !== beforeHash) {
        dismissed = true;
        break;
      }
    }

    if (!dismissed) break; // no dialog responded — wizard or main menu reached
  }

  await expect(page.locator('button[aria-label="Upload"]')).toBeVisible();
}

/**
 * Navigate the WASM "Create model" wizard using hardcoded bitmap coordinates,
 * OR dismiss it with the back arrow if we just want to reach the main menu.
 *
 * After bootApp the canvas is at either:
 *   a) The "Create model" wizard  → go through it (createModel = true)
 *   b) The main menu              → already done  (createModel = true still safe)
 *
 * If createModel is false, dismiss the wizard via the back arrow instead.
 */
export async function navigateCreateModelWizard(
  page: Page,
  { createModel = true }: { createModel?: boolean } = {},
): Promise<void> {
  const toPage = await getCanvasMapper(page);

  if (!createModel) {
    // Dismiss wizard via back arrow (top-left). If we're already at the main
    // menu this click is harmless — the main menu has no back arrow there.
    const back = toPage(30, 25);
    const before = await canvasScreenshot(page);
    await page.mouse.click(back.x, back.y);
    await page.waitForTimeout(600);
    return;
  }

  // Select Glider type and advance through all wizard pages.
  // The wizard has 7 configuration pages after model-type selection, then a
  // Date & Time screen before reaching the model home screen.  12 Next clicks
  // reliably lands on the home screen regardless of how many boot-dialog clicks
  // accidentally advanced the wizard beforehand.
  const glider = toPage(BITMAP.wizGlider.x, BITMAP.wizGlider.y);
  await page.mouse.click(glider.x, glider.y);
  await page.waitForTimeout(300);

  const next = toPage(BITMAP.wizNext.x, BITMAP.wizNext.y);
  for (let i = 0; i < 12; i++) {
    await page.mouse.click(next.x, next.y);
    await page.waitForTimeout(300);
  }

  await page.waitForTimeout(800);
}
