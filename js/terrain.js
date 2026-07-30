// =====================================================================
// TERRAIN.JS — Geração de Terreno + Texturas
// =====================================================================

function makeGroundTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#4a7a3c';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 10000; i++) {
    g.fillStyle = `rgba(${32 + Math.random() * 30},${70 + Math.random() * 45},${22 + Math.random() * 25},${0.28 + Math.random() * 0.22})`;
    const x = Math.random() * 512, y = Math.random() * 512;
    g.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 260; i++) {
    g.strokeStyle = `rgba(84,96,58,${0.03 + Math.random() * 0.05})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(Math.random() * 512, Math.random() * 512);
    g.lineTo(Math.random() * 512, Math.random() * 512);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(50, 50);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makeRoadTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#2c3138';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(180,180,180,${0.02 + Math.random() * 0.08})`;
    const x = Math.random() * 512, y = Math.random() * 512;
    g.fillRect(x, y, 1 + Math.random() * 3, Math.random() * 0.5 + 0.5);
  }
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const y = 32 + i * 40 + Math.random() * 8;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makeWallTexture(color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 220; i++) {
    g.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.06})`;
    const x = Math.random() * 256, y = Math.random() * 256;
    const w = 10 + Math.random() * 20, h = 4 + Math.random() * 8;
    g.fillRect(x, y, w, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 1.5);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

// --- Heightmap ---
function getTerrainHeightValue(x, z) {
  const nx = x / WORLD_SIZE;
  const nz = z / WORLD_SIZE;
  let height = Math.sin(nx * 1.7 + nz * 0.3) * 2.3 + Math.cos(nz * 1.4 + nx * 0.7) * 1.9;
  height += Math.sin(nx * 0.5) * 3.2 + Math.sin(nz * 0.4) * 2.1;
  height += (Math.random() - 0.5) * 0.35;
  const dist = Math.hypot(x * 0.7, z * 0.7);
  height -= Math.max(0, dist / 50 - 1.8);
  return height;
}

function generateTerrainGeometry() {
  const geo = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const positions = geo.attributes.position.array;
  const grid = TERRAIN_SEGMENTS + 1;
  terrainHeights.length = 0;
  for (let zi = 0; zi < grid; zi++) {
    terrainHeights[zi] = [];
    for (let xi = 0; xi < grid; xi++) {
      const idx = (zi * grid + xi) * 3;
      const worldX = positions[idx];
      const worldZ = positions[idx + 2];
      const height = getTerrainHeightValue(worldX, worldZ);
      positions[idx + 1] = height;
      terrainHeights[zi][xi] = height;
    }
  }
  geo.attributes.position.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function getTerrainHeight(x, z) {
  const half = WORLD_SIZE;
  const grid = TERRAIN_SEGMENTS;
  const localX = (x + half) / (2 * half) * grid;
  const localZ = (z + half) / (2 * half) * grid;
  const ix = Math.floor(localX);
  const iz = Math.floor(localZ);
  const fx = Math.max(0, Math.min(1, localX - ix));
  const fz = Math.max(0, Math.min(1, localZ - iz));
  const clamp = v => Math.max(0, Math.min(grid, v));
  const h00 = terrainHeights[clamp(iz)][clamp(ix)];
  const h10 = terrainHeights[clamp(iz)][clamp(ix + 1)];
  const h01 = terrainHeights[clamp(iz + 1)][clamp(ix)];
  const h11 = terrainHeights[clamp(iz + 1)][clamp(ix + 1)];
  const h0 = h00 * (1 - fx) + h10 * fx;
  const h1 = h01 * (1 - fx) + h11 * fx;
  return h0 * (1 - fz) + h1 * fz;
}

// --- Criar Terreno ---
const groundGeo = generateTerrainGeometry();
const groundMat = new THREE.MeshStandardMaterial({
  map: makeGroundTexture(), roughness: 0.96, metalness: 0.02,
  bumpMap: makeGroundTexture(), bumpScale: 0.08
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.receiveShadow = true;
scene.add(ground);

// --- Estradas ---
const roadMat = new THREE.MeshStandardMaterial({
  map: makeRoadTexture(), roughness: 0.62, metalness: 0.12,
  normalMap: makeRoadTexture(), normalScale: new THREE.Vector2(0.15, 0.15),
  envMapIntensity: 0.4
});

function addRoadSegment(x, z, width, length, rotation = 0) {
  const seg = new THREE.Mesh(new THREE.PlaneGeometry(width, length), roadMat);
  seg.rotation.x = -Math.PI / 2;
  seg.rotation.z = rotation;
  seg.position.set(x, getTerrainHeight(x, z) + 0.02, z);
  seg.receiveShadow = true;
  scene.add(seg);
  roadSegments.push(seg);
}

function refreshRoadHeight() {
  roadSegments.forEach(seg => {
    seg.position.y = getTerrainHeight(seg.position.x, seg.position.z) + 0.02;
  });
}

// Gerar estradas
addRoadSegment(0, 0, 12, WORLD_SIZE * 1.2);
addRoadSegment(0, 0, WORLD_SIZE * 1.2, 12);
for (let i = 1; i < 3; i++) {
  addRoadSegment(i * 18, 0, 10, WORLD_SIZE * 1.1);
  addRoadSegment(-i * 18, 0, 10, WORLD_SIZE * 1.1);
  addRoadSegment(0, i * 18, WORLD_SIZE * 1.1, 10, Math.PI / 2);
  addRoadSegment(0, -i * 18, WORLD_SIZE * 1.1, 10, Math.PI / 2);
}
