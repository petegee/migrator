/**
 * Probe: Find the Emscripten FS object and the Lua upload destination
 *
 * Goals:
 * 1. Enumerate window globals to find Emscripten Module / FS
 * 2. Intercept Angular upload handler to trace the destination path
 * 3. Check the patched.js wrapper source for FS mount points
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { uploadFile } from '../helpers/upload';
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

local function run(event, touchState)
end

return { init=init, run=run }
`.trimStart();

test('probe: find Emscripten FS in window scope', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const globals = await page.evaluate(() => {
    // Look for Emscripten-related globals
    const candidates: Record<string, string> = {};
    for (const key of Object.keys(window)) {
      if (
        key.includes('FS') || key.includes('Module') || key.includes('emscripten') ||
        key.includes('WASM') || key.includes('wasm') || key.includes('Ethos') ||
        key.includes('Radio') || key.includes('radio')
      ) {
        candidates[key] = typeof (window as any)[key];
      }
    }
    return candidates;
  });
  console.log('=== EMSCRIPTEN GLOBALS ===');
  console.log(JSON.stringify(globals, null, 2));

  // Try common Emscripten module patterns
  const fsProbe = await page.evaluate(() => {
    const w = window as any;
    const tries = [
      'Module', 'Module_', 'FS', 'NODEFS', 'MEMFS',
      'wasmInstance', 'wasmModule', 'EthosModule',
    ];
    const found: Record<string, string> = {};
    for (const k of tries) {
      if (w[k] !== undefined) found[k] = typeof w[k];
    }
    // Also check if Module.FS exists
    if (w.Module && w.Module.FS) found['Module.FS'] = 'exists';
    return found;
  });
  console.log('=== FS PROBE ===');
  console.log(JSON.stringify(fsProbe, null, 2));
});

test('probe: intercept upload and log filesystem changes', async ({ page }) => {
  const scriptPath = path.join(os.tmpdir(), 'probe_tool.lua');
  fs.writeFileSync(scriptPath, LUA_SCRIPT);

  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Inject a filesystem spy before upload — intercept writeFile, open, etc.
  // Try to patch through Angular's component if possible
  await page.evaluate(() => {
    const w = window as any;
    // Intercept XMLHttpRequest in case upload goes through XHR
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    w._uploadLog = [];
    XMLHttpRequest.prototype.open = function(method: string, url: string, ...rest: any[]) {
      w._uploadLog.push({ type: 'xhr-open', method, url });
      return origOpen.call(this, method, url, ...rest);
    };
    // Also intercept fetch
    const origFetch = window.fetch;
    window.fetch = function(input: any, init: any) {
      w._uploadLog.push({ type: 'fetch', url: String(input) });
      return origFetch.call(window, input, init);
    };
  });

  await uploadFile(page, 'lua', scriptPath);
  await page.waitForTimeout(2_000);

  const uploadLog = await page.evaluate(() => (window as any)._uploadLog || []);
  console.log('=== UPLOAD NETWORK LOG ===');
  console.log(JSON.stringify(uploadLog, null, 2));

  // Check if there's an Angular service or component with FS access
  const angularProbe = await page.evaluate(() => {
    const w = window as any;
    // Angular stores component trees on DOM elements
    // Look for any element that has ngComponent or __ngContext__
    const elements = document.querySelectorAll('*');
    const fsRelated: string[] = [];
    for (const el of Array.from(elements).slice(0, 50)) {
      const keys = Object.keys(el).filter(k =>
        k.includes('FS') || k.includes('wasm') || k.includes('module') || k.includes('upload')
      );
      if (keys.length) fsRelated.push(`${el.tagName}: ${keys.join(', ')}`);
    }
    return fsRelated;
  });
  console.log('=== ANGULAR FS REFS ===');
  console.log(angularProbe.join('\n'));

  fs.unlinkSync(scriptPath);
});

test('probe: read patched.js upload handler from network', async ({ page }) => {
  // Capture the Angular app's main bundle to find upload handling code
  const scripts: string[] = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('main') || url.includes('chunk') || url.includes('app')) {
      scripts.push(url);
    }
  });

  await page.goto('https://ethos.studio1247.com/1.6.6/X18RS_FCC');
  await page.waitForTimeout(3_000);

  console.log('=== LOADED SCRIPTS ===');
  console.log(scripts.join('\n'));

  // After boot, look for the upload handler in Angular's injected scripts
  const uploadHandler = await page.evaluate(() => {
    // Search all script tags for "lua" related upload path
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    return scripts.map(s => (s as HTMLScriptElement).src);
  });
  console.log('=== SCRIPT SRCS ===');
  console.log(uploadHandler.join('\n'));
});
