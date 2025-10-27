// Minimal semantic search module. Exposes window.__sem.topK with onPartial.
(() => {
  let E = null, meta = null, model = null;
  const el = () => document.getElementById('sem-status');
  const setStatus = (t, show = true) => { const x = el(); if (!x) return; x.hidden = !show; if (t !== undefined) x.textContent = t; };
  const BASE = (window.__SEM_ASSETS_BASE || '/assets/');

  async function loadEmbeddings() {
    if (E && meta) return { E, meta };
    setStatus('Loading index…', true);
    const [buf, m] = await Promise.all([
      fetch(new URL('embeddings.f32', BASE), { cache: 'no-store' }).then(r => r.arrayBuffer()),
      fetch(new URL('embeddings.meta.json', BASE), { cache: 'no-store' }).then(r => r.json()),
    ]);
    E = new Float32Array(buf); meta = m; return { E, meta };
  }

  async function loadModel() {
    if (model) return model;
    setStatus('Loading model…', true);
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
    return model;
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
    setStatus('', false);
    document.body.classList.remove('sem-running');
    return idx.map(i => ({ u: meta.urls[i], score: scores[i] }));
  }

  // Optional: allow preloading to start model/index fetch when Sem is toggled on
  async function preload(){ try { await Promise.all([loadEmbeddings(), loadModel()]); } catch(e){} }

  window.__sem = { topK, preload };
})();
