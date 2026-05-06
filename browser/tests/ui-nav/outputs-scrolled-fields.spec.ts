/**
 * Probe: Outputs channel editor — scrolled fields
 * Confirmed so far: Name(~150), Direction(250), Min(340), Max(380), Subtrim/Center(440)
 * Goal: scroll down once and capture what fields appear + their y-coords.
 * Then try tapping each estimated field to confirm it responds.
 */
import { test } from '@playwright/test';
import { bootApp, navigateCreateModelWizard } from '../helpers/boot';
import { tapBitmap, touchBitmap, navigateToOutputs } from '../helpers/navigate';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../findings/screenshots');
function save(name: string, buf: Buffer) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), buf);
}
const snap = async (page: any, name: string) =>
  save(name, await page.locator('canvas').first().screenshot({ type: 'png' }));

async function openCH1Editor(page: any) {
  await bootApp(page);
  await navigateCreateModelWizard(page);
  await navigateToOutputs(page);
  // Open CH1 editor (left col row 1, confirmed coords)
  await tapBitmap(page, 200, 112);
  await page.waitForTimeout(500);
}

async function cdpScroll(page: any, bx: number, byStart: number, byEnd: number) {
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find((cv: HTMLCanvasElement) => cv.getContext('webgl') !== null || cv.getContext('webgl2') !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!rect) throw new Error('canvas not found');
  const px = rect.x + bx * (rect.w / 800);
  const pyStart = rect.y + byStart * (rect.h / 480);
  const pyEnd = rect.y + byEnd * (rect.h / 480);
  const client = (page as any).context().browser()?.contexts()[0];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: px, y: pyStart, id: 0 }],
  });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: px, y: pyEnd, id: 0 }],
  });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await page.waitForTimeout(300);
}

test('outputs-ch1: baseline (unscrolled fields)', async ({ page }) => {
  await openCH1Editor(page);
  await snap(page, 'out-ch1-00-baseline.png');
});

test('outputs-ch1: after 1 scroll — what fields appear', async ({ page }) => {
  await openCH1Editor(page);
  await cdpScroll(page, 400, 400, 150);
  await snap(page, 'out-ch1-01-after-scroll1.png');
});

test('outputs-ch1: after 2 scrolls', async ({ page }) => {
  await openCH1Editor(page);
  await cdpScroll(page, 400, 400, 150);
  await cdpScroll(page, 400, 400, 150);
  await snap(page, 'out-ch1-02-after-scroll2.png');
});

// Tap sweep on scrolled fields — estimated coords for PWM centre, Curve, Slow up, Slow down, Balance, Swap
test('outputs-ch1: tap (600, 160) after scroll — PWM centre?', async ({ page }) => {
  await openCH1Editor(page);
  await cdpScroll(page, 400, 400, 150);
  await snap(page, 'out-ch1-scroll1-before-tap160.png');
  await tapBitmap(page, 600, 160);
  await page.waitForTimeout(500);
  await snap(page, 'out-ch1-scroll1-tap160.png');
});

test('outputs-ch1: tap (600, 240) after scroll — Curve?', async ({ page }) => {
  await openCH1Editor(page);
  await cdpScroll(page, 400, 400, 150);
  await tapBitmap(page, 600, 240);
  await page.waitForTimeout(500);
  await snap(page, 'out-ch1-scroll1-tap240.png');
});

test('outputs-ch1: tap (600, 320) after scroll — Slow up?', async ({ page }) => {
  await openCH1Editor(page);
  await cdpScroll(page, 400, 400, 150);
  await tapBitmap(page, 600, 320);
  await page.waitForTimeout(500);
  await snap(page, 'out-ch1-scroll1-tap320.png');
});

test('outputs-ch1: tap (600, 400) after scroll — Slow down?', async ({ page }) => {
  await openCH1Editor(page);
  await cdpScroll(page, 400, 400, 150);
  await tapBitmap(page, 600, 400);
  await page.waitForTimeout(500);
  await snap(page, 'out-ch1-scroll1-tap400.png');
});
