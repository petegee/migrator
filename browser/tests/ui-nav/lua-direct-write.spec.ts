/**
 * Probe: Direct FS write via Angular simulation service + proper snackbar timing
 *
 * The bundle revealed: simulationService.writeFile(path, data)
 * which calls FS.writeFile() directly. Also FS.mkdirTree() for directories.
 *
 * Strategy:
 * 1. Find the simulation service via Angular's __ngContext__ by looking for
 *    a writeFile method signature
 * 2. Write the Lua script directly to the correct path
 * 3. Check if Lua tile appears after a FS sync / page navigation
 *
 * Also: capture DOM structure to understand what Angular components exist.
 */
import { test, expect } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToModelSetup, swipeCanvas } from '../helpers/navigate';
import { uploadFile } from '../helpers/upload';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) => {
  const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
  save(name, buf);
};

const LUA_SCRIPT = `
local function init()
  model.name("LUA_OK")
  local c = model.createCurve()
  c:name("PROBE")
  model.dirty()
end

local function run(event, touchState)
end

return { init=init, run=run }
`.trimStart();

function makeZip(entries: Record<string, string>): string {
  const zipPath = path.join(os.tmpdir(), 'ethos_plugin.zip');
  const zip = new AdmZip();
  for (const [entryPath, content] of Object.entries(entries)) {
    zip.addFile(entryPath, Buffer.from(content, 'utf8'));
  }
  zip.writeZip(zipPath);
  return zipPath;
}

test('probe: DOM structure and Angular components', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const domInfo = await page.evaluate(() => {
    // List top-level custom elements (Angular components)
    const customEls = Array.from(document.querySelectorAll('*'))
      .map(el => el.tagName.toLowerCase())
      .filter(tag => tag.includes('-'))
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .sort();
    return customEls;
  });
  console.log('=== ANGULAR CUSTOM ELEMENTS ===');
  console.log(domInfo.join('\n'));

  // Try to find writeFile via service in __ngContext__
  const serviceProbe = await page.evaluate(() => {
    const results: string[] = [];
    const elements = document.querySelectorAll('*');
    for (const el of Array.from(elements)) {
      const ctx = (el as any).__ngContext__;
      if (!ctx || !Array.isArray(ctx)) continue;
      for (const item of ctx) {
        if (!item || typeof item !== 'object') continue;
        // Look for writeFile method
        if (typeof item.writeFile === 'function') {
          results.push(`${el.tagName}: has writeFile, keys: ${Object.keys(item).slice(0, 20).join(', ')}`);
        }
        // Look for FS method (signal returning FS)
        for (const k of Object.keys(item).slice(0, 40)) {
          try {
            const v = (item as any)[k];
            if (typeof v === 'function') {
              const called = v();
              if (called && typeof called.readdir === 'function') {
                results.push(`${el.tagName}.${k}(): has readdir — FS found!`);
              }
            }
          } catch {}
        }
      }
    }
    return results;
  });
  console.log('=== SERVICE PROBE ===');
  console.log(serviceProbe.join('\n'));
});

test('probe: upload with proper snackbar wait', async ({ page }) => {
  const zipPath = makeZip({
    'tools/probe_tool/probe_tool.lua': LUA_SCRIPT,
  });

  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Start watching for snackbar BEFORE the upload
  const snackbarAppeared = page.locator('simple-snack-bar').first();

  // Upload and immediately poll for snackbar
  await uploadFile(page, 'lua', zipPath);

  // Wait up to 5s for snackbar to appear with any text
  let snackText: string | null = null;
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(500);
    try {
      const visible = await snackbarAppeared.isVisible();
      if (visible) {
        snackText = await snackbarAppeared.textContent();
        console.log(`=== SNACKBAR at attempt ${i}: "${snackText}" ===`);
        break;
      }
    } catch {}
  }
  if (!snackText) console.log('=== SNACKBAR: never appeared ===');

  await page.waitForTimeout(1_000);
  await snap(page, 'dw-01-after-upload.png');

  fs.unlinkSync(zipPath);
});

test('probe: write Lua script directly via JS to WASM FS paths', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Try to find and invoke the simulation service's writeFile directly
  const writeResult = await page.evaluate(async (script: string) => {
    const log: string[] = [];

    // Walk __ngContext__ looking for writeFile
    const elements = document.querySelectorAll('*');
    for (const el of Array.from(elements)) {
      const ctx = (el as any).__ngContext__;
      if (!ctx || !Array.isArray(ctx)) continue;
      for (const item of ctx) {
        if (!item || typeof item !== 'object') continue;
        if (typeof item.writeFile === 'function') {
          log.push(`Found writeFile on ${el.tagName}`);
          try {
            // Try writing to standard Ethos script paths
            await item.writeFile('/persist/X18RS_FCC/scripts/tools/probe_tool/probe_tool.lua', script);
            log.push('Wrote to /persist/X18RS_FCC/scripts/tools/probe_tool/probe_tool.lua');
          } catch (e: any) {
            log.push(`writeFile failed: ${e.message}`);
            // Try alternate path
            try {
              await item.writeFile('/scripts/tools/probe_tool/probe_tool.lua', script);
              log.push('Wrote to /scripts/tools/probe_tool/probe_tool.lua');
            } catch (e2: any) {
              log.push(`alt path also failed: ${e2.message}`);
            }
          }
        }
      }
    }
    return log;
  }, LUA_SCRIPT);

  console.log('=== DIRECT WRITE RESULT ===');
  console.log(writeResult.join('\n'));

  await page.waitForTimeout(1_500);
  await snap(page, 'dw-02-after-direct-write.png');

  // Check Model Setup page 2
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(500);
  await snap(page, 'dw-03-model-p2.png');

  fs.writeFileSync('/tmp/direct-write-log.txt', writeResult.join('\n'));
});
