/**
 * Probe: measure canvas dimensions after boot and at Vars editor
 * to verify the actual CSS size and position used for coordinate mapping.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, navigateToVars } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, label: string) =>
  save(label, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function measure(page: any, label: string) {
  const info = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { bitmapW: c.width, bitmapH: c.height, cssW: r.width, cssH: r.height, cssX: r.x, cssY: r.y };
  });
  console.log(`[${label}]`, JSON.stringify(info));
  return info;
}

test('canvas measure: boot → wizard → vars editor', async ({ page }) => {
  await bootApp(page);
  const afterBoot = await measure(page, 'after-boot');
  await snap(page, 'vcm-00-after-boot.png');

  await navigateCreateModelWizard(page);
  const afterWizard = await measure(page, 'after-wizard');
  await snap(page, 'vcm-01-after-wizard.png');

  await navigateToVars(page);
  const afterVars = await measure(page, 'after-vars');
  await snap(page, 'vcm-02-after-vars.png');

  await tapBitmap(page, 400, 266);
  await page.waitForTimeout(600);
  const afterEditor = await measure(page, 'in-vars-editor');
  await snap(page, 'vcm-03-vars-editor.png');

  // Also check: what page coordinates does bitmapToPage(400, 466) produce?
  const buttonPos = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return {
      scaleX: r.width / 800,
      scaleY: r.height / 480,
      buttonPageX: r.x + 400 * (r.width / 800),
      buttonPageY: r.y + 466 * (r.height / 480),
      viewportH: window.innerHeight,
    };
  });
  console.log('[button-pos]', JSON.stringify(buttonPos));
});
