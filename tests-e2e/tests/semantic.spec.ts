import { test, expect } from '@playwright/test';

test('semantic toggle reranks results (stubbed)', async ({ page, baseURL }) => {
  const BASE = baseURL!.replace(/\/$/, '');
  await page.goto(BASE + '/');
  await page.waitForSelector('#site-search');

  // Stub semantic engine and force semantic mode even if the toggle is disabled in this env
  await page.addInitScript(() => {
    // @ts-ignore
    window.__sem = { topK: async () => [{ u: '/2025/10/26/Tyrrrz-YoutubeExplode.html', score: 0.99 }] };
  });
  await page.evaluate(() => {
    const el = document.getElementById('sem-toggle') as HTMLInputElement | null;
    if (el) (el as any).checked = true;
  });

  // Type a query; panel should show the stubbed result at the top
  await page.fill('#site-search', 'youtube');
  const first = page.locator('#search-results a').first();
  await expect(first).toHaveAttribute('href', /\/repo_posts\/2025\/10\/26\/Tyrrrz-YoutubeExplode\.html$/);

  // Turn off semantic and ensure results change away from the stubbed URL
  await page.evaluate(() => {
    const el = document.getElementById('sem-toggle') as HTMLInputElement | null;
    if (el) (el as any).checked = false;
  });
  await page.fill('#site-search', 'engine');
  const firstHref = await first.getAttribute('href');
  expect(firstHref).not.toMatch(/Tyrrrz-YoutubeExplode/);
});

