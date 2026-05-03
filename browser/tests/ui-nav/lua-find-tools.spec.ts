/**
 * Probe: Find where Lua tools appear after upload
 *
 * Goals:
 * 1. Sweep bottom nav at y=459 to find all nav icons (home/model/layout/system)
 * 2. Navigate to what looks like System settings (gear icon, estimated x≈478)
 * 3. Look for Tools / Scripts section
 * 4. Find and activate the uploaded probe_tool.lua
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap } from '../helpers/navigate';
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

test('probe: bottom nav sweep to find all icons', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  await snap(page, 'lua-nav-01-home.png');

  // Sweep bottom nav bar (y=459) at candidate x positions
  // Known: home=54, model=194. Next icons likely at ~334, ~474, ~614, ~754
  for (const x of [334, 474, 614, 754]) {
    await tapBitmap(page, x, 459);
    await page.waitForTimeout(600);
    await snap(page, `lua-nav-02-tap-x${x}.png`);
    // Go back to home to reset state
    await tapBitmap(page, 54, 459);
    await page.waitForTimeout(400);
  }
});

test('probe: upload script then navigate system menu for Tools', async ({ page }) => {
  const scriptPath = path.join(os.tmpdir(), 'probe_tool.lua');
  fs.writeFileSync(scriptPath, LUA_SCRIPT);

  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Upload the script
  await uploadFile(page, 'lua', scriptPath);
  await page.waitForTimeout(1_500);
  await snap(page, 'lua-sys-01-after-upload.png');

  // Try each bottom nav candidate — look for a system/settings menu
  // that might show Tools or Scripts
  for (const x of [334, 474, 614]) {
    await tapBitmap(page, x, 459);
    await page.waitForTimeout(700);
    await snap(page, `lua-sys-02-nav-x${x}.png`);

    // Tap first row items to look for Tools/Scripts
    for (const gx of [100, 300, 500, 700]) {
      await tapBitmap(page, gx, 140);
      await page.waitForTimeout(500);
      await snap(page, `lua-sys-03-nav-x${x}-grid-x${gx}-r1.png`);
      await tapBitmap(page, 25, 25); // back
      await page.waitForTimeout(400);
    }
    for (const gx of [100, 300, 500, 700]) {
      await tapBitmap(page, gx, 330);
      await page.waitForTimeout(500);
      await snap(page, `lua-sys-04-nav-x${x}-grid-x${gx}-r2.png`);
      await tapBitmap(page, 25, 25); // back
      await page.waitForTimeout(400);
    }

    // Reset to home
    await tapBitmap(page, 54, 459);
    await page.waitForTimeout(400);
  }

  fs.unlinkSync(scriptPath);
});
