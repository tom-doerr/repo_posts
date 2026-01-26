import { test, expect } from '@playwright/test';

const BASE = process.env.BASE || 'https://tom-doerr.github.io/repo_posts';

test('post page has related repos', async ({ page, request }) => {
  const resp = await request.get(BASE + '/assets/search-index.json');
  const idx: any[] = await resp.json();
  const post = idx[0];
  await page.goto(BASE + post.u);
  await expect(page.locator('.related-list')).toBeVisible({ timeout: 5000 });
});

test('post page has view on index link', async ({ page, request }) => {
  const resp = await request.get(BASE + '/assets/search-index.json');
  const idx: any[] = await resp.json();
  await page.goto(BASE + idx[0].u);
  await expect(page.locator('a:has-text("View on index")')).toBeVisible();
});
