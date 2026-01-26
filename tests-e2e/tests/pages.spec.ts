import { test, expect } from '@playwright/test';

const BASE = process.env.BASE || 'https://tom-doerr.github.io/repo_posts';

test('status page loads with metrics', async ({ page }) => {
  await page.goto(BASE + '/status.html');
  await expect(page.locator('text=Posts:')).toBeVisible();
  await expect(page.locator('text=Embeddings:')).toBeVisible();
});

test('RSS feed is accessible', async ({ request }) => {
  const resp = await request.get(BASE + '/feed.xml');
  expect(resp.ok()).toBeTruthy();
  const body = await resp.text();
  expect(body).toContain('<feed');
  expect(body).toContain('<entry>');
});

test('archive page loads', async ({ page }) => {
  await page.goto(BASE + '/archive.html');
  await expect(page).toHaveTitle(/Archive/);
});
