import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        channel: 'chromium'
      },
    },
  ],
  webServer: {
    command: 'sirv . --port 5173 --cors',
    url: 'http://localhost:5173/tests/spa.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
