/**
 * Probe: Find uploaded Lua script in WASM filesystem + post-upload Model Setup
 *
 * Goals:
 * 1. Use page.evaluate to walk the Emscripten FS after Lua upload — find the file
 * 2. Check if Model Setup page 2 shows a Lua tile after upload
 * 3. Re-examine File manager tabs with better y coords
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToModelSetup, swipeCanvas } from '../helpers/navigate';
import { uploadFile } from '../helpers/upload';
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

/** Recursively list all files in the Emscripten virtual filesystem */
async function listWasmFs(page: any, startPath = '/'): Promise<string[]> {
  return page.evaluate((root: string) => {
    const results: string[] = [];
    function walk(dir: string) {
      let entries: string[];
      try {
        entries = (window as any).FS.readdir(dir);
      } catch { return; }
      for (const entry of entries) {
        if (entry === '.' || entry === '..') continue;
        const full = dir === '/' ? '/' + entry : dir + '/' + entry;
        results.push(full);
        try {
          const stat = (window as any).FS.stat(full);
          if ((window as any).FS.isDir(stat.mode)) walk(full);
        } catch { /* skip */ }
      }
    }
    walk(root);
    return results;
  }, startPath);
}

test('probe: list WASM filesystem before and after Lua upload', async ({ page }) => {
  const scriptPath = path.join(os.tmpdir(), 'probe_tool.lua');
  fs.writeFileSync(scriptPath, LUA_SCRIPT);

  await bootApp(page);
  await navigateCreateModelWizard(page);

  const before = await listWasmFs(page);
  console.log('=== FS BEFORE UPLOAD ===');
  console.log(before.join('\n'));

  await uploadFile(page, 'lua', scriptPath);
  await page.waitForTimeout(2_000);

  const after = await listWasmFs(page);
  console.log('=== FS AFTER UPLOAD ===');
  console.log(after.join('\n'));

  const added = after.filter(f => !before.includes(f));
  console.log('=== NEWLY ADDED ===');
  console.log(added.join('\n'));

  // Also look for any .lua files
  const luaFiles = after.filter(f => f.endsWith('.lua'));
  console.log('=== LUA FILES ===');
  console.log(luaFiles.join('\n'));

  fs.unlinkSync(scriptPath);
});

test('probe: Model Setup page 2 after Lua upload — Lua tile?', async ({ page }) => {
  const scriptPath = path.join(os.tmpdir(), 'probe_tool.lua');
  fs.writeFileSync(scriptPath, LUA_SCRIPT);

  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Upload first
  await uploadFile(page, 'lua', scriptPath);
  await page.waitForTimeout(2_000);
  await snap(page, 'lua-tile-01-after-upload.png');

  // Navigate to Model Setup page 2
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(500);
  await snap(page, 'lua-tile-02-model-setup-p2-after-upload.png');

  // Tap r2c4 (700,330) which should be Lua if tile appears
  await tapBitmap(page, 700, 330);
  await page.waitForTimeout(700);
  await snap(page, 'lua-tile-03-tap-r2c4.png');

  fs.unlinkSync(scriptPath);
});

test('probe: File manager tab coordinates', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Navigate to System > File manager
  await tapBitmap(page, 474, 459);
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 140); // File manager
  await page.waitForTimeout(600);
  await snap(page, 'fm-tabs-01-initial.png');

  // Sweep y for tab bar (tabs are in right panel ~x=490)
  for (const y of [30, 40, 50, 55, 60, 70]) {
    await tapBitmap(page, 490, y);
    await page.waitForTimeout(400);
    await snap(page, `fm-tabs-02-sdcard-y${y}.png`);
    // Reset by tapping Radio tab area
    await tapBitmap(page, 330, y);
    await page.waitForTimeout(300);
  }
});
