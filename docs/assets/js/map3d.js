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
let labelIndices = [], labelDirty = true, lastLabelCompute = 0;
const labelPool = [];
const v3 = new THREE.Vector3();
let fly = null;

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
  controls.addEventListener('change', () => { labelDirty = true; });
  createPoints();
}

function createPoints() {
  const geo = new THREE.BufferGeometry();
  const n = data.coords.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  data.coords.forEach((c, i) => { pos[i*3]=c[0]; pos[i*3+1]=c[1]; pos[i*3+2]=c[2]; col[i*3]=1; col[i*3+1]=0.4; col[i*3+2]=0.07; });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
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
  checkHighlight();
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

function checkHighlight() {
  const u = new URLSearchParams(location.search).get('hl'); if (!u) return;
  const i = findUrlIndex(u); if (i < 0) return;
  highlighted = i; const c = points.geometry.attributes.color.array;
  c[i*3]=0; c[i*3+1]=1; c[i*3+2]=0.25;
  points.geometry.attributes.color.needsUpdate = true;
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
  labelDirty = true;
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
    <small>Tip: hover for tooltip; click to pin details.</small>
  `;
  document.body.appendChild(hud);

  labelModeSel = hud.querySelector('#label-mode');
  labelNearest = hud.querySelector('#label-nearest');
  labelNearestOut = hud.querySelector('#label-nearest-out');
  labelZoomRow = hud.querySelector('#label-zoom-row');
  labelZoom = hud.querySelector('#label-zoom');
  labelZoomOut = hud.querySelector('#label-zoom-out');

  const sync = () => {
    if (labelNearestOut) labelNearestOut.textContent = String(labelNearest.value);
    if (labelZoomOut) labelZoomOut.textContent = String(labelZoom.value);
    if (labelZoomRow) labelZoomRow.style.display = (labelModeSel.value === 'zoom') ? '' : 'none';
    labelDirty = true;
  };
  labelModeSel.addEventListener('change', sync);
  labelNearest.addEventListener('input', sync);
  labelZoom.addEventListener('input', sync);
  sync();
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
  return meta ? (meta.s || null) : null;
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

function positionLabels() {
  const { mode } = getLabelSettings();
  if (!labelsWrap || mode === 'off' || !labelIndices.length) {
    hideAllLabels();
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
  }
  for (let i = shown; i < labelPool.length; i++) labelPool[i].style.display = 'none';
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
    labelDirty = true;
  } else {
    selected = -1;
    infobox.style.display = 'none';
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
  controls.update();
  if (highlightPulse && highlightPulse.visible) {
    const tt = performance.now() * 0.004;
    highlightPulse.material.size = 0.07 + 0.015 * (0.5 + 0.5 * Math.sin(tt));
    highlightPulse.material.opacity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(tt + 1.2));
  }
  const now = performance.now();
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
