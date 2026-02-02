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
let tasteEnableCb = null;
let tasteStrengthRange = null;
let tasteStrengthOut = null;
let tasteVotesOut = null;
let tasteResetBtn = null;
let tasteStatusEl = null;
let labelIndices = [], labelDirty = true, lastLabelCompute = 0;
const labelPool = [];
const thumbPool = [];
const v3 = new THREE.Vector3();
let fly = null;
let baseColors = null;
let basePos = null;
let posArr = null;
let matchIndices = [];
let searchText = null;
let searchTextLc = null;
let searchDebounce = 0;
let queryPulse = null;
let semFlySeq = 0;
let tasteSeq = 0;
let lastZoomAssistCompute = 0;
let zoomAssistDist = null;
const ZOOM_SPEED_BASE = 0.8;
const ZOOM_SPEED_MIN = 0.18;
const ZOOM_ASSIST_NEAR = 0.14;
const ZOOM_ASSIST_FAR = 0.9;
const ZOOM_ASSIST_K = 3;
const ZOOM_ASSIST_SMOOTH = 0.25;
// Picking radius in screen pixels (converted to world-space threshold per pick).
const PICK_RADIUS_PX = 14;
const PICK_THRESHOLD_MIN = 0.003;
const PICK_THRESHOLD_MAX = 0.065;
// Match the site's primary accent orange (#ff6611).
const NODE_BASE_R = 1.0;
const NODE_BASE_G = 0.4;
const NODE_BASE_B = 0.0667;
const TASTE_STORE_KEY = 'magi_taste_votes_v1';
const TASTE_ANCHOR_KEY = 'magi_taste_anchor_v1';
const TASTE_ENABLE_KEY = 'magi_taste_enabled_v1';
const TASTE_STRENGTH_KEY = 'magi_taste_strength_v3';
const TASTE_STRENGTH_KEY_V2 = 'magi_taste_strength_v2';
const TASTE_STRENGTH_KEY_V1 = 'magi_taste_strength_v1';
const TASTE_LAMBDA = 0.01;
const TASTE_EPOCHS = 18;
const TASTE_LR = 0.06;
const TASTE_MAX_SHIFT = 0.6;
const TASTE_LERP = 0.012;
// Taste anchor placement: keep the "good" attractor in front of the camera,
// but never too close (otherwise points can clip/vanish when they get near).
const TASTE_ANCHOR_MIN_AHEAD = 0.35;
// "Anti-drift" force for Taste: pulls far-out nodes back toward the cloud so
// personalization doesn't explode the layout. Force increases with distance.
const TASTE_ELASTIC_RADIUS_Q = 0.985; // base radius quantile (robust to outliers)
const TASTE_ELASTIC_RADIUS_MULT = 1.15; // allow mild expansion before pulling back
const TASTE_ELASTIC_STRENGTH = 0.8; // scaled by (shift^2)
const TASTE_ELASTIC_MAX_FRAC = 0.03; // max fraction of displacement corrected per frame
let tasteEnabled = true;
// Slider position 0..1000; displayed value is logarithmic-spaced 0..1000.
let tasteStrengthPos = 667;
let tasteVotes = new Map(); // url -> +1/-1
let tasteAnchor = null; // THREE.Vector3
let tasteDirs = null; // Float32Array (n*3)
let tasteW = null; // Float32Array (dim)
let tasteB = 0;
let tastePred = null; // Float32Array (n)
let tasteUrlToEmbIdx = null; // Map(url -> emb index)
let tasteElasticRadius = null;

const TASTE_STRENGTH_POS_MAX = 1000;
const TASTE_STRENGTH_VAL_MAX = 1000;

function tasteStrengthValueFromPos(pos) {
  const p = Math.max(0, Math.min(TASTE_STRENGTH_POS_MAX, Math.round(pos)));
  if (p <= 0) return 0;
  const t = p / TASTE_STRENGTH_POS_MAX;
  return Math.round(Math.exp(Math.log(TASTE_STRENGTH_VAL_MAX) * t));
}

