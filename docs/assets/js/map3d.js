import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const BASE = window.__SEM_ASSETS_BASE || '/repo_posts/assets/';
const SITE_BASE = BASE.replace(/\/assets\/?$/, '');
let scene, camera, renderer, controls, points, data, searchIdx, urlToMeta = {};
let raycaster, mouse, tooltip, infobox, hovered = -1, selected = -1, highlighted = -1;
let halos = null;
let highlightPulse = null;
let pendingOpenIndex = -1;
let labelsWrap, hud, labelModeSel, labelNearest, labelNearestOut, labelZoom, labelZoomOut, labelZoomRow;
let searchInput, searchModeSel, searchCaseCb, searchCountOut, searchErrorEl, searchClearBtn;
let thumbsToggle = null;
let semLocateInput = null;
let semFlyBtn = null;
let semStatusEl = null;
let labelIndices = [], labelDirty = true, lastLabelCompute = 0;
const labelPool = [];
const thumbPool = [];
const v3 = new THREE.Vector3();
let fly = null;
let baseColors = null;
let matchIndices = [];
let searchText = null;
let searchTextLc = null;
let searchDebounce = 0;
let queryPulse = null;
let semFlySeq = 0;
let lastZoomAssistCompute = 0;
let zoomAssistDist = null;
const ZOOM_SPEED_BASE = 0.8;
const ZOOM_SPEED_MIN = 0.18;
const ZOOM_ASSIST_NEAR = 0.14;
const ZOOM_ASSIST_FAR = 0.9;
const ZOOM_ASSIST_K = 3;
const ZOOM_ASSIST_SMOOTH = 0.25;

function makePointSprite() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

async function init() {
  const [d3, idx] = await Promise.all([
    fetch(BASE + 'embeddings.3d.json').then(r => r.json()),
    fetch(BASE + 'search-index.json').then(r => r.json())
  ]);
  data = d3; searchIdx = idx;
  searchIdx.forEach(p => {
    urlToMeta[p.u] = p;
    // Keep both baseurl-prefixed and baseurl-stripped keys to make deep links robust.
    if (SITE_BASE && typeof p.u === 'string') {
      if (p.u.startsWith(SITE_BASE + '/')) urlToMeta[p.u.slice(SITE_BASE.length)] = p;
      else if (p.u.startsWith('/')) urlToMeta[SITE_BASE + p.u] = p;
    }
  });
  buildSearchText();
  setupScene();
  setupInteraction();
  setupLabelsUI();
  animate();
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a0a2e);
  scene.fog = new THREE.FogExp2(0x1a0a2e, 0.8);
  camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0, 0, 1.5);
  renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true});
  renderer.setSize(innerWidth, innerHeight);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 0.5;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  const stopRotate = () => { controls.autoRotate = false; };
  renderer.domElement.addEventListener('pointerdown', stopRotate, { once: true });
  renderer.domElement.addEventListener('wheel', stopRotate, { once: true });
  controls.addEventListener('change', () => { labelDirty = true; });
  createPoints();
}

