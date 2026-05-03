/**
 * Probe: Upload script → reload page → check if Lua tile appears on fresh boot
 *
 * The firmware syncs to IndexedDB after upload. On next boot it reads from
 * IndexedDB, so scripts written in session N are visible in session N+1.
 *
 * Strategy:
 * 1. Boot, upload ZIP (write to FS, sync to IndexedDB)
 * 2. Reload the page (fresh WASM boot reads persisted FS)
 * 3. Boot dialogs again, navigate to Model Setup page 2
 * 4. Check for Lua tile at r2c4 (700,330)
 * 5. If present, tap it and verify script ran
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
    zip.addFile(p, content === null ? Buffer.alloc(0) : Buffer.from(content, 'utf8'),
      '', content === null ? 0o40755 : 0);
  }
  zip.writeZip(zipPath);
  return zipPath;
}

test('probe: upload + page reload + check Lua tile', async ({ page }) => {
  const zipPath = makeZipWithDirs({
    'tools/':                          null,
    'tools/probe_tool/':               null,
    'tools/probe_tool/probe_tool.lua': LUA_SCRIPT,
  });

  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  // Session 1: upload and sync
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await uploadFile(page, 'lua', zipPath);
  await page.waitForTimeout(3_000); // wait for IndexedDB sync

  const syncLog = consoleLogs.filter(l => l.includes('Sync') || l.includes('Writing probe_tool'));
  console.log('=== SYNC LOG ===');
  console.log(syncLog.join('\n'));

  // Session 2: reload page (firmware reboots, reads persisted FS)
  consoleLogs.length = 0;
  await page.reload();
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const bootLog = consoleLogs.filter(l =>
    l.includes('script') || l.includes('lua') || l.includes('tool') || l.includes('probe')
  );
  console.log('=== BOOT LOG (script-related) ===');
  console.log(bootLog.join('\n'));

  await snap(page, 'reboot-01-after-reload.png');

  // Check Model Setup page 2
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(600);
  await snap(page, 'reboot-02-model-p2.png');

  // Tap r2c4 (700,330) — Lua tile?
  await tapBitmap(page, 700, 330);
  await page.waitForTimeout(800);
  await snap(page, 'reboot-03-tap-r2c4.png');

  // If something opened, interact with it
  // Take a wider sweep of page 2 row 2
  for (const x of [100, 300, 500, 700]) {
    await goBack(page);
    await page.waitForTimeout(300);
    await navigateToModelSetup(page);
    await swipeCanvas(page, 'left');
    await page.waitForTimeout(400);
    await tapBitmap(page, x, 330);
    await page.waitForTimeout(700);
    await snap(page, `reboot-04-r2-x${x}.png`);
  }

  fs.unlinkSync(zipPath);
});

test('probe: after reload check Curves and Edit Model for script evidence', async ({ page }) => {
  const zipPath = makeZipWithDirs({
    'tools/':                          null,
    'tools/probe_tool/':               null,
    'tools/probe_tool/probe_tool.lua': LUA_SCRIPT,
  });

  // Upload first
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await uploadFile(page, 'lua', zipPath);
  await page.waitForTimeout(3_000);

  // Reload
  await page.reload();
  await bootApp(page);
  await navigateCreateModelWizard(page);

  await snap(page, 'ev-01-home-after-reload.png');

  // Check model name on home screen (title bar shows model name)
  // Check Curves for PROBE curve
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await tapBitmap(page, 100, 330); // Curves
  await page.waitForTimeout(600);
  await snap(page, 'ev-02-curves.png');

  // Check Edit Model for name
  await goBack(page);
  await page.waitForTimeout(400);
  await swipeCanvas(page, 'right'); // back to page 1
  await page.waitForTimeout(400);
  await tapBitmap(page, 300, 140); // Edit model
  await page.waitForTimeout(600);
  await snap(page, 'ev-03-edit-model.png');

  fs.unlinkSync(zipPath);
});
