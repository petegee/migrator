/**
 * Probe: Lua script upload via web interface
 *
 * Goals:
 * 1. Confirm what the "lua plugin" upload menu item does
 * 2. See what snackbar / feedback appears after upload
 * 3. Find where uploaded scripts appear in the UI (Model Setup page 2 r2c4 = Lua)
 * 4. Determine if uploading triggers script execution (auto-init) or just installs it
 * 5. If manual activation needed, confirm how to run the script
 *
 * The probe script sets model.name("LUA_OK") and creates a curve called "PROBE".
 * If either change appears in the UI, the script executed.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToModelSetup, swipeCanvas, navigateToCurves, goBack } from '../helpers/navigate';
import { uploadFile, waitForSnackbar } from '../helpers/upload';
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

// Minimal Ethos tool script that makes two observable changes:
//   1. Renames the active model to "LUA_OK"
//   2. Creates a curve named "PROBE"
// If either change is visible in the UI, we know the script ran.
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

test('probe: upload Lua script and observe result', async ({ page }) => {
  // Write script to a temp file
  const scriptPath = path.join(os.tmpdir(), 'probe_tool.lua');
  fs.writeFileSync(scriptPath, LUA_SCRIPT);

  await bootApp(page);
  await navigateCreateModelWizard(page);

  await snap(page, 'lua-01-before-upload.png');

  // Upload via "lua plugin" menu item
  await uploadFile(page, 'lua', scriptPath);

  // Capture snackbar text (if any) — gives us the firmware's response
  try {
    await waitForSnackbar(page, '', 5_000);
  } catch { /* no snackbar, that's fine — just capture the screen */ }

  await page.waitForTimeout(1_500);
  await snap(page, 'lua-02-after-upload.png');

  // Navigate to the Lua section — Model Setup page 2, r2c4
  await navigateToModelSetup(page);
  await swipeCanvas(page, 'left');
  await snap(page, 'lua-03-model-setup-page2.png');

  // Tap Lua grid item (page 2 r2c4 = (700, 140))
  await tapBitmap(page, 700, 140);
  await page.waitForTimeout(800);
  await snap(page, 'lua-04-lua-section.png');

  // If a list appeared, tap the first item (y≈140 likely) to activate the script
  await tapBitmap(page, 400, 140);
  await page.waitForTimeout(600);
  await snap(page, 'lua-05-first-item-tap.png');

  await tapBitmap(page, 400, 200);
  await page.waitForTimeout(600);
  await snap(page, 'lua-06-second-item-tap.png');

  // Go back to top, then check Curves to see if "PROBE" curve was created
  await goBack(page);
  await page.waitForTimeout(400);
  await goBack(page);
  await page.waitForTimeout(400);

  await navigateToCurves(page);
  await snap(page, 'lua-07-curves-after-script.png');

  // Check Edit Model to see if model name changed to "LUA_OK"
  await goBack(page);
  await page.waitForTimeout(400);
  await goBack(page);
  await page.waitForTimeout(400);
  await navigateToModelSetup(page);
  // Edit Model is r1c2 on page 1
  await tapBitmap(page, 300, 140);
  await page.waitForTimeout(600);
  await snap(page, 'lua-08-edit-model-after-script.png');

  fs.unlinkSync(scriptPath);
});
