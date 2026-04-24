import { Page, expect } from '@playwright/test';

/**
 * Regex to identify each upload menu item in the mat-menu opened by the
 * Upload toolbar button.  Angular Material prepends a Material icon name to
 * the visible text, so we match the meaningful words only.
 */
const MENU_TEXT: Record<string, RegExp> = {
  model:  /model file/i,
  backup: /radio backup/i,
  audio:  /audio pack/i,
  lua:    /lua plugin/i,
  csv:    /csv translations/i,
};

export type InputKey = keyof typeof MENU_TEXT;

/**
 * Upload a file by clicking the Upload toolbar button, selecting the
 * matching menu item, and supplying the file to the browser file-chooser
 * before Angular's change handler runs.
 *
 * This is the most reliable approach: the native file-chooser mechanism
 * sets el.files correctly and keeps them alive through the change event,
 * avoiding the race condition where setInputFiles + a later dispatchEvent
 * sees an already-cleared FileList.
 */
export async function uploadFile(
  page: Page,
  key: InputKey,
  filePath: string,
): Promise<void> {
  // Register the file-chooser listener BEFORE the click that opens it.
  // Promise.all ensures the listener is active when the menu item triggers
  // input.click() under the hood.
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    (async () => {
      await page.click('button[aria-label="Upload"]');
      // Wait for menu panel to appear, then click the matching item
      await page.locator('.mat-mdc-menu-panel').waitFor({ state: 'visible' });
      await page.locator('.mat-mdc-menu-item').filter({ hasText: MENU_TEXT[key] }).click();
    })(),
  ]);

  await chooser.setFiles(filePath);
}

/**
 * Wait for a Material snackbar containing the expected text to appear.
 *
 * Uses toContainText rather than toHaveText to handle any whitespace or action
 * button text that Angular Material may append to the simple-snack-bar element.
 */
export async function waitForSnackbar(
  page: Page,
  expectedText: string,
  timeout = 10_000,
): Promise<void> {
  await expect(page.locator('simple-snack-bar').first())
    .toContainText(expectedText, { timeout });
}
