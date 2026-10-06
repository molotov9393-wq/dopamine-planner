import * as THREE from './vendor/three/three.module.js';

const CELL = 1.4;
const MAP_RADIUS = 20;
const TILE_COUNT = MAP_RADIUS * 2 + 1;
const CROPS = { carrot: 0, strawberry: 1, sunflower: 2 };
const DECOR = { flowerbed: 7, appletree: 5, cottage: 3, barn: 4 };
const ANIMALS = { hen: 0, pig: 1, lamb: 2, calf: 3 };

let game = null;
let textureLoader;
let cropSheet;
let animalSheet;

function seeded(x, z) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function loadTexture(url) {
  return new Promise((resolve, reject) => textureLoader.load(url, resolve, undefined, reject));
}

function cellTexture(sheet, column, row, columns, rows) {
  const map = sheet.clone();
  map.repeat.set(1 / columns, 1 / rows);
  map.offset.set(column / columns, 1 - (row + 1) / rows);
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  return map;
}

function tileCoords(key) {
  const [x, z] = key.split(',').map(Number);
  return [x, z];
}

function clearGroup(group) {
  while (group.children.length) {
    const object = group.children[0];
    group.remove(object);
    if (object.material?.map) object.material.map.dispose();
    if (object.material) object.material.dispose();
    if (object.geometry) object.geometry.dispose();
  }
}

function makeBillboard(sheet, index, rows, width, height, y = 0) {
  const columns = rows === 1 ? 4 : 4;
  const map = cellTexture(sheet, index % columns, Math.floor(index / columns), columns, rows);
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  const material = new THREE.SpriteMaterial({ map, transparent: true, alphaTest: 0.035, depthWrite: false, toneMapped: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width, height, 1);
  sprite.center.set(0.5, 0.02);
  sprite.position.y = y;
  return sprite;
}

function makeSoftShadow(x, z, width, height, group) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({ color: 0x34452e, transparent: true, opacity: 0.18, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.12, z);
  mesh.scale.set(width, height, 1);
  group.add(mesh);
}

function refreshObjects() {
  if (!game) return;
  const { farm, crops, decor, animals, actors } = game;
  clearGroup(crops);
  clearGroup(decor);
  clearGroup(animals);
  actors.length = 0;

  for (const [key, crop] of Object.entries(farm.plots || {})) {
    const [gx, gz] = tileCoords(key);
    const x = gx * CELL;
    const z = gz * CELL;
    const soil = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.055, 1.22), new THREE.MeshStandardMaterial({ color: 0x9d7659, roughness: 1 }));
    soil.position.set(x, 0.14, z);
    crops.add(soil);
    const spriteIndex = CROPS[crop.crop] ?? 0;
    const sprite = makeBillboard(cropSheet, spriteIndex, 2, crop.watered ? 1.45 : 1.08, crop.watered ? 1.9 : 1.35, 0.2);
    sprite.position.set(x, 0.18, z);
    crops.add(sprite);
    actors.push({ sprite, kind: 'crop', x, z, phase: seeded(gx, gz) * 6, ripe: Boolean(crop.watered) });
  }

  for (const item of farm.decor || []) {
    const index = DECOR[item.id];
    if (index === undefined) continue;
    const x = (Number(item.x) || 0) * CELL;
    const z = (Number(item.z) || 0) * CELL;
    const size = item.id === 'cottage' || item.id === 'barn' ? [3.4, 3.1] : item.id === 'appletree' ? [2.3, 2.8] : [2.1, 1.8];
    makeSoftShadow(x, z, size[0] * 0.36, size[0] * 0.22, decor);
    const sprite = makeBillboard(cropSheet, index, 2, size[0], size[1], 0.14);
    sprite.position.set(x, 0.15, z);
    decor.add(sprite);
  }

  for (const item of farm.animals || []) {
    const index = ANIMALS[item.id];
    if (index === undefined) continue;
    const x = (Number(item.x) || 0) * CELL;
    const z = (Number(item.z) || 0) * CELL;
    makeSoftShadow(x, z, 0.62, 0.33, animals);
    const sprite = makeBillboard(animalSheet, index, 1, 1.22, 1.45, 0.15);
    sprite.position.set(x, 0.17, z);
    animals.add(sprite);
    actors.push({ sprite, kind: 'animal', id: item.id, x, z, phase: Number(item.phase) || seeded(x, z) * 7 });
  }
}

