// =====================================================================
// TERRAIN.JS — MUNDO ABERTO INFINITO EM CHUNKS PROCEDURAIS
// Heightfield fBm + ridged, normais analíticas (sem costuras), vertex colors
// por bioma/inclinação/altitude, textura de detalhe PBR e fila de streaming.
// =====================================================================

const CHUNK_SIZE = 64;
const CHUNK_SEGS = 24;
const RENDER_DISTANCE = 3; // Raio de 7x7 chunks ao redor do jogador

const loadedChunks = new Map();
const chunkCollidablesMap = new Map();

let currentMapKey = 'neon_rust';

// ---------------------------------------------------------------------
// Estilo de relevo por mapa
// ---------------------------------------------------------------------
const TERRAIN_STYLES = {
  neon_rust:     { amp: 5.5,  hill: 0.0065, ridge: 2.2, detail: 0.55, flatR: 150, dune: 0 },
  jungle_temple: { amp: 12,   hill: 0.0075, ridge: 6.0, detail: 0.95, flatR: 140, dune: 0 },
  void_core:     { amp: 10,   hill: 0.0070, ridge: 10,  detail: 0.80, flatR: 150, dune: 0 },
  desert:        { amp: 9,    hill: 0.0055, ridge: 4.0, detail: 0.45, flatR: 140, dune: 1 },
  arctic:        { amp: 11,   hill: 0.0070, ridge: 7.5, detail: 0.70, flatR: 140, dune: 0 }
};
let terrainStyle = TERRAIN_STYLES.neon_rust;

const _tc = (hex) => new THREE.Color(hex).convertSRGBToLinear();
const TERRAIN_PALETTES = {
  neon_rust: {
    low: _tc(0x1a2128), mid: _tc(0x29333a), high: _tc(0x3a444b), rock: _tc(0x4a5157), accent: _tc(0x3d2d22),
    h0: -4, h1: 6, rockStart: 0.20, rough: 0.55, metal: 0.10, bump: 1.4
  },
  jungle_temple: {
    low: _tc(0x183010), mid: _tc(0x2b4e17), high: _tc(0x3e6a21), rock: _tc(0x5a524b), accent: _tc(0x4a3926),
    h0: -8, h1: 14, rockStart: 0.24, rough: 0.97, metal: 0, bump: 1.8
  },
  void_core: {
    low: _tc(0x120824), mid: _tc(0x220f3f), high: _tc(0x3b1c68), rock: _tc(0x0c0516), accent: _tc(0x1b3d63),
    h0: -8, h1: 14, rockStart: 0.22, rough: 0.35, metal: 0.25, bump: 1.4
  },
  desert: {
    low: _tc(0xc29a5e), mid: _tc(0xdbb679), high: _tc(0xbd8651), rock: _tc(0x8d5c39), accent: _tc(0xe8cf9c),
    h0: -6, h1: 10, rockStart: 0.30, rough: 1.0, metal: 0, bump: 1.2
  },
  arctic: {
    low: _tc(0xc2d0df), mid: _tc(0xe4edf6), high: _tc(0xf8fbff), rock: _tc(0x55606c), accent: _tc(0x9fc3da),
    h0: -8, h1: 14, rockStart: 0.34, rough: 0.5, metal: 0.04, bump: 1.0
  }
};
let terrainPalette = TERRAIN_PALETTES.neon_rust;

// ---------------------------------------------------------------------
// Altura contínua em qualquer ponto (X, Z) do universo
// ---------------------------------------------------------------------
const TERRAIN_MAX_H = 45;

function getTerrainHeight(x, z) {
  const s = terrainStyle;
  const big = fbm(x * s.hill + 31.7, z * s.hill - 12.3, 4);
  let h = (big - 0.5) * 2 * s.amp;

  const rn = fbm(x * 0.0045 - 5.1, z * 0.0045 + 8.8, 3);
  const ridge = 1 - Math.abs(rn * 2 - 1);
  h += ridge * ridge * ridge * s.ridge * 2.2;

  if (s.dune) {
    const w = vnoise(x * 0.012, z * 0.012) * 6.0;
    h += Math.sin(x * 0.05 + z * 0.02 + w) * 1.1 * s.dune;
  }

  h += (fbm(x * 0.06, z * 0.06, 3) - 0.5) * 2 * s.detail;

  // Zona central quase plana (estruturas), com transição suave para o relevo
  const d = Math.sqrt(x * x + z * z);
  const f = smoothstep(s.flatR, s.flatR + 110, d);
  const flatH = h * 0.10 + (fbm(x * 0.02, z * 0.02, 2) - 0.5) * 0.5;
  return flatH + (h - flatH) * f;
}