function createPoints() {
  const geo = new THREE.BufferGeometry();
  const n = data.coords.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  data.coords.forEach((c, i) => { pos[i*3]=c[0]; pos[i*3+1]=c[1]; pos[i*3+2]=c[2]; col[i*3]=1; col[i*3+1]=0.4; col[i*3+2]=0.07; });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  baseColors = col.slice();
  const sprite = makePointSprite();
  // "Shadow"/outline layer behind points to make individual nodes easier to distinguish.
  const mat = new THREE.PointsMaterial({
    size: 0.022,
    sizeAttenuation: true,
    vertexColors: true,
    map: sprite,
    transparent: true,
    alphaTest: 0.15,
    depthWrite: true,
  });
  points = new THREE.Points(geo, mat);
  scene.add(points);

  // Pulsing marker for deep-linked highlight (keeps the target obvious without clicking).
  const hgeo = new THREE.BufferGeometry();
  const hpos = new Float32Array(3);
  hgeo.setAttribute('position', new THREE.BufferAttribute(hpos, 3));
  const hmat = new THREE.PointsMaterial({
    size: 0.07,
    sizeAttenuation: true,
    map: sprite,
    transparent: true,
    opacity: 0.0,
    color: 0x00ff41,
    alphaTest: 0.05,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  highlightPulse = new THREE.Points(hgeo, hmat);
  highlightPulse.renderOrder = 2;
  highlightPulse.visible = false;
  scene.add(highlightPulse);

  // Pulsing marker for semantic "query point" (not tied to a specific node).
  const qgeo = new THREE.BufferGeometry();
  const qpos = new Float32Array(3);
  qgeo.setAttribute('position', new THREE.BufferAttribute(qpos, 3));
  const qmat = new THREE.PointsMaterial({
    size: 0.06,
    sizeAttenuation: true,
    map: sprite,
    transparent: true,
    opacity: 0.0,
    color: 0x00eaff,
    alphaTest: 0.05,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  queryPulse = new THREE.Points(qgeo, qmat);
  queryPulse.renderOrder = 2;
  queryPulse.visible = false;
  scene.add(queryPulse);

  checkHighlight();
}

function buildSearchText() {
  if (!data || !data.urls) return;
  const n = data.urls.length;
  searchText = new Array(n);
  searchTextLc = new Array(n);
  for (let i = 0; i < n; i++) {
    const url = data.urls[i];
    const meta = metaForUrl(url);
    const title = displayTitle(meta) || '';
    const summary = (meta && meta.s) ? String(meta.s) : '';
    const raw = (meta && meta.t) ? String(meta.t) : '';
    const combined = `${title} ${summary} ${url || ''} ${raw}`.trim();
    searchText[i] = combined;
    searchTextLc[i] = combined.toLowerCase();
  }
}

function normalizePath(u) {
  if (!u) return null;
  let s = String(u);
  try {
    // Accept absolute URLs, too.
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname;
  } catch (e) {}
  try { s = decodeURIComponent(s); } catch (e) {}
  if (s && s[0] !== '/') s = '/' + s;
  return s;
}

function withSiteBase(path) {
  const p = normalizePath(path);
  if (!p) return p;
  if (!SITE_BASE) return p;
  if (p.startsWith(SITE_BASE + '/')) return p;
  return SITE_BASE + p;
}

function findUrlIndex(u) {
  const p = normalizePath(u);
  if (!p || !data || !data.urls) return -1;
  const cands = [p];
  if (SITE_BASE) {
    if (p.startsWith(SITE_BASE + '/')) cands.push(p.slice(SITE_BASE.length));
    else cands.push(SITE_BASE + p);
  }
  for (const c of cands) {
    const i = data.urls.indexOf(c);
    if (i >= 0) return i;
  }
  return -1;
}

function metaForUrl(url) {
  if (!url) return null;
  return urlToMeta[url] || urlToMeta[withSiteBase(url)] || urlToMeta[normalizePath(url)];
}

function displayTitle(meta) {
  if (!meta) return null;
  const raw = String(meta.title || '');
  const m = raw.match(/\[([^\]]+)\]/);
  return (m && m[1]) ? m[1] : (raw || null);
}

function startFlyTo(i, dist = 0.6) {
  if (!data || !data.coords || !data.coords[i]) return;
  const p = data.coords[i];
  const fromPos = camera.position.clone();
  const fromTgt = controls.target.clone();
  const toTgt = new THREE.Vector3(p[0], p[1], p[2]);
  const toPos = new THREE.Vector3(p[0], p[1], p[2] + dist);
  fly = { t0: performance.now(), dur: 650, fromPos, fromTgt, toPos, toTgt };
}

function startFlyToPoint(toTgt, dur = 720, dist = 0.6) {
  if (!toTgt || !camera || !controls) return;
  const fromPos = camera.position.clone();
  const fromTgt = controls.target.clone();
  const toPos = new THREE.Vector3(toTgt.x, toTgt.y, toTgt.z + dist);
  fly = { t0: performance.now(), dur, fromPos, fromTgt, toPos, toTgt };
}

function setQueryTarget(toTgt) {
  if (!queryPulse || !toTgt) return;
  const a = queryPulse.geometry.attributes.position.array;
  a[0] = toTgt.x; a[1] = toTgt.y; a[2] = toTgt.z;
  queryPulse.geometry.attributes.position.needsUpdate = true;
  queryPulse.visible = true;
  queryPulse.material.opacity = 0.75;
}

function clearQueryTarget() {
  if (queryPulse) queryPulse.visible = false;
}

function checkHighlight() {
  const u = new URLSearchParams(location.search).get('hl'); if (!u) return;
  const i = findUrlIndex(u); if (i < 0) return;
  highlighted = i;
  if (highlightPulse && data && data.coords && data.coords[i]) {
    const p = data.coords[i];
    const a = highlightPulse.geometry.attributes.position.array;
    a[0] = p[0]; a[1] = p[1]; a[2] = p[2];
    highlightPulse.geometry.attributes.position.needsUpdate = true;
    highlightPulse.visible = true;
    highlightPulse.material.opacity = 0.85;
  }
  startFlyTo(i, 0.62);
  const open = new URLSearchParams(location.search).get('open');
  if (open !== '0') {
    selected = i;
    // Infobox DOM is created in setupInteraction() which runs after setupScene().
    // Defer opening until we have the element to avoid breaking the whole page.
    if (infobox) showInfobox(i);
    else pendingOpenIndex = i;
  }
  applyColors();
  labelDirty = true;
}

function applyColors() {
  if (!points || !points.geometry || !points.geometry.attributes || !points.geometry.attributes.color) return;
  const c = points.geometry.attributes.color.array;
  if (baseColors && baseColors.length === c.length) c.set(baseColors);
  else {
    for (let i = 0; i < c.length; i += 3) { c[i] = 1; c[i + 1] = 0.4; c[i + 2] = 0.07; }
  }

  // Search matches (cyan)
  for (let k = 0; k < matchIndices.length; k++) {
    const i = matchIndices[k];
    c[i*3] = 0.2; c[i*3 + 1] = 0.9; c[i*3 + 2] = 1.0;
  }

  // Selected (pinned) (warm white)
  if (selected >= 0) {
    c[selected*3] = 1.0; c[selected*3 + 1] = 0.92; c[selected*3 + 2] = 0.35;
  }

  // Deep-linked highlight (green) overrides everything else.
  if (highlighted >= 0) {
    c[highlighted*3] = 0.0; c[highlighted*3 + 1] = 1.0; c[highlighted*3 + 2] = 0.25;
  }

  points.geometry.attributes.color.needsUpdate = true;
}

function setupInteraction() {
  raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 0.03;
  mouse = new THREE.Vector2();
  tooltip = document.createElement('div');
  tooltip.id = 'tooltip';
  document.body.appendChild(tooltip);
  infobox = document.createElement('div');
  infobox.id = 'infobox';
  document.body.appendChild(infobox);
  if (pendingOpenIndex >= 0) {
    showInfobox(pendingOpenIndex);
    pendingOpenIndex = -1;
  }
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('click', onClick);
}

function setupLabelsUI() {
  // Label overlay container (DOM, pointer-events disabled by CSS)
  labelsWrap = document.createElement('div');
  labelsWrap.id = 'labels';
  document.body.appendChild(labelsWrap);

  // Minimal HUD controls
  hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <b>LABELS</b>
    <div class="row">
      <span>Mode</span>
      <select id="label-mode" aria-label="Label mode">
        <option value="off">Off</option>
        <option value="zoom" selected>Zoom (LOD)</option>
        <option value="nearest">Nearest N</option>
        <option value="highlight">Highlighted only</option>
        <option value="search">Search matches</option>
      </select>
    </div>
    <div class="row">
      <span>Nearest</span>
      <input id="label-nearest" type="range" min="0" max="50" value="12" />
      <output id="label-nearest-out">12</output>
    </div>
    <div class="row" id="label-zoom-row">
      <span>Zoom</span>
      <input id="label-zoom" type="range" min="0.6" max="6" step="0.1" value="2.2" />
      <output id="label-zoom-out">2.2</output>
    </div>
    <div class="row">
      <span>Shots</span>
      <label class="chk" title="Show screenshot crops for visible labels"><input id="thumbs-toggle" type="checkbox" />On</label>
    </div>
    <div class="sep"></div>
    <b>SEARCH</b>
    <div class="row">
      <span>Query</span>
      <input id="map-search" type="text" inputmode="search" autocomplete="off" spellcheck="false" placeholder="keyword or /regex/i" />
    </div>
    <div class="row">
      <span>Mode</span>
      <select id="search-mode" aria-label="Search mode">
        <option value="keyword" selected>Keyword</option>
        <option value="regex">Regex</option>
      </select>
    </div>
    <div class="row">
      <span>Case</span>
      <label class="chk"><input id="search-case" type="checkbox" />Aa</label>
    </div>
    <div class="row">
      <span>Matches</span>
      <output id="search-count">0</output>
    </div>
    <div class="row">
      <span></span>
      <button id="search-clear" type="button" class="btn2">Clear</button>
    </div>
    <div id="search-error" class="status err" role="status" aria-live="polite"></div>
    <div class="sep"></div>
    <b>SEMANTIC</b>
    <div class="row">
      <span>Locate</span>
      <input id="sem-locate" type="text" inputmode="search" autocomplete="off" spellcheck="false" placeholder="fly to meaning…" />
    </div>
    <div class="row">
      <span></span>
      <button id="sem-fly" type="button" class="btn2">Fly</button>
    </div>
    <div id="sem-status" class="status" role="status" aria-live="polite" hidden></div>
    <small>Tip: hover for tooltip; click to pin details.<br>Search: keywords or <code>/regex/i</code>. Semantic: fly to a point in space.</small>
  `;
  document.body.appendChild(hud);

  labelModeSel = hud.querySelector('#label-mode');
  labelNearest = hud.querySelector('#label-nearest');
  labelNearestOut = hud.querySelector('#label-nearest-out');
  labelZoomRow = hud.querySelector('#label-zoom-row');
  labelZoom = hud.querySelector('#label-zoom');
  labelZoomOut = hud.querySelector('#label-zoom-out');
  thumbsToggle = hud.querySelector('#thumbs-toggle');
  searchInput = hud.querySelector('#map-search');
  searchModeSel = hud.querySelector('#search-mode');
  searchCaseCb = hud.querySelector('#search-case');
  searchCountOut = hud.querySelector('#search-count');
  searchErrorEl = hud.querySelector('#search-error');
  searchClearBtn = hud.querySelector('#search-clear');
  semLocateInput = hud.querySelector('#sem-locate');
  semFlyBtn = hud.querySelector('#sem-fly');
  semStatusEl = hud.querySelector('#sem-status');

  const sync = () => {
    if (labelNearestOut) labelNearestOut.textContent = String(labelNearest.value);
    if (labelZoomOut) labelZoomOut.textContent = String(labelZoom.value);
    if (labelZoomRow) labelZoomRow.style.display = (labelModeSel.value === 'zoom') ? '' : 'none';
    labelDirty = true;
  };
  labelModeSel.addEventListener('change', sync);
  labelNearest.addEventListener('input', sync);
  labelZoom.addEventListener('input', sync);
  if (thumbsToggle) thumbsToggle.addEventListener('change', () => { labelDirty = true; });
  const searchSync = () => scheduleSearchUpdate();
  if (searchInput) {
    searchInput.addEventListener('input', searchSync);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        scheduleSearchUpdate(true);
        searchInput.blur();
      }
    });
  }
  if (searchModeSel) searchModeSel.addEventListener('change', searchSync);
  if (searchCaseCb) searchCaseCb.addEventListener('change', searchSync);
  if (searchClearBtn) searchClearBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    scheduleSearchUpdate(true);
    searchInput && searchInput.focus();
  });
  sync();
  scheduleSearchUpdate(true);
  wireSemanticLocate();
}

function scheduleSearchUpdate(immediate = false) {
  if (searchDebounce) clearTimeout(searchDebounce);
  if (immediate) updateSearchMatches();
  else searchDebounce = setTimeout(updateSearchMatches, 90);
}

function setSearchError(msg) {
  if (searchErrorEl) searchErrorEl.textContent = msg || '';
  if (searchInput) searchInput.style.borderColor = msg ? '#ff3355' : '';
}

function setSemStatus(msg, kind) {
  if (!semStatusEl) return;
  if (!msg) {
    semStatusEl.hidden = true;
    semStatusEl.textContent = '';
    semStatusEl.classList.remove('warn', 'err');
    return;
  }
  semStatusEl.hidden = false;
  semStatusEl.textContent = msg;
  semStatusEl.classList.toggle('warn', kind === 'warn');
  semStatusEl.classList.toggle('err', kind === 'err');
}

function wireSemanticLocate() {
  if (!semLocateInput || !semFlyBtn) return;
  const go = () => semanticLocate(semLocateInput.value || '');
  semFlyBtn.addEventListener('click', go);
  semLocateInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); go(); }
    if (e.key === 'Escape') {
      semLocateInput.value = '';
      setSemStatus('', null);
      clearQueryTarget();
      semLocateInput.blur();
    }
  });
}

async function ensureSemModule() {
  if (window.__sem && typeof window.__sem.topK === 'function') return;
  const src = BASE + 'js/sem.js';
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
  if (!window.__sem || typeof window.__sem.topK !== 'function') {
    throw new Error('Semantic module did not initialize');
  }
}

function semanticPointFromResults(results, want = 24) {
  if (!results || !results.length || !data || !data.coords) return null;
  const used = [];
  for (let r = 0; r < results.length && used.length < want; r++) {
    const u = results[r].u;
    const i = findUrlIndex(u);
    if (i < 0) continue;
    const score = (typeof results[r].score === 'number') ? results[r].score : 0;
    used.push({ i, score });
  }
  if (!used.length) return null;
  let max = -Infinity;
  for (let k = 0; k < used.length; k++) max = Math.max(max, used[k].score);
  const temp = 7.5;
  let sumW = 0, sx = 0, sy = 0, sz = 0;
  for (let k = 0; k < used.length; k++) {
    const { i, score } = used[k];
    const w = Math.exp((score - max) * temp);
    if (!Number.isFinite(w) || w <= 0) continue;
    const c = data.coords[i];
    sumW += w;
    sx += w * c[0]; sy += w * c[1]; sz += w * c[2];
  }
  if (!sumW) {
    const c = data.coords[used[0].i];
    return { point: new THREE.Vector3(c[0], c[1], c[2]), used: used.length };
  }
  return { point: new THREE.Vector3(sx / sumW, sy / sumW, sz / sumW), used: used.length };
}

async function semanticLocate(qRaw) {
  const q = (qRaw || '').trim();
  if (!q) {
    setSemStatus('', null);
    clearQueryTarget();
    return;
  }
  const my = ++semFlySeq;
  setSemStatus('Semantic: starting…', 'warn');
  try {
    await ensureSemModule();
    if (my !== semFlySeq) return;
    const res = await window.__sem.topK(q, 80);
    if (my !== semFlySeq) return;
    const out = semanticPointFromResults(res, 28);
    if (!out) {
      setSemStatus('No semantic matches found in map', 'err');
      return;
    }
    setQueryTarget(out.point);
    startFlyToPoint(out.point, 760);
    setSemStatus(`Flying to semantic point (${out.used} matches)`, null);
    labelDirty = true;
  } catch (err) {
    let msg = (err && err.message) ? err.message : String(err);
    try {
      if (window.__sem && typeof window.__sem.getLastError === 'function') {
        const e = window.__sem.getLastError();
        if (e && (e.user || e.message)) msg = e.user || e.message || msg;
      }
    } catch (e) {}
    setSemStatus('Sem error: ' + msg, 'err');
  }
}

function updateSearchMatches() {
  const q = (searchInput ? searchInput.value : '').trim();
  const mode = searchModeSel ? searchModeSel.value : 'keyword';
  const caseSensitive = !!(searchCaseCb && searchCaseCb.checked);
  setSearchError('');

  if (!q) {
    matchIndices = [];
    if (searchCountOut) searchCountOut.textContent = '0';
    applyColors();
    labelDirty = true;
    return;
  }

  const n = data && data.urls ? data.urls.length : 0;
  const out = [];

  try {
    if (mode === 'regex') {
      let re;
      if (q.startsWith('/') && q.lastIndexOf('/') > 0) {
        const last = q.lastIndexOf('/');
        const pat = q.slice(1, last);
        const flags = q.slice(last + 1).replace(/[gy]/g, '');
        re = new RegExp(pat, flags);
      } else {
        re = new RegExp(q, caseSensitive ? '' : 'i');
      }
      for (let i = 0; i < n; i++) {
        const hay = (searchText && searchText[i]) ? searchText[i] : '';
        if (re.test(hay)) out.push(i);
      }
    } else {
      const tokensRaw = q.split(/\s+/).filter(Boolean);
      const tokens = caseSensitive ? tokensRaw : tokensRaw.map(t => t.toLowerCase());
      if (!tokens.length) {
        matchIndices = [];
        if (searchCountOut) searchCountOut.textContent = '0';
        applyColors();
        labelDirty = true;
        return;
      }
      for (let i = 0; i < n; i++) {
        const hay = caseSensitive
          ? ((searchText && searchText[i]) ? searchText[i] : '')
          : ((searchTextLc && searchTextLc[i]) ? searchTextLc[i] : '');
        let ok = true;
        for (let t = 0; t < tokens.length; t++) {
          if (!hay.includes(tokens[t])) { ok = false; break; }
        }
        if (ok) out.push(i);
      }
    }
  } catch (e) {
    matchIndices = [];
    if (searchCountOut) searchCountOut.textContent = '0';
    setSearchError(`Search error: ${e && e.message ? e.message : String(e)}`);
    applyColors();
    labelDirty = true;
    return;
  }

  matchIndices = out;
  if (searchCountOut) searchCountOut.textContent = String(matchIndices.length);
  applyColors();
  labelDirty = true;
}

function getLabelSettings() {
  const mode = labelModeSel ? labelModeSel.value : 'off';
  const nearest = labelNearest ? Math.max(0, parseInt(labelNearest.value || '0', 10)) : 0;
  const zoom = labelZoom ? Math.max(0.1, parseFloat(labelZoom.value || '2.2')) : 2.2;
  return { mode, nearest, zoom };
}

function titleForIndex(i) {
  const url = data.urls[i];
  const meta = metaForUrl(url);
  if (!meta) return null;
  return displayTitle(meta) || (meta.s || null);
}

function nearestPointIndices(k, exclude) {
  if (k <= 0) return [];
  const cam = camera.position;
  const best = [];
  const insert = (idx, dist) => {
    let pos = best.length;
    while (pos > 0 && dist < best[pos - 1].dist) pos--;
    best.splice(pos, 0, { idx, dist });
    if (best.length > k) best.pop();
  };
  for (let i = 0; i < data.coords.length; i++) {
    if (exclude.has(i)) continue;
    const c = data.coords[i];
    const dx = c[0] - cam.x, dy = c[1] - cam.y, dz = c[2] - cam.z;
    const dist = dx*dx + dy*dy + dz*dz;
    if (best.length < k) insert(i, dist);
    else if (dist < best[best.length - 1].dist) insert(i, dist);
  }
  return best.map(x => x.idx);
}

function nearestFromList(list, k, exclude) {
  if (k <= 0 || !list || !list.length) return [];
  const cam = camera.position;
  const best = [];
  const insert = (idx, dist) => {
    let pos = best.length;
    while (pos > 0 && dist < best[pos - 1].dist) pos--;
    best.splice(pos, 0, { idx, dist });
    if (best.length > k) best.pop();
  };
  for (let n = 0; n < list.length; n++) {
    const i = list[n];
    if (exclude.has(i)) continue;
    const c = data.coords[i];
    const dx = c[0] - cam.x, dy = c[1] - cam.y, dz = c[2] - cam.z;
    const dist = dx*dx + dy*dy + dz*dz;
    if (best.length < k) insert(i, dist);
    else if (dist < best[best.length - 1].dist) insert(i, dist);
  }
  return best.map(x => x.idx);
}

function nearestKAvgDistance(pos, k) {
  if (!points || !points.geometry || !points.geometry.attributes || !points.geometry.attributes.position) return null;
  const a = points.geometry.attributes.position.array;
  if (!a || a.length < 3) return null;
  const kk = Math.max(1, Math.min(8, k | 0));
  const best = new Array(kk).fill(Infinity);
  for (let i = 0; i < a.length; i += 3) {
    const dx = a[i] - pos.x, dy = a[i + 1] - pos.y, dz = a[i + 2] - pos.z;
    const d2 = dx*dx + dy*dy + dz*dz;
    for (let j = 0; j < kk; j++) {
      if (d2 < best[j]) {
        for (let m = kk - 1; m > j; m--) best[m] = best[m - 1];
        best[j] = d2;
        break;
      }
    }
  }
  let sum = 0, count = 0;
  for (let j = 0; j < kk; j++) {
    if (!Number.isFinite(best[j])) continue;
    sum += best[j];
    count++;
  }
  if (!count) return null;
  return Math.sqrt(sum / count);
}

function computeLabelIndices() {
  const { mode, nearest, zoom } = getLabelSettings();
  labelIndices = [];
  if (!data || !camera || !controls) return;
  if (mode === 'off') return;

  const exclude = new Set();
  const add = (i) => { if (i >= 0 && !exclude.has(i)) { exclude.add(i); labelIndices.push(i); } };
  add(highlighted);
  add(selected);

  if (mode === 'highlight') return;

  if (mode === 'search') {
    labelIndices.push(...nearestFromList(matchIndices, nearest, exclude));
    return;
  }

  if (mode === 'zoom') {
    const z = camera.position.distanceTo(controls.target);
    if (z > zoom) return;
  }
  labelIndices.push(...nearestPointIndices(nearest, exclude));
}

function ensureLabelPool(n) {
  while (labelPool.length < n) {
    const el = document.createElement('div');
    el.className = 'point-label';
    el.style.display = 'none';
    labelsWrap.appendChild(el);
    labelPool.push(el);
  }
}

function hideAllLabels() {
  for (const el of labelPool) el.style.display = 'none';
}

function ensureThumbPool(n) {
  while (thumbPool.length < n) {
    const wrap = document.createElement('div');
    wrap.className = 'point-thumb';
    wrap.style.display = 'none';
    const img = document.createElement('img');
    img.decoding = 'async';
    img.loading = 'lazy';
    wrap.appendChild(img);
    labelsWrap.appendChild(wrap);
    thumbPool.push({ wrap, img, src: '' });
  }
}

function hideAllThumbs() {
  for (const t of thumbPool) t.wrap.style.display = 'none';
}

function imageForIndex(i) {
  const url = data.urls[i];
  const meta = metaForUrl(url);
  if (!meta) return null;
  const raw = meta.img || meta.image || '';
  const p = normalizePath(raw);
  if (!p) return null;
  return withSiteBase(p);
}

function positionThumbs(entries) {
  const showThumbs = !!(thumbsToggle && thumbsToggle.checked);
  if (!showThumbs || !entries || !entries.length) {
    hideAllThumbs();
    return;
  }

  ensureThumbPool(entries.length);

  let shown = 0;
  for (let n = 0; n < entries.length; n++) {
    const { i, x, y } = entries[n];
    const src = imageForIndex(i);
    if (!src) continue;
    const title = titleForIndex(i) || '';
    const item = thumbPool[shown++];
    item.wrap.classList.toggle('highlight', i === highlighted);
    item.wrap.style.left = `${x}px`;
    item.wrap.style.top = `${y}px`;
    if (item.src !== src) {
      item.src = src;
      item.img.src = src;
    }
    item.img.alt = title ? `Screenshot: ${title}` : 'Screenshot';
    item.wrap.style.display = 'block';
  }
  for (let i = shown; i < thumbPool.length; i++) thumbPool[i].wrap.style.display = 'none';
}

function positionLabels() {
  const { mode } = getLabelSettings();
  if (!labelsWrap || mode === 'off' || !labelIndices.length) {
    hideAllLabels();
    hideAllThumbs();
    return;
  }

  const cam = camera.position;
  const entries = [];
  for (const i of labelIndices) {
    const c = data.coords[i];
    const dx = c[0] - cam.x, dy = c[1] - cam.y, dz = c[2] - cam.z;
    const dist = dx*dx + dy*dy + dz*dz;
    const pri = (i === highlighted) ? 0 : ((i === selected) ? 1 : 2);
    entries.push({ i, dist, pri });
  }
  entries.sort((a, b) => (a.pri - b.pri) || (a.dist - b.dist));

  ensureLabelPool(entries.length);

  const placed = [];
  let shown = 0;
  const shownEntries = [];
  for (let n = 0; n < entries.length; n++) {
    const { i, pri } = entries[n];
    const text = titleForIndex(i);
    if (!text) continue;
    const c = data.coords[i];
    v3.set(c[0], c[1], c[2]).project(camera);
    if (v3.z < -1 || v3.z > 1) continue;
    const x = (v3.x * 0.5 + 0.5) * innerWidth;
    const y = (-v3.y * 0.5 + 0.5) * innerHeight;
    if (x < -40 || x > innerWidth + 40 || y < -40 || y > innerHeight + 40) continue;

    // Cheap overlap avoidance: approximate label box size from text length.
    const w = Math.min(260, 18 + text.length * 7);
    const h = 18;
    const rect = { l: x - w / 2, r: x + w / 2, t: y - h - 10, b: y - 10 };
    let overlaps = false;
    for (const p of placed) {
      if (!(rect.r < p.l || rect.l > p.r || rect.b < p.t || rect.t > p.b)) { overlaps = true; break; }
    }
    if (overlaps && pri >= 2) continue; // keep highlighted/selected even if crowded
    if (overlaps) {
      // For priority labels, allow overlap but don't add to placed to avoid starving others.
    } else {
      placed.push(rect);
    }

    const el = labelPool[shown++];
    el.textContent = text;
    el.classList.toggle('highlight', i === highlighted);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.opacity = pri < 2 ? '1' : '0.85';
    el.style.display = 'block';
    shownEntries.push({ i, x, y, pri });
  }
  for (let i = shown; i < labelPool.length; i++) labelPool[i].style.display = 'none';
  positionThumbs(shownEntries);
}

function onMouseMove(e) {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(points);
  if (hits.length > 0) { const i = hits[0].index; if (i !== hovered) { hovered = i; showTooltip(i, e); } }
  else { hovered = -1; tooltip.style.display = 'none'; }
  document.body.style.cursor = hovered >= 0 ? 'pointer' : 'crosshair';
}

function onClick(e) {
  if (e.target.closest('#infobox')) return;
  if (hovered >= 0) {
    selected = hovered;
    showInfobox(selected);
    applyColors();
    labelDirty = true;
  } else {
    selected = -1;
    infobox.style.display = 'none';
    applyColors();
    labelDirty = true;
  }
}

function showTooltip(i, e) {
  const url = data.urls[i], meta = metaForUrl(url);
  if (!meta) return;
  const title = displayTitle(meta) || '';
  tooltip.innerHTML = `<b>${title}</b><br><small>${meta.d}</small><br>${meta.s||''}`;
  tooltip.style.cssText = `display:block;left:${e.clientX+10}px;top:${e.clientY+10}px`;
}

function showInfobox(i) {
  const url = data.urls[i], meta = metaForUrl(url);
  if (!meta) return;
  const title = displayTitle(meta) || '';
  infobox.innerHTML = `<b>${title}</b><br><small>${meta.d}</small>
<p>${meta.s||''}</p><a href="${withSiteBase(url)}" class="btn">VIEW →</a>`;
  infobox.style.display = 'block';
}

function animate() {
  requestAnimationFrame(animate);
  if (fly) {
    const t = (performance.now() - fly.t0) / fly.dur;
    const k = t >= 1 ? 1 : (t <= 0 ? 0 : (t * t * (3 - 2 * t))); // smoothstep
    camera.position.lerpVectors(fly.fromPos, fly.toPos, k);
    controls.target.lerpVectors(fly.fromTgt, fly.toTgt, k);
    if (k >= 1) fly = null;
    labelDirty = true;
  }
  const dist = camera.position.distanceTo(controls.target);
  controls.rotateSpeed = Math.min(1, dist * 0.4);
  // Dynamic zoom sensitivity: slow down near nodes for finer control.
  const now = performance.now();
  if (now - lastZoomAssistCompute > 180) {
    lastZoomAssistCompute = now;
    zoomAssistDist = nearestKAvgDistance(camera.position, ZOOM_ASSIST_K);
  }
  if (zoomAssistDist != null) {
    const t = Math.max(0, Math.min(1, (zoomAssistDist - ZOOM_ASSIST_NEAR) / (ZOOM_ASSIST_FAR - ZOOM_ASSIST_NEAR)));
    const desired = ZOOM_SPEED_MIN + (ZOOM_SPEED_BASE - ZOOM_SPEED_MIN) * t;
    controls.zoomSpeed = controls.zoomSpeed + (desired - controls.zoomSpeed) * ZOOM_ASSIST_SMOOTH;
  } else {
    controls.zoomSpeed = ZOOM_SPEED_BASE;
  }
  controls.update();
  if (points && points.material) {
    const breath = performance.now() * 0.0008;
    points.material.size = 0.020 + 0.004 * Math.sin(breath);
  }
  if (highlightPulse && highlightPulse.visible) {
    const tt = performance.now() * 0.004;
    highlightPulse.material.size = 0.07 + 0.015 * (0.5 + 0.5 * Math.sin(tt));
    highlightPulse.material.opacity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(tt + 1.2));
  }
  if (queryPulse && queryPulse.visible) {
    const tt = performance.now() * 0.004;
    queryPulse.material.size = 0.06 + 0.018 * (0.5 + 0.5 * Math.sin(tt + 0.6));
    queryPulse.material.opacity = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(tt + 1.8));
  }
  if (labelDirty && now - lastLabelCompute > 120) {
    lastLabelCompute = now;
    labelDirty = false;
    computeLabelIndices();
  }
  positionLabels();
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

init();
