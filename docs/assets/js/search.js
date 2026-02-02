---
---
(function(){
  const input = document.getElementById('site-search');
  if(!input) return;
  let data=null, idxPromise=null, timer=null, active=-1, current=[];
  const panel = document.getElementById('search-results');
  const clearBtn = document.getElementById('search-clear');
  const countEl = document.getElementById('search-count');
  const semStatus = document.getElementById('sem-status');
  const semToggle = document.getElementById('sem-toggle');
  const semDetails = document.getElementById('sem-details');
  const semDetailsPre = document.getElementById('sem-details-pre');
  const semDetailsCopy = document.getElementById('sem-details-copy');
  let semSeq = 0;
  const getSemLastError = () => {
    try {
      if(window.__sem && typeof window.__sem.getLastError === 'function') return window.__sem.getLastError();
    } catch(e) {}
    return null;
  };
  const updateSemDetails = (extra) => {
    if(!semDetails || !semDetailsPre) return;
    const err = getSemLastError();
    const lines = [];
    lines.push(`time: ${new Date().toISOString()}`);
    lines.push(`page: ${location.href}`);
    lines.push(`webgpu: ${('gpu' in navigator) ? 'yes' : 'no'}`);
    if(semToggle){
      lines.push(`sem_toggle: ${semToggle.checked ? 'on' : 'off'}${semToggle.disabled ? ' (disabled)' : ''}`);
    } else {
      lines.push('sem_toggle: (missing)');
    }
    lines.push(`sem_module: ${(window.__sem && typeof window.__sem.topK === 'function') ? 'loaded' : 'missing'}`);
    lines.push(`assets_base: ${window.__SEM_ASSETS_BASE || '(unset)'}`);
    if(err){
      lines.push(`last_error: ${err.code || '(no code)'} — ${err.user || err.message || ''}`.trim());
      if(err.code === 'model_load'){
        lines.push('hint: a CDN may be blocked by an extension/network (jsdelivr/esm.sh/skypack).');
      } else if(err.code === 'embeddings_load'){
        lines.push('hint: embeddings.* may be missing/404 on the deployed site.');
      }
    } else {
      lines.push('last_error: none');
    }
    if(extra && typeof extra.note === 'string' && extra.note){
      lines.push(`note: ${extra.note}`);
    }
    semDetailsPre.textContent = lines.join('\n');
    const sticky = semDetails.open;
    const hasFlag = !!(semStatus && (semStatus.classList.contains('sem-error') || semStatus.classList.contains('sem-warn')));
    const shouldShow = sticky || hasFlag || !!(semToggle && semToggle.checked);
    semDetails.hidden = !shouldShow;
  };
  if(semDetailsCopy && semDetailsPre && navigator.clipboard){
    semDetailsCopy.addEventListener('click', ()=>{
      const txt = semDetailsPre.textContent || '';
      navigator.clipboard.writeText(txt).then(()=>{
        const old = semDetailsCopy.textContent;
        semDetailsCopy.textContent = 'Copied';
        setTimeout(()=>{ semDetailsCopy.textContent = old; }, 1200);
      }, ()=>{
        const old = semDetailsCopy.textContent;
        semDetailsCopy.textContent = 'Copy failed';
        setTimeout(()=>{ semDetailsCopy.textContent = old; }, 1200);
      });
    });
  }
  const setSemStatus = (msg, kind) => {
    if(!semStatus) return;
    if(!msg){
      semStatus.hidden = true;
      semStatus.textContent = '';
      semStatus.classList.remove('sem-error', 'sem-warn');
      updateSemDetails();
      return;
    }
    semStatus.hidden = false;
    semStatus.textContent = msg;
    semStatus.classList.toggle('sem-error', kind === 'error');
    semStatus.classList.toggle('sem-warn', kind === 'warn');
    updateSemDetails();
  };
  const triggerSearch = () => {
    if(!input.value || !input.value.trim()) return;
    input.dispatchEvent(new Event('input'));
  };
  const waitForSem = (timeoutMs) => new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const ok = window.__sem && typeof window.__sem.preload === 'function';
      if(ok) return resolve(window.__sem);
      if(performance.now() - t0 >= timeoutMs) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
  // If user enables Sem, begin preloading model/index to reduce "Embedding…" wait
  if(semToggle){
    semToggle.addEventListener('change', ()=>{
      if(!semToggle.checked){
        // Clear any sticky semantic error when switching off
        if(semStatus && semStatus.classList.contains('sem-error')) setSemStatus('', null);
        updateSemDetails({ note: 'Sem toggled off' });
        triggerSearch();
        return;
      }
      (async()=>{
        setSemStatus('Loading semantic…', null);
        const sem = await waitForSem(2000);
        // Sem is enabled, but module didn't load (common with adblock or missing asset).
        if(!sem){
          setSemStatus('Sem failed to load (blocked or missing). Using keyword search.', 'error');
          updateSemDetails({ note: 'Sem enabled but module missing (timeout)' });
          triggerSearch();
          return;
        }
        try {
          await sem.preload();
          if(semStatus && !semStatus.classList.contains('sem-error')) semStatus.hidden = true;
          updateSemDetails({ note: 'Sem preload ok' });
        } catch (err) {
          const msg = (err && err.message) ? err.message : String(err);
          setSemStatus('Sem preload error: ' + msg, 'error');
          updateSemDetails({ note: 'Sem preload failed' });
        }
        triggerSearch();
      })();
    });
  }
  const BASE = '{{ site.baseurl | default: "" }}';
  const fetchIdx = async () => {
    if(data) return data;
    if(idxPromise) return idxPromise;
    idxPromise = (async()=>{
      const r = await fetch('{{ "/assets/search-index.json" | relative_url }}');
      if(!r.ok) throw new Error(`search-index.json HTTP ${r.status}`);
      data = await r.json();
      return data;
    })();
    try { return await idxPromise; }
    catch (err) { idxPromise = null; throw err; }
  };
  let currentQuery='';
  const esc = s=>String(s == null ? '' : s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const highlight = (text, q)=>{
    let out = esc(text);
    const toks = (q||'').trim().split(/\s+/).filter(t=>t.length>1);
    for(const t of toks){
      const re = new RegExp('('+t.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')+')','ig');
      out = out.replace(re,'<mark>$1</mark>');
    }
    return out;
  };
  // Prefetch the index as soon as the user shows intent.
  input.addEventListener('focus', ()=>{ fetchIdx().catch(()=>{}); });
  const render = (showEmpty) => {
    if(countEl){ countEl.hidden = !current.length && !showEmpty; countEl.textContent = current.length ? `${current.length} result${current.length===1?'':'s'}` : ''; }
    if(!current.length){
      if(showEmpty){ panel.hidden=false; panel.innerHTML='<div class="search-empty">No repos found</div>'; }
      else{ panel.hidden=true; panel.innerHTML=''; }
      active=-1; return;
    }
    panel.hidden=false;
    panel.innerHTML = '<ul>' + current.slice(0,20).map((e,i)=>{
      const snip = e.s ? `<div class="snippet">${highlight(e.s,currentQuery)}</div>` : '';
      return `<li role="option" ${i===active?'aria-selected="true"':''} class="${i===active?'active':''}"><a href="${BASE}${e.u}">${highlight(e.title,currentQuery)}</a><small>${e.d}</small>${snip}</li>`;
    }).join('') + '</ul>';
  };
  input.addEventListener('input', (e)=>{
    clearTimeout(timer);
    const qRaw = e.target.value; const q = qRaw.trim().toLowerCase(); currentQuery = qRaw;
    // owner:foo filter (case-insensitive). Minimal parsing: first owner:token wins.
    const m = q.match(/(?:^|\s)owner:([\w-]+)/);
    const owner = m ? m[1].toLowerCase() : null;
    const qNoOwner = owner ? q.replace(m[0], '').trim() : q;
    const toksAnd = qNoOwner.split(/\s+/).filter(t=>t.length>1);
    if(clearBtn) clearBtn.hidden = !qRaw;
    if(!q){ current=[]; render(); return; }
    if(!data && panel){
      panel.hidden = false;
      panel.innerHTML = '<ul><li class="active"><small>Loading index…</small></li></ul>';
    }
    timer = setTimeout(()=>{ (async()=>{
      let idx;
      try {
        idx=await fetchIdx();
      } catch (err) {
        if(panel){ panel.hidden=false; panel.innerHTML='<div class="search-empty">Failed to load search index</div>'; }
        return;
      }
      const sem = document.getElementById('sem-toggle');
      const semWanted = sem && sem.checked;
      const semAvailable = semWanted && window.__sem && typeof window.__sem.topK === 'function';
      if(semWanted && !semAvailable){
        setSemStatus('Sem is on but unavailable (blocked or missing). Using keyword search.', 'error');
      }
      if(semAvailable){
        try {
          const mySeq = ++semSeq;
          if(semStatus){ semStatus.classList.remove('sem-error','sem-warn'); semStatus.hidden = false; }
          updateSemDetails({ note: 'Semantic search running' });
          // Incremental results: stream updates as scores are computed
          const byUrl = new Map(idx.map(x=>[x.u, x]));
          let lastFlush = 0, top = [];
          const stream = await window.__sem.topK(qRaw, 50, {
            onPartial: (partial)=>{
              const now = performance.now();
              if(now - lastFlush < 80) return; // throttle to ~12fps
              lastFlush = now; top = partial;
              const arr = top.map(t=>byUrl.get(t.u)).filter(Boolean);
              let out = owner ? arr.filter(e => (e.t||'').toLowerCase().includes(`[${owner}/`)) : arr;
              current = out.slice(0,20);
              active = current.length?0:-1; render();
            }
          });
          // Final results
          if(mySeq !== semSeq) return; // stale
          const arr = stream.map(t=>byUrl.get(t.u)).filter(Boolean);
          current = owner ? arr.filter(e => (e.t||'').toLowerCase().includes(`[${owner}/`)) : arr;
          active = current.length?0:-1; render(true);
          if(semStatus && !semStatus.classList.contains('sem-error')) semStatus.hidden = true;
          updateSemDetails({ note: 'Semantic search complete' });
          return;
        } catch (err) {
          // Surface semantic failure, then fall back to keyword search.
          let msg = (err && err.message) ? err.message : String(err);
          try {
            if(window.__sem && typeof window.__sem.getLastError === 'function'){
              const e = window.__sem.getLastError();
              if(e && (e.user || e.message)) msg = e.user || e.message || msg;
            }
          } catch(e) {}
          setSemStatus('Sem error: ' + msg, 'error');
        }
      }
      let res;
      if(window.fuzzysort){
        res = qNoOwner ? fuzzysort.go(qNoOwner, idx, {key:'t', limit:50}) : idx.map(x=>({obj:x}));
      } else {
        res = (qNoOwner ? idx.filter(x=>x.t.includes(qNoOwner)) : idx).map(x=>({obj:x}));
      }
      if(toksAnd.length){ res = res.filter(r=>toksAnd.every(t=>r.obj.t.includes(t))); }
      current = res.map(r=>r.obj);
      if(owner){ current = current.filter(e => (e.t||'').toLowerCase().includes(`[${owner}/`)); }
      active = current.length?0:-1; render(true);
    })(); }, 100);
  });
  // Clear button
  if(clearBtn){ clearBtn.addEventListener('click', ()=>{ input.value=''; clearBtn.hidden=true; current=[]; render(); input.focus(); if(countEl) countEl.hidden=true; }); }
  input.addEventListener('keydown', (e)=>{
    if(panel.hidden || !current.length) return;
    if(e.key==='ArrowDown' || e.key==='j'){ e.preventDefault(); active=Math.min(active+1, current.length-1); render(); }
    else if(e.key==='ArrowUp' || e.key==='k'){ e.preventDefault(); active=Math.max(active-1, 0); render(); }
    else if(e.key==='Enter'){ if(active>=0){ window.location = BASE + current[active].u; } }
    else if(e.key==='Escape'){ panel.hidden=true; panel.innerHTML=''; active=-1; }
  });
  document.addEventListener('keydown', (e)=>{ if(document.activeElement!==input) return; if(e.key==='j' || e.key==='k' || e.key==='Enter' || e.key==='Escape') input.dispatchEvent(new KeyboardEvent('keydown', e)); });
  document.addEventListener('click', (ev)=>{ if(!panel.contains(ev.target) && ev.target!==input){ panel.hidden=true; }});
  // "/" focuses the search input when not typing in a field
  document.addEventListener('keydown', (e)=>{
    if(e.key!=='/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if(tag==='input' || tag==='textarea') return;
    e.preventDefault();
    input.focus();
  });
})();
