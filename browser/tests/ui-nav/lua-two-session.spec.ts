/**
 * Probe: Two-session test (upload → unload WASM → reload → check Lua tile)
 *
 * Key: navigate to about:blank between sessions to release WASM memory
 * before booting again. Extended per-test timeout of 240s.
 *
 * Also check File manager after upload to confirm /scripts/ folder exists.
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

test('probe: upload + unload + reload — check Lua tile on fresh boot', async ({ page }) => {
  test.setTimeout(240_000);
  const zipPath = makeZipWithDirs({
    'tools/':                          null,
    'tools/probe_tool/':               null,
    'tools/probe_tool/probe_tool.lua': LUA_SCRIPT,
  });

  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  // ── Session 1: upload and sync ──────────────────────────────────────────
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await uploadFile(page, 'lua', zipPath);
  await page.waitForTimeout(4_000); // wait for full IndexedDB sync

  const syncDone = logs.some(l => l.includes('Sync done') && logs.indexOf(l) > logs.findIndex(ll => ll.includes('Writing probe_tool')));
  console.log(`=== Session 1: sync done after write? ${syncDone} ===`);
  console.log(logs.filter(l => l.includes('probe_tool') || l.includes('Sync')).join('\n'));

  // Check File manager to confirm /scripts/ exists in RADIO:/
  await tapBitmap(page, 474, 459); // System
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 140); // File manager
  await page.waitForTimeout(600);
  await snap(page, 'ts-01-file-manager-after-upload.png');

  // ── Unload WASM before re-init ──────────────────────────────────────────
  await page.goto('about:blank');
  await page.waitForTimeout(3_000); // allow GC

  // ── Session 2: fresh boot from persisted IndexedDB ──────────────────────
  logs.length = 0;
  await bootApp(page);
  await navigateCreateModelWizard(page);

  const scriptLogs = logs.filter(l =>
    l.includes('script') || l.includes('lua') || l.includes('tool') ||
    l.includes('probe') || l.includes('Sync')
  );
  console.log('=== Session 2 boot logs (script-related) ===');
  console.log(scriptLogs.join('\n'));

  await snap(page, 'ts-02-home-session2.png');

  // Model Setup page 2
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(600);
  await snap(page, 'ts-03-model-p2.png');

  // Tap r2c4 (700,330) — Lua tile?
  await tapBitmap(page, 700, 330);
  await page.waitForTimeout(800);
  await snap(page, 'ts-04-tap-r2c4.png');

  // Also verify via File manager that scripts folder persisted
  await tapBitmap(page, 25, 25); // back if needed
  await page.waitForTimeout(300);
  await tapBitmap(page, 474, 459); // System
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 140); // File manager
  await page.waitForTimeout(600);
  await snap(page, 'ts-05-file-manager-session2.png');

  // Navigate into scripts folder if visible
  for (const y of [80, 110, 140, 170, 200, 230]) {
    await tapBitmap(page, 150, y);
    await page.waitForTimeout(300);
    const buf = await page.locator('canvas').first().screenshot({ type: 'png' });
    const prev = fs.existsSync(path.join(OUT, `ts-06-fm-y${y}.png`))
      ? fs.readFileSync(path.join(OUT, `ts-06-fm-y${y}.png`))
      : null;
    save(`ts-06-fm-y${y}.png`, buf);
  }
  await snap(page, 'ts-07-fm-final.png');

  fs.unlinkSync(zipPath);
});
