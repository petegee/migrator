/**
 * Probe: System page 2 + File manager filesystem exploration
 *
 * Goals:
 * 1. Upload script, then check System page 2 (swipe left from System page 1)
 * 2. Map all grid items on System page 2
 * 3. Check File manager Radio / SD card / Flash tabs to find uploaded .lua file
 * 4. If Tools/Scripts found on System page 2, enter and activate the script
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, swipeCanvas } from '../helpers/navigate';
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

test('probe: System page 2 grid', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Go to System menu
  await tapBitmap(page, 474, 459);
  await page.waitForTimeout(600);
  await snap(page, 'sys2-01-page1.png');

  // Swipe left to page 2
  await swipeCanvas(page, 'left');
  await page.waitForTimeout(600);
  await snap(page, 'sys2-02-page2.png');

  // Map all grid items on page 2
  for (const [gx, gy] of [[100,140],[300,140],[500,140],[700,140],[100,330],[300,330],[500,330],[700,330]]) {
    await tapBitmap(page, gx, gy);
    await page.waitForTimeout(700);
    await snap(page, `sys2-03-r${gy===140?1:2}c${[100,300,500,700].indexOf(gx)+1}.png`);
    await tapBitmap(page, 25, 25); // back
    await page.waitForTimeout(400);
  }
});

test('probe: File manager — find uploaded Lua script', async ({ page }) => {
  const scriptPath = path.join(os.tmpdir(), 'probe_tool.lua');
  fs.writeFileSync(scriptPath, LUA_SCRIPT);

  await bootApp(page);
  await navigateCreateModelWizard(page);

  // Upload the script first
  await uploadFile(page, 'lua', scriptPath);
  await page.waitForTimeout(1_500);

  // Navigate to System > File manager
  await tapBitmap(page, 474, 459);
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 140); // File manager
  await page.waitForTimeout(600);
  await snap(page, 'fm-01-radio-root.png');

  // Check SD card tab (x≈490, y≈55 approx — tab bar is near top)
  // Tabs are: Radio | SD card | Flash — tap each
  await tapBitmap(page, 490, 55);  // SD card tab
  await page.waitForTimeout(600);
  await snap(page, 'fm-02-sdcard-tab.png');

  await tapBitmap(page, 640, 55);  // Flash tab
  await page.waitForTimeout(600);
  await snap(page, 'fm-03-flash-tab.png');

  // Back to Radio tab
  await tapBitmap(page, 325, 55);  // Radio tab
  await page.waitForTimeout(500);

  // Explore RADIO:/ — tap each folder/file visible
  // From prior screenshot: [audio], [models], radio.bin at y≈80, 140, 200 approx
  // Check if there's now a [scripts] folder
  for (const y of [80, 110, 140, 170, 200, 230, 260]) {
    await tapBitmap(page, 150, y); // left panel list items
    await page.waitForTimeout(400);
    await snap(page, `fm-04-radio-item-y${y}.png`);
  }

  fs.unlinkSync(scriptPath);
});