function buildTiles(centerX = 0, centerZ = 0) {
  if (!game) return;
  if (game.tiles) game.scene.remove(game.tiles);
  const geometry = game.tileGeometry;
  const material = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  const mesh = new THREE.InstancedMesh(geometry, material, TILE_COUNT * TILE_COUNT);
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let n = 0;
  const cx = Math.round(centerX / CELL);
  const cz = Math.round(centerZ / CELL);
  for (let z = -MAP_RADIUS; z <= MAP_RADIUS; z++) {
    for (let x = -MAP_RADIUS; x <= MAP_RADIUS; x++) {
      const gx = cx + x;
      const gz = cz + z;
      dummy.position.set(gx * CELL, -0.055, gz * CELL);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      const shade = 0.92 + seeded(gx, gz) * 0.11;
      color.setRGB(0.70 * shade, 0.79 * shade, 0.58 * shade);
      mesh.setColorAt(n, color);
      n++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  game.tiles = mesh;
  game.scene.add(mesh);
  game.tileCenter.set(cx * CELL, 0, cz * CELL);
}

function updateCamera() {
  const { camera, target } = game;
  camera.position.set(target.x + 16, target.y + 22, target.z + 16);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}

function resize() {
  if (!game) return;
  const width = Math.max(1, game.canvas.clientWidth);
  const height = Math.max(1, game.canvas.clientHeight);
  game.renderer.setSize(width, height, false);
  const aspect = width / height;
  const view = 10.8 / game.camera.zoom;
  game.camera.left = -view * aspect;
  game.camera.right = view * aspect;
  game.camera.top = view;
  game.camera.bottom = -view;
  game.camera.updateProjectionMatrix();
}

function updateSelection(event) {
  const rect = game.canvas.getBoundingClientRect();
  game.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  game.raycaster.setFromCamera(game.pointer, game.camera);
  const hit = game.raycaster.intersectObject(game.hitPlane)[0];
  if (!hit) return null;
  const gx = Math.round(hit.point.x / CELL);
  const gz = Math.round(hit.point.z / CELL);
  game.selection.position.set(gx * CELL, 0.17, gz * CELL);
  game.selection.visible = true;
  return { x: gx, z: gz };
}

function attachInput() {
  const { canvas } = game;
  let pointers = new Map();
  let drag = null;
  let moved = false;
  const point = (event) => ({ x: event.clientX, y: event.clientY });

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, point(event));
    if (pointers.size === 1) { drag = point(event); moved = false; }
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; drag = { distance: Math.hypot(a.x - b.x, a.y - b.y) }; }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) { updateSelection(event); return; }
    const previous = pointers.get(event.pointerId);
    const next = point(event);
    pointers.set(event.pointerId, next);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (drag?.distance && distance > 0) { game.camera.zoom = THREE.MathUtils.clamp(game.camera.zoom * (distance / drag.distance), 0.65, 2); drag.distance = distance; resize(); }
      moved = true;
    } else if (drag && previous) {
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      if (Math.abs(next.x - drag.x) + Math.abs(next.y - drag.y) > 5) moved = true;
      if (moved) {
        game.target.x -= dx * 0.055 / game.camera.zoom;
        game.target.z += dx * 0.055 / game.camera.zoom;
        game.target.x += dy * 0.035 / game.camera.zoom;
        game.target.z += dy * 0.035 / game.camera.zoom;
        updateCamera();
        const cx = Math.round(game.target.x / CELL), cz = Math.round(game.target.z / CELL);
        if (Math.abs(cx - game.tileCenter.x / CELL) > 7 || Math.abs(cz - game.tileCenter.z / CELL) > 7) buildTiles(game.target.x, game.target.z);
      }
    }
  });
  canvas.addEventListener('pointerup', (event) => {
    if (pointers.size === 1 && !moved) {
      const cell = updateSelection(event);
      if (cell) game.onCell?.(cell.x, cell.z);
    }
    pointers.delete(event.pointerId);
    if (!pointers.size) { drag = null; moved = false; }
    else if (pointers.size === 1) { drag = [...pointers.values()][0]; moved = true; }
  });
  canvas.addEventListener('pointercancel', (event) => { pointers.delete(event.pointerId); drag = null; });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    game.camera.zoom = THREE.MathUtils.clamp(game.camera.zoom * (event.deltaY < 0 ? 1.12 : 0.89), 0.65, 2);
    resize();
  }, { passive: false });
}

