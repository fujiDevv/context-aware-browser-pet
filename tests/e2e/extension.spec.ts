import { test, expect } from './fixtures';

test.describe('Arcrawls Browser Extension E2E', () => {
  test('injects pet companion host into a regular webpage', async ({ page }) => {
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });

    const petHost = page.locator('#arcrawls-companion-host');
    await expect(petHost).toBeAttached({ timeout: 15_000 });
    await expect(petHost).toHaveCount(1);
  });

  test('extension popup loads successfully', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Popup bootstraps async settings/locale; wait for a stable root marker.
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
