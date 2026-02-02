// Minimal in-browser chat LLM (WebGPU) for the 3D map.
// Exposes window.__llm.chat(messages, { onStatus }) => { text }.
(() => {
  let gen = null;
  let lastError = null;
  const MODEL = 'Xenova/distilgpt2';

  const setError = (code, err, user) => {
    lastError = {
      code,
      message: (err && err.message) ? String(err.message) : String(err),
      user: user || undefined,
    };
    try { console.error('[llm]', code, err); } catch (e) {}
  };
  const clearError = () => { lastError = null; };

  async function importTransformers() {
    const sources = [
      'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.1',
      'https://esm.sh/@xenova/transformers@2.14.1',
      'https://cdn.skypack.dev/@xenova/transformers@2.14.1',
    ];
    let last = null;
    for (const src of sources) {
      try {
        return await import(src);
      } catch (err) {
        last = err;
      }
    }
    throw last || new Error('Failed to import transformers');
  }

  function requireWebGPU() {
    if (!('gpu' in navigator)) {
      throw new Error('WebGPU is not available in this browser.');
    }
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      throw new Error('WebGPU requires a secure context (https).');
    }
  }

  async function loadGenerator(opt = {}) {
    if (gen) return gen;
    requireWebGPU();
    const onStatus = (typeof opt.onStatus === 'function') ? opt.onStatus : null;
    if (onStatus) onStatus('Chat: loading model…');
    try {
      const t = await importTransformers();
      // Prefer quantized WebGPU; fall back to non-quantized if needed.
      try {
        gen = await t.pipeline('text-generation', MODEL, {
          device: 'webgpu',
          quantized: true,
          progress_callback: (p) => {
            if (!onStatus || !p) return;
            if (p.status === 'progress' && typeof p.progress === 'number') {
              onStatus(`Chat: loading… ${Math.round(p.progress)}%`);
            } else if (p.status === 'ready') {
              onStatus('Chat: ready');
            }
          }
        });
      } catch (errQ) {
        gen = await t.pipeline('text-generation', MODEL, {
          device: 'webgpu',
          progress_callback: (p) => {
            if (!onStatus || !p) return;
            if (p.status === 'progress' && typeof p.progress === 'number') {
              onStatus(`Chat: loading… ${Math.round(p.progress)}%`);
            } else if (p.status === 'ready') {
              onStatus('Chat: ready');
            }
          }
        });
      }
      clearError();
      if (onStatus) onStatus('Chat: ready');
      return gen;
    } catch (err) {
      setError('model_load', err, 'Failed to load the chat model (a CDN may be blocked).');
      if (onStatus) onStatus('Chat: failed to load');
      throw err;
    }
  }

  function buildPrompt(messages) {
    const sys =
      'You are a tiny local assistant embedded in a 3D map UI. ' +
      'Be concise. If unsure, say so. Do not invent facts.';
    const lines = [sys, ''];
    const tail = Array.isArray(messages) ? messages.slice(-10) : [];
    for (const m of tail) {
      if (!m || !m.role) continue;
      const role = (m.role === 'assistant') ? 'Assistant' : 'User';
      const content = String(m.content || '').replace(/\s+/g, ' ').trim();
      if (!content) continue;
      lines.push(`${role}: ${content}`);
    }
    lines.push('Assistant:');
    return lines.join('\n');
  }

  async function chat(messages, opt = {}) {
    const onStatus = (typeof opt.onStatus === 'function') ? opt.onStatus : null;
    const prompt = buildPrompt(messages);
    const g = await loadGenerator({ onStatus });
    if (onStatus) onStatus('Chat: thinking…');
    try {
      const out = await g(prompt, {
        max_new_tokens: Math.max(8, Math.min(240, opt.maxNewTokens || 160)),
        do_sample: true,
        temperature: 0.8,
        top_p: 0.95,
        repetition_penalty: 1.08,
        return_full_text: false,
      });
      clearError();
      const txt = (out && out[0] && out[0].generated_text != null) ? String(out[0].generated_text) : '';
      return { text: txt.trim() };
    } catch (err) {
      setError('generate', err, 'Chat generation failed.');
      throw err;
    } finally {
      if (onStatus) onStatus('');
    }
  }

  async function preload(opt = {}) { await loadGenerator(opt); }

  window.__llm = { chat, preload, getLastError: () => lastError, model: MODEL };
})();

