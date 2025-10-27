import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 30000,
  retries: 1,
  use: {
    headless: true,
    baseURL: process.env.BASE || 'https://tom-doerr.github.io/repo_posts',
  },
});

