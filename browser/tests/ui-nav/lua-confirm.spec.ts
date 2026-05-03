/**
 * Probe: Definitive Lua tile check — handles checklist warning correctly
 *
 * Key fix: dismiss checklist by tapping OK, then navigate WITHOUT re-tapping
 * Model Setup nav (we're already on it after dismiss). Also avoid clock-tick
 * false positives by using a 1.5s wait before comparing canvas.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, swipeCanvas, goBack } from '../helpers/navigate';
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
  return buf;
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

/** Dismiss the checklist warning if present. Returns true if it was dismissed. */
async function dismissChecklist(page: any): Promise<boolean> {
  const before = await page.locator('canvas').first().screenshot();
  // OK button candidates — sweep y from 405 to 445 at x=700
  for (const by of [405, 415, 425, 435, 437, 445]) {
    await tapBitmap(page, 700, by);
    await page.waitForTimeout(1_500); // wait > 1s to avoid clock false-positive
    const after = await page.locator('canvas').first().screenshot();
    // Compare top-left corner (away from clock which is top-right)
    // If the dialog title area (y<50, x<400) changed, the dialog was dismissed
    const changed = !before.subarray(0, 200).equals(after.subarray(0, 200));
    if (changed) {
      console.log(`=== Checklist dismissed at y=${by} ===`);
      return true;
    }
  }
  return false;
}

test('probe: Lua tile — upload, reload, dismiss checklist, check page 2', async ({ page }) => {
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

  // Unload
  await page.goto('about:blank');
  await page.waitForTimeout(3_000);

  // Session 2
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await snap(page, 'confirm-01-home.png');

  // Tap Model Setup → checklist may appear
  await tapBitmap(page, 194, 459);
  await page.waitForTimeout(800);
  await snap(page, 'confirm-02-after-model-tap.png');

  // Dismiss checklist (we should land on Model Setup page 1)
  const dismissed = await dismissChecklist(page);
  console.log(`dismissed: ${dismissed}`);
  await snap(page, 'confirm-03-after-dismiss.png');

  // Now we should be on Model Setup page 1 — swipe left to page 2
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(600);
  await snap(page, 'confirm-04-page2.png');

  // Check r2c4 (700,330) for Lua tile
  await tapBitmap(page, 700, 330);
  await page.waitForTimeout(800);
  await snap(page, 'confirm-05-r2c4.png');

  // Also snapshot all row 2 tiles on page 2 for a complete map
  for (const bx of [100, 300, 500]) {
    await goBack(page);
    await page.waitForTimeout(300);
    await swipeCanvas(page, 'left');
    await page.waitForTimeout(400);
    await tapBitmap(page, bx, 330);
    await page.waitForTimeout(700);
    await snap(page, `confirm-06-r2-x${bx}.png`);
  }

  fs.unlinkSync(zipPath);
});
