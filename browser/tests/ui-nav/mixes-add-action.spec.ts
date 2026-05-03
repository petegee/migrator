/**
 * Probe: Mixes editor — "+ Add a new action" button
 *
 * The mix editor has an "Actions" section below y=305. The default action row
 * ("Always on Weight 100%") sits at y≈390. Below it is a "+ Add a new action"
 * button estimated at y≈415–450 (bottom edge). Goal: confirm which interaction
 * works — tapBitmap, touchBitmap, or wheel+Enter (same as Vars screen).
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToMixes, cdpEnterKey } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function openMixEditor(page: any) {
  await navigateToMixes(page);
  await tapBitmap(page, 563, 69);       // + header → library grid
  await page.waitForTimeout(500);
  await tapBitmap(page, 100, 101);      // Free mix → placement popup
  await page.waitForTimeout(500);
  await touchBitmap(page, 320, 141);    // "First position" (touch required)
  await page.waitForTimeout(700);
  // Now in mix editor
}

test('probe: mixes add-action — editor overview', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openMixEditor(page);
  await snap(page, 'mixes-add-action-01-editor.png');
});

test('probe: mixes add-action — tapBitmap y=430', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openMixEditor(page);

  await snap(page, 'mixes-add-action-02-before-tap.png');
  await tapBitmap(page, 350, 430);
  await page.waitForTimeout(600);
  await snap(page, 'mixes-add-action-03-after-tap-430.png');
});

test('probe: mixes add-action — touchBitmap y=430', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openMixEditor(page);

  await touchBitmap(page, 350, 430);
  await page.waitForTimeout(600);
  await snap(page, 'mixes-add-action-04-after-touch-430.png');
});

test('probe: mixes add-action — wheel + CDP Enter', async ({ page }) => {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await openMixEditor(page);

  await snap(page, 'mixes-add-action-05-before-wheel.png');

  // Wheel to focus the "+ Add a new action" button (try 5 clicks first)
  const centre = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: any) => cv.getContext('webgl') || cv.getContext('webgl2')) ?? canvases[0];
    if (!c) return { x: 400, y: 300 };
    const r = c.getBoundingClientRect();
    return { x: r.x + 400 * (r.width / 800), y: r.y + 300 * (r.height / 480) };
  });

  const client = await (page.context() as any).newCDPSession(page);
  for (let i = 0; i < 5; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: centre.x, y: centre.y,
      deltaX: 0, deltaY: 300, modifiers: 0, pointerType: 'mouse',
    });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
  await snap(page, 'mixes-add-action-06-after-5-wheels.png');

  await cdpEnterKey(page);
  await snap(page, 'mixes-add-action-07-after-enter.png');
});
