import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests',

  // WASM boot is slow; allow 90 s per test
  timeout: 90_000,

  // One retry gives the trace file on first failure
  retries: 1,

  // WASM sessions can't run in parallel safely:
  //   - each session fully initialises the Emscripten runtime
  //   - SharedArrayBuffer + AudioContext creation competes for resources
  workers: 1,

  outputDir: 'test-results/',

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'on-failure' }],
  ],

  use: {
    baseURL: 'https://ethos.studio1247.com',
    headless: true,
    viewport: { width: 1280, height: 800 },

    // Screenshots only when a test fails — canvas state is valuable for debugging
    screenshot: 'only-on-failure',

    // Full trace on first retry so failures can be replayed in the Trace Viewer
    trace: 'on-first-retry',

    // Per-action timeout (clicks, locator waits, etc.)
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      // Spread Desktop Chrome defaults, then pin viewport so canvas layout is
      // deterministic — Desktop Chrome default (1280×720) would override the
      // global viewport setting above.
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
};

export default config;
