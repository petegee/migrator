/**
 * Probe: Dismiss checklist warning + check Lua tile
 *
 * The checklist "Throttle is not idle" dialog appears on session 2 when
 * navigating to Model Setup. OK button is in bottom-right of dialog.
 * Confirm its bitmap coords, then navigate to Model Setup page 2.
 */
import { test } from '@playwright/test';
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

test('probe: session2 — dismiss checklist, find Lua tile, run script', async ({ page }) => {
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
  await snap(page, 'final-01-home.png');

  // Navigate to Model Setup — checklist dialog may appear
  await tapBitmap(page, 194, 459);
  await page.waitForTimeout(800);
  await snap(page, 'final-02-after-model-nav.png');

  // Dismiss checklist warning if present (OK button bottom-right)
  // Try candidates from the screenshot analysis: around (636, 437)
  for (const [bx, by] of [[636, 437], [700, 437], [636, 420], [636, 460]]) {
    const before = await page.locator('canvas').first().screenshot();
    await tapBitmap(page, bx, by);
    await page.waitForTimeout(600);
    const after = await page.locator('canvas').first().screenshot();
    if (Buffer.compare(before, after) !== 0) {
      console.log(`=== Checklist dismissed at (${bx}, ${by}) ===`);
      await snap(page, `final-03-checklist-dismissed-${bx}-${by}.png`);
      break;
    }
  }

  // Now try navigating to Model Setup page 2
  await tapBitmap(page, 194, 459);
  await page.waitForTimeout(800);
  await snap(page, 'final-04-model-setup.png');

  await swipeCanvas(page, 'left');
  await page.waitForTimeout(600);
  await snap(page, 'final-05-model-p2.png');

  // Check r2c4 (700,330) for Lua tile
  await tapBitmap(page, 700, 330);
  await page.waitForTimeout(800);
  await snap(page, 'final-06-r2c4.png');

  // If something opened, take more screenshots and check all row 2 items
  for (const bx of [100, 300, 500]) {
    await tapBitmap(page, 25, 25); // back
    await page.waitForTimeout(400);
    await tapBitmap(page, 194, 459);
    await page.waitForTimeout(500);
    // Dismiss checklist if it reappears
    await tapBitmap(page, 636, 437);
    await page.waitForTimeout(400);
    await tapBitmap(page, 194, 459);
    await page.waitForTimeout(500);
    await swipeCanvas(page, 'left');
    await page.waitForTimeout(400);
    await tapBitmap(page, bx, 330);
    await page.waitForTimeout(700);
    await snap(page, `final-07-row2-x${bx}.png`);
  }

  fs.unlinkSync(zipPath);
});
