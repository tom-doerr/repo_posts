import { test, expect } from '@playwright/test';

// E2E for semantic search with injected stub
test('semantic search shows status and yields results', async ({ page, baseURL }) => {
  const BASE = (baseURL || 'https://tom-doerr.github.io/repo_posts').replace(/\/$/, '');

  // Ensure WebGPU gate passes
  await page.addInitScript(() => {
    if (!('gpu' in navigator)) {
      Object.defineProperty(navigator, 'gpu', { value: {}, configurable: true });
    }
  });

  // Block sem.js to prevent it from overwriting our stub
  await page.route('**/assets/js/sem.js', route => route.abort());

  // Stub search index to include our test URL
  await page.route('**/assets/search-index.json', async (route) => {
    const idx = [
      { u: '/2025/10/26/Tyrrrz-YoutubeExplode.html', t: 'youtube', title: 'YoutubeExplode', d: '2025-10-26', s: 'YouTube extractor' }
    ];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(idx) });
  });

  await page.goto(BASE + '/');
  await page.waitForSelector('#site-search');

  // Inject our stub after page load
  await page.evaluate(() => {
    (window as any).__sem = {
      topK: async () => [
        { u: '/2025/10/26/Tyrrrz-YoutubeExplode.html', score: 0.99 }
      ],
      preload: async () => {}
    };
  });

  // Enable semantic mode
  await page.check('#sem-toggle', { force: true });

  // Type query
  await page.fill('#site-search', 'youtube');

  // Result should appear
  const first = page.locator('#search-results a').first();
  await expect(first).toHaveAttribute('href', /Tyrrrz-YoutubeExplode\.html$/);
});
