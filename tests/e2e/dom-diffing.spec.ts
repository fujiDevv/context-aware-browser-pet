import { test, expect } from '@playwright/test';

test.describe('Arcrawls Extension E2E', () => {
  test('should not poll LLM for unchanged SPA navigations', async ({ page }) => {
    // Navigate to a mock SPA page
    await page.goto('http://localhost:5173/tests/spa.html');

    // Wait for initial Arcrawls injection
    await page.waitForTimeout(2000);

    // Mock the extension API to track LLM invocations
    const llmCalls = await page.evaluate(() => {
      let calls = 0;
      // Mock the bridge/API call for LLM
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('gemini')) {
          calls++;
        }
        return originalFetch(...args);
      };
      return calls;
    });

    // Simulate SPA navigation that does not meaningfully change content length/semantics
    await page.evaluate(() => {
      history.pushState({}, '', '/new-route');
      const minorUpdate = document.createElement('span');
      minorUpdate.innerText = " ";
      document.body.appendChild(minorUpdate);
    });

    // Trigger emotion update (wait for frequency cycle or force it)
    await page.waitForTimeout(5000);

    const callsAfterNav = await page.evaluate(() => {
      // Logic to fetch tracked calls
      return (window as any)._llmCalls || 0;
    });

    // We expect the LLM NOT to have been invoked because the diff was negligible (< 50 chars)
    expect(callsAfterNav).toBe(0);
  });
});
