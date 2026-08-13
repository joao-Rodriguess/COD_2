// =====================================================================
// TERRAIN.JS — SISTEMA DE MUNDO ABERTO INFINITO COM CHUNKS PROCEDURAIS (ESTILO MINECRAFT)
// =====================================================================

const CHUNK_SIZE = 64;
const CHUNK_SEGS = 16;
const RENDER_DISTANCE = 3; // Raio de 7x7 Chunks ao redor do jogador

const loadedChunks = new Map();
const chunkCollidablesMap = new Map();

// --- Função de Ruído Multi-Oitava Simplex/fBm Procedural Infinito ---
function noise2D(x, z) {
  const s1 = Math.sin(x * 0.035 + z * 0.025) * 4.8;
  const s2 = Math.cos(x * 0.07 - z * 0.05) * 2.5;
  const s3 = Math.sin(x * 0.15 + z * 0.12) * 0.9;
  const ridge = Math.abs(Math.sin(x * 0.015 + z * 0.015)) * 7.5;
  return s1 + s2 + s3 + ridge;
}

// Retorna a altura contínua em qualquer coordenada (X, Z) do universo do jogo
function getTerrainHeight(x, z) {
  // Biomas procedurais derivados de coordenadas de longo alcance
  const biomeNoise = Math.sin(x * 0.005) * Math.cos(z * 0.005);
  const mountainFactor = Math.max(0.5, 1.0 + biomeNoise * 1.5);

  const baseH = noise2D(x, z) * mountainFactor;
  return baseH;
}

// Retorna o Bioma Atual com base nas coordenadas
function getBiomeAt(x, z) {
  const v = Math.sin(x * 0.008 + z * 0.008);
  if (v > 0.4) return { name: 'Montanhas Rochosas', color: '#1a241b' };
  if (v < -0.4) return { name: 'Pântano Tóxico', color: '#122018' };
  return { name: 'Floresta Verdante', color: '#1b2a1a' };
}

// Textura Procedural Orgânica do Solo por Bioma
function makeOrganicGroundTexture(themeColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = themeColor || '#1a241b';
  ctx.fillRect(0, 0, 256, 256);

  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 30;
    data[i]     = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 1.1));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.9));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

const groundMaterialCache = new THREE.MeshStandardMaterial({
  map: makeOrganicGroundTexture('#1a241b'),
  roughness: 0.88,
  metalness: 0.12,
  bumpScale: 0.15
});

let groundMat = groundMaterialCache;
let roadMat = new THREE.MeshStandardMaterial({ color: 0x111622, roughness: 0.7, metalness: 0.2 });

// Criar um Chunk de Terreno
function createChunk(cx, cz) {
  const key = `${cx},${cz}`;
  if (loadedChunks.has(key)) return;

  const worldX = cx * CHUNK_SIZE;
  const worldZ = cz * CHUNK_SIZE;

  const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, CHUNK_SEGS, CHUNK_SEGS);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i) + worldX;
    const vz = pos.getZ(i) + worldZ;
    const vy = getTerrainHeight(vx, vz);
    pos.setY(i, vy);
  }
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, groundMaterialCache);
  mesh.position.set(worldX, 0, worldZ);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  scene.add(mesh);

  const chunkObj = { cx, cz, mesh, geo };
  loadedChunks.set(key, chunkObj);

  // Decorar o Chunk (Árvores, Pedras, Baús e Feras)
  if (typeof decorateChunk === 'function') {
    decorateChunk(cx, cz, worldX, worldZ);
  }
}

// Descarregar Chunk Distante
function unloadChunk(key) {
  const chunkObj = loadedChunks.get(key);
  if (!chunkObj) return;

  scene.remove(chunkObj.mesh);
  if (chunkObj.geo) chunkObj.geo.dispose();
  loadedChunks.delete(key);

  // Remover elementos colisores e baús atribuídos a esse chunk
  if (chunkCollidablesMap.has(key)) {
    const items = chunkCollidablesMap.get(key);
    items.forEach(obj => {
      if (obj.mesh) scene.remove(obj.mesh);
      const idx = collidables.indexOf(obj);
      if (idx >= 0) collidables.splice(idx, 1);
    });
    chunkCollidablesMap.delete(key);
  }
}

// Atualização Dinâmica de Chunks baseada na posição do jogador
function updateChunks(playerX, playerZ) {
  const pCX = Math.floor((playerX + CHUNK_SIZE / 2) / CHUNK_SIZE);
  const pCZ = Math.floor((playerZ + CHUNK_SIZE / 2) / CHUNK_SIZE);

  const activeKeys = new Set();

  for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
    for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
      const cx = pCX + dx;
      const cz = pCZ + dz;
      const key = `${cx},${cz}`;
      activeKeys.add(key);
      if (!loadedChunks.has(key)) {
        createChunk(cx, cz);
      }
    }
  }

  // Limpar Chunks distantes além do raio de visão
  for (const [key] of loadedChunks.entries()) {
    if (!activeKeys.has(key)) {
      unloadChunk(key);
    }
  }
}

// Inicializar Chunks Iniciais
updateChunks(0, 0);
