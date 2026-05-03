/**
 * Probe: Upload a properly structured Lua plugin ZIP
 *
 * The "lua plugin" upload expects a .zip file extracted to
 * /persist/{board}/scripts/. Ethos tools go in scripts/tools/.
 *
 * Goals:
 * 1. Upload a ZIP containing tools/probe_tool.lua
 * 2. Check if the Lua tile appears on Model Setup page 2
 * 3. If the tile appears, navigate to it and run the script
 * 4. Verify the model was modified (name = "LUA_OK", curve "PROBE" exists)
 * 5. Access the FS via Angular's SimulationService to read filesystem state
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToModelSetup, swipeCanvas, navigateToCurves, goBack } from '../helpers/navigate';
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

// Minimal Ethos tool script
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

function makePluginZip(scriptContent: string, toolName: string): string {
  const zipPath = path.join(os.tmpdir(), `${toolName}.zip`);
  const zip = new AdmZip();
  // Try both common Ethos script layouts:
  // tools/toolname.lua  (flat)
  zip.addFile(`tools/${toolName}.lua`, Buffer.from(scriptContent, 'utf8'));
  zip.writeZip(zipPath);
  return zipPath;
}

/** Read the Angular SimulationService FS to list files */
async function listFsViaAngular(page: any): Promise<string[]> {
  return page.evaluate(() => {
    try {
      // Try Angular ivy's getComponent / getDirectiveMetadata
      const ng = (window as any).ng;
      if (!ng) return ['ng not found'];

      const root = document.querySelector('app-root') as any;
      if (!root) return ['app-root not found'];

      // In Angular 14+ ivy: ng.getComponent returns the component instance
      const comp = ng.getComponent?.(root);
      if (!comp) return ['component not found'];

      return ['comp keys: ' + Object.keys(comp).join(', ')];
    } catch (e: any) {
      return ['error: ' + e.message];
    }
  });
}

test('probe: upload ZIP with tools/probe_tool.lua', async ({ page }) => {
  const zipPath = makePluginZip(LUA_SCRIPT, 'probe_tool');

  await bootApp(page);
  await navigateCreateModelWizard(page);

  await snap(page, 'zip-01-before.png');

  // Upload the ZIP
  await uploadFile(page, 'lua', zipPath);
  await page.waitForTimeout(2_000);
  await snap(page, 'zip-02-after-upload.png');

  // Check Angular FS access
  const fsInfo = await listFsViaAngular(page);
  console.log('=== ANGULAR FS INFO ===');
  console.log(fsInfo.join('\n'));

  // Check Model Setup page 2 — does Lua tile appear?
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(500);
  await snap(page, 'zip-03-model-setup-p2.png');

  // Tap r2c4 (700,330) — Lua tile location per navigate.ts comment
  await tapBitmap(page, 700, 330);
  await page.waitForTimeout(700);
  await snap(page, 'zip-04-tap-r2c4.png');

  // Also try model setup page 2 row 2 across all columns in case Lua is elsewhere
  for (const x of [100, 300, 500]) {
    await goBack(page);
    await page.waitForTimeout(300);
    // Make sure we're on page 2
    await navigateToModelSetup(page);
    await swipeCanvas(page, 'left');
    await page.waitForTimeout(400);
    await tapBitmap(page, x, 330);
    await page.waitForTimeout(600);
    await snap(page, `zip-05-tap-r2c-x${x}.png`);
  }

  fs.unlinkSync(zipPath);
});

test('probe: access FS signal via Angular injector after upload', async ({ page }) => {
  const zipPath = makePluginZip(LUA_SCRIPT, 'probe_tool');

  await bootApp(page);
  await navigateCreateModelWizard(page);
  await uploadFile(page, 'lua', zipPath);
  await page.waitForTimeout(2_000);

  const result = await page.evaluate(() => {
    try {
      // In Angular ivy, components expose injector via __ngContext__
      // Walk all elements looking for SimulationService FS signal
      const allElements = document.querySelectorAll('*');
      for (const el of Array.from(allElements)) {
        const ctx = (el as any).__ngContext__;
        if (!ctx) continue;
        // ctx is a LView array; find the component/directive instances
        for (const item of Array.from(ctx)) {
          if (item && typeof item === 'object') {
            // Look for a property that looks like it holds an FS object
            const keys = Object.keys(item);
            for (const k of keys) {
              const val = (item as any)[k];
              if (val && typeof val === 'function') {
                try {
                  const result = val();
                  if (result && typeof result === 'object' && result.readdir) {
                    // Found the FS!
                    const files: string[] = [];
                    function walk(dir: string) {
                      const entries = result.readdir(dir);
                      for (const e of entries) {
                        if (e === '.' || e === '..') continue;
                        const full = dir === '/' ? '/' + e : dir + '/' + e;
                        files.push(full);
                        try {
                          if (result.isDir(result.stat(full).mode)) walk(full);
                        } catch {}
                      }
                    }
                    walk('/');
                    return { found: true, path: k, files: files.slice(0, 100) };
                  }
                } catch {}
              }
            }
          }
        }
      }
      return { found: false };
    } catch (e: any) {
      return { error: e.message };
    }
  });

  console.log('=== FS SIGNAL PROBE ===');
  console.log(JSON.stringify(result, null, 2));

  fs.unlinkSync(zipPath);
});
