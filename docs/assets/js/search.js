---
---
(function(){
  const input = document.getElementById('site-search');
  if(!input) return;
  let data=null, timer=null, active=-1, current=[];
  const panel = document.getElementById('search-results');
  const BASE = '{{ site.baseurl | default: "" }}';
  const fetchIdx = async () => {
    if(data) return data;
    const r = await fetch('{{ "/assets/search-index.json" | relative_url }}', {cache:'no-store'});
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
  const render = () => {
    if(!current || !current.length){ panel.hidden=true; panel.innerHTML=''; active=-1; return; }
    panel.hidden=false;
    panel.innerHTML = '<ul>' + current.slice(0,20).map((e,i)=>{
      return `<li class="${i===active?'active':''}"><a href="${BASE}${e.u}">${highlight(e.title,currentQuery)}</a><small>${e.d}</small></li>`;
    }).join('') + '</ul>';
  };
  input.addEventListener('input', (e)=>{
    clearTimeout(timer);
    const qRaw = e.target.value; const q = qRaw.trim().toLowerCase(); currentQuery = qRaw;
    if(!q){ current=[]; render(); return; }
    timer = setTimeout(()=>{ (async()=>{
      const idx=await fetchIdx();
      const toks = q.split(/\s+/).filter(t=>t.length>1);
      const scored = [];
      for(const obj of idx){
        const text = obj.t;
        let miss=false, score=0;
        for(const t of toks){ const pos = text.indexOf(t); if(pos<0){ miss=true; break; } score += 1000 - pos; }
        if(!miss) scored.push({obj, score});
      }
      scored.sort((a,b)=> b.score - a.score);
      current = scored.map(r=>r.obj);
      active = current.length?0:-1; render();
    })(); }, 100);
  });
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
