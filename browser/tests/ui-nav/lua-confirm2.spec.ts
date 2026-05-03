/**
 * Probe: Lua tile — correct two-step navigation after checklist dismissal
 *
 * After checklist is dismissed, firmware returns to Home (not Model Setup).
 * Sequence: tap Model Setup → checklist → dismiss → tap Model Setup again
 * (no checklist second time) → swipe left → check r2c4 for Lua tile.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, swipeCanvas } from '../helpers/navigate';
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

test('probe: Lua tile after correct nav sequence', async ({ page }) => {
  test.setTimeout(240_000);

  const zipPath = makeZipWithDirs({
    'tools/':                          null,
    'tools/probe_tool/':               null,
    'tools/probe_tool/probe_tool.lua': LUA_SCRIPT,
  });

  // Session 1: upload
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await uploadFile(page, 'lua', zipPath);
  await page.waitForTimeout(4_000);

  // Unload WASM
  await page.goto('about:blank');
  await page.waitForTimeout(3_000);

  // Session 2: fresh boot
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Step 1: Tap Model Setup — triggers checklist
  await tapBitmap(page, 194, 459);
  await page.waitForTimeout(1_000);
  await snap(page, 'c2-01-checklist.png');

  // Step 2: Dismiss checklist at (700, 405) — returns to Home
  await tapBitmap(page, 700, 405);
  await page.waitForTimeout(1_500);
  await snap(page, 'c2-02-after-dismiss.png');

  // Step 3: Tap Model Setup again — should go straight to Model Setup now
  await tapBitmap(page, 194, 459);
  await page.waitForTimeout(800);
  await snap(page, 'c2-03-model-setup.png');

  // Step 4: Swipe left to page 2
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(600);
  await snap(page, 'c2-04-page2.png');

  // Step 5: Check all row 2 tiles for Lua
  for (const [bx, label] of [[100,'c1'],[300,'c2'],[500,'c3'],[700,'c4']]) {
    await tapBitmap(page, bx as number, 330);
    await page.waitForTimeout(800);
    await snap(page, `c2-05-r2${label}.png`);
    // Go back
    await tapBitmap(page, 25, 25);
    await page.waitForTimeout(400);
    // Re-navigate to page 2 if we went somewhere
    const buf = await page.locator('canvas').first().screenshot();
    // Just try to swipe left again — harmless if already on page 2
    await swipeCanvas(page, 'left');
    await page.waitForTimeout(400);
  }

  fs.unlinkSync(zipPath);
});
