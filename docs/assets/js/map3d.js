import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const BASE = window.__SEM_ASSETS_BASE || '/repo_posts/assets/';
let scene, camera, renderer, controls, points, data, searchIdx, urlToMeta = {};
let raycaster, mouse, tooltip, infobox, hovered = -1, selected = -1, highlighted = -1;
let labelsWrap, hud, labelModeSel, labelNearest, labelNearestOut, labelZoom, labelZoomOut, labelZoomRow;
let labelIndices = [], labelDirty = true, lastLabelCompute = 0;
const labelPool = [];
const v3 = new THREE.Vector3();

async function init() {
  const [d3, idx] = await Promise.all([
    fetch(BASE + 'embeddings.3d.json').then(r => r.json()),
    fetch(BASE + 'search-index.json').then(r => r.json())
  ]);
  data = d3; searchIdx = idx;
  searchIdx.forEach(p => urlToMeta[p.u] = p);
  setupScene();
  setupInteraction();
  setupLabelsUI();
  animate();
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a0a2e);
  camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0, 0, 3);
  renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true});
  renderer.setSize(innerWidth, innerHeight);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.addEventListener('change', () => { labelDirty = true; });
  createPoints();
}

function createPoints() {
  const geo = new THREE.BufferGeometry();
  const n = data.coords.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  data.coords.forEach((c, i) => { pos[i*3]=c[0]; pos[i*3+1]=c[1]; pos[i*3+2]=c[2]; col[i*3]=1; col[i*3+1]=0.4; col[i*3+2]=0.07; });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({size: 0.02, sizeAttenuation: true, vertexColors: true});
  points = new THREE.Points(geo, mat);
  scene.add(points);
  checkHighlight();
}

function checkHighlight() {
  const u = new URLSearchParams(location.search).get('hl'); if (!u) return;
  const i = data.urls.indexOf(u); if (i < 0) return;
  highlighted = i; const c = points.geometry.attributes.color.array;
  c[i*3]=0; c[i*3+1]=1; c[i*3+2]=0.25;
  points.geometry.attributes.color.needsUpdate = true;
  const p = data.coords[i]; camera.position.set(p[0],p[1],p[2]+0.5); controls.target.set(p[0],p[1],p[2]);
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
  const meta = urlToMeta[url];
  if (!meta) return null;
  return meta.s || null;
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
  const url = data.urls[i], meta = urlToMeta[url];
  if (!meta) return;
  const title = meta.title.replace(/\[([^\]]+)\].*/,'$1');
  tooltip.innerHTML = `<b>${title}</b><br><small>${meta.d}</small><br>${meta.s||''}`;
  tooltip.style.cssText = `display:block;left:${e.clientX+10}px;top:${e.clientY+10}px`;
}

function showInfobox(i) {
  const url = data.urls[i], meta = urlToMeta[url];
  if (!meta) return;
  const title = meta.title.replace(/\[([^\]]+)\].*/,'$1');
  infobox.innerHTML = `<b>${title}</b><br><small>${meta.d}</small>
<p>${meta.s||''}</p><a href="${url}" class="btn">VIEW →</a>`;
  infobox.style.display = 'block';
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
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
