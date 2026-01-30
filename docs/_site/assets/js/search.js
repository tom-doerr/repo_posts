(function(){
  const input = document.getElementById('site-search');
  if(!input) return;
  let data=null, timer=null, active=-1, current=[];
  const panel = document.getElementById('search-results');
  const clearBtn = document.getElementById('search-clear');
  const countEl = document.getElementById('search-count');
  const semStatus = document.getElementById('sem-status');
  let semSeq = 0;
  // If WebGPU is unavailable, disable semantic toggle to avoid slow/unsupported paths
  const semToggle = document.getElementById('sem-toggle');
  if(semToggle && !('gpu' in navigator)){
    semToggle.disabled = true;
    if(semStatus){ semStatus.hidden = false; semStatus.textContent = 'Sem unsupported'; }
    const label = document.querySelector('label.sem');
    if(label) label.title = 'Semantic search needs WebGPU on this device';
  }
  // If user enables Sem, begin preloading model/index to reduce "Embedding…" wait
  if(semToggle){
    semToggle.addEventListener('change', ()=>{
      if(semToggle.checked && window.__sem && typeof window.__sem.preload === 'function'){
        if(semStatus){ semStatus.hidden = false; semStatus.textContent = 'Loading model…'; }
        window.__sem.preload().then(()=>{ if(semStatus) semStatus.hidden = true; }).catch(()=>{});
      }
    });
  }
  const BASE = '/repo_posts';
  const fetchIdx = async () => {
    if(data) return data;
    const r = await fetch('/repo_posts/assets/search-index.json');
    data = await r.json();
    return data;
  };
  let currentQuery='';
  const esc = s=>s.replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const highlight = (text, q)=>{
    let out = esc(text);
    const toks = (q||'').trim().split(/\s+/).filter(t=>t.length>1);
    for(const t of toks){
      const re = new RegExp('('+t.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')+')','ig');
      out = out.replace(re,'<mark>$1</mark>');
    }
    return out;
  };
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
    timer = setTimeout(()=>{ (async()=>{
      const idx=await fetchIdx();
      const sem = document.getElementById('sem-toggle');
      if(sem && sem.checked && window.__sem){
        try {
          const mySeq = ++semSeq; if(semStatus) semStatus.hidden = false;
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
          if(semStatus) semStatus.hidden = true;
          return;
        } catch (err) { current = []; }
      } else {
        let res;
        if(window.fuzzysort){
          res = qNoOwner ? fuzzysort.go(qNoOwner, idx, {key:'t', limit:50}) : idx.map(x=>({obj:x}));
        } else {
          res = (qNoOwner ? idx.filter(x=>x.t.includes(qNoOwner)) : idx).map(x=>({obj:x}));
        }
        if(toksAnd.length){ res = res.filter(r=>toksAnd.every(t=>r.obj.t.includes(t))); }
        current = res.map(r=>r.obj);
      }
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
