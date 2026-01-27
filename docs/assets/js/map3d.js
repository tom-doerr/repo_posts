import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const BASE = window.__SEM_ASSETS_BASE || '/repo_posts/assets/';
let scene, camera, renderer, controls, points, data, searchIdx, urlToMeta = {};
let raycaster, mouse, tooltip, hovered = -1;

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
  const pos = new Float32Array(data.coords.length * 3);
  data.coords.forEach((c, i) => { pos[i*3]=c[0]; pos[i*3+1]=c[1]; pos[i*3+2]=c[2]; });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({color: 0xff6611, size: 0.02, sizeAttenuation: true});
  points = new THREE.Points(geo, mat);
  scene.add(points);
}

function setupInteraction() {
  raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 0.03;
  mouse = new THREE.Vector2();
  tooltip = document.createElement('div');
  tooltip.id = 'tooltip';
  document.body.appendChild(tooltip);
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

function onClick() {
  if (hovered >= 0) {
    const url = data.urls[hovered];
    const meta = urlToMeta[url];
    if (meta) window.location.href = url;
  }
}

function showTooltip(i, e) {
  const url = data.urls[i], meta = urlToMeta[url];
  if (!meta) return;
  const title = meta.title.replace(/\[([^\]]+)\].*/,'$1');
  tooltip.innerHTML = `<b>${title}</b><br><small>${meta.d}</small><br>${meta.s||''}`;
  tooltip.style.cssText = `display:block;left:${e.clientX+10}px;top:${e.clientY+10}px`;
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