function getTerrainNormal(x, z, out) {
  const e = 0.7;
  const hl = getTerrainHeight(x - e, z), hr = getTerrainHeight(x + e, z);
  const hd = getTerrainHeight(x, z - e), hu = getTerrainHeight(x, z + e);
  out = out || new THREE.Vector3();
  out.set(hl - hr, 2 * e, hd - hu).normalize();
  return out;
}

// Raycast analítico contra o heightfield: retorna distância ou -1
function raycastTerrain(origin, dir, maxDist) {
  if (dir.y > 0 && origin.y > TERRAIN_MAX_H) return -1;
  if (origin.y < getTerrainHeight(origin.x, origin.z)) return 0;
  let t = 0.8;
  while (t <= maxDist) {
    const px = origin.x + dir.x * t, py = origin.y + dir.y * t, pz = origin.z + dir.z * t;
    const gy = getTerrainHeight(px, pz);
    if (py < gy) {
      let a = Math.max(0, t - 6), b = t;
      for (let i = 0; i < 7; i++) {
        const m = (a + b) * 0.5;
        if (origin.y + dir.y * m < getTerrainHeight(origin.x + dir.x * m, origin.z + dir.z * m)) b = m; else a = m;
      }
      return b;
    }
    if (dir.y > 0 && py > TERRAIN_MAX_H) return -1;
    t += clamp((py - gy) * 0.6, 0.7, 6);
  }
  return -1;
}

// ---------------------------------------------------------------------
// Cor do terreno (altitude, inclinação, ruído macro/micro)
// ---------------------------------------------------------------------
const _tmpC = new THREE.Color();
function terrainColor(x, z, h, ny, pal, out, o) {
  const n1 = fbm(x * 0.018 + 3.3, z * 0.018 - 1.7, 3);
  const n2 = vnoise(x * 0.35, z * 0.35);
  const n3 = fbm(x * 0.05 - 9, z * 0.05 + 4, 2);
  const hh = smoothstep(pal.h0, pal.h1, h);

  _tmpC.copy(pal.low).lerp(pal.mid, smoothstep(0.25, 0.75, n1));
  _tmpC.lerp(pal.high, hh * 0.75);
  _tmpC.lerp(pal.accent, smoothstep(0.58, 0.78, n3) * 0.65);

  const slope = 1 - ny;
  const rockT = smoothstep(pal.rockStart, pal.rockStart + 0.2, slope);
  _tmpC.lerp(pal.rock, rockT);

  const k = 0.86 + n2 * 0.28;
  out[o] = _tmpC.r * k; out[o + 1] = _tmpC.g * k; out[o + 2] = _tmpC.b * k;
}

// ---------------------------------------------------------------------
// Material do solo
// ---------------------------------------------------------------------
TEX.groundDetail.repeat.set(CHUNK_SIZE / 4, CHUNK_SIZE / 4);

const groundMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  map: TEX.groundDetail,
  bumpMap: TEX.groundDetail,
  bumpScale: 1.4,
  roughness: 0.9,
  metalness: 0.0
});
const groundMaterialCache = groundMat;
let roadMat = new THREE.MeshStandardMaterial({ color: 0x111622, roughness: 0.7, metalness: 0.2 });

function setTerrainStyle(mapKey) {
  currentMapKey = TERRAIN_STYLES[mapKey] ? mapKey : 'neon_rust';
  terrainStyle = TERRAIN_STYLES[currentMapKey];
  terrainPalette = TERRAIN_PALETTES[currentMapKey];
  groundMat.roughness = terrainPalette.rough;
  groundMat.metalness = terrainPalette.metal;
  groundMat.bumpScale = terrainPalette.bump;
  groundMat.envMapIntensity = currentMapKey === 'neon_rust' ? 1.1 : 0.55;
  groundMat.needsUpdate = true;
}

