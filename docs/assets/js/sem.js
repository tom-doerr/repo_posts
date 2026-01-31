// Minimal semantic search module. Exposes window.__sem.topK with onPartial.
(() => {
  let E = null, meta = null, model = null;
  let lastError = null;
  const el = () => document.getElementById('sem-status');
  const setStatus = (t, show = true) => { const x = el(); if (!x) return; x.hidden = !show; if (t !== undefined) x.textContent = t; };
  const setError = (code, err, user) => {
    lastError = {
      code,
      message: (err && err.message) ? String(err.message) : String(err),
      user: user || undefined,
    };
    try { console.error('[sem]', code, err); } catch (e) {}
  };
  const clearError = () => { lastError = null; };
  // Ensure the base is an absolute URL; URL() cannot use a path-only base like "/repo_posts/assets/".
  const BASE = new URL((window.__SEM_ASSETS_BASE || '/assets/'), location.origin);

  async function loadEmbeddings() {
    if (E && meta) return { E, meta };
    setStatus('Loading index…', true);
    try {
      const [rBin, rMeta] = await Promise.all([
        fetch(new URL('embeddings.f32', BASE), { cache: 'no-store' }),
        fetch(new URL('embeddings.meta.json', BASE), { cache: 'no-store' }),
      ]);
      if (!rBin.ok) throw new Error(`embeddings.f32 HTTP ${rBin.status}`);
      if (!rMeta.ok) throw new Error(`embeddings.meta.json HTTP ${rMeta.status}`);
      const [buf, m] = await Promise.all([rBin.arrayBuffer(), rMeta.json()]);
      E = new Float32Array(buf);
      meta = m;
      clearError();
      return { E, meta };
    } catch (err) {
      setError('embeddings_load', err, 'Failed to load semantic index assets (embeddings.*).');
      setStatus('Sem error: failed to load embeddings', true);
      throw err;
    }
  }

  async function loadModel() {
    if (model) return model;
    setStatus('Loading model…', true);
    try {
      const t = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.1');
      model = await t.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        progress_callback: (p) => {
          if (!p) return;
          if (p.status === 'progress' && typeof p.progress === 'number') {
            setStatus(`Loading model… ${Math.round(p.progress)}%`, true);
          } else if (p.status === 'ready') {
            setStatus('Embedding…', true);
          }
        }
      });
      clearError();
      return model;
    } catch (err) {
      setError('model_load', err, 'Failed to load the semantic model (cdn.jsdelivr.net may be blocked).');
      setStatus('Sem error: failed to load model', true);
      throw err;
    }
  }

  async function embed(q) {
    setStatus('Embedding…', true);
    // Gentle hints for first-time users: model download can take a while
    const hintSoon = setTimeout(() => setStatus('Embedding… first run may take ~60s'), 5000);
    const hintLong = setTimeout(() => setStatus('Embedding… still working — if this never finishes, try a hard reload'), 45000);
    try {
      const mdl = await loadModel();
      const out = await mdl(q, { pooling: 'mean', normalize: true });
      return out.data;
    } finally {
      clearTimeout(hintSoon);
      clearTimeout(hintLong);
    }
  }

  async function topK(q, k = 20, opt = {}) {
    document.body.classList.add('sem-running');
    try {
      setStatus('Ranking…', true);
      const [{ E, meta }, v] = await Promise.all([loadEmbeddings(), embed(q)]);
      const dim = meta.dim, n = meta.count;
      const scores = new Array(n);
      // Initialise numeric progress
      let lastStatus = 0;
      setStatus(`Ranking… 0/${n} (0%)`, true);
      for (let i = 0, off = 0; i < n; i++, off += dim) {
        let s = 0.0; for (let j = 0; j < dim; j++) { s += E[off + j] * v[j]; } scores[i] = s;
        if ((i & 31) === 31 && opt.onPartial) {
          const idxp = Array.from({ length: i + 1 }, (_, t) => t).sort((a, b) => scores[b] - scores[a]).slice(0, Math.min(k, i + 1));
          opt.onPartial(idxp.map(t => ({ u: meta.urls[t], score: scores[t] })));
        }
        if ((i & 31) === 31) {
          const now = performance.now();
          if (now - lastStatus > 80) {
            const done = i + 1;
            const pct = Math.round((done * 100) / n);
            setStatus(`Ranking… ${done}/${n} (${pct}%)`, true);
            lastStatus = now;
          }
        }
      }
      const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => scores[b] - scores[a]).slice(0, k);
      clearError();
      setStatus('', false);
      return idx.map(i => ({ u: meta.urls[i], score: scores[i] }));
    } catch (err) {
      setError('topk', err, 'Semantic ranking failed.');
      setStatus('Sem error: ' + ((err && err.message) ? err.message : String(err)), true);
      throw err;
    } finally {
      document.body.classList.remove('sem-running');
    }
  }

  // Optional: allow preloading to start model/index fetch when Sem is toggled on
  async function preload(){ await Promise.all([loadEmbeddings(), loadModel()]); }

  window.__sem = { topK, preload, getLastError: () => lastError };
})();
