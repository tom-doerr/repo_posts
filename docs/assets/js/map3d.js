import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const BASE = window.__SEM_ASSETS_BASE || '/repo_posts/assets/';
let scene, camera, renderer, controls, points, data, searchIdx, urlToMeta = {};
let raycaster, mouse, tooltip, infobox, hovered = -1, selected = -1, highlighted = -1;

async function init() {
  const [d3, idx] = await Promise.all([
    fetch(BASE + 'embeddings.3d.json').then(r => r.json()),
    fetch(BASE + 'search-index.json').then(r => r.json())
  ]);
  data = d3; searchIdx = idx;
  searchIdx.forEach(p => urlToMeta[p.u] = p);
  setupScene();
  setupInteraction();
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
  } else {
    selected = -1;
    infobox.style.display = 'none';
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
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

init();