function tasteStrengthPosFromValue(value) {
  const v = Math.max(0, Math.min(TASTE_STRENGTH_VAL_MAX, Math.round(value)));
  if (v <= 0) return 0;
  const t = Math.log(v) / Math.log(TASTE_STRENGTH_VAL_MAX);
  return Math.round(t * TASTE_STRENGTH_POS_MAX);
}

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
  loadTasteState();
  refreshTasteUI();
  if (selected >= 0 && infobox && infobox.style.display === 'block') {
    showInfobox(selected);
  }
  if (tasteVotes.size > 0) {
    scheduleTasteUpdate('Loaded votes');
  }
  animate();
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.8);
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
  data.coords.forEach((c, i) => { pos[i*3]=c[0]; pos[i*3+1]=c[1]; pos[i*3+2]=c[2]; col[i*3]=NODE_BASE_R; col[i*3+1]=NODE_BASE_G; col[i*3+2]=NODE_BASE_B; });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  baseColors = col.slice();
  basePos = pos.slice();
  posArr = geo.attributes.position.array;
  tasteElasticRadius = computeTasteElasticRadiusFromBase();
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
  checkSemanticQuery();
}

function checkSemanticQuery() {
  const q = new URLSearchParams(location.search).get('sem');
  if (!q) return;
  setTimeout(() => semanticLocate(q), 100);
}

function getNodeCount() {
  return (data && data.urls) ? data.urls.length : 0;
}

function computeTasteAnchorFromView() {
  if (!camera || !controls) return null;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  // controls.target is always "in front", but can get extremely close when zoomed in.
  const distToTarget = camera.position.distanceTo(controls.target);
  const minAhead = Math.max(TASTE_ANCHOR_MIN_AHEAD, (camera.near || 0.1) * 3.5);
  const d = Math.max(distToTarget, minAhead);
  return camera.position.clone().add(dir.multiplyScalar(d));
}

function computeTasteElasticRadiusFromBase() {
  if (!basePos) return null;
  const n = Math.floor(basePos.length / 3);
  if (n <= 0) return null;

  let sx = 0, sy = 0, sz = 0;
  for (let i = 0, o = 0; i < n; i++, o += 3) {
    sx += basePos[o];
    sy += basePos[o + 1];
    sz += basePos[o + 2];
  }
  const cx = sx / n;
  const cy = sy / n;
  const cz = sz / n;

  const dists = new Array(n);
  for (let i = 0, o = 0; i < n; i++, o += 3) {
    const dx = basePos[o] - cx;
    const dy = basePos[o + 1] - cy;
    const dz = basePos[o + 2] - cz;
    dists[i] = Math.sqrt(dx*dx + dy*dy + dz*dz);
  }
  dists.sort((a, b) => a - b);
  const qi = Math.max(0, Math.min(n - 1, Math.floor((n - 1) * TASTE_ELASTIC_RADIUS_Q)));
  const r = dists[qi] || dists[n - 1];
  return (Number.isFinite(r) && r > 0) ? r : null;
}

