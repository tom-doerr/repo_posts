import { test, expect } from '@playwright/test';

test('semantic toggle reranks results (stubbed)', async ({ page, baseURL, request }) => {
  const BASE = (baseURL || 'https://tom-doerr.github.io/repo_posts').replace(/\/$/, '');
  // Fetch the live search index and pick a guaranteed URL
  const resp = await request.get(BASE + '/assets/search-index.json');
  expect(resp.ok()).toBeTruthy();
  const idx: any[] = await resp.json();
  const pick = idx.find(e => typeof e.u === 'string' && e.u.endsWith('.html')) || idx[0];
  expect(pick && pick.u).toBeTruthy();

  await page.goto(BASE + '/');
  await page.waitForSelector('#site-search');

  // Stub semantic engine to return the picked URL and force semantic mode
  await page.addInitScript((u) => {
    // @ts-ignore
    window.__sem = { topK: async () => [{ u, score: 0.99 }] };
  }, pick.u);
  await page.evaluate(() => {
    const el = document.getElementById('sem-toggle') as HTMLInputElement | null;
    if (el) (el as any).checked = true;
  });

  // Type a short query to trigger search; expect our stubbed URL to appear first
  await page.fill('#site-search', 'a');
  const first = page.locator('#search-results a').first();
  await expect(first).toHaveAttribute('href', new RegExp(pick.u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/^\//, '\\/repo_posts\/')));
});
