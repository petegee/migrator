/**
 * Probe: Keyboard key input — touchBitmap vs tapBitmap, row y-coordinates
 *
 * Round 1 results (confirmed):
 *   - touchBitmap WORKS for key input ✓
 *   - Row 2 (ASDFGHJKL) at bitmap y=340 ✓  (x-spacing 80px: A=40,S=120,D=200,F=280,G=360,H=440,J=520,K=600,L=680)
 *   - y=262 is ABOVE the keyboard — taps hit the editor fields and dismiss keyboard
 *   - tapBitmap ENTER at (700, 415) did NOT close the keyboard
 *
 * Round 2 goal:
 *   - Pin down Row 1 y (estimated bitmap y≈280, canvas y≈223)
 *   - Pin down Row 3 y (estimated bitmap y≈396, canvas y≈317)
 *   - Confirm ENTER with touchBitmap at estimated y≈452
 *
 * x-column mapping (80px spacing, same for all rows):
 *   col 0 = x=40, col 1 = x=120, col 2 = x=200, col 3 = x=280 ...
 *   Row 1: Q  W  E  R  T  Y  U  I  O  P   (x=40..760)
 *   Row 2: A  S  D  F  G  H  J  K  L      (x=40..680)
 *   Row 3: Z  X  C  V  B  N  M            (x=120..600, shift at x=40, backspace x=720)
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToFlightModes, goBack } from '../helpers/navigate';

test('probe: keyboard key C via touchBitmap', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToFlightModes(page);

  // Add FM1 — editor auto-opens
  await tapBitmap(page, 569, 69);
  await page.waitForTimeout(600);

  const editorOpen = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('01-fm-editor-open', { body: editorOpen, contentType: 'image/png' });

  // Open name keyboard via touch (confirmed: touchBitmap at 780,80 works)
  await touchBitmap(page, 780, 80);
  await page.waitForTimeout(600);

  const keyboardOpen = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('02-keyboard-open', { body: keyboardOpen, contentType: 'image/png' });

  // Type 'C' using touchBitmap — Row 3 ZXCVBNM, y≈340, C is 3rd key
  // Key grid row 3: Z=40, X=120, C=200, V=280, B=360, N=440, M=520  (approx, 80px spacing)
  // Previous spec had C at x=280 but that might be V. Trying x=200 for C.
  await touchBitmap(page, 200, 340);
  await page.waitForTimeout(300);

  const afterC = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('03-after-C-touch-200-340', { body: afterC, contentType: 'image/png' });

  // Also try x=280 (was used previously) to compare
  await touchBitmap(page, 280, 340);
  await page.waitForTimeout(300);

  const afterC2 = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('04-after-touch-280-340', { body: afterC2, contentType: 'image/png' });

  // Try tapping ENTER (700, 415) to confirm what was typed
  await tapBitmap(page, 700, 415);
  await page.waitForTimeout(400);

  const afterEnter = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('05-after-enter', { body: afterEnter, contentType: 'image/png' });
});

test('probe: keyboard row key positions — screenshot full keyboard', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToFlightModes(page);

  // Add FM1
  await tapBitmap(page, 569, 69);
  await page.waitForTimeout(600);

  // Open name keyboard
  await touchBitmap(page, 780, 80);
  await page.waitForTimeout(600);

  // Capture the full keyboard at high zoom — just the screenshot is enough
  // to read the key positions visually
  const keyboard = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('keyboard-layout', { body: keyboard, contentType: 'image/png' });

  // Touch key at known column positions to identify actual key x-coords.
  // Row 1 (y=262): tap at x=40,120,200,280,360,440,520,600,680,760 → should be Q,W,E,R,T,Y,U,I,O,P
  for (const x of [40, 120, 200, 280, 360, 440, 520, 600, 680, 760]) {
    await touchBitmap(page, x, 262);
    await page.waitForTimeout(150);
  }

  const row1typed = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('row1-qwertyuiop-typed', { body: row1typed, contentType: 'image/png' });
});

// ─── Round 2: pin down row y-coordinates ────────────────────────────────────

async function openKeyboard(page: import('@playwright/test').Page) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToFlightModes(page);
  await tapBitmap(page, 569, 69);   // add FM1 → editor auto-opens
  await page.waitForTimeout(600);
  await touchBitmap(page, 780, 80); // open name keyboard
  await page.waitForTimeout(600);
}

test('probe: Row 1 y-sweep — descend from y=340 to y=300 at x=200', async ({ page }) => {
  // Previous sweep (ascending from y=270) failed: y=270 dismissed keyboard
  // immediately and all subsequent steps were wasted.
  //
  // This sweep DESCENDS from the confirmed Row 2 hit (y=340) upward toward Row 1.
  // x=200 column: Row1='E', Row2='D'. Name field accumulates typed chars.
  // The first screenshot where the accumulated string contains 'E' identifies Row 1 y.
  // If a tap dismisses the keyboard, the following screenshots show the FM editor.
  //
  // Confirmed so far: Row2 y=340, Row3 y=385, ENTER touchBitmap y=450.
  await openKeyboard(page);

  const before = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('00-keyboard-open', { body: before, contentType: 'image/png' });

  for (const y of [340, 335, 330, 325, 320, 315, 310, 305, 300]) {
    await touchBitmap(page, 200, y);
    await page.waitForTimeout(350);
    const snap = await page.locator('canvas').screenshot({ type: 'png' });
    await test.info().attach(`row1-x200-y${y}`, { body: snap, contentType: 'image/png' });
  }
});

test('probe: Row 3 y-sweep — C at x=280, y=380..420', async ({ page }) => {
  // x=280 column: Row1=R, Row2=F (confirmed y=340), Row3=C
  // Sweep y from 380 to 420. First screenshot showing 'C' identifies Row 3 y.
  await openKeyboard(page);

  const before = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('00-keyboard-open', { body: before, contentType: 'image/png' });

  for (const y of [380, 385, 390, 395, 400, 405, 410, 415, 420]) {
    await touchBitmap(page, 280, y);
    await page.waitForTimeout(350);
    const snap = await page.locator('canvas').screenshot({ type: 'png' });
    await test.info().attach(`row3-x280-y${y}`, { body: snap, contentType: 'image/png' });
  }
});

test('probe: ENTER via touchBitmap at y=445..460', async ({ page }) => {
  // Type 'S' (confirmed: x=120, y=340) then try touchBitmap ENTER.
  // Keyboard closes when ENTER registers — final screenshot shows editor without keyboard.
  await openKeyboard(page);

  // Type 'S' so the name field is non-empty (easier to see if it committed)
  await touchBitmap(page, 120, 340); // S
  await page.waitForTimeout(300);
  const afterS = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('01-after-S', { body: afterS, contentType: 'image/png' });

  // Try ENTER at increasing y values — stop annotating once keyboard closes
  for (const y of [445, 450, 455, 460]) {
    await touchBitmap(page, 700, y);
    await page.waitForTimeout(400);
    const snap = await page.locator('canvas').screenshot({ type: 'png' });
    await test.info().attach(`enter-y${y}`, { body: snap, contentType: 'image/png' });
  }
});
