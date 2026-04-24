import { Page, Download } from '@playwright/test';
import * as fs from 'fs';

/**
 * Index map for the three items in the Download mat-menu.
 *
 * Confirmed from probe_upload5.py / download_probe.py investigations:
 *   item 0 → "Save the current model file"   (icon: flight)        → .bin download
 *   item 1 → "Save all screenshots"           (icon: screenshot_monitor) → no-op
 *   item 2 → "Save a radio backup"            (icon: cloud_download) → .zip download
 */
export const MENU = {
  modelFile:   0,
  screenshots: 1,
  radioBackup: 2,
} as const;

/**
 * Open the Angular Material Download dropdown and click the specified item.
 *
 * The menu renders into a CDK overlay (.mat-mdc-menu-panel) outside the normal
 * DOM tree; select items by position rather than text to avoid fragile text
 * matching across locale or version changes.
 */
export async function clickDownloadMenuItem(
  page: Page,
  index: number,
): Promise<void> {
  await page.click('button[aria-label="Download"]');
  await page.locator('.mat-mdc-menu-panel button').nth(index).click();
}

/**
 * Read the body of a Playwright download event into a Buffer.
 * Throws if the download path is unavailable (e.g. network error).
 */
export async function downloadToBuffer(download: Download): Promise<Buffer> {
  const filePath = await download.path();
  if (!filePath) {
    throw new Error(`Download path is null for "${download.suggestedFilename()}" — download may have failed`);
  }
  return fs.readFileSync(filePath);
}
