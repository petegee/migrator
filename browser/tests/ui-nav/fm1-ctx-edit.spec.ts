/**
 * Probe: FM1 context menu "Edit" action
 *
 * Goal: find the correct y-coordinate and interaction type (tap vs touch) to
 * successfully open the FM1 editor via the context menu "Edit" item.
 *
 * Background:
 * - FM0 has an expanded touch area that intercepts taps at FM1's row (y≈148).
 * - A 4-tap sequence reliably opens the FM1 context menu popup:
 *     1. tapBitmap(400, 148)   — tap FM0 row → FM0 popup
 *     2. tapBitmap(400, 165)   — tap y=165 → dismiss FM0 popup (or select?)
 *     3. tapBitmap(400, 165)   — second tap → FM1 highlighted?
 *     4. tapBitmap(400, 165)   — third tap → FM1 context menu popup
 * - Confirmed from probe screenshot: popup shows Edit/Clone/Delete at approx y=80-145
 * - touchBitmap(400, 132) left popup showing — Edit was NOT triggered
 *
 * This probe tries multiple y-values and interaction types for the "Edit" item.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToFlightModes, goBack } from '../helpers/navigate';

async function openFM1ContextMenu(page: import('@playwright/test').Page): Promise<void> {
  await navigateToFlightModes(page);

  // Add FM1 first (needs to exist for context menu)
  await tapBitmap(page, 569, 69);  // "+" button
  await page.waitForTimeout(600);
  await goBack(page);               // exit FM1 editor (saves FM1)
  await page.waitForTimeout(400);

  // 4-tap sequence to open FM1 context menu
  // Tap FM0 row to open FM0 popup, then tap y=165 three times
  await tapBitmap(page, 400, 148);
  await page.waitForTimeout(300);
  await tapBitmap(page, 400, 165);
  await page.waitForTimeout(300);
  await tapBitmap(page, 400, 165);
  await page.waitForTimeout(300);
  await tapBitmap(page, 400, 165);
  await page.waitForTimeout(400);
}

test('probe: FM1 context menu Edit — tap at various y-values', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openFM1ContextMenu(page);

  const ctxMenu = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('01-ctx-menu-open', { body: ctxMenu, contentType: 'image/png' });

  // Try tapping "Edit" at different y-values (popup items are at approx y=80-145)
  // From probe screenshot fme-pre-80.png: popup appears near top of screen
  // Edit is typically the first item. Try y=85, 95, 105, 115 with tapBitmap.
  for (const y of [85, 95, 105, 115, 125]) {
    await tapBitmap(page, 400, y);
    await page.waitForTimeout(500);

    const snap = await page.locator('canvas').screenshot({ type: 'png' });
    await test.info().attach(`02-tap-400-${y}`, { body: snap, contentType: 'image/png' });

    // If the popup dismissed and we're now in the FM editor, we're done
    // (FM editor has the name pencil icon at x≈780; just capture and stop)
    // Re-open context menu for next attempt if it closed without opening editor
    // (Can't easily detect this without vision — just capture all states)
  }
});

test('probe: FM1 context menu Edit — touchBitmap at y=85,95,105', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openFM1ContextMenu(page);

  const ctxMenu = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('01-ctx-menu-open', { body: ctxMenu, contentType: 'image/png' });

  // Try touchBitmap for Edit — maybe the popup items need touch events
  for (const y of [85, 95, 105]) {
    await touchBitmap(page, 400, y);
    await page.waitForTimeout(500);

    const snap = await page.locator('canvas').screenshot({ type: 'png' });
    await test.info().attach(`02-touch-400-${y}`, { body: snap, contentType: 'image/png' });
  }
});

test('probe: FM1 context menu — screenshot popup item positions', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openFM1ContextMenu(page);

  // Just capture the menu at full resolution — don't touch anything
  const menu = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('fm1-ctx-menu-positions', { body: menu, contentType: 'image/png' });

  // Now try a single tap at the exact center of where "Edit" visually appears
  // Based on prior screenshot: "Edit" label is at approx bitmap (400, 88)
  await tapBitmap(page, 400, 88);
  await page.waitForTimeout(500);

  const after88 = await page.locator('canvas').screenshot({ type: 'png' });
  await test.info().attach('after-tap-88', { body: after88, contentType: 'image/png' });
});