// ---------------------------------------------------------------------
// Criação / destruição de chunks
// ---------------------------------------------------------------------
const _nrm = new THREE.Vector3();

function createChunk(cx, cz) {
  const key = `${cx},${cz}`;
  if (loadedChunks.has(key)) return;

  const worldX = cx * CHUNK_SIZE;
  const worldZ = cz * CHUNK_SIZE;
  const N = CHUNK_SEGS + 1;
  const step = CHUNK_SIZE / CHUNK_SEGS;

  const positions = new Float32Array(N * N * 3);
  const normals = new Float32Array(N * N * 3);
  const colors = new Float32Array(N * N * 3);
  const uvs = new Float32Array(N * N * 2);
  const pal = terrainPalette;

  let p = 0, c = 0, u = 0;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const lx = -CHUNK_SIZE / 2 + i * step;
      const lz = -CHUNK_SIZE / 2 + j * step;
      const wx = worldX + lx, wz = worldZ + lz;
      const h = getTerrainHeight(wx, wz);
      getTerrainNormal(wx, wz, _nrm);

      positions[p] = lx; positions[p + 1] = h; positions[p + 2] = lz;
      normals[p] = _nrm.x; normals[p + 1] = _nrm.y; normals[p + 2] = _nrm.z;
      p += 3;
      terrainColor(wx, wz, h, _nrm.y, pal, colors, c);
      c += 3;
      uvs[u++] = i / CHUNK_SEGS; uvs[u++] = j / CHUNK_SEGS;
    }
  }

  const idx = new Uint16Array(CHUNK_SEGS * CHUNK_SEGS * 6);
  let k = 0;
  for (let j = 0; j < CHUNK_SEGS; j++) {
    for (let i = 0; i < CHUNK_SEGS; i++) {
      const a = j * N + i, b = (j + 1) * N + i, cc = j * N + i + 1, d = (j + 1) * N + i + 1;
      idx[k++] = a; idx[k++] = b; idx[k++] = cc;
      idx[k++] = b; idx[k++] = d; idx[k++] = cc;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, groundMat);
  mesh.position.set(worldX, 0, worldZ);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  scene.add(mesh);

  const chunkObj = { cx, cz, key, mesh, geo, decor: null };
  loadedChunks.set(key, chunkObj);

  // Decoração do chunk: vegetação, rochas, props, baús, feras
  if (typeof decorateChunk === 'function') {
    chunkObj.decor = decorateChunk(cx, cz, worldX, worldZ);
  }
}

function unloadChunk(key) {
  const chunkObj = loadedChunks.get(key);
  if (!chunkObj) return;

  scene.remove(chunkObj.mesh);
  if (chunkObj.geo) chunkObj.geo.dispose();
  loadedChunks.delete(key);

  if (chunkObj.decor && typeof releaseChunkDecor === 'function') {
    releaseChunkDecor(chunkObj.decor);
  }
}

function unloadAllChunks() {
  for (const key of Array.from(loadedChunks.keys())) unloadChunk(key);
}

// Atualização dinâmica: cria no máx. 2 chunks por frame (evita travadas)
function updateChunks(playerX, playerZ, immediate = false) {
  const pCX = Math.floor((playerX + CHUNK_SIZE / 2) / CHUNK_SIZE);
  const pCZ = Math.floor((playerZ + CHUNK_SIZE / 2) / CHUNK_SIZE);

  const want = [];
  for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
    for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
      const cx = pCX + dx, cz = pCZ + dz;
      if (!loadedChunks.has(`${cx},${cz}`)) want.push({ cx, cz, d: dx * dx + dz * dz });
    }
  }
  want.sort((a, b) => a.d - b.d);

  let budget = immediate ? Infinity : 2;
  for (const w of want) {
    if (budget-- <= 0) break;
    createChunk(w.cx, w.cz);
  }

  // Histerese: só descarrega quando passa 1 chunk além do raio de criação
  for (const [key, ch] of loadedChunks) {
    if (Math.abs(ch.cx - pCX) > RENDER_DISTANCE + 1 || Math.abs(ch.cz - pCZ) > RENDER_DISTANCE + 1) {
      unloadChunk(key);
    }
  }
}
