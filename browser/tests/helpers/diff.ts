import { Page } from '@playwright/test';
import { clickDownloadMenuItem, downloadToBuffer, MENU } from './download';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Download convenience wrapper
// ---------------------------------------------------------------------------

/**
 * Trigger the "Save the current model file" download and return its contents.
 * After the download, click the Display canvas status bar area to restore ETHOS
 * pointer-event focus — without this, subsequent tapBitmap calls are ignored.
 */
export async function downloadModelBin(page: Page): Promise<Buffer> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickDownloadMenuItem(page, MENU.modelFile),
  ]);
  const buf = await downloadToBuffer(download);

  // Restore canvas focus: tap the top-right status area of the Display canvas.
  // No interactive element lives there so this is a safe no-op for ETHOS navigation.
  const rect = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const c = canvases.find(cv => (cv.getContext('webgl') ?? cv.getContext('webgl2')) !== null) ?? canvases[0];
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (rect) {
    await page.mouse.click(rect.x + rect.w * 0.85, rect.y + rect.h * 0.05);
    await page.waitForTimeout(300);
  }

  return buf;
}

// ---------------------------------------------------------------------------
// Binary diff
// ---------------------------------------------------------------------------

export interface ByteDiff {
  offset: number;
  hex: string;
  before: number;
  after: number;
}

export interface DiffRecord {
  action: string;
  timestamp: string;
  baselineBytes: number;
  changedBytes: number;
  diffCount: number;
  diffs: ByteDiff[];
}

/** Byte-level diff of two buffers. Returns one entry per changed offset. */
export function binDiff(a: Buffer, b: Buffer): ByteDiff[] {
  const len = Math.max(a.length, b.length);
  const diffs: ByteDiff[] = [];
  for (let i = 0; i < len; i++) {
    const before = a[i] ?? -1;
    const after  = b[i] ?? -1;
    if (before !== after) {
      diffs.push({
        offset: i,
        hex: `0x${i.toString(16).toUpperCase().padStart(4, '0')}`,
        before,
        after,
      });
    }
  }
  return diffs;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const FINDINGS_ROOT = path.join(__dirname, '..', '..', 'findings');

/** Save a .bin buffer to findings/bins/<name>.bin */
export function saveBin(name: string, buf: Buffer): string {
  const dir = path.join(FINDINGS_ROOT, 'bins');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.bin`);
  fs.writeFileSync(filePath, buf);
  return filePath;
}

/** Build and save a DiffRecord to findings/diffs/<name>.json */
export function saveDiff(
  name: string,
  action: string,
  baseline: Buffer,
  changed: Buffer,
): DiffRecord {
  const diffs = binDiff(baseline, changed);
  const record: DiffRecord = {
    action,
    timestamp: new Date().toISOString(),
    baselineBytes: baseline.length,
    changedBytes: changed.length,
    diffCount: diffs.length,
    diffs,
  };
  const dir = path.join(FINDINGS_ROOT, 'diffs');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(record, null, 2));
  return record;
}

/** Print a compact diff summary to stdout (visible in test output). */
export function logDiff(record: DiffRecord): void {
  console.log(`\n=== ${record.action} ===`);
  console.log(`Bytes changed: ${record.diffCount}  (${record.baselineBytes} → ${record.changedBytes} bytes total)`);
  if (record.diffCount === 0) {
    console.log('  (no changes)');
  } else {
    for (const d of record.diffs) {
      console.log(
        `  ${d.hex}  0x${d.before.toString(16).padStart(2,'0')} → 0x${d.after.toString(16).padStart(2,'0')}` +
        `  (${d.before} → ${d.after})`,
      );
    }
  }
}