function getNodePos(i, out) {
  if (!posArr || i < 0) return null;
  const o = i * 3;
  const x = posArr[o], y = posArr[o + 1], z = posArr[o + 2];
  if (out) { out.set(x, y, z); return out; }
  return { x, y, z };
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

function slugFromPath(p) {
  const s = normalizePath(p);
  if (!s) return null;
  const parts = s.split('/');
  const last = parts[parts.length - 1] || '';
  const m = last.match(/^(.+)\.html$/i);
  return m ? m[1] : null;
}

function findBySlug(slug) {
  if (!slug || !data || !data.urls) return -1;
  const want = '/' + String(slug).toLowerCase() + '.html';
  for (let i = 0; i < data.urls.length; i++) {
    const u = data.urls[i];
    if (!u) continue;
    if (String(u).toLowerCase().endsWith(want)) return i;
  }
  return -1;
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
  // Fallback: map keeps only the latest post per repo (deduped); allow deep-links from older dates.
  const slug = slugFromPath(p);
  if (slug) {
    const i = findBySlug(slug);
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
  const p = getNodePos(i, v3);
  if (!p) return;
  const fromPos = camera.position.clone();
  const fromTgt = controls.target.clone();
  const toTgt = new THREE.Vector3(p.x, p.y, p.z);
  const toPos = new THREE.Vector3(p.x, p.y, p.z + dist);
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
  if (highlightPulse) {
    const p = getNodePos(i, v3);
    if (!p) return;
    const a = highlightPulse.geometry.attributes.position.array;
    a[0] = p.x; a[1] = p.y; a[2] = p.z;
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

function setHighlight(i) {
  highlighted = i;
  updateHighlightPulse(i);
  updateHighlightUrl(i);
  applyColors();
  labelDirty = true;
}

function updateHighlightPulse(i) {
  if (!highlightPulse) return;
  if (i < 0) { highlightPulse.visible = false; return; }
  const p = getNodePos(i, v3); if (!p) return;
  const a = highlightPulse.geometry.attributes.position.array;
  a[0] = p.x; a[1] = p.y; a[2] = p.z;
  highlightPulse.geometry.attributes.position.needsUpdate = true;
  highlightPulse.visible = true;
}

function updateHighlightUrl(i) {
  const url = new URL(location.href);
  if (i >= 0 && data && data.urls && data.urls[i]) url.searchParams.set('hl', data.urls[i]);
  else url.searchParams.delete('hl');
  url.searchParams.delete('sem');
  history.replaceState(null, '', url.toString());
}

function updateSemUrl(q) {
  const url = new URL(location.href);
  if (q) url.searchParams.set('sem', q);
  else url.searchParams.delete('sem');
  url.searchParams.delete('hl');
  history.replaceState(null, '', url.toString());
}

function applyColors() {
  if (!points || !points.geometry || !points.geometry.attributes || !points.geometry.attributes.color) return;
  const c = points.geometry.attributes.color.array;
  if (baseColors && baseColors.length === c.length) c.set(baseColors);
  else {
    for (let i = 0; i < c.length; i += 3) { c[i] = NODE_BASE_R; c[i + 1] = NODE_BASE_G; c[i + 2] = NODE_BASE_B; }
  }

  // Search matches (cyan)
  for (let k = 0; k < matchIndices.length; k++) {
    const i = matchIndices[k];
    c[i*3] = 0.0; c[i*3 + 1] = 1.0; c[i*3 + 2] = 0.25;
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
  updatePickThreshold();
  mouse = new THREE.Vector2();
  tooltip = document.createElement('div');
  tooltip.id = 'tooltip';
  document.body.appendChild(tooltip);
  infobox = document.createElement('div');
  infobox.id = 'infobox';
  document.body.appendChild(infobox);
  infobox.addEventListener('click', onInfoboxClick);
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
	      <input id="label-nearest" type="range" min="0" max="50" value="20" />
	      <output id="label-nearest-out">20</output>
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
      <button id="sem-fly" type="button" class="btn2">Locate</button>
    </div>
    <div id="sem-status" class="status" role="status" aria-live="polite" hidden></div>
    <div class="sep"></div>
    <b>TASTE</b>
    <div class="row">
      <span>Enable</span>
      <label class="chk" title="Personalize positions using your votes (saved locally)"><input id="taste-enable" type="checkbox" checked />On</label>
    </div>
	    <div class="row">
	      <span>Strength</span>
	      <input id="taste-strength" type="range" min="0" max="1000" step="1" value="667" />
	      <output id="taste-strength-out">100</output>
	    </div>
    <div class="row">
      <span>Votes</span>
      <output id="taste-votes">0</output>
    </div>
    <div class="row">
      <span></span>
      <button id="taste-reset" type="button" class="btn2">Reset</button>
    </div>
    <div id="taste-status" class="status" role="status" aria-live="polite" hidden></div>
    <small>Tip: hover for tooltip; click to pin details.<br>Search: keywords or <code>/regex/i</code>. Semantic: fly to a point in space. Taste: vote to nudge the map.</small>
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
  tasteEnableCb = hud.querySelector('#taste-enable');
  tasteStrengthRange = hud.querySelector('#taste-strength');
  tasteStrengthOut = hud.querySelector('#taste-strength-out');
  tasteVotesOut = hud.querySelector('#taste-votes');
  tasteResetBtn = hud.querySelector('#taste-reset');
  tasteStatusEl = hud.querySelector('#taste-status');

  applyQueryParamsToUI();

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
  const searchSync = () => { scheduleSearchUpdate(); updateUrlFromSearchUI(); };
  if (searchInput) {
    searchInput.addEventListener('input', searchSync);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        scheduleSearchUpdate(true);
        updateUrlFromSearchUI();
        searchInput.blur();
      }
    });
  }
  if (searchModeSel) searchModeSel.addEventListener('change', searchSync);
  if (searchCaseCb) searchCaseCb.addEventListener('change', searchSync);
  if (searchClearBtn) searchClearBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    scheduleSearchUpdate(true);
    updateUrlFromSearchUI();
    searchInput && searchInput.focus();
  });
  sync();
  scheduleSearchUpdate(true);
  wireSemanticLocate();
  wireTasteUI();
  maybeAutoSemanticLocate();
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

function setTasteStatus(msg, kind) {
  if (!tasteStatusEl) return;
  if (!msg) {
    tasteStatusEl.hidden = true;
    tasteStatusEl.textContent = '';
    tasteStatusEl.classList.remove('warn', 'err');
    return;
  }
  tasteStatusEl.hidden = false;
  tasteStatusEl.textContent = msg;
  tasteStatusEl.classList.toggle('warn', kind === 'warn');
  tasteStatusEl.classList.toggle('err', kind === 'err');
}

function wireSemanticLocate() {
  if (!semLocateInput || !semFlyBtn) return;
  const go = () => {
    updateUrlFromSemanticUI(true);
    semanticLocate(semLocateInput.value || '');
  };
  semFlyBtn.addEventListener('click', go);
  semLocateInput.addEventListener('input', () => updateUrlFromSemanticUI(false));
  semLocateInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); go(); }
    if (e.key === 'Escape') {
      semLocateInput.value = '';
      updateUrlFromSemanticUI(false);
      setSemStatus('', null);
      clearQueryTarget();
      semLocateInput.blur();
    }
  });
}

