import { test, expect } from '@playwright/test';

const BASE = process.env.BASE || 'https://tom-doerr.github.io/repo_posts';

test('homepage loads with posts', async ({ page }) => {
  await page.goto(BASE + '/');
  await expect(page).toHaveTitle(/Repository Showcase/);
  const posts = page.locator('.post-card, article, .post');
  await expect(posts.first()).toBeVisible();
});

test('search input exists and is focusable', async ({ page }) => {
  await page.goto(BASE + '/');
  const search = page.locator('#site-search');
  await expect(search).toBeVisible();
  await search.focus();
  await expect(search).toBeFocused();
});

test('fuzzy search returns results', async ({ page }) => {
  await page.goto(BASE + '/');
  await page.fill('#site-search', 'python');
  const results = page.locator('#search-results a');
  await expect(results.first()).toBeVisible({ timeout: 5000 });
});
