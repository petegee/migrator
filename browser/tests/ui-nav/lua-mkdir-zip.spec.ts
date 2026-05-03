/**
 * Probe: ZIP with explicit directory entries so the extractor creates parent dirs
 *
 * Problem: zipService.extract() calls FS.writeFile() without mkdir-ing parent dirs.
 * Fix: add directory entries to the ZIP — the extractor should call FS.mkdir() for them.
 *
 * Also confirmed: firmware FS path is /persist/X18RS/scripts/ (not X18RS_FCC).
 *
 * Goals:
 * 1. Upload ZIP with dir entries: tools/ + tools/probe_tool/ + tools/probe_tool/probe_tool.lua
 * 2. Confirm "Writing ..." log without ErrnoError
 * 3. Check if Lua tile appears on Model Setup page 2
 * 4. If tile appears, tap it and verify script ran (model name = "LUA_OK")
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToModelSetup, swipeCanvas, navigateToCurves } from '../helpers/navigate';
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
local function run(event, touchState) end
return { init=init, run=run }
`.trimStart();

function makeZipWithDirs(entries: Record<string, string | null>): string {
  const zipPath = path.join(os.tmpdir(), 'ethos_plugin.zip');
  const zip = new AdmZip();
  for (const [p, content] of Object.entries(entries)) {
    if (content === null) {
      // Directory entry
      zip.addFile(p, Buffer.alloc(0), '', 0o40755);
    } else {
      zip.addFile(p, Buffer.from(content, 'utf8'));
    }
  }
  zip.writeZip(zipPath);
  return zipPath;
}

test('probe: ZIP with directory entries — mkdir before writeFile', async ({ page }) => {
  // Include explicit directory entries so extractor creates parent paths
  const zipPath = makeZipWithDirs({
    'tools/':                               null,   // dir entry
    'tools/probe_tool/':                    null,   // dir entry
    'tools/probe_tool/probe_tool.lua':      LUA_SCRIPT,
  });

  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  await bootApp(page);
  await navigateCreateModelWizard(page);

  consoleLogs.push('--- UPLOAD START ---');
  await uploadFile(page, 'lua', zipPath);
  await page.waitForTimeout(3_000);
  consoleLogs.push('--- UPLOAD END ---');

  const startIdx = consoleLogs.findIndex(l => l.includes('UPLOAD START'));
  console.log('=== CONSOLE (upload window) ===');
  console.log(consoleLogs.slice(Math.max(0, startIdx - 1)).join('\n'));

  await snap(page, 'mkdir-01-after-upload.png');

  // Check Model Setup page 2 — Lua tile?
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(600);
  await snap(page, 'mkdir-02-model-p2.png');

  // Try r2c4 (700,330) for Lua tile
  await tapBitmap(page, 700, 330);
  await page.waitForTimeout(800);
  await snap(page, 'mkdir-03-tap-r2c4.png');

  fs.unlinkSync(zipPath);
});

test('probe: after successful write — check if model changed', async ({ page }) => {
  const zipPath = makeZipWithDirs({
    'tools/':                               null,
    'tools/probe_tool/':                    null,
    'tools/probe_tool/probe_tool.lua':      LUA_SCRIPT,
  });

  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  await bootApp(page);
  await navigateCreateModelWizard(page);
  await uploadFile(page, 'lua', zipPath);
  await page.waitForTimeout(3_000);

  // Log what happened
  const idx = consoleLogs.findIndex(l => l.includes('extractZip'));
  const relevant = consoleLogs.slice(Math.max(0, idx)).join('\n');
  console.log('=== UPLOAD TRACE ===');
  console.log(relevant);

  await snap(page, 'mkdir-10-home.png');

  // Navigate to Curves to check if PROBE curve was created
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await tapBitmap(page, 100, 330); // Curves
  await page.waitForTimeout(600);
  await snap(page, 'mkdir-11-curves.png');

  // Navigate to Edit Model to check model name
  await tapBitmap(page, 25, 25); // back
  await page.waitForTimeout(400);
  await tapBitmap(page, 25, 25); // back to Model Setup page 2
  await page.waitForTimeout(400);
  await swipeCanvas(page, 'right'); // page 1
  await page.waitForTimeout(400);
  await tapBitmap(page, 300, 140); // Edit model r1c2
  await page.waitForTimeout(600);
  await snap(page, 'mkdir-12-edit-model.png');

  fs.unlinkSync(zipPath);
});