function wireTasteUI() {
  if (tasteEnableCb) {
    tasteEnableCb.addEventListener('change', () => {
      tasteEnabled = !!tasteEnableCb.checked;
      try { localStorage.setItem(TASTE_ENABLE_KEY, tasteEnabled ? '1' : '0'); } catch (e) {}
      if (!tasteEnabled) {
        resetPositionsToBase();
        setTasteStatus('Personalization off', 'warn');
      } else {
        setTasteStatus('Personalization on', null);
        if (tasteVotes.size > 0) scheduleTasteUpdate('Enabled');
      }
      refreshTasteUI();
    });
  }
  const syncStrength = (persist = false) => {
    if (!tasteStrengthRange) return;
    const pos = Math.max(0, Math.min(TASTE_STRENGTH_POS_MAX, parseInt(tasteStrengthRange.value || String(tasteStrengthPos), 10) || 0));
    tasteStrengthPos = pos;
    const v = tasteStrengthValueFromPos(pos);
    if (tasteStrengthOut) tasteStrengthOut.textContent = String(v);
    if (persist) {
      try { localStorage.setItem(TASTE_STRENGTH_KEY, String(pos)); } catch (e) {}
    }
  };
  if (tasteStrengthRange) tasteStrengthRange.addEventListener('input', () => syncStrength(true));
  syncStrength(false);
  if (tasteResetBtn) {
    tasteResetBtn.addEventListener('click', () => {
      tasteVotes = new Map();
      tasteW = null; tasteB = 0; tastePred = null; tasteDirs = null;
      tasteAnchor = null;
      try { localStorage.removeItem(TASTE_STORE_KEY); localStorage.removeItem(TASTE_ANCHOR_KEY); } catch (e) {}
      resetPositionsToBase();
      setTasteStatus('Votes cleared', 'warn');
      refreshTasteUI();
    });
  }
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

function updateUrlParams(mut) {
  try {
    const url = new URL(location.href);
    mut(url.searchParams);
    const qs = url.searchParams.toString();
    const next = url.pathname + (qs ? `?${qs}` : '') + url.hash;
    history.replaceState(null, '', next);
  } catch (e) {}
}

function updateUrlFromSearchUI() {
  const q = (searchInput ? searchInput.value : '').trim();
  const mode = searchModeSel ? searchModeSel.value : 'keyword';
  const cs = !!(searchCaseCb && searchCaseCb.checked);
  updateUrlParams((sp) => {
    if (!q) {
      sp.delete('q'); sp.delete('qm'); sp.delete('qc');
      return;
    }
    sp.set('q', q);
    sp.set('qm', (mode === 'regex') ? 'regex' : 'keyword');
    if (cs) sp.set('qc', '1'); else sp.delete('qc');
  });
}

function updateUrlFromSemanticUI(go = false) {
  const q = (semLocateInput ? semLocateInput.value : '').trim();
  updateUrlParams((sp) => {
    if (!q) {
      sp.delete('sem'); sp.delete('sem_go');
      return;
    }
    sp.set('sem', q);
    if (go) sp.set('sem_go', '1'); else sp.delete('sem_go');
  });
}

function applyQueryParamsToUI() {
  const sp = new URLSearchParams(location.search);
  const q = sp.get('q') || '';
  if (searchInput && q) searchInput.value = q;
  const qm = sp.get('qm');
  if (searchModeSel && (qm === 'regex' || qm === 'keyword')) searchModeSel.value = qm;
  const qc = sp.get('qc');
  if (searchCaseCb) searchCaseCb.checked = (qc === '1');

  const sem = sp.get('sem') || '';
  if (semLocateInput && sem) semLocateInput.value = sem;
}

function maybeAutoSemanticLocate() {
  const sp = new URLSearchParams(location.search);
  const sem = (sp.get('sem') || '').trim();
  const go = sp.get('sem_go') === '1';
  if (!sem || !go) return;
  if (semLocateInput && !semLocateInput.value) semLocateInput.value = sem;
  semanticLocate(sem);
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
    const p = getNodePos(i);
    if (!p) continue;
    sumW += w;
    sx += w * p.x; sy += w * p.y; sz += w * p.z;
  }
  if (!sumW) {
    const p = getNodePos(used[0].i, v3);
    return p ? { point: p.clone(), used: used.length } : null;
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
    updateSemUrl(q);
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
  const s = (meta.s || '').trim();
  if (s) return (s.length > 84) ? (s.slice(0, 81) + '…') : s;
  return displayTitle(meta) || (String(meta.title || '').trim() || null);
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
  const n = getNodeCount();
  for (let i = 0; i < n; i++) {
    if (exclude.has(i)) continue;
    const o = i * 3;
    const dx = posArr[o] - cam.x, dy = posArr[o + 1] - cam.y, dz = posArr[o + 2] - cam.z;
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
    const o = i * 3;
    const dx = posArr[o] - cam.x, dy = posArr[o + 1] - cam.y, dz = posArr[o + 2] - cam.z;
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
    const o = i * 3;
    const dx = posArr[o] - cam.x, dy = posArr[o + 1] - cam.y, dz = posArr[o + 2] - cam.z;
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
    const o = i * 3;
    v3.set(posArr[o], posArr[o + 1], posArr[o + 2]).project(camera);
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

function updatePickThreshold() {
  if (!raycaster || !camera || !controls) return;
  const dist = Math.max(1e-3, camera.position.distanceTo(controls.target));
  const fov = THREE.MathUtils.degToRad(camera.fov || 60);
  const worldPerPx = (2 * Math.tan(fov / 2) * dist) / Math.max(1, innerHeight);
  const threshold = THREE.MathUtils.clamp(worldPerPx * PICK_RADIUS_PX, PICK_THRESHOLD_MIN, PICK_THRESHOLD_MAX);
  raycaster.params.Points.threshold = threshold;
}

function pickIndexAt(clientX, clientY) {
  if (!raycaster || !mouse || !camera || !points) return -1;
  mouse.x = (clientX / Math.max(1, innerWidth)) * 2 - 1;
  mouse.y = -(clientY / Math.max(1, innerHeight)) * 2 + 1;
  updatePickThreshold();
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(points);
  if (!hits || hits.length <= 0) return -1;

  // When multiple points are inside the threshold, prefer the one closest to the ray
  // (which best matches the cursor), then by distance along the ray.
  let best = hits[0];
  let bestRay = Number.isFinite(best.distanceToRay) ? best.distanceToRay : Infinity;
  let bestDist = Number.isFinite(best.distance) ? best.distance : Infinity;
  for (let h = 1; h < hits.length; h++) {
    const hit = hits[h];
    const dRay = Number.isFinite(hit.distanceToRay) ? hit.distanceToRay : Infinity;
    const d = Number.isFinite(hit.distance) ? hit.distance : Infinity;
    if (dRay < bestRay || (dRay === bestRay && d < bestDist)) {
      best = hit;
      bestRay = dRay;
      bestDist = d;
    }
  }
  return Number.isFinite(best.index) ? best.index : -1;
}

function onMouseMove(e) {
  const i = pickIndexAt(e.clientX, e.clientY);
  if (i >= 0) { if (i !== hovered) { hovered = i; showTooltip(i, e); } }
  else { hovered = -1; tooltip.style.display = 'none'; }
  document.body.style.cursor = hovered >= 0 ? 'pointer' : 'crosshair';
}

function onClick(e) {
  if (e.target.closest('#infobox')) return;
  const i = pickIndexAt(e.clientX, e.clientY);
  if (i >= 0) {
    selected = i;
    setHighlight(i);
    showInfobox(selected);
  } else {
    selected = -1;
    setHighlight(-1);
    infobox.style.display = 'none';
  }
}

function showTooltip(i, e) {
  const url = data.urls[i], meta = metaForUrl(url);
  if (!meta) return;
  const title = displayTitle(meta) || '';
  tooltip.innerHTML = `<b>${title}</b><br><small>${meta.d}</small><br>${meta.s||''}`;
  tooltip.style.cssText = `display:block;left:${e.clientX+10}px;top:${e.clientY+10}px`;
}

function getVote(url) {
  const k = normalizePath(url);
  if (!k) return 0;
  return tasteVotes.get(k) || 0;
}

function showInfobox(i) {
  const url = data.urls[i], meta = metaForUrl(url);
  if (!meta) return;
  const title = displayTitle(meta) || '';
  const v = getVote(url);
  const upOn = v === 1 ? ' on' : '';
  const dnOn = v === -1 ? ' on' : '';
  const clrShow = v ? '' : ' hidden';
  infobox.innerHTML = `<b>${title}</b><br><small>${meta.d}</small>
<p>${meta.s||''}</p>
<div class="votes" aria-label="Vote controls">
  <button type="button" class="vote up${upOn}" data-vote="up" aria-label="Like">▲ Like</button>
  <button type="button" class="vote down${dnOn}" data-vote="down" aria-label="Dislike">▼ Dislike</button>
  <button type="button" class="vote clear${clrShow}" data-vote="clear" aria-label="Clear vote">Clear</button>
</div>
<a href="${withSiteBase(url)}" class="btn">VIEW →</a>`;
  infobox.style.display = 'block';
}

function onInfoboxClick(e) {
  const btn = e.target.closest('[data-vote]');
  if (!btn) return;
  const act = btn.getAttribute('data-vote');
  if (selected < 0) return;
  const url = data.urls[selected];
  if (act === 'up') applyVote(url, 1);
  else if (act === 'down') applyVote(url, -1);
  else if (act === 'clear') applyVote(url, 0);
  showInfobox(selected);
}

function loadTasteState() {
  try {
    const en = localStorage.getItem(TASTE_ENABLE_KEY);
    if (en === '0') tasteEnabled = false;
    const st3 = parseInt(localStorage.getItem(TASTE_STRENGTH_KEY) || '', 10);
    if (Number.isFinite(st3)) {
      tasteStrengthPos = Math.max(0, Math.min(TASTE_STRENGTH_POS_MAX, st3));
    } else {
      // Back-compat:
      // - v2 stored normalized 0..1.
      // - v1 stored raw max-shift (0..TASTE_MAX_SHIFT).
      let value = null;
      const st2 = parseFloat(localStorage.getItem(TASTE_STRENGTH_KEY_V2) || '');
      if (Number.isFinite(st2)) value = Math.max(0, Math.min(1, st2)) * TASTE_STRENGTH_VAL_MAX;
      const st1 = (value == null) ? parseFloat(localStorage.getItem(TASTE_STRENGTH_KEY_V1) || '') : NaN;
      if (value == null && Number.isFinite(st1)) value = Math.max(0, Math.min(1, st1 / TASTE_MAX_SHIFT)) * TASTE_STRENGTH_VAL_MAX;
      if (value != null) {
        tasteStrengthPos = tasteStrengthPosFromValue(value);
        try {
          localStorage.setItem(TASTE_STRENGTH_KEY, String(tasteStrengthPos));
          localStorage.removeItem(TASTE_STRENGTH_KEY_V2);
          localStorage.removeItem(TASTE_STRENGTH_KEY_V1);
        } catch (e) {}
      }
    }
    const anchorRaw = localStorage.getItem(TASTE_ANCHOR_KEY);
    if (anchorRaw) {
      const a = JSON.parse(anchorRaw);
      if (a && Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z)) {
        tasteAnchor = new THREE.Vector3(a.x, a.y, a.z);
      }
    }
    const raw = localStorage.getItem(TASTE_STORE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return;
    tasteVotes = new Map();
    for (const [k, v] of Object.entries(obj)) {
      const p = normalizePath(k);
      if (!p) continue;
      const y = (v === 1 || v === -1) ? v : 0;
      if (y) tasteVotes.set(p, y);
    }
  } catch (e) {}
}

function saveTasteVotes() {
  try {
    const obj = {};
    for (const [k, v] of tasteVotes.entries()) obj[k] = v;
    localStorage.setItem(TASTE_STORE_KEY, JSON.stringify(obj));
  } catch (e) {}
}

function saveTasteAnchor() {
  try {
    if (!tasteAnchor) return;
    localStorage.setItem(TASTE_ANCHOR_KEY, JSON.stringify({ x: tasteAnchor.x, y: tasteAnchor.y, z: tasteAnchor.z }));
  } catch (e) {}
}

function refreshTasteUI() {
  if (tasteEnableCb) tasteEnableCb.checked = !!tasteEnabled;
  const val = tasteStrengthValueFromPos(tasteStrengthPos);
  if (tasteStrengthRange) tasteStrengthRange.value = String(tasteStrengthPos);
  if (tasteStrengthOut) tasteStrengthOut.textContent = String(val);
  if (tasteVotesOut) tasteVotesOut.textContent = String(tasteVotes.size);
}

function applyVote(url, y) {
  const k = normalizePath(url);
  if (!k) return;
  if (y === 0) tasteVotes.delete(k);
  else tasteVotes.set(k, y);
  saveTasteVotes();

  // Anchor = point in front of the camera, but never too close (prevents "good" nodes
  // from flying into/through the camera when zoomed in).
  tasteAnchor = computeTasteAnchorFromView() || controls.target.clone();
  saveTasteAnchor();
  tasteDirs = null; // recompute with new anchor

  refreshTasteUI();
  if (!tasteEnabled) {
    setTasteStatus('Vote saved (personalization off)', 'warn');
    return;
  }
  scheduleTasteUpdate('Voted');
}

function scheduleTasteUpdate(reason) {
  const my = ++tasteSeq;
  setTasteStatus('Updating taste…', 'warn');
  setTimeout(() => { if (my === tasteSeq) updateTasteModel(reason); }, 0);
}

async function updateTasteModel(reason) {
  if (!tasteEnabled || tasteVotes.size === 0) {
    tasteW = null; tasteB = 0; tastePred = null; tasteDirs = null;
    resetPositionsToBase();
    setTasteStatus(tasteEnabled ? 'No votes yet' : 'Personalization off', 'warn');
    return;
  }
  try {
    await ensureSemModule();
    if (!window.__sem || typeof window.__sem.embeddings !== 'function') throw new Error('Embeddings loader missing');
    setTasteStatus('Loading embeddings…', 'warn');
    const { E, meta } = await window.__sem.embeddings({ silent: true });
    if (!E || !meta || !meta.urls || !meta.dim) throw new Error('Embeddings unavailable');
    if (!tasteUrlToEmbIdx) {
      tasteUrlToEmbIdx = new Map();
      for (let i = 0; i < meta.urls.length; i++) tasteUrlToEmbIdx.set(meta.urls[i], i);
    }
    const samples = [];
    for (const [url, y] of tasteVotes.entries()) {
      const j = tasteUrlToEmbIdx.get(url);
      if (j == null) continue;
      samples.push({ j, y });
    }
    if (!samples.length) {
      setTasteStatus('Votes do not match embeddings set', 'err');
      return;
    }
    const { w, b } = trainTasteRidgeSGD(E, meta.dim, samples);
    tasteW = w; tasteB = b;
    setTasteStatus('Scoring nodes…', 'warn');
    await computeTastePredictionsChunked(E, meta.dim);
    if (tasteAnchor && basePos) tasteDirs = computeTasteDirs(tasteAnchor);
    setTasteStatus(`Taste updated (${tasteVotes.size} vote${tasteVotes.size === 1 ? '' : 's'})`, null);
  } catch (err) {
    setTasteStatus('Taste error: ' + ((err && err.message) ? err.message : String(err)), 'err');
  }
}

function trainTasteRidgeSGD(E, dim, samples) {
  const w = new Float32Array(dim);
  let b = 0;
  let lr = TASTE_LR;
  for (let ep = 0; ep < TASTE_EPOCHS; ep++) {
    for (let n = 0; n < samples.length; n++) {
      const j = samples[n].j;
      const y = samples[n].y;
      const off = j * dim;
      let pred = b;
      for (let k = 0; k < dim; k++) pred += w[k] * E[off + k];
      const err = pred - y;
      const l2 = 2 * TASTE_LAMBDA;
      const step = 2 * lr;
      for (let k = 0; k < dim; k++) {
        const wk = w[k];
        const grad = step * (err * E[off + k]) + (lr * l2) * wk;
        w[k] = wk - grad;
      }
      b -= step * err;
    }
    lr *= 0.9;
  }
  return { w, b };
}

async function computeTastePredictionsChunked(E, dim) {
  const my = tasteSeq;
  const n = getNodeCount();
  const pred = new Float32Array(n);
  const CHUNK = 420;
  for (let i0 = 0; i0 < n; i0 += CHUNK) {
    if (my !== tasteSeq) return;
    const i1 = Math.min(n, i0 + CHUNK);
    for (let i = i0; i < i1; i++) {
      const url = data.urls[i];
      const j = tasteUrlToEmbIdx ? tasteUrlToEmbIdx.get(url) : null;
      if (j == null || !tasteW) { pred[i] = 0; continue; }
      const off = j * dim;
      let s = tasteB;
      for (let k = 0; k < dim; k++) s += tasteW[k] * E[off + k];
      pred[i] = Math.tanh(s);
    }
    await new Promise(r => setTimeout(r, 0));
  }
  tastePred = pred;
}

function computeTasteDirs(anchor) {
  if (!anchor || !basePos) return null;
  const n = getNodeCount();
  const dirs = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    const dx = anchor.x - basePos[o];
    const dy = anchor.y - basePos[o + 1];
    const dz = anchor.z - basePos[o + 2];
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
    dirs[o] = dx / len;
    dirs[o + 1] = dy / len;
    dirs[o + 2] = dz / len;
  }
  return dirs;
}

function resetPositionsToBase() {
  if (!posArr || !basePos) return;
  posArr.set(basePos);
  points.geometry.attributes.position.needsUpdate = true;
  labelDirty = true;
}

function updateTastePositions() {
  if (!tasteEnabled || !tastePred || !tasteDirs || !posArr || !basePos || !tasteAnchor) return;
  const n = getNodeCount();
  const strengthValue = tasteStrengthValueFromPos(tasteStrengthPos);
  const shift = strengthValue / 1000; // 0-1 range, slider controls directly
  if (!shift) return;
  let moving = false;
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    const s = tastePred[i] || 0;
    let t = shift * s;
    // Prevent overshooting the anchor (which can push points behind the camera).
    if (t > 0) {
      const dxA = tasteAnchor.x - basePos[o];
      const dyA = tasteAnchor.y - basePos[o + 1];
      const dzA = tasteAnchor.z - basePos[o + 2];
      const dA = Math.sqrt(dxA*dxA + dyA*dyA + dzA*dzA);
      if (Number.isFinite(dA) && dA > 0) t = Math.min(t, dA);
      else t = 0;
    }
    const tx = basePos[o] + tasteDirs[o] * t;
    const ty = basePos[o + 1] + tasteDirs[o + 1] * t;
    const tz = basePos[o + 2] + tasteDirs[o + 2] * t;
    const nx = posArr[o] + (tx - posArr[o]) * TASTE_LERP;
    const ny = posArr[o + 1] + (ty - posArr[o + 1]) * TASTE_LERP;
    const nz = posArr[o + 2] + (tz - posArr[o + 2]) * TASTE_LERP;
    moving = moving || (Math.abs(nx - posArr[o]) + Math.abs(ny - posArr[o + 1]) + Math.abs(nz - posArr[o + 2]) > 1e-5);
    posArr[o] = nx; posArr[o + 1] = ny; posArr[o + 2] = nz;
  }

  // Elastic pullback: keep the cloud cohesive under strong personalization.
  // Uses the current centroid (so translation is allowed) and a robust base radius.
  if (tasteElasticRadius && shift > 0.02) {
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0, o = 0; i < n; i++, o += 3) {
      cx += posArr[o];
      cy += posArr[o + 1];
      cz += posArr[o + 2];
    }
    cx /= n; cy /= n; cz /= n;
    const r0 = tasteElasticRadius * TASTE_ELASTIC_RADIUS_MULT;
    const r02 = r0 * r0;
    const k = TASTE_ELASTIC_STRENGTH * shift * shift;
    for (let i = 0, o = 0; i < n; i++, o += 3) {
      const dx = posArr[o] - cx;
      const dy = posArr[o + 1] - cy;
      const dz = posArr[o + 2] - cz;
      const d2 = dx*dx + dy*dy + dz*dz;
      if (d2 <= r02) continue;
      const dist = Math.sqrt(d2) || 1;
      const over = dist - r0;
      const ratio = over / r0;
      const g = Math.min(TASTE_ELASTIC_MAX_FRAC, k * ratio * ratio);
      if (g <= 0) continue;
      posArr[o] -= dx * g;
      posArr[o + 1] -= dy * g;
      posArr[o + 2] -= dz * g;
      moving = true;
    }
  }

  if (moving) {
    points.geometry.attributes.position.needsUpdate = true;
    labelDirty = true;
  }
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
  if (tasteEnabled && tasteVotes.size > 0) {
    if (tasteAnchor && !tasteDirs && basePos) tasteDirs = computeTasteDirs(tasteAnchor);
    updateTastePositions();
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
    points.material.size = 0.020 + 0.002 * Math.sin(breath);
  }
  if (highlightPulse && highlightPulse.visible) {
    if (highlighted >= 0 && posArr) {
      const o = highlighted * 3;
      const a = highlightPulse.geometry.attributes.position.array;
      a[0] = posArr[o]; a[1] = posArr[o + 1]; a[2] = posArr[o + 2];
      highlightPulse.geometry.attributes.position.needsUpdate = true;
    }
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
