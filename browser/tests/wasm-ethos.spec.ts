import { test, expect } from '@playwright/test';
import * as path from 'path';

import { bootApp, navigateCreateModelWizard } from './helpers/boot';
import { uploadFile, waitForSnackbar } from './helpers/upload';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from './helpers/download';

const fixture = (...s: string[]) => path.join(__dirname, '..', 'fixtures', ...s);

test('boot — Angular toolbar is visible', async ({ page }) => {
  await bootApp(page);
  await expect(page.locator('button[aria-label="Upload"]')).toBeVisible();
  await expect(page.locator('button[aria-label="Download"]')).toBeVisible();
});

test('upload model file — snackbar confirms success', async ({ page }) => {
  await bootApp(page);
  await uploadFile(page, 'model', fixture('model.bin'));
  await waitForSnackbar(page, 'Model file uploaded');
});

test('download model file — FRSK binary after wizard', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.bin$/);

  const buf = await downloadToBuffer(download);
  expect(buf.length).toBeGreaterThanOrEqual(700);
  expect(buf.subarray(0, 4).toString('ascii')).toBe('FRSK');
});
