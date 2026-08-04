import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Extension launch + page injection needs more headroom than unit-style tests.
  timeout: 60_000,
  // Fixture/teardown hangs were exceeding the default 30s worker budget.
  globalTimeout: 10 * 60_000,
  expect: {
    timeout: 15_000,
  },
  // Parallel headful extension contexts race on Chromium profiles/GPU and
  // commonly produce "timeout while setting up context" + teardown hangs.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        channel: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'sirv . --port 5173 --cors',
    url: 'http://localhost:5173/tests/spa.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
