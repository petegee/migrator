/**
 * Probe: Correct Lua plugin ZIP structure + snackbar confirmation
 *
 * Prior attempt used tools/probe_tool.lua (flat).
 * Ethos likely expects a directory: tools/probe_tool/probe_tool.lua
 *
 * Also: check snackbar to confirm upload was accepted.
 * Also: try accessing FS through Angular __ngContext__ on simulation element.
 */
import { test, expect } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToModelSetup, swipeCanvas, goBack } from '../helpers/navigate';
import { uploadFile, waitForSnackbar } from '../helpers/upload';
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

test('probe: directory-based ZIP + snackbar check', async ({ page }) => {
  // Ethos tool format: tools/<name>/<name>.lua
  const zipPath = makeZip({
    'tools/probe_tool/probe_tool.lua': LUA_SCRIPT,
  });

  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Intercept snackbar BEFORE upload
  const snackbarPromise = page.locator('simple-snack-bar').first().textContent({ timeout: 8_000 }).catch(() => null);

  await uploadFile(page, 'lua', zipPath);
  const snackText = await snackbarPromise;
  console.log('=== SNACKBAR ===', snackText);

  await page.waitForTimeout(2_000);
  await snap(page, 'v2-01-after-upload.png');

  // Model Setup page 2
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(500);
  await snap(page, 'v2-02-model-p2.png');

  fs.unlinkSync(zipPath);
});

test('probe: access FS via Angular __ngContext__ deep scan', async ({ page }) => {
  const zipPath = makeZip({
    'tools/probe_tool/probe_tool.lua': LUA_SCRIPT,
  });

  await bootApp(page);
  await navigateCreateModelWizard(page);
  await uploadFile(page, 'lua', zipPath);
  await page.waitForTimeout(2_000);

  const result = await page.evaluate(() => {
    function tryFs(obj: any, depth = 0): any {
      if (depth > 4 || !obj || typeof obj !== 'object') return null;
      // Check if this object looks like an Emscripten FS
      if (typeof obj.readdir === 'function' && typeof obj.writeFile === 'function') {
        try {
          const files: string[] = [];
          function walk(dir: string) {
            const entries = obj.readdir(dir);
            for (const e of entries) {
              if (e === '.' || e === '..') continue;
              const full = dir === '/' ? '/' + e : dir + '/' + e;
              files.push(full);
              try {
                if (obj.isDir(obj.stat(full).mode)) walk(full);
              } catch {}
            }
          }
          walk('/');
          return files;
        } catch { return null; }
      }
      // Recurse into object properties
      for (const k of Object.keys(obj).slice(0, 30)) {
        try {
          const val = obj[k];
          // Call signals (functions that return an object with readdir)
          if (typeof val === 'function') {
            try {
              const called = val();
              const found = tryFs(called, depth + 1);
              if (found) return found;
            } catch {}
          }
          const found = tryFs(val, depth + 1);
          if (found) return found;
        } catch {}
      }
      return null;
    }

    // Walk __ngContext__ of all elements
    const elements = document.querySelectorAll('*');
    for (const el of Array.from(elements)) {
      const ctx = (el as any).__ngContext__;
      if (!ctx || !Array.isArray(ctx)) continue;
      for (const item of ctx) {
        if (!item || typeof item !== 'object') continue;
        const found = tryFs(item, 0);
        if (found) return { element: el.tagName, files: found.slice(0, 200) };
      }
    }
    return { notFound: true };
  });

  console.log('=== FS DEEP SCAN ===');
  console.log(JSON.stringify(result, null, 2));

  fs.unlinkSync(zipPath);
});