function animate(now) {
  if (!game) return;
  game.frame = requestAnimationFrame(animate);
  const t = now * 0.001;
  for (const actor of game.actors) {
    if (actor.kind === 'animal') {
      const pace = actor.id === 'hen' ? 0.55 : 0.28;
      actor.sprite.position.x = actor.x + Math.sin(t * pace + actor.phase) * 0.68;
      actor.sprite.position.z = actor.z + Math.cos(t * pace * 0.72 + actor.phase) * 0.45;
      actor.sprite.material.rotation = Math.sin(t * pace + actor.phase) * 0.04;
    } else if (actor.ripe) {
      actor.sprite.position.y = 0.18 + Math.sin(t * 2.3 + actor.phase) * 0.06;
    }
  }
  game.renderer.render(game.scene, game.camera);
}

function update(farm) {
  if (!game) return;
  game.farm = farm;
  refreshObjects();
}

async function mount(canvas, farm, onCell) {
  if (game?.canvas === canvas) { game.onCell = onCell; update(farm); return; }
  unmount();
  textureLoader = textureLoader || new THREE.TextureLoader();
  try {
    const [crops, animals] = await Promise.all([
      loadTexture('./assets/doodles/farm-sprites-v1.png'),
      loadTexture('./assets/doodles/farm-animals-v1.png')
    ]);
    cropSheet = crops;
    animalSheet = animals;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvas.innerHTML = '';
    canvas.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#dbe8cf');
    scene.fog = new THREE.Fog('#dbe8cf', 34, 88);
    const camera = new THREE.OrthographicCamera(-16, 16, 12, -12, 0.1, 180);
    camera.zoom = 1.12;
    const target = new THREE.Vector3(0, 0, 0);
    const hemisphere = new THREE.HemisphereLight(0xfff5df, 0x82966b, 2.05);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xfff0d7, 2.1);
    sun.position.set(-8, 18, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(768, 768);
    sun.shadow.camera.left = -26; sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -26;
    scene.add(sun);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshLambertMaterial({ color: 0xb8cd9d }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.18;
    floor.receiveShadow = true;
    scene.add(floor);
    const hitPlane = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    hitPlane.rotation.x = -Math.PI / 2;
    hitPlane.position.y = 0.11;
    scene.add(hitPlane);
    const selection = new THREE.Mesh(new THREE.RingGeometry(0.43, 0.54, 4), new THREE.MeshBasicMaterial({ color: 0xf4d882, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    selection.rotation.x = -Math.PI / 2;
    selection.visible = false;
    scene.add(selection);
    const tileGeometry = new THREE.PlaneGeometry(1.43, 1.43);
    game = { canvas, renderer, scene, camera, target, hitPlane, selection, tileGeometry, farm, onCell, actors: [], pointer: new THREE.Vector2(), raycaster: new THREE.Raycaster(), tileCenter: new THREE.Vector3(1000, 0, 1000), frame: 0, resizeObserver: null };
    game.crops = new THREE.Group(); game.decor = new THREE.Group(); game.animals = new THREE.Group();
    scene.add(game.crops, game.decor, game.animals);
    updateCamera();
    resize();
    buildTiles();
    refreshObjects();
    attachInput();
    game.resizeObserver = new ResizeObserver(resize);
    game.resizeObserver.observe(canvas);
    animate(0);
  } catch (error) {
    console.error('Farm 3D could not start', error);
    canvas.innerHTML = '<div class="farm-3d-fallback">3D-графика не запустилась в этом браузере. Попробуй открыть планер в Safari или Chrome.</div>';
  }
}

function zoom(factor) {
  if (!game) return;
  game.camera.zoom = THREE.MathUtils.clamp(game.camera.zoom * factor, 0.65, 2);
  resize();
}

function unmount() {
  if (!game) return;
  cancelAnimationFrame(game.frame);
  game.resizeObserver?.disconnect();
  game.renderer.dispose();
  game = null;
}

window.PlannerFarm3D = { mount, update, zoom, unmount };
window.dispatchEvent(new Event('planner-farm-ready'));
