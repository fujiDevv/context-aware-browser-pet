import { test as base, chromium, type BrowserContext } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Extension e2e fixtures.
 *
 * Loading a real Chrome extension requires `launchPersistentContext` (not the
 * default ephemeral browser). That path is flaky under parallel workers and can
 * hang on close — so we use a unique temp profile, a dedicated fixture timeout,
 * and a bounded teardown.
 */
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // Own timeout so launch doesn't burn the whole test budget.
  context: [async ({}, use) => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const pathToExtension = path.resolve(__dirname, '../../dist');

    if (!fs.existsSync(path.join(pathToExtension, 'manifest.json'))) {
      throw new Error(
        `Extension build not found at ${pathToExtension}. Run "npm run build" before e2e tests.`,
      );
    }

    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arcrawls-pw-'));

    let context: BrowserContext | undefined;
    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        // MV3 content scripts need a real browser window in most Chromium builds.
        headless: false,
        args: [
          `--disable-extensions-except=${pathToExtension}`,
          `--load-extension=${pathToExtension}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-sync',
          '--disable-background-networking',
        ],
        ignoreDefaultArgs: ['--disable-extensions'],
        timeout: 45_000,
      });

      await use(context);
    } finally {
      // Bounded close: an unbounded context.close() is a common cause of
      // "Worker teardown timeout of 30000ms exceeded" with extension contexts.
      if (context) {
        await Promise.race([
          context.close().catch(() => {}),
          new Promise<void>((resolve) => setTimeout(resolve, 8_000)),
        ]);
      }
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup of the temp profile.
      }
    }
  }, { scope: 'test', timeout: 60_000 }],

  extensionId: [async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 20_000 });
    }

    const extensionId = background.url().split('/')[2];
    if (!extensionId) {
      throw new Error(`Could not parse extension id from service worker URL: ${background.url()}`);
    }

    await use(extensionId);
  }, { scope: 'test', timeout: 25_000 }],
});

export const expect = test.expect;
