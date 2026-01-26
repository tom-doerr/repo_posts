import { test, expect } from '@playwright/test';

test('semantic toggle reranks results (stubbed)', async ({ page, baseURL, request }) => {
  const BASE = (baseURL || 'https://tom-doerr.github.io/repo_posts').replace(/\/$/, '');

  // Fetch the live search index and pick a guaranteed URL
  const resp = await request.get(BASE + '/assets/search-index.json');
  expect(resp.ok()).toBeTruthy();
  const idx: any[] = await resp.json();
  const pick = idx.find(e => typeof e.u === 'string' && e.u.endsWith('.html')) || idx[0];
  expect(pick && pick.u).toBeTruthy();

  // Ensure WebGPU gate passes
  await page.addInitScript(() => {
    if (!('gpu' in navigator)) {
      Object.defineProperty(navigator, 'gpu', { value: {}, configurable: true });
    }
  });

  // Block sem.js to prevent it from overwriting our stub
  await page.route('**/assets/js/sem.js', route => route.abort());

  await page.goto(BASE + '/');
  await page.waitForSelector('#site-search');

  // Inject stub after page load
  await page.evaluate((u) => {
    (window as any).__sem = { topK: async () => [{ u, score: 0.99 }], preload: async () => {} };
  }, pick.u);

  // Enable semantic mode
  await page.check('#sem-toggle', { force: true });

  // Type query
  await page.fill('#site-search', 'a');

  // Result should match our stubbed URL
  const first = page.locator('#search-results a').first();
  const pattern = new RegExp(pick.u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  await expect(first).toHaveAttribute('href', pattern);
});
