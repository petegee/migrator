/**
 * Probe: Intercept console.log during upload to trace what happens
 *
 * The Angular bundle logs "Writing <path>" from its writeFile() method.
 * Also intercept console.error to catch silent failures.
 *
 * Also: directly inspect app-simulation __ngContext__ for the FS signal.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { uploadFile } from '../helpers/upload';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const LUA_SCRIPT = `
local function init()
  model.name("LUA_OK")
  local c = model.createCurve()
  c:name("PROBE")
  model.dirty()
end
local function run(event, touchState) end
return { init=init, run=run }
`.trimStart();

function makeZip(entries: Record<string, string>): string {
  const zipPath = path.join(os.tmpdir(), 'ethos_plugin.zip');
  const zip = new AdmZip();
  for (const [p, content] of Object.entries(entries)) {
    zip.addFile(p, Buffer.from(content, 'utf8'));
  }
  zip.writeZip(zipPath);
  return zipPath;
}

test('probe: console.log intercept during upload', async ({ page }) => {
  const zipPath = makeZip({ 'tools/probe_tool/probe_tool.lua': LUA_SCRIPT });
  const consoleLogs: string[] = [];

  // Capture all console messages from the page
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    consoleLogs.push(`[pageerror] ${err.message}`);
  });

  await bootApp(page);
  await navigateCreateModelWizard(page);

  consoleLogs.push('--- UPLOAD START ---');
  await uploadFile(page, 'lua', zipPath);
  await page.waitForTimeout(3_000);
  consoleLogs.push('--- UPLOAD END ---');

  console.log('=== CONSOLE LOG DUMP ===');
  // Show logs from upload start onwards
  const startIdx = consoleLogs.findIndex(l => l.includes('UPLOAD START'));
  console.log(consoleLogs.slice(Math.max(0, startIdx - 2)).join('\n'));

  fs.unlinkSync(zipPath);
});

test('probe: inspect app-simulation __ngContext__ for FS', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const result = await page.evaluate(() => {
    const el = document.querySelector('app-simulation') as any;
    if (!el) return { error: 'app-simulation not found' };

    const ctx = el.__ngContext__;
    if (!ctx) return { error: 'no __ngContext__' };

    const info: any = {
      ctxType: typeof ctx,
      ctxIsArray: Array.isArray(ctx),
      ctxLength: Array.isArray(ctx) ? ctx.length : 'n/a',
      items: [],
    };

    if (Array.isArray(ctx)) {
      for (let i = 0; i < Math.min(ctx.length, 30); i++) {
        const item = ctx[i];
        if (!item || typeof item !== 'object') {
          info.items.push(`[${i}]: ${typeof item} = ${item}`);
          continue;
        }
        const keys = Object.keys(item).slice(0, 20);
        const hasFsLike = keys.some(k => {
          try {
            const v = (item as any)[k];
            return typeof v === 'function' && v.toString().includes('readdir');
          } catch { return false; }
        });
        info.items.push(`[${i}]: object with keys: ${keys.join(', ')}${hasFsLike ? ' *** FS-LIKE ***' : ''}`);

        // Check for writeFile
        if (typeof item.writeFile === 'function') {
          info.items.push(`  *** writeFile found at [${i}]! ***`);
        }
        // Check for FS signal
        for (const k of keys) {
          try {
            const v = (item as any)[k];
            if (typeof v === 'function') {
              const r = v();
              if (r && typeof r.readdir === 'function') {
                info.items.push(`  *** FS signal at [${i}].${k}()! readdir exists ***`);
                // Try to list files
                try {
                  const entries = r.readdir('/');
                  info.rootEntries = entries;
                } catch (e: any) {
                  info.items.push(`  readdir / failed: ${e.message}`);
                }
              }
            }
          } catch {}
        }
      }
    }

    return info;
  });

  console.log('=== APP-SIMULATION CONTEXT ===');
  console.log(JSON.stringify(result, null, 2));
});

test('probe: try uploadFile via button click sequence manually', async ({ page }) => {
  // Check if the upload button and lua plugin menu item are actually found
  const zipPath = makeZip({ 'tools/probe_tool/probe_tool.lua': LUA_SCRIPT });
  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Manually open the upload menu to see what items are available
  await page.click('button[aria-label="Upload"]');
  await page.locator('.mat-mdc-menu-panel').waitFor({ state: 'visible' });

  const menuItems = await page.locator('.mat-mdc-menu-item').allTextContents();
  console.log('=== UPLOAD MENU ITEMS ===');
  console.log(menuItems.join('\n'));

  // Close menu
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  fs.unlinkSync(zipPath);
});
