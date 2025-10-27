import { test, expect } from '@playwright/test';

// E2E for embedding path using network stubs to avoid heavy model/asset loads.
test('embedding UI shows model progress, then embedding, then ranking, and yields results', async ({ page, baseURL }) => {
  const BASE = (baseURL || 'https://tom-doerr.github.io/repo_posts').replace(/\/$/, '');

  // Ensure WebGPU gate passes
  await page.addInitScript(() => {
    // @ts-ignore
    if (!('gpu' in navigator)) Object.defineProperty(navigator, 'gpu', { value: {}, configurable: true });
  });

  // Route the Transformers.js CDN import to a tiny stub that triggers progress and returns a small model
  // Intercept common jsDelivr paths for the module (with or without trailing files)
  const fulfillStub = async (route: any) => {
    const body = [
      'export async function pipeline(task, modelId, opt = {}) {',
      '  const cb = opt.progress_callback;',
      '  if (cb) {',
      '    setTimeout(()=>cb({status:"progress", progress:10}), 10);',
      '    setTimeout(()=>cb({status:"progress", progress:100}), 30);',
      '    setTimeout(()=>cb({status:"ready"}), 40);',
      '  }',
      '  return async (q, opts) => ({ data: new Float32Array([1,0,0,0]) });',
      '}'
    ].join('\n');
    await route.fulfill({ status: 200, contentType: 'application/javascript', body });
  };
  await page.route('**/@xenova/transformers@2.14.1**', fulfillStub);
  await page.route('**/npm/@xenova/transformers@2.14.1**', fulfillStub);

  // Provide tiny embeddings assets (4 docs, dim=4); first doc should rank highest
  await page.route('**/assets/embeddings.meta.json', async (route) => {
    const meta = { dim: 4, count: 4, urls: [
      '/2025/10/26/Tyrrrz-YoutubeExplode.html',
      '/2025/10/27/pgadmin-org-pgadmin4.html',
      '/2025/10/27/yogeshojha-rengine.html',
      '/2025/10/27/jakejarvis-awesome-shodan-queries.html'
    ]};
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(meta) });
  });
  await page.route('**/assets/embeddings.f32', async (route) => {
    const E = new Float32Array([
      1,0,0,0,  // best match for query [1,0,0,0]
      0.5,0,0,0,
      0,1,0,0,
      0,0,1,0,
    ]);
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/octet-stream' }, body: Buffer.from(E.buffer) });
  });

  await page.goto(BASE + '/');
  await page.waitForSelector('#site-search');

  // Enable semantic mode
  const semToggle = page.locator('#sem-toggle');
  await semToggle.check({ force: true });

  // Start a query, observe states
  await page.fill('#site-search', 'youtube');

  // Model download progress should appear
  await expect(page.locator('#sem-status')).toContainText('Loading model…');

  // Then embedding
  await expect(page.locator('#sem-status')).toContainText('Embedding…');

  // Then ranking with numeric progress
  await expect(page.locator('#sem-status')).toContainText('Ranking…');

  // Ensure a result appears and the top hit is our first URL
  const first = page.locator('#search-results a').first();
  await expect(first).toHaveAttribute('href', /\/repo_posts\/2025\/10\/26\/Tyrrrz-YoutubeExplode\.html$/);
});
