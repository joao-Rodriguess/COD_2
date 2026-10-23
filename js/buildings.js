// =====================================================================
// BUILDINGS.JS — ARQUITETURA, PROPS & INTERAÇÕES (texturas PBR, interiores,
// colisão por proxies, escadas, animações de luzes/chamas)
// =====================================================================

const mapStructuresGroup = new THREE.Group();
scene.add(mapStructuresGroup);

const activePortals = [];
const animatedProps = [];
let interactiveMetalDoor = null;

function clearMapStructures() {
  while (mapStructuresGroup.children.length > 0) {
    const child = mapStructuresGroup.children[0];
    mapStructuresGroup.remove(child);
    child.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
  collidables.length = 0;
  houseEntries.length = 0;
  lootChests.length = 0;
  climbPoints.length = 0;
  elevatedPlatforms.length = 0;
  barricades.length = 0;
  buildingSpots.length = 0;
  centerPositions.length = 0;
  activePortals.length = 0;
  animatedProps.length = 0;
  interactiveMetalDoor = null;
  if (typeof markCollidablesDirty === 'function') markCollidablesDirty();
}

function registerCollidable(mesh) {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  collidables.push({ mesh, box });
  if (typeof markCollidablesDirty === 'function') markCollidablesDirty();
  return box;
}

function syncAllCollidableBoxes() {
  scene.updateMatrixWorld(true);
  collidables.forEach(c => { c.box.setFromObject(c.mesh); });
}

// =====================================================================
// MATERIAIS PBR COM TEXTURAS PROCEDURAIS
// =====================================================================
function texMat(tex, tint = 0xffffff, o = {}) {
  const { bump = 0.8, noBump = false, ...rest } = o;
  const m = new THREE.MeshStandardMaterial(Object.assign({ map: tex, roughness: 0.85, metalness: 0 }, rest));
  if (!noBump) { m.bumpMap = tex; m.bumpScale = bump; }
  m.color.setHex(tint).convertSRGBToLinear();
  return m;
}

function repeatTex(tex, rx, ry) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.repeat.set(rx, ry);
  return t;
}

const towerWin = makeWindowTextures(['#ffd27a', '#4be8ff', '#ff4fc8', '#ffffff'], 0.5);
const houseWin = makeWindowTextures(['#ffc874', '#ffe0a0'], 0.35);

const MATS = {
  concreteDark:  texMat(TEX.concrete, 0x7a8088, { roughness: 0.9 }),
  concreteLight: texMat(TEX.concrete, 0xcfd3d6, { roughness: 0.9 }),
  plaster:       texMat(TEX.concrete, 0xe0d6c0, { roughness: 0.95 }),
  sandstone:     texMat(TEX.concrete, 0xd8b078, { roughness: 1.0, bump: 1.2 }),
  frameMetal:    texMat(TEX.metalPanel, 0x9aa2ac, { metalness: 0.75, roughness: 0.45 }),
  corrugated:    texMat(TEX.corrugated, 0xc4ccd4, { metalness: 0.55, roughness: 0.5, bump: 1.2 }),
  corrugatedRoof: texMat(repeatTex(TEX.corrugated, 5, 3), 0xaab2ba, { metalness: 0.6, roughness: 0.45, bump: 1.2, side: THREE.DoubleSide }),
  containerRed:  texMat(TEX.corrugated, 0xb04030, { metalness: 0.4, roughness: 0.6, bump: 1.2 }),
  containerBlue: texMat(TEX.corrugated, 0x3a5e92, { metalness: 0.4, roughness: 0.6, bump: 1.2 }),
  containerOrange: texMat(TEX.corrugated, 0xd08a30, { metalness: 0.4, roughness: 0.6, bump: 1.2 }),
  woodPlank:     texMat(TEX.wood, 0xd8b890, { roughness: 0.9 }),
  woodDark:      texMat(TEX.wood, 0x8a6a4a, { roughness: 0.9 }),
  woodTribal:    texMat(TEX.wood, 0xb89868, { roughness: 0.95 }),
  stoneRuins:    texMat(TEX.stone, 0xd2d4cc, { roughness: 0.95, bump: 1.4 }),
  stoneMoss:     texMat(TEX.stone, 0xa2b296, { roughness: 0.97, bump: 1.4 }),
  thatchRoof:    texMat(repeatTex(TEX.thatch, 3, 2), 0xe8d8a8, { roughness: 1.0, bump: 1.0 }),
  roofTile:      texMat(repeatTex(TEX.roofTile, 4, 3), 0xffffff, { roughness: 0.8, bump: 1.0 }),
  snow:          pbr(0xf0f6fb, { roughness: 0.55 }),
  towerGlass:    new THREE.MeshStandardMaterial({ map: towerWin.diffuse, emissiveMap: towerWin.emissive, emissive: 0xffffff, emissiveIntensity: 1.35, roughness: 0.3, metalness: 0.65 }),
  houseWall:     null, // preenchido por estilo
  glass:         new THREE.MeshStandardMaterial({ color: 0x7ab0c8, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.9 }),
  glassCyber:    new THREE.MeshStandardMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.55, metalness: 0.9, roughness: 0.1 }),
  neonCyan:      new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
  neonPurple:    new THREE.MeshBasicMaterial({ color: 0xb040ff }),
  neonOrange:    new THREE.MeshBasicMaterial({ color: 0xff7a1a }),
  neonPink:      new THREE.MeshBasicMaterial({ color: 0xff3cc8 }),
  rockMat:       pbr(0x5a5e64, { roughness: 0.95 }),
  obsidianVoid:  pbr(0x120822, { roughness: 0.12, metalness: 0.85 }),
  crystalVoid:   new THREE.MeshStandardMaterial({ color: 0x1a0838, emissive: 0x9d00ff, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.15 }),
  hazardYellow:  pbr(0xe8b800, { metalness: 0.3, roughness: 0.55 }),
  ironDark:      pbr(0x1c1e20, { metalness: 0.85, roughness: 0.45 }),
  gold:          pbr(0xd4a73a, { metalness: 0.9, roughness: 0.3 }),
  woodChest:     texMat(TEX.wood, 0xa87848, { roughness: 0.85 }),
  cloth:         pbr(0xb8452a, { roughness: 1.0, side: THREE.DoubleSide }),
  clothSand:     pbr(0xd8c498, { roughness: 1.0, side: THREE.DoubleSide }),
  flameMat:      new THREE.SpriteMaterial({ map: TEX.softDot, color: 0xffa030, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
  prefabWhite:   texMat(TEX.corrugated, 0xe8ecef, { metalness: 0.3, roughness: 0.55, bump: 1.0 }),
  prefabOrange:  texMat(TEX.corrugated, 0xe0701c, { metalness: 0.3, roughness: 0.55, bump: 1.0 })
};

reflectiveMaterials.push(MATS.glassCyber, MATS.glass);

// Materiais para detalhes mesclados (vertex colors)
const DECO_MAT = {
  d:    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0 }),
  m:    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.75 }),
  lit:  new THREE.MeshBasicMaterial({ vertexColors: true }),
  dark: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.9 })
};

// Deco: acumula detalhes não-colidíveis em poucos draw-calls
class Deco {
  constructor() { this.b = { d: new GeoBatch(), m: new GeoBatch(), lit: new GeoBatch(), dark: new GeoBatch() }; }
  box(k, w, h, d, x, y, z, c1, ry = 0, c2) {
    this.b[k].add(new THREE.BoxGeometry(w, h, d), mat4(x, y, z, 0, ry, 0), { c1, c2: c2 === undefined ? c1 : c2, vary: k === 'lit' ? 0 : 0.07 });
  }
  boxR(k, w, h, d, x, y, z, c1, rx, ry, rz) {
    this.b[k].add(new THREE.BoxGeometry(w, h, d), mat4(x, y, z, rx, ry, rz), { c1, vary: 0.06 });
  }
  cyl(k, rt, rb, h, seg, x, y, z, c1, rx = 0, ry = 0, rz = 0, c2) {
    this.b[k].add(new THREE.CylinderGeometry(rt, rb, h, seg, 1), mat4(x, y, z, rx, ry, rz), { c1, c2: c2 === undefined ? c1 : c2, vary: 0.05 });
  }
  flush(parent) {
    Object.keys(this.b).forEach(k => {
      const m = this.b[k].flush(DECO_MAT[k]);
      if (m) { m.castShadow = (k !== 'lit'); parent.add(m); }
    });
  }
}

// Caixa com UV proporcional ao tamanho (textura sem esticar)
function tbox(w, h, d, mat, tu = 4, tv = tu) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0] / tu, uv.getY(k) * dims[f][1] / tv);
    }
  }
  uv.needsUpdate = true;
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function put(parent, mesh, x, y, z, ry = 0) {
  mesh.position.set(x, y, z);
  if (ry) mesh.rotation.y = ry;
  parent.add(mesh);
  return mesh;
}

// Sprite de brilho (neon / lâmpadas)
function glowSprite(parent, x, y, z, size, color, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TEX.softDot, color, blending: THREE.AdditiveBlending, transparent: true, opacity, depthWrite: false
  }));
  s.scale.set(size, size, 1);
  s.position.set(x, y, z);
  parent.add(s);
  return s;
}

// Escada metálica (mesclada) com degraus
let _ladderMat = null;
function makeLadder(height) {
  const B = new GeoBatch();
  B.add(new THREE.BoxGeometry(0.07, height, 0.07), mat4(-0.32, height / 2, 0), { c1: 0x6a6f75 });
  B.add(new THREE.BoxGeometry(0.07, height, 0.07), mat4(0.32, height / 2, 0), { c1: 0x6a6f75 });
  for (let y = 0.35; y < height; y += 0.35) {
    B.add(new THREE.CylinderGeometry(0.025, 0.025, 0.64, 5, 1), mat4(0, y, 0, 0, 0, Math.PI / 2), { c1: 0x8a8f95 });
  }
  if (!_ladderMat) _ladderMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.8 });
  const m = B.flush(_ladderMat);
  m.castShadow = true;
  return m;
}

// Par de pontos de escalada (subir/descer) — respeita altura atual do jogador
function addLadderPair(upX, upZ, groundY, topY, landX, landZ, downX, downZ) {
  climbPoints.push({ x: upX, z: upZ, targetY: topY + 2, toX: landX, toZ: landZ, maxY: groundY + 4.2, label: 'SUBIR' });
  climbPoints.push({ x: landX, z: landZ, targetY: groundY + 2, toX: downX, toZ: downZ, minY: topY + 1.2, label: 'DESCER' });
}

// Animações de estruturas (beacons, chamas, objetos giratórios)
function updateStructureAnimations(dt, t) {
  for (let i = 0; i < animatedProps.length; i++) animatedProps[i](t, dt);
  CHEST_BEAM_MAT.opacity = 0.32 + Math.sin(t * 2.2) * 0.12;
}

// =====================================================================
// 1. BAÚ DE SAQUE (madeira reforçada + feixe de luz)
// =====================================================================
const CHEST_GEO = {
  body: new THREE.BoxGeometry(1.3, 0.55, 0.82),
  lid: (() => { const g = new THREE.CylinderGeometry(0.41, 0.41, 1.3, 14, 1, false, 0, Math.PI); g.rotateZ(Math.PI / 2); return g; })(),
  band: new THREE.BoxGeometry(0.1, 0.6, 0.88),
  lidBand: (() => { const g = new THREE.CylinderGeometry(0.43, 0.43, 0.1, 14, 1, false, 0, Math.PI); g.rotateZ(Math.PI / 2); return g; })(),
  lock: new THREE.BoxGeometry(0.2, 0.24, 0.09),
  beam: new THREE.CylinderGeometry(0.3, 0.6, 7, 12, 1, true)
};
const CHEST_BEAM_MAT = new THREE.MeshBasicMaterial({
  map: TEX.beam, color: 0x4be8ff, transparent: true, opacity: 0.4,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});

function addLootChest(x, z, opts = {}) {
  const parent = opts.parent || mapStructuresGroup;
  const baseY = opts.y !== undefined ? opts.y : getTerrainHeight(x, z);
  const group = new THREE.Group();

  const body = new THREE.Mesh(CHEST_GEO.body, MATS.woodChest);
  body.position.y = 0.275; body.castShadow = true; body.receiveShadow = true; group.add(body);
  const lid = new THREE.Mesh(CHEST_GEO.lid, MATS.woodChest);
  lid.position.y = 0.55; lid.castShadow = true; group.add(lid);
  for (const sx of [-0.5, 0.5]) {
    const band = new THREE.Mesh(CHEST_GEO.band, MATS.ironDark);
    band.position.set(sx, 0.28, 0); group.add(band);
    const lb = new THREE.Mesh(CHEST_GEO.lidBand, MATS.ironDark);
    lb.position.set(sx, 0.55, 0); group.add(lb);
  }
  const lock = new THREE.Mesh(CHEST_GEO.lock, MATS.gold);
  lock.position.set(0, 0.52, 0.43); group.add(lock);

  const beam = new THREE.Mesh(CHEST_GEO.beam, CHEST_BEAM_MAT);
  beam.position.y = 3.6; beam.renderOrder = 5; group.add(beam);
  const halo = glowSprite(group, 0, 0.9, 0, 1.6, 0x4be8ff, 0.7);

  group.position.set(x, baseY, z);
  group.rotation.y = opts.rot || 0;
  parent.add(group);

  const rec = { group, opened: false, beam, halo };
  lootChests.push(rec);
  return rec;
}

// =====================================================================
// 2. DETRITOS INDUSTRIAIS (barris, caixotes e paletes)
// =====================================================================
function buildIndustrialDebris(x, z) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);
  const D = new Deco();
  const cols = [0xa83020, 0x2e5a94, 0xc8a020];
  for (let i = 0; i < 3; i++) {
    const bx = (i - 1) * 0.95, bz = (i % 2) * 0.4;
    D.cyl('d', 0.4, 0.4, 1.15, 12, bx, 0.58, bz, cols[i]);
    D.cyl('m', 0.415, 0.415, 0.07, 12, bx, 0.3, bz, 0x25282b);
    D.cyl('m', 0.415, 0.415, 0.07, 12, bx, 0.86, bz, 0x25282b);
    D.cyl('m', 0.34, 0.34, 0.03, 12, bx, 1.16, bz, 0x2a2d30);
  }
  D.box('d', 1.4, 0.15, 1.4, 2.3, 0.08, 0.2, 0x8a6a42, 0.3);
  D.box('d', 1.2, 1.2, 1.2, 2.3, 0.75, 0.2, 0xa07a48, 0.3);
  D.box('m', 1.26, 0.12, 1.26, 2.3, 0.75, 0.2, 0x3a3a3c, 0.3);
  D.box('d', 1.0, 1.0, 1.0, 2.9, 0.65, -1.0, 0x907040, -0.4);
  D.flush(g);
  mapStructuresGroup.add(g);
  registerCollidable(put(g, proxyBox(0, 0, 0.2, 2.6, 1.2, 1.4), 0, 0, 0));
  registerCollidable(put(g, proxyBox(2.4, 0, -0.3, 2.2, 1.9, 2.3), 0, 0, 0));
}

// =====================================================================
// 3. POSTE DE ILUMINAÇÃO COM LUZ VOLUMÉTRICA
// =====================================================================
const LAMP_CONE_GEO = new THREE.ConeGeometry(3.4, 5.4, 16, 1, true);
LAMP_CONE_GEO.translate(0, -2.7, 0);

function buildStreetLamp(x, z, colorHex = 0x00f0ff) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);
  g.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2;
  const D = new Deco();
  D.cyl('m', 0.12, 0.2, 6.2, 8, 0, 3.1, 0, 0x14181d);
  D.box('m', 0.55, 0.9, 0.55, 0, 0.45, 0, 0x1c2026);
  D.box('m', 0.62, 0.08, 0.62, 0, 0.92, 0, 0x2a3038);
  D.box('m', 1.6, 0.13, 0.13, 0.75, 6.0, 0, 0x14181d);
  D.boxR('m', 0.1, 0.9, 0.1, 0.25, 5.65, 0, 0, 0, -0.6);
  D.box('m', 0.62, 0.18, 0.46, 1.5, 5.9, 0, 0x1a1e24);
  D.box('lit', 0.5, 0.06, 0.36, 1.5, 5.78, 0, colorHex);
  D.flush(g);
  const halo = glowSprite(g, 1.5, 5.6, 0, 2.4, colorHex, 0.85);
  const cone = new THREE.Mesh(LAMP_CONE_GEO, new THREE.MeshBasicMaterial({
    color: colorHex, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  cone.position.set(1.5, 5.7, 0); g.add(cone);
  const phase = Math.random() * 6;
  animatedProps.push((t) => { const f = 0.88 + 0.12 * Math.sin(t * 7 + phase) * Math.sin(t * 2.3 + phase); halo.material.opacity = 0.85 * f; });
  mapStructuresGroup.add(g);
  registerCollidable(put(g, proxyCyl(0, 0, 0, 0.3, 6.2), 0, 0, 0));
}

// =====================================================================
// 4. BARRICADA TÁTICA DE SACOS DE AREIA
// =====================================================================
const SANDBAG_GEO = (() => { const g = new THREE.CylinderGeometry(0.23, 0.23, 0.82, 10); g.rotateZ(Math.PI / 2); g.scale(1, 0.72, 1); return g; })();
function deployBarricade() {
  if (!gameRunning || !player.alive || inventory.barricades <= 0) return;
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).negate();
  const pos = yawObject.position.clone().addScaledVector(forward, 2.4);
  pos.y = getTerrainHeight(pos.x, pos.z);

  const g = new THREE.Group();
  g.position.copy(pos);
  g.rotation.y = yaw;

  const sandbagMat = pbr(0x9a8664, { roughness: 1.0, map: TEX.concrete, bumpMap: TEX.concrete, bumpScale: 1.5 });
  for (let row = 0; row < 3; row++) {
    const ry = row * 0.34 + 0.18;
    const bagCount = (row === 2) ? 2 : 3;
    for (let b = 0; b < bagCount; b++) {
      const bx = (b - (bagCount - 1) / 2) * 0.88 + (row % 2) * 0.12;
      const bag = new THREE.Mesh(SANDBAG_GEO, sandbagMat);
      bag.position.set(bx, ry, (Math.random() - 0.5) * 0.04);
      bag.rotation.y = (Math.random() - 0.5) * 0.12;
      bag.castShadow = true; bag.receiveShadow = true;
      g.add(bag);
    }
  }
  const stakeMat = pbr(0x4a321a, { roughness: 0.9 });
  for (const sx of [-1.4, 1.4]) {
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.8, 6), stakeMat);
    stake.position.set(sx, 0.9, 0);
    stake.rotation.z = sx * 0.03;
    stake.castShadow = true;
    g.add(stake);
  }

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);
  g.children.forEach(c => { if (c.geometry === SANDBAG_GEO) registerCollidable(c); });

  barricades.push(g);
  inventory.barricades--;
  updateInventory();
  showStatus('🛡️ BARRICADA DE SACOS DE AREIA POSICIONADA!');
}

// =====================================================================
// 5. TORRE DE VIGIA / NINHO DE ATIRADOR (treliça, escada, holofote)
// =====================================================================
function buildWatchtower(x, z, height = 12, opts = {}) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);
  const width = 6.0;
  const D = new Deco();
  const colliders = [];
  const woodDeck = opts.metal ? MATS.frameMetal : MATS.woodPlank;

  // Plataforma
  const deck = tbox(width, 0.32, width, woodDeck, 3);
  put(g, deck, 0, height - 0.16, 0); colliders.push(deck);
  const under = tbox(width - 0.3, 0.3, width - 0.3, MATS.woodDark, 3);
  put(g, under, 0, height - 0.45, 0);

  // Pernas e contraventamento
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const lx = sx * (width / 2 - 0.35), lz = sz * (width / 2 - 0.35);
    D.box('d', 0.38, height, 0.38, lx, height / 2 - 0.1, lz, 0x6a4c2e, 0, 0x7a5a38);
    const leg = proxyBox(lx, 0, lz, 0.5, height, 0.5); g.add(leg); colliders.push(leg);
  }
  const levels = Math.max(1, Math.floor(height / 4.5));
  for (let i = 1; i <= levels; i++) {
    const y0 = (height / (levels + 1)) * i;
    const span = width - 0.7;
    for (const s of [-1, 1]) {
      D.box('d', span, 0.2, 0.2, 0, y0, s * (width / 2 - 0.35), 0x5a3f26);
      D.box('d', 0.2, 0.2, span, s * (width / 2 - 0.35), y0, 0, 0x5a3f26);
    }
    const dg = Math.hypot(span, height / (levels + 1));
    const ang = Math.atan2(span, height / (levels + 1));
    for (const s of [-1, 1]) {
      D.boxR('d', 0.14, dg, 0.14, 0, y0 + height / (levels + 1) / 2, s * (width / 2 - 0.35), ang * 0 + Math.atan2(0, 1), 0, ang);
    }
  }

  // Guarda-corpo (lado da escada aberto)
  const railMat = MATS.woodDark;
  const rails = [
    [width, 1.0, 0.12, 0, height + 0.5, -width / 2],
    [width, 1.0, 0.12, 0, height + 0.5, width / 2],
    [0.12, 1.0, width, -width / 2, height + 0.5, 0]
  ];
  rails.forEach(r => { const m = tbox(r[0], r[1], r[2], railMat, 2); put(g, m, r[3], r[4], r[5]); colliders.push(m); });
  const rFront = tbox(0.12, 1.0, width * 0.55, railMat, 2); put(g, rFront, width / 2, height + 0.5, -width * 0.225); colliders.push(rFront);
  const rFront2 = tbox(0.12, 1.0, width * 0.15, railMat, 2); put(g, rFront2, width / 2, height + 0.5, width * 0.425); colliders.push(rFront2);

  // Cobertura + holofote
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) D.box('d', 0.2, 3.2, 0.2, sx * (width / 2 - 0.3), height + 1.6, sz * (width / 2 - 0.3), 0x5a3f26);
  const roof = tbox(width + 0.8, 0.22, width + 0.8, opts.metal ? MATS.corrugated : MATS.roofTile, 3);
  put(g, roof, 0, height + 3.3, 0);
  D.box('m', 0.5, 0.5, 0.7, -width / 2 + 0.8, height + 1.0, -width / 2 + 0.8, 0x1a1e24);
  D.flush(g);

  const lamp = new THREE.Group();
  lamp.position.set(0, height + 3.0, 0);
  const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.6, 10), MATS.ironDark);
  lampBody.rotation.x = Math.PI / 2; lamp.add(lampBody);
  const beamCone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 22, 14, 1, true), new THREE.MeshBasicMaterial({
    color: 0xfff0c0, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  beamCone.rotation.x = -Math.PI / 2; beamCone.position.z = -11.3; lamp.add(beamCone);
  g.add(lamp);
  const spin = Math.random() * 6, spd = 0.35 + Math.random() * 0.2;
  animatedProps.push((t) => { lamp.rotation.y = spin + t * spd; });

  // Escada
  const ladder = makeLadder(height + 1.0);
  ladder.position.set(width / 2 + 0.28, 0, 0.3); ladder.rotation.y = Math.PI / 2;
  g.add(ladder);

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);
  colliders.forEach(c => registerCollidable(c));

  elevatedPlatforms.push({
    minX: x - width / 2 + 0.2, maxX: x + width / 2 - 0.1,
    minZ: z - width / 2 + 0.2, maxZ: z + width / 2 - 0.2,
    y: groundY + height
  });
  addLadderPair(x + width / 2 + 0.9, z + 0.3, groundY, groundY + height, x + width / 2 - 1.3, z + 0.3, x + width / 2 + 0.9, z + 0.3);

  addLootChest(x - 1.2, z - 1.3, { y: groundY + height, rot: 0.4 });
  buildingSpots.push({ x, z, w: width + 2, d: width + 2 });
}

// =====================================================================
// 6. ARRANHA-CÉUS CYBERPUNK (torre em caixa com fachada de janelas)
// =====================================================================
let _helipadTex = null;
function helipadTexture() {
  if (_helipadTex) return _helipadTex;
  _helipadTex = makeCanvasTexture(256, (ctx, w, h) => {
    ctx.fillStyle = '#20262e'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(128, 128, 112, 0, 6.3); ctx.stroke();
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(78, 78, 22, 100); ctx.fillRect(156, 78, 22, 100); ctx.fillRect(78, 116, 100, 22);
  }, { clamp: true });
  return _helipadTex;
}

function buildCyberSkyscraper(x, z, floors = 4, radius = 9.0) {
  const w = radius * 2;
  const groundY = getTerrainHeight(x, z);
  const floorH = 4.2, H = floors * floorH;
  const g = new THREE.Group();
  g.position.set(x, groundY, z);
  const D = new Deco();
  const rng = mulberry32(hash2i(Math.round(x), Math.round(z)) * 4294967295 >>> 0);

  const body = tbox(w, H + 1.2, w, MATS.towerGlass, 12, 16.8);
  put(g, body, 0, (H - 1.2) / 2, 0);

  // Plinto e pilares de canto com neon
  D.box('d', w + 3.6, 0.5, w + 3.6, 0, 0.25, 0, 0x30353c);
  const cNeon = [0x00f0ff, 0xff3cc8];
  let ci = 0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    D.box('m', 0.9, H + 0.4, 0.9, sx * (w / 2 + 0.02), H / 2, sz * (w / 2 + 0.02), 0x1a1e24);
    D.box('lit', 0.14, H, 0.14, sx * (w / 2 + 0.48), H / 2, sz * (w / 2 + 0.48), cNeon[ci++ % 2]);
  }
  for (let i = 1; i < floors; i += 2) { // faixas de neon nos andares
    const c = cNeon[(i >> 1) % 2];
    for (const s of [-1, 1]) {
      D.box('lit', w + 0.4, 0.14, 0.14, 0, i * floorH, s * (w / 2 + 0.22), c);
      D.box('lit', 0.14, 0.14, w + 0.4, s * (w / 2 + 0.22), i * floorH, 0, c);
    }
  }
  // Entrada (face +z)
  D.box('dark', 4.6, 3.0, 0.2, 0, 1.6, w / 2 + 0.05, 0x0a141c);
  D.box('m', 5.2, 0.3, 2.8, 0, 3.5, w / 2 + 1.3, 0x1a1e24);
  D.box('lit', 4.6, 0.12, 0.12, 0, 3.32, w / 2 + 2.6, 0x00f0ff);
  for (const s of [-1, 1]) D.box('m', 0.25, 3.5, 0.25, s * 2.5, 1.75, w / 2 + 2.5, 0x14181d);
  glowSprite(g, 0, 3.0, w / 2 + 2.4, 5, 0x00f0ff, 0.5);

  // Cobertura: parapeito, AC, tanque, antena e heliponto
  D.box('d', w + 0.4, 1.0, 0.4, 0, H + 0.5, w / 2 + 0.0, 0x3c4148);
  D.box('d', w + 0.4, 1.0, 0.4, 0, H + 0.5, -w / 2, 0x3c4148);
  D.box('d', 0.4, 1.0, w, w / 2, H + 0.5, 0, 0x3c4148);
  D.box('d', 0.4, 1.0, w, -w / 2, H + 0.5, 0, 0x3c4148);
  for (let i = 0; i < 3; i++) D.box('m', 2.2, 1.3, 1.6, -w / 2 + 2.2 + i * 2.8, H + 0.65, -w / 2 + 2, 0x5a6068, 0, 0x7a8088);
  D.cyl('d', 1.2, 1.2, 2.2, 14, w / 2 - 2.6, H + 1.1, -w / 2 + 2.6, 0x4a4e52);
  D.cyl('m', 0.12, 0.2, 14, 6, w / 2 - 1.5, H + 7, w / 2 - 1.5, 0x2a2e34);
  const beacon = glowSprite(g, w / 2 - 1.5, H + 14.2, w / 2 - 1.5, 2.4, 0xff2020, 1.0);
  const ph = rng() * 6;
  animatedProps.push((t) => { beacon.material.opacity = Math.max(0, Math.sin(t * 2.4 + ph)) * 0.95 + 0.05; });
  D.flush(g);

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.2, w * 0.2, 0.12, 24), new THREE.MeshStandardMaterial({ map: helipadTexture(), roughness: 0.7 }));
  pad.position.set(-w * 0.12, H + 0.07, w * 0.14); pad.receiveShadow = true; g.add(pad);

  // Escada externa (face +z) até a cobertura
  const lad = makeLadder(H + 1.2);
  lad.position.set(w / 2 - 2.5, 0, w / 2 + 0.4);
  g.add(lad);

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);
  registerCollidable(body);
  // Parapeitos colidíveis (invisíveis): impedem queda acidental, permitem pular
  [[w, 1, 0.4, 0, -w / 2], [w, 1, 0.4, 0, w / 2], [0.4, 1, w, -w / 2, 0], [0.4, 1, w, w / 2, 0]].forEach(p => {
    const pr = proxyBox(p[3], H, p[4], p[0], p[1], p[2]); g.add(pr); registerCollidable(pr);
  });

  elevatedPlatforms.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - w / 2, maxZ: z + w / 2, y: groundY + H });
  addLadderPair(x + w / 2 - 2.5, z + w / 2 + 1.1, groundY, groundY + H, x + w / 2 - 2.5, z + w / 2 - 2.2, x + w / 2 - 2.5, z + w / 2 + 1.9);

  addLootChest(x + w * 0.22, z - w * 0.22, { y: groundY + H, rot: 0.6 });
  buildingSpots.push({ x, z, w: w + 4, d: w + 4 });
  return { x, z, w, H, groundY };
}

// Ponte aérea inclinada: plataformas segmentadas (sem "paredes invisíveis")
function buildSkybridge(x1, z1, y1, x2, z2, y2) {
  const start = new THREE.Vector3(x1, y1, z1);
  const end = new THREE.Vector3(x2, y2, z2);
  const dist = start.distanceTo(end);
  const mid = start.clone().add(end).multiplyScalar(0.5);

  const g = new THREE.Group();
  g.position.copy(mid);
  g.lookAt(end);
  const D = new Deco();

  const deck = tbox(3.2, 0.36, dist, MATS.frameMetal, 3);
  put(g, deck, 0, -0.18, 0);
  D.box('m', 0.3, 0.9, dist, 0, -0.8, 0, 0x1a1e24);
  for (const s of [-1, 1]) {
    D.box('m', 0.12, 0.12, dist, s * 1.52, 0.95, 0, 0x2a3038);
    D.box('lit', 0.08, 0.08, dist, s * 1.52, 0.02, 0, s > 0 ? 0x00f0ff : 0xff3cc8);
    for (let p = -dist / 2 + 1; p < dist / 2; p += 2.6) D.box('m', 0.1, 1.0, 0.1, s * 1.52, 0.45, p, 0x2a3038);
  }
  for (let p = -dist / 2 + 3; p < dist / 2 - 2; p += 6) {
    D.boxR('m', 0.14, 3.2, 0.14, -0.9, -1.6, p, 0, 0, 0.55);
    D.boxR('m', 0.14, 3.2, 0.14, 0.9, -1.6, p, 0, 0, -0.55);
  }
  D.flush(g);
  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);
  registerCollidable(deck);

  const segLen = 1.8;
  const nSeg = Math.max(1, Math.ceil(dist / segLen));
  for (let i = 0; i < nSeg; i++) {
    const t = (i + 0.5) / nSeg;
    const px = x1 + (x2 - x1) * t, pz = z1 + (z2 - z1) * t, py = y1 + (y2 - y1) * t;
    const hw = 1.7 + Math.min(0.9, Math.abs(x2 - x1 || 1) / dist * 0);
    elevatedPlatforms.push({ minX: px - hw, maxX: px + hw, minZ: pz - hw, maxZ: pz + hw, y: py });
  }
}

// =====================================================================
// 7. HANGAR INDUSTRIAL (porta aberta, contêineres, vigas, iluminação)
// =====================================================================
function buildIndustrialHangar(x, z, w = 24, d = 28, h = 9) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);
  const D = new Deco();
  const colliders = [];
  const wt = 0.6, doorW = 10, doorH = 7.2, bury = 1.2;

  const wall = (ww, hh, dd, px, py, pz, mat = MATS.corrugated) => {
    const m = tbox(ww, hh, dd, mat, 5, 5); put(g, m, px, py, pz); colliders.push(m); return m;
  };
  wall(w, h + bury, wt, 0, (h - bury) / 2, -d / 2);
  wall(wt, h + bury, d, -w / 2, (h - bury) / 2, 0);
  wall(wt, h + bury, d, w / 2, (h - bury) / 2, 0);
  const fw = (w - doorW) / 2;
  wall(fw, h + bury, wt, -(doorW / 2 + fw / 2), (h - bury) / 2, d / 2);
  wall(fw, h + bury, wt, (doorW / 2 + fw / 2), (h - bury) / 2, d / 2);
  wall(doorW, h - doorH, wt, 0, doorH + (h - doorH) / 2, d / 2);

  // Telhado em arco baixo
  const roofGeo = new THREE.CylinderGeometry(w / 2, w / 2, d, 24, 1, true, 0, Math.PI);
  roofGeo.rotateX(Math.PI / 2); roofGeo.rotateZ(Math.PI / 2); roofGeo.scale(1, 0.4, 1);
  const roof = new THREE.Mesh(roofGeo, MATS.corrugatedRoof);
  roof.position.y = h; roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 24, 0, Math.PI), MATS.corrugated);
    cap.scale.set(1, 0.4, 1); cap.position.set(0, h, s * (d / 2 - 0.05));
    if (s < 0) cap.rotation.y = Math.PI;
    cap.castShadow = true; g.add(cap);
  }

  // Estrutura interna: vigas, luminárias, canos
  const archH = w / 2 * 0.4;
  for (let zz = -d / 2 + 3; zz < d / 2; zz += 6) {
    D.box('m', w - 0.4, 0.35, 0.35, 0, h - 0.4, zz, 0x30363e);
    D.box('m', 0.4, h - 1, 0.4, -w / 2 + 0.5, (h - 1) / 2, zz, 0x2a3038);
    D.box('m', 0.4, h - 1, 0.4, w / 2 - 0.5, (h - 1) / 2, zz, 0x2a3038);
    D.box('m', 2.4, 0.15, 0.7, 0, h - 0.7, zz, 0x20242a);
    D.box('lit', 2.2, 0.06, 0.55, 0, h - 0.8, zz, 0xfff0d0);
  }
  D.cyl('m', 0.22, 0.22, d - 2, 8, w / 2 - 1.1, h - 1.3, 0, 0x6a3a22, Math.PI / 2, 0, 0);
  D.cyl('m', 0.16, 0.16, d - 2, 8, w / 2 - 1.1, h - 2.0, 0, 0x4a5a6a, Math.PI / 2, 0, 0);
  D.box('d', w - 1.2, 0.12, d - 1.2, 0, 0.06, 0, 0x4a4e52, 0, 0x5a5e62);
  for (let i = 0; i < 6; i++) D.box('d', 0.35, 0.02, d - 1.6, -w / 2 + 2 + i * 4, 0.14, 0, i % 2 ? 0xd8b000 : 0x222222);
  // Faixas de perigo nas colunas externas
  for (const sx of [-1, 1]) {
    D.box('d', 1.2, h, 0.3, sx * (doorW / 2 + 0.6), h / 2 - 0.5, d / 2 + 0.35, 0x1a1e24);
    for (let k = 0; k < 7; k++) D.box('d', 1.22, 0.45, 0.32, sx * (doorW / 2 + 0.6), 0.5 + k * 0.9, d / 2 + 0.36, k % 2 ? 0xe0b000 : 0x181818);
  }
  D.flush(g);

  // Contêineres coloridos e caixotes
  const cm = [MATS.containerRed, MATS.containerBlue, MATS.containerOrange, MATS.containerBlue];
  for (let i = 0; i < 4; i++) {
    const cx = (i % 2 === 0 ? -1 : 1) * (w * 0.28), cz = (i < 2 ? -1 : 1) * (d * 0.22);
    const c = tbox(4.2, 3.0, 9, cm[i], 4, 4);
    put(g, c, cx, 1.5, cz); colliders.push(c);
    if (i === 1) { const c2 = tbox(4.2, 3.0, 9, cm[2], 4, 4); put(g, c2, cx, 4.5, cz, 0.04); colliders.push(c2); }
  }

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);
  colliders.forEach(c => registerCollidable(c));

  addLootChest(x, z - d / 2 + 3, { y: groundY + 0.12, rot: 0 });
  buildingSpots.push({ x, z, w: w + 2, d: d + 2 });
}

// =====================================================================
// 8. CASAS / ABRIGOS ENTRÁVEIS (paredes ocas, porta, janelas, interior)
// =====================================================================
const HOUSE_STYLES = {
  plain:  { wall: () => MATS.plaster, roof: 'flat', trim: 0x4a4e52, lit: 0.3, neon: null },
  neon:   { wall: () => MATS.concreteDark, roof: 'flat', trim: 0x20242a, lit: 0.8, neon: 0x00f0ff, neon2: 0xff3cc8 },
  adobe:  { wall: () => MATS.sandstone, roof: 'flat', trim: 0x8a5a38, lit: 0.0, neon: null, adobe: true },
  cabin:  { wall: () => MATS.woodPlank, roof: 'gable', roofMat: () => MATS.snow, trim: 0x4a3420, lit: 0.6, neon: null, chimney: true },
  module: { wall: () => MATS.prefabWhite, roof: 'flat', trim: 0xe0701c, lit: 0.5, neon: null, stripe: 0xe0701c },
  hut:    { wall: () => MATS.woodTribal, roof: 'pyramid', roofMat: () => MATS.thatchRoof, trim: 0x4a321a, lit: 0.0, neon: null }
};

function addWindowGrid(D, rng, cx, cy, cz, ry, span, rows, cols, ww, wh, litChance, litCols, glassBack) {
  const cos = Math.cos(ry), sin = Math.sin(ry);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const off = (c - (cols - 1) / 2) * (span / cols);
      const px = cx + cos * off, pz = cz - sin * off, py = cy + r * (wh + 0.7);
      D.box('d', ww + 0.3, wh + 0.3, 0.14, px, py, pz, 0x2a2d30, ry);
      const lit = rng() < litChance;
      const fx = px + sin * 0.07, fz = pz + cos * 0.07;
      D.box(lit ? 'lit' : 'dark', ww, wh, 0.08, fx, py, fz, lit ? litCols[(rng() * litCols.length) | 0] : 0x10202c, ry);
      D.box('d', ww + 0.4, 0.08, 0.26, px + sin * 0.12, py - wh / 2 - 0.1, pz + cos * 0.12, 0x3a3d40, ry);
    }
  }
}

function buildHouse(x, z, o = {}) {
  const w = o.w || 12, d = o.d || 12, h = o.h || 6.5;
  const rot = o.rot || 0;
  const S = HOUSE_STYLES[o.style || 'plain'];
  const groundY = getTerrainHeight(x, z);
  const rng = mulberry32(hash2i(Math.round(x * 7), Math.round(z * 13)) * 4294967295 >>> 0);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);
  g.rotation.y = rot * Math.PI / 2;
  const D = new Deco();
  const colliders = [];
  const wt = 0.45, doorW = 2.7, doorH = 2.8, bury = 1.2;
  const wallMat = S.wall();

  const wall = (ww, hh, dd, px, py, pz) => {
    const m = tbox(ww, hh, dd, wallMat, 4, 4); put(g, m, px, py, pz); colliders.push(m); return m;
  };
  wall(w, h + bury, wt, 0, (h - bury) / 2, -d / 2 + wt / 2);
  wall(wt, h + bury, d, -w / 2 + wt / 2, (h - bury) / 2, 0);
  wall(wt, h + bury, d, w / 2 - wt / 2, (h - bury) / 2, 0);
  const fw = (w - doorW) / 2;
  wall(fw, h + bury, wt, -(doorW / 2 + fw / 2), (h - bury) / 2, d / 2 - wt / 2);
  wall(fw, h + bury, wt, (doorW / 2 + fw / 2), (h - bury) / 2, d / 2 - wt / 2);
  wall(doorW, h - doorH, wt, 0, doorH + (h - doorH) / 2, d / 2 - wt / 2);

  // Teto (laje)
  const ceil = tbox(w, 0.34, d, wallMat, 4, 4);
  put(g, ceil, 0, h + 0.17, 0); colliders.push(ceil);

  // Piso/fundação
  D.box('d', w + 0.5, 0.26, d + 0.5, 0, 0.0, 0, 0x4a4e52);
  D.box('d', w - 1.0, 0.04, d - 1.0, 0, 0.13, 0, 0x6a4c30, 0, 0x7a5a38);
  // Soleira / degrau na porta
  D.box('d', doorW + 0.8, 0.12, 1.1, 0, 0.06, d / 2 + 0.3, 0x5a5e62);

  // Janelas (paredes laterais, fundo e fachada)
  const litCols = S.neon ? [0xffc874, 0x4be8ff, 0xff4fc8] : [0xffc874, 0xffe0a0];
  const rows = h > 5 ? 2 : 1;
  const wy = h > 5 ? 1.7 : 1.5;
  addWindowGrid(D, rng, 0, wy, d / 2 + 0.01 - wt + wt, 0, 0, 0, 0, 0, 0, 0, litCols); // noop (mantém simetria)
  const frontOff = doorW / 2 + fw / 2;
  for (const s of [-1, 1]) addWindowGrid(D, rng, s * frontOff, wy, d / 2 + 0.01, 0, 0, rows, 1, Math.min(2.0, fw * 0.55), 1.3, S.lit, litCols);
  addWindowGrid(D, rng, 0, wy, -d / 2 - 0.01 + 0, Math.PI, w * 0.7, rows, 2, 1.7, 1.3, S.lit, litCols);
  addWindowGrid(D, rng, -w / 2 - 0.01, wy, 0, -Math.PI / 2, d * 0.7, rows, 2, 1.7, 1.3, S.lit, litCols);
  addWindowGrid(D, rng, w / 2 + 0.01, wy, 0, Math.PI / 2, d * 0.7, rows, 2, 1.7, 1.3, S.lit, litCols);

  // Porta entreaberta + batente
  D.box('d', 0.22, doorH + 0.1, 0.5, -doorW / 2 - 0.1, doorH / 2, d / 2 - wt / 2, S.trim);
  D.box('d', 0.22, doorH + 0.1, 0.5, doorW / 2 + 0.1, doorH / 2, d / 2 - wt / 2, S.trim);
  D.box('d', doorW + 0.5, 0.22, 0.5, 0, doorH + 0.1, d / 2 - wt / 2, S.trim);
  D.box('d', doorW * 0.46, doorH - 0.15, 0.08, -doorW / 2 + doorW * 0.18, doorH / 2, d / 2 + 0.7, 0x5a3c22, 1.1);

  // Interior
  const iy = 0.15;
  D.box('d', 1.8, 0.1, 1.0, -w * 0.18, iy + 0.85, -d * 0.2, 0x8a6a42, 0.2);
  for (const lx of [-0.8, 0.8]) for (const lz of [-0.4, 0.4]) D.box('d', 0.08, 0.85, 0.08, -w * 0.18 + lx * 0.95 * Math.cos(0.2), iy + 0.42, -d * 0.2 + lz, 0x5a4028, 0.2);
  D.box('d', 0.5, 0.5, 0.5, w * 0.28, iy + 0.25, -d * 0.3, 0x9a7444, 0.4);
  D.box('d', 0.5, 0.5, 0.5, w * 0.28 + 0.55, iy + 0.25, -d * 0.3 + 0.1, 0x8a6638, -0.2);
  D.box('d', 0.42, 0.42, 0.42, w * 0.28 + 0.2, iy + 0.71, -d * 0.3, 0x8a6638, 0.1);
  D.box('d', 0.5, 2.2, d * 0.5, -w / 2 + 0.7, iy + 1.1, 0, 0x4a3a2c);
  D.box('lit', 0.9, 0.05, 0.9, 0, h - 0.04, 0, 0xfff0d0);

  // Neon / acabamentos de estilo
  if (S.neon) {
    const nc = S.neon, nc2 = S.neon2 || S.neon;
    D.box('lit', w + 0.1, 0.12, 0.12, 0, h + 0.5, d / 2 + 0.06, nc);
    D.box('lit', 0.12, 0.12, d + 0.1, -w / 2 - 0.06, h + 0.5, 0, nc2);
    D.box('lit', 0.12, 0.12, d + 0.1, w / 2 + 0.06, h + 0.5, 0, nc2);
    D.box('m', 3.4, 0.9, 0.2, 0, doorH + 0.9, d / 2 + 0.2, 0x14181d);
    D.box('lit', 3.0, 0.5, 0.1, 0, doorH + 0.9, d / 2 + 0.32, rng() < 0.5 ? nc : nc2);
    glowSprite(g, 0, doorH + 0.9, d / 2 + 0.8, 4.5, nc, 0.55);
    glowSprite(g, 0, h * 0.5, d / 2 + 1.2, 6, nc, 0.12);
  }
  if (S.stripe) { for (const s of [-1, 1]) D.box('d', w + 0.04, 0.5, 0.06, 0, 1.3, s * (d / 2 + 0.02), S.stripe); }
  if (S.adobe) {
    for (let i = 0; i < 6; i++) D.cyl('d', 0.14, 0.14, 1.0, 6, -w / 2 + 1 + i * (w - 2) / 5, h - 0.5, d / 2 + 0.3, 0x5a3a22, Math.PI / 2, 0, 0);
    D.box('d', doorW + 2.4, 0.1, 1.8, 0, doorH + 0.5, d / 2 + 0.95, 0xc8b078);
  }

  // Telhado
  let roofAccessible = false;
  if (S.roof === 'flat') {
    const px = (a, b, c, e, f, gg) => D.box('d', a, b, c, e, f, gg, S.trim === 0x4a4e52 ? 0x50555a : 0x30343a);
    px(w + 0.3, 0.9, 0.4, 0, h + 0.8, d / 2 - 0.1); px(w + 0.3, 0.9, 0.4, 0, h + 0.8, -d / 2 + 0.1);
    px(0.4, 0.9, d, w / 2 - 0.1, h + 0.8, 0); px(0.4, 0.9, d, -w / 2 + 0.1, h + 0.8, 0);
    for (let i = 0; i < 2; i++) D.box('m', 1.6, 1.0, 1.2, -w * 0.2 + i * 2.2, h + 0.84, -d * 0.2, 0x5a6068, 0, 0x7a8088);
    D.cyl('m', 0.06, 0.1, 5, 6, w * 0.3, h + 3, -d * 0.3, 0x2a2e34);
    if (S.neon) D.box('lit', 0.1, 0.1, 0.1, w * 0.3, h + 5.4, -d * 0.3, 0xff2020);
    [[w, 1, 0.4, 0, d / 2 - 0.1], [w, 1, 0.4, 0, -d / 2 + 0.1], [0.4, 1, d, -w / 2 + 0.1, 0], [0.4, 1, d, w / 2 - 0.1, 0]].forEach(p => {
      const pr = proxyBox(p[3], h + 0.34, p[4], p[0], p[1], p[2]); g.add(pr); colliders.push(pr);
    });
    roofAccessible = true;
  } else if (S.roof === 'gable') {
    const rise = w * 0.3;
    const ang = Math.atan2(rise, w / 2);
    const L = (w / 2) / Math.cos(ang) + 0.55;
    const slabMat = S.roofMat ? S.roofMat() : MATS.roofTile;
    for (const s of [-1, 1]) {
      const slab = tbox(L, 0.28, d + 1.0, MATS.woodDark, 3); slab.rotation.z = -s * ang;
      put(g, slab, s * (w / 4 + 0.1), h + 0.34 + rise / 2, 0);
      const top = tbox(L + 0.05, 0.22, d + 1.05, slabMat, 3); top.rotation.z = -s * ang;
      put(g, top, s * (w / 4 + 0.1) - s * Math.sin(ang) * 0.0, h + 0.34 + rise / 2 + 0.2 * Math.cos(ang), 0);
    }
    const tri = new THREE.Shape(); tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rise); tri.closePath();
    for (const s of [-1, 1]) {
      const gm = new THREE.Mesh(new THREE.ShapeGeometry(tri), MATS.woodDark);
      gm.position.set(0, h + 0.34, s * (d / 2 - 0.1)); if (s < 0) gm.rotation.y = Math.PI; gm.castShadow = true; g.add(gm);
    }
    D.box('d', 0.35, 0.35, d + 1.1, 0, h + 0.34 + rise + 0.2, 0, 0x3a2a1a);
    if (S.chimney) {
      D.box('d', 1.0, rise + 2.6, 1.0, w * 0.28, h + (rise + 2.6) / 2, -d * 0.2, 0x6a625a);
      D.box('d', 1.2, 0.2, 1.2, w * 0.28, h + rise + 2.7, -d * 0.2, 0x4a443e);
    }
    // Lenha e degrau
    for (let i = 0; i < 6; i++) D.cyl('d', 0.14, 0.14, 1.4, 7, -w / 2 - 0.3, 0.2 + (i % 3) * 0.28, -d * 0.1 + Math.floor(i / 3) * 0.3 + (i % 3) * 0.1 - 0.5, 0x6a4a2c, 0, 0, Math.PI / 2);
  } else if (S.roof === 'pyramid') {
    const rr = (w / 2) * 1.5;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rr, h * 0.75, 4, 1), S.roofMat());
    cone.rotation.y = Math.PI / 4; cone.position.y = h + 0.34 + h * 0.375; cone.castShadow = true; cone.receiveShadow = true; g.add(cone);
    D.cyl('d', 0.1, 0.1, 1.4, 6, 0, h + 0.34 + h * 0.75 + 0.5, 0, 0x3a2a1a);
    for (let i = 0; i < 4; i++) D.cyl('d', 0.12, 0.12, 2.4, 6, (i < 2 ? -1 : 1) * (w / 2 - 0.1), 1.3, (i % 2 ? -1 : 1) * (d / 2 + 0.2), 0x5a4028);
    D.box('d', doorW + 1.6, 0.14, 1.5, 0, doorH + 0.4, d / 2 + 0.8, 0x8a7a42);
  }
  D.flush(g);

  // Escada de acesso ao teto (somente tetos planos)
  if (roofAccessible) {
    const lad = makeLadder(h + 0.5);
    lad.position.set(w / 2 + 0.12, 0, -d * 0.2); lad.rotation.y = Math.PI / 2; g.add(lad);
  }

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);
  colliders.forEach(c => registerCollidable(c));

  const wp = (lx, lz) => g.localToWorld(new THREE.Vector3(lx, 0, lz));
  if (roofAccessible) {
    const up = wp(w / 2 + 0.8, -d * 0.2), land = wp(w / 2 - 1.3, -d * 0.2);
    addLadderPair(up.x, up.z, groundY, groundY + h + 0.34, land.x, land.z, up.x, up.z);
    const odd = rot % 2 === 1;
    const hw = (odd ? d : w) / 2 - 0.3, hd = (odd ? w : d) / 2 - 0.3;
    elevatedPlatforms.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd, y: groundY + h + 0.34 });
  }
  const ci = wp(0, -d * 0.28);
  addLootChest(ci.x, ci.z, { y: groundY + 0.15, rot: rot * Math.PI / 2 });
  const odd = rot % 2 === 1;
  buildingSpots.push({ x, z, w: (odd ? d : w) + 2, d: (odd ? w : d) + 2, house: true });
}

function buildResidentialHouse(x, z, w = 12, d = 12, h = 6.5, style = 'plain', rot = 0) {
  buildHouse(x, z, { w, d, h, style, rot });
}

// Rotação (em quartos de volta) para a fachada olhar o centro do mapa
function rotToCenter(x, z) {
  const th = Math.atan2(-x, -z);
  return ((Math.round(th / (Math.PI / 2)) % 4) + 4) % 4;
}

// =====================================================================
// 9. ROCHAS DE FORMAÇÃO (compat) — implementado em nature.js
// =====================================================================

// =====================================================================
// 10. ESTRUTURAS ESPECIAIS (torre de água, tanques, radar, rádio, poço...)
// =====================================================================
function buildWaterTower(x, z) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, groundY, z);
  const D = new Deco(); const H = 11;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    D.box('m', 0.3, H, 0.3, sx * 2, H / 2, sz * 2, 0x4a3a2a);
    const pr = proxyBox(sx * 2, 0, sz * 2, 0.45, H, 0.45); g.add(pr);
    D.boxR('m', 0.14, H * 0.55, 0.14, sx * 2, H * 0.3, 0, sz * 0.0, 0, 0);
  }
  for (const y of [3.5, 7]) for (const s of [-1, 1]) { D.box('m', 4.2, 0.16, 0.16, 0, y, s * 2, 0x3a2e22); D.box('m', 0.16, 0.16, 4.2, s * 2, y, 0, 0x3a2e22); }
  D.cyl('m', 2.4, 2.4, 3.6, 16, 0, H + 1.8, 0, 0x6a5a48, 0, 0, 0, 0x7a6a56);
  D.cyl('m', 0.1, 2.5, 1.4, 16, 0, H + 4.3, 0, 0x5a4a38);
  D.cyl('m', 2.46, 2.46, 0.15, 16, 0, H + 0.9, 0, 0x2a2018); D.cyl('m', 2.46, 2.46, 0.15, 16, 0, H + 2.7, 0, 0x2a2018);
  D.flush(g);
  const lad = makeLadder(H + 0.5); lad.position.set(2.2, 0, 0); lad.rotation.y = Math.PI / 2; g.add(lad);
  mapStructuresGroup.add(g); mapStructuresGroup.updateMatrixWorld(true);
  g.children.forEach(c => { if (c.material === PROXY_MAT) registerCollidable(c); });
  buildingSpots.push({ x, z, w: 6, d: 6 });
}

function buildFuelTanks(x, z, rot = 0) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, groundY, z); g.rotation.y = rot * Math.PI / 2;
  const D = new Deco();
  for (let i = 0; i < 3; i++) {
    const zz = (i - 1) * 3.6;
    D.cyl('m', 1.25, 1.25, 7, 16, 0, 1.75, zz, i === 1 ? 0xb8b8b0 : 0xc8c0b0, 0, 0, Math.PI / 2, 0xe0dcd0);
    D.box('m', 0.4, 0.5, 2.4, -2.0, 0.25, zz, 0x2a2e34); D.box('m', 0.4, 0.5, 2.4, 2.0, 0.25, zz, 0x2a2e34);
    D.cyl('m', 0.4, 0.4, 0.3, 10, 0, 3.15, zz, 0x30343a);
    D.box('d', 7.2, 0.5, 0.1, 0, 1.75, zz + 1.26, 0xc03020);
  }
  D.cyl('m', 0.08, 0.08, 9, 6, 3.9, 1.3, 0, 0x50565e, Math.PI / 2, 0, 0, 0x50565e);
  D.flush(g);
  const pr = proxyBox(0, 0, 0, 8, 3.4, 12); g.add(pr);
  mapStructuresGroup.add(g); mapStructuresGroup.updateMatrixWorld(true);
  registerCollidable(pr);
  const odd = rot % 2 === 1;
  buildingSpots.push({ x, z, w: odd ? 14 : 10, d: odd ? 10 : 14 });
}

function buildRadioMast(x, z, H = 26) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, groundY, z);
  const D = new Deco();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) D.box('m', 0.16, H, 0.16, sx * 0.9, H / 2, sz * 0.9, 0xb8bcc2);
  for (let y = 1.5; y < H; y += 2.4) {
    D.box('m', 1.9, 0.08, 0.08, 0, y, 0.9, 0xb8bcc2); D.box('m', 1.9, 0.08, 0.08, 0, y, -0.9, 0xb8bcc2);
    D.box('m', 0.08, 0.08, 1.9, 0.9, y, 0, 0xb8bcc2); D.box('m', 0.08, 0.08, 1.9, -0.9, y, 0, 0xb8bcc2);
  }
  D.cyl('m', 0.08, 0.08, 5, 5, 0, H + 2.5, 0, 0xd0d0d0);
  D.box('m', 2.2, 1.6, 2.2, 3.2, 0.8, 0, 0x4a5058); D.box('m', 0.4, 0.4, 0.4, 3.2, 1.8, 0, 0x2a2e34);
  D.flush(g);
  const b = glowSprite(g, 0, H + 5, 0, 2.6, 0xff2020, 1);
  const ph = Math.random() * 6; animatedProps.push((t) => { b.material.opacity = Math.max(0, Math.sin(t * 2.0 + ph)) * 0.95 + 0.05; });
  const pr = proxyBox(0, 0, 0, 2, 7, 2); g.add(pr);
  const pr2 = proxyBox(3.2, 0, 0, 2.3, 1.7, 2.3); g.add(pr2);
  mapStructuresGroup.add(g); mapStructuresGroup.updateMatrixWorld(true);
  registerCollidable(pr); registerCollidable(pr2);
  buildingSpots.push({ x, z, w: 9, d: 5 });
}

function buildRadarDome(x, z) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, groundY, z);
  const base = tbox(6, 3, 6, MATS.prefabWhite, 3); put(g, base, 0, 1.5, 0);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3.6, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), pbr(0xf0f4f8, { roughness: 0.35, metalness: 0.1 }));
  dome.position.y = 3; dome.castShadow = true; g.add(dome);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.1, 8, 28), MATS.ironDark); ring.rotation.x = Math.PI / 2; ring.position.y = 3.05; g.add(ring);
  const rot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 3.0), MATS.neonCyan); rot.position.y = 5.2; g.add(rot);
  animatedProps.push((t) => { dome.rotation.y = t * 0.2; });
  mapStructuresGroup.add(g); mapStructuresGroup.updateMatrixWorld(true);
  registerCollidable(base);
  const pr = proxyBox(0, 3, 0, 5.6, 2.8, 5.6); g.add(pr); registerCollidable(pr);
  buildingSpots.push({ x, z, w: 9, d: 9 });
}

function buildWell(x, z) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, groundY, z);
  const D = new Deco();
  D.cyl('d', 1.3, 1.45, 1.1, 14, 0, 0.55, 0, 0x8a7a62, 0, 0, 0, 0x9a8a72);
  D.cyl('dark', 1.05, 1.05, 0.05, 14, 0, 1.05, 0, 0x0a141a);
  for (const s of [-1, 1]) D.box('d', 0.18, 2.6, 0.18, s * 1.3, 1.8, 0, 0x5a3c22);
  D.box('d', 0.2, 0.2, 3.0, 0, 3.0, 0, 0x5a3c22, Math.PI / 2);
  D.box('d', 3.2, 0.16, 1.6, 0, 3.2, 0, 0x7a5a3a, 0.0);
  D.flush(g);
  const pr = proxyCyl(0, 0, 0, 1.4, 1.1); g.add(pr);
  mapStructuresGroup.add(g); mapStructuresGroup.updateMatrixWorld(true); registerCollidable(pr);
  buildingSpots.push({ x, z, w: 4, d: 4 });
}

function buildMarketStall(x, z, rot = 0) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, groundY, z); g.rotation.y = rot * Math.PI / 2;
  const D = new Deco();
  const cols = [0xb8452a, 0x2a6a8a, 0xc89a2a];
  const col = cols[Math.floor(Math.abs(hash2i(Math.round(x), Math.round(z))) * 3)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) D.box('d', 0.14, sz < 0 ? 2.8 : 2.2, 0.14, sx * 1.6, sz < 0 ? 1.4 : 1.1, sz * 1.1, 0x5a3c22);
  D.box('d', 3.4, 0.9, 0.9, 0, 0.45, 0.6, 0x8a6a42);
  D.box('d', 3.4, 0.08, 1.1, 0, 0.92, 0.6, 0x9a7a52);
  for (let i = 0; i < 6; i++) D.cyl('d', 0.16, 0.16, 0.18, 8, -1.2 + i * 0.48, 1.05, 0.6, i % 2 ? 0xc8402a : 0xe8a020);
  D.flush(g);
  const awn = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }));
  awn.material.color.setHex(col).convertSRGBToLinear();
  awn.rotation.x = -Math.PI / 2 + 0.28; awn.position.set(0, 2.6, 0); awn.castShadow = true; g.add(awn);
  const pr = proxyBox(0, 0, 0.6, 3.4, 1.0, 0.9); g.add(pr);
  mapStructuresGroup.add(g); mapStructuresGroup.updateMatrixWorld(true); registerCollidable(pr);
  const odd = rot % 2 === 1; buildingSpots.push({ x, z, w: odd ? 4 : 5, d: odd ? 5 : 4 });
}

function buildBrazier(parent, x, y, z, flameScale = 1) {
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.5, 10), MATS.stoneRuins);
  bowl.position.set(x, y + 1.0, z); bowl.castShadow = true; parent.add(bowl);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.0, 8), MATS.stoneRuins);
  stand.position.set(x, y + 0.5, z); parent.add(stand);
  const fl = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Sprite(MATS.flameMat.clone());
    s.position.set(x, y + 1.5, z); s.scale.set(1.2 * flameScale, 1.8 * flameScale, 1);
    parent.add(s); fl.push(s);
  }
  const glow = glowSprite(parent, x, y + 1.6, z, 7 * flameScale, 0xff7a20, 0.28);
  const ph = Math.random() * 10;
  animatedProps.push((t) => {
    fl.forEach((s, i) => {
      const f = 0.75 + 0.25 * Math.sin(t * (9 + i * 3) + ph + i * 2);
      s.scale.set((0.9 + 0.35 * f) * flameScale, (1.4 + 0.7 * f) * flameScale, 1);
      s.position.y = y + 1.5 + 0.15 * f * flameScale;
      s.material.opacity = 0.65 + 0.3 * f;
    });
    glow.material.opacity = 0.22 + 0.1 * Math.sin(t * 11 + ph);
  });
}

// =====================================================================
// 11. TEMPLO DA SELVA (plataformas escalonadas, santuário, colunas, braseiros)
// =====================================================================
function buildJungleTempleComplex(x, z) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, groundY, z);
  const D = new Deco();
  const colliders = [];
  const sizes = [42, 34, 26, 19];
  const step = 0.68;

  sizes.forEach((sz, i) => {
    const top = (i + 1) * step;
    const m = tbox(sz, top + 1.5, sz, i % 2 === 0 ? MATS.stoneRuins : MATS.stoneMoss, 4, 4);
    put(g, m, 0, (top - 1.5) / 2, 0);
    elevatedPlatforms.push({ minX: x - sz / 2, maxX: x + sz / 2, minZ: z - sz / 2, maxZ: z + sz / 2, y: groundY + top });
    // Friso decorativo nas bordas
    D.box('d', sz + 0.3, 0.18, sz + 0.3, 0, top - 0.09, 0, 0x6a7060);
  });
  const topY = sizes.length * step;

  // Santuário (paredes ocas, entrada +z)
  const sw = 13, sd = 11, sh = 6.5, st = 0.9, door = 3.6;
  const sMat = MATS.stoneRuins;
  const sWall = (ww, hh, dd, px, py, pz, mat = sMat) => { const m = tbox(ww, hh, dd, mat, 3, 3); put(g, m, px, py, pz); colliders.push(m); };
  sWall(sw, sh, st, 0, topY + sh / 2, -sd / 2 + st / 2);
  sWall(st, sh, sd, -sw / 2 + st / 2, topY + sh / 2, 0);
  sWall(st, sh, sd, sw / 2 - st / 2, topY + sh / 2, 0);
  const sfw = (sw - door) / 2;
  sWall(sfw, sh, st, -(door / 2 + sfw / 2), topY + sh / 2, sd / 2 - st / 2);
  sWall(sfw, sh, st, (door / 2 + sfw / 2), topY + sh / 2, sd / 2 - st / 2);
  sWall(door, sh - 3.4, st, 0, topY + 3.4 + (sh - 3.4) / 2, sd / 2 - st / 2, MATS.stoneMoss);
  // Telhado em degraus
  [[sw + 1.6, 0.9], [sw - 1.2, 0.9], [sw - 4, 0.9], [sw - 7, 0.9]].forEach((r, i) => {
    const m = tbox(r[0], r[1], sd + 1.6 - i * 2.2, i % 2 ? MATS.stoneMoss : MATS.stoneRuins, 3, 3);
    put(g, m, 0, topY + sh + 0.45 + i * 0.9, 0); if (i === 0) colliders.push(m);
  });
  // Altar e gema
  D.box('d', 2.2, 1.0, 1.4, 0, topY + 0.5, -sd / 2 + 2.2, 0x6a7060);
  D.box('d', 2.6, 0.2, 1.8, 0, topY + 1.1, -sd / 2 + 2.2, 0x7a8070);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: 0x103018, emissive: 0x30ff80, emissiveIntensity: 1.4, roughness: 0.1, metalness: 0.3 }));
  gem.position.set(0, topY + 2.2, -sd / 2 + 2.2); g.add(gem);
  const gemGlow = glowSprite(g, 0, topY + 2.2, -sd / 2 + 2.2, 4.5, 0x30ff80, 0.5);
  animatedProps.push((t) => { gem.rotation.y = t * 0.9; gem.position.y = topY + 2.2 + Math.sin(t * 1.6) * 0.12; gemGlow.material.opacity = 0.4 + Math.sin(t * 2) * 0.12; });

  // Colunatas
  const colPos = [];
  for (let i = -2; i <= 2; i++) { colPos.push([i * 6, 14]); colPos.push([i * 6, -14]); }
  for (let i = -1; i <= 1; i++) { colPos.push([14, i * 6]); colPos.push([-14, i * 6]); }
  colPos.forEach(([cx, cz]) => {
    D.cyl('d', 0.62, 0.72, 5.4, 10, cx, topY + 2.7, cz, 0x7a8070, 0, 0, 0, 0x8a9080);
    D.box('d', 1.7, 0.4, 1.7, cx, topY + 5.6, cz, 0x8a9080);
    D.box('d', 1.5, 0.35, 1.5, cx, topY + 0.18, cz, 0x6a7060);
    const pr = proxyBox(cx, topY, cz, 1.3, 5.8, 1.3); g.add(pr); colliders.push(pr);
  });
  D.flush(g);

  [[17, 17], [-17, 17], [17, -17], [-17, -17]].forEach(([bx, bz]) => buildBrazier(g, bx, topY, bz, 1.1));
  buildBrazier(g, 3.5, topY, sd / 2 + 1.4, 0.9); buildBrazier(g, -3.5, topY, sd / 2 + 1.4, 0.9);

  // Vegetação invadindo o templo
  const FB = new GeoBatch(), r = mulberry32(777);
  for (let i = 0; i < 26; i++) {
    const a = r() * 6.28, rr = 21 + r() * 5;
    const bx = Math.cos(a) * rr, bz = Math.sin(a) * rr;
    addBush(FB, x + bx, getTerrainHeight(x + bx, z + bz) - 0.2, z + bz, 1.1 + r() * 1.2, r, 0x153a14, 0x3c7a24);
  }
  const fm = FB.flush(NAT_FOLIAGE);

  mapStructuresGroup.add(g);
  if (fm) mapStructuresGroup.add(fm);
  mapStructuresGroup.updateMatrixWorld(true);
  colliders.forEach(c => registerCollidable(c));

  addLootChest(x, z - sd / 2 + 2.4 + 0.2, { y: groundY + topY + 1.3 + 0.0, rot: 0, parent: mapStructuresGroup });
  addLootChest(x + 6, z + 8, { y: groundY + topY, rot: 0.8 });
  buildingSpots.push({ x, z, w: 46, d: 46 });
}

function buildJungleTribalHut(x, z, w, h) {
  buildHouse(x, z, { w: Math.min(w, 8.5), d: Math.min(w, 8.5), h: Math.min(h, 3.8), style: 'hut', rot: rotToCenter(x, z) });
}

// =====================================================================
// 12. MONÓLITOS DO ABISMO (plintos escalonados + obelisco flutuante)
// =====================================================================
function buildVoidMonolithComplex(x, z, w, d, h) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, groundY, z);
  const D = new Deco();
  const tiers = [[w, 0.45], [w * 0.78, 0.9], [w * 0.56, 1.35]];
  tiers.forEach(([tw, th]) => {
    const m = tbox(tw, th + 1.4, tw, MATS.obsidianVoid, 4);
    put(g, m, 0, (th - 1.4) / 2, 0);
    D.box('lit', tw + 0.1, 0.1, tw + 0.1, 0, th - 0.05, 0, 0x7a20ff);
    elevatedPlatforms.push({ minX: x - tw / 2, maxX: x + tw / 2, minZ: z - tw / 2, maxZ: z + tw / 2, y: groundY + th });
  });
  // Runas luminosas
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, rr = w * 0.5 - 0.1;
    D.box('lit', 0.14, 0.05, 1.4, Math.cos(a) * (w * 0.4), 0.46, Math.sin(a) * (w * 0.4), i % 2 ? 0x00f0ff : 0xb040ff, -a + Math.PI / 2);
  }
  D.flush(g);

  const topY = tiers[2][1];
  const obel = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.03, w * 0.15, h, 4, 1), MATS.crystalVoid);
  obel.rotation.y = Math.PI / 4;
  obel.position.set(0, topY + 1.6 + h / 2, 0); obel.castShadow = true; g.add(obel);
  const oGlow = glowSprite(g, 0, topY + 1.6 + h * 0.55, 0, h * 0.9, 0x9d00ff, 0.35);
  const shards = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.35 + (i % 3) * 0.12, 0), MATS.crystalVoid);
    g.add(s); shards.push({ mesh: s, a: i * 1.26, rad: w * 0.28 + (i % 2) * 1.4, hh: topY + 2.4 + i * 0.7, sp: 0.5 + i * 0.12 });
  }
  const ph = Math.random() * 6;
  animatedProps.push((t) => {
    obel.position.y = topY + 1.6 + h / 2 + Math.sin(t * 0.9 + ph) * 0.35;
    obel.rotation.y = Math.PI / 4 + t * 0.25;
    oGlow.material.opacity = 0.3 + 0.12 * Math.sin(t * 1.7 + ph);
    shards.forEach(s => {
      const a = s.a + t * s.sp;
      s.mesh.position.set(Math.cos(a) * s.rad, s.hh + Math.sin(t * 1.3 + s.a) * 0.3, Math.sin(a) * s.rad);
      s.mesh.rotation.set(t * 0.8 + s.a, t * 0.6, 0);
    });
  });

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);
  const pr = proxyBox(0, topY, 0, w * 0.2, h + 2, w * 0.2); g.add(pr); registerCollidable(pr);
  addLootChest(x + w * 0.2, z + w * 0.2, { y: groundY + topY, rot: 0.8 });
  buildingSpots.push({ x, z, w: w + 2, d: w + 2 });
}

// Portal quântico com vórtice animado
let _portalTex = null;
function portalTexture() {
  if (_portalTex) return _portalTex;
  _portalTex = makeCanvasTexture(256, (ctx, w, h) => {
    ctx.translate(128, 128);
    for (let a = 0; a < 5; a++) {
      ctx.save(); ctx.rotate(a * 1.256);
      const g = ctx.createLinearGradient(0, 0, 124, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let r = 0; r < 124; r += 4) ctx.lineTo(Math.cos(r * 0.04) * r, Math.sin(r * 0.04) * r);
      ctx.stroke(); ctx.restore();
    }
    const c = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
    c.addColorStop(0, 'rgba(255,255,255,1)'); c.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 60, 0, 6.3); ctx.fill();
  }, { clamp: true });
  return _portalTex;
}

function makePortal(px, py, pz, colorHex, target) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.22, 12, 36), new THREE.MeshBasicMaterial({ color: colorHex }));
  ring.position.set(px, py, pz);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.95, 32), new THREE.MeshBasicMaterial({
    map: portalTexture(), color: colorHex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  ring.add(disc);
  const halo = glowSprite(ring, 0, 0, 0, 9, colorHex, 0.4);
  mapStructuresGroup.add(ring);
  const portal = { mesh: ring, targetPos: target, cooldown: 0 };
  activePortals.push(portal);
  return portal;
}

// =====================================================================
// 13. LAYOUTS DE MAPA
// =====================================================================
function scatterProps(count, range, fn) {
  let placed = 0, tries = 0;
  while (placed < count && tries < count * 8) {
    tries++;
    const rx = (Math.random() * 2 - 1) * range, rz = (Math.random() * 2 - 1) * range;
    if (Math.hypot(rx, rz) < 18 || isNearStructure(rx, rz, 3)) continue;
    fn(rx, rz); placed++;
  }
}

function buildNeonRustLayout() {
  const t0 = buildCyberSkyscraper(0, 0, 5, 10);
  const t1 = buildCyberSkyscraper(-35, -35, 4, 9);
  const t2 = buildCyberSkyscraper(35, 35, 4, 9);

  // Pontes aéreas ligando cantos das coberturas
  buildSkybridge(-t0.w / 2 + 0.2, -t0.w / 2 + 0.2, t0.groundY + t0.H, -35 + t1.w / 2 - 0.2, -35 + t1.w / 2 - 0.2, t1.groundY + t1.H);
  buildSkybridge(t0.w / 2 - 0.2, t0.w / 2 - 0.2, t0.groundY + t0.H, 35 - t2.w / 2 + 0.2, 35 - t2.w / 2 + 0.2, t2.groundY + t2.H);

  buildIndustrialHangar(-55, 40, 22, 28, 9);
  buildIndustrialHangar(55, -40, 22, 28, 9);

  [[-72, -72], [72, 72], [-82, 70], [82, -70], [-28, 62], [28, -62], [78, -6], [-78, -6]].forEach(([hx, hz]) => {
    buildHouse(hx, hz, { w: 14, d: 14, h: 7, style: 'neon', rot: rotToCenter(hx, hz) });
  });

  [[-110, -110], [110, 110], [-110, 110], [110, -110]].forEach(([wx, wz]) => buildWatchtower(wx, wz, 14, { metal: true }));

  buildFuelTanks(22, -22, 0);
  buildRadioMast(-20, 22, 24);

  scatterProps(14, 125, (rx, rz) => buildStreetLamp(rx, rz, Math.random() < 0.5 ? 0x00f0ff : 0xff3cc8));
  scatterProps(10, 125, (rx, rz) => buildIndustrialDebris(rx, rz));
}

function buildVoidCoreLayout() {
  buildVoidMonolithComplex(0, 0, 26, 26, 14);

  const gy = (px) => getTerrainHeight(px, 0) + 2;
  makePortal(-45, gy(-45), 0, 0x00f0ff, new THREE.Vector3(42, gy(45), 0));
  makePortal(45, gy(45), 0, 0xb040ff, new THREE.Vector3(-42, gy(-45), 0));
  mapStructuresGroup.children.forEach(c => { if (c.geometry && c.geometry.type === 'TorusGeometry') c.rotation.y = Math.PI / 2; });

  const grid = [-85, -45, 45, 85];
  grid.forEach(gx => grid.forEach(gz => {
    if (Math.abs(gx) !== Math.abs(gz)) buildVoidMonolithComplex(gx, gz, 16, 16, 9);
  }));
}

function buildJungleTempleLayout() {
  buildJungleTempleComplex(0, 0);
  [
    [-50, -50], [-65, -35], [-35, -65],
    [50, 50], [65, 35], [35, 65],
    [-50, 50], [-65, 35], [-35, 65],
    [50, -50], [65, -35], [35, -65]
  ].forEach(([hx, hz]) => buildJungleTribalHut(hx, hz, 8, 3.6));
  buildWaterTower(75, 0);
}

function buildDesertLayout() {
  // Povoado de adobe com praça central
  buildWell(0, 0);
  [[-24, -8, 0], [24, 8, 2], [-8, 26, 1], [8, -26, 3]].forEach(([sx, sz, r]) => buildMarketStall(sx, sz, r));
  const houses = [[-45, -40], [45, 40], [-45, 45], [45, -45], [0, -60], [0, 62], [-75, 0], [75, 5], [-80, -75], [82, 78]];
  houses.forEach(([hx, hz], i) => buildHouse(hx, hz, { w: 11 + (i % 3) * 2, d: 11 + ((i + 1) % 3) * 2, h: 5 + (i % 2), style: 'adobe', rot: rotToCenter(hx, hz) }));
  buildWaterTower(-100, -20);
  buildRadioMast(100, -30, 20);
  buildFuelTanks(30, -75, 1);
  [[-115, -110], [115, 110]].forEach(([wx, wz]) => buildWatchtower(wx, wz, 12));
}

function buildArcticLayout() {
  buildRadarDome(0, 0);
  const modules = [[-22, -6, 1], [22, 6, 3], [-8, 24, 2], [10, -26, 0], [-48, -40, 1], [48, 44, 3], [-52, 46, 0], [52, -42, 2]];
  modules.forEach(([mx, mz, r], i) => buildHouse(mx, mz, { w: 12, d: 9, h: 3.8, style: 'module', rot: r }));
  [[-80, 10], [80, -10], [0, 75], [0, -78]].forEach(([cx, cz]) => buildHouse(cx, cz, { w: 9, d: 8, h: 3.6, style: 'cabin', rot: rotToCenter(cx, cz) }));
  buildFuelTanks(35, -40, 0);
  buildRadioMast(-30, 40, 28);
  [[-110, -105], [112, 108]].forEach(([wx, wz]) => buildWatchtower(wx, wz, 12, { metal: true }));
}

function generateMapStructures(mapKey) {
  clearMapStructures();

  if (mapKey === 'neon_rust') buildNeonRustLayout();
  else if (mapKey === 'void_core') buildVoidCoreLayout();
  else if (mapKey === 'jungle_temple') buildJungleTempleLayout();
  else if (mapKey === 'desert') buildDesertLayout();
  else if (mapKey === 'arctic') buildArcticLayout();
  else {
    for (let ix = -2; ix <= 2; ix++) for (let iz = -2; iz <= 2; iz++) buildHouse(ix * 35, iz * 35, { style: 'plain', rot: rotToCenter(ix, iz) });
  }

  createTacticalSites();
  syncAllCollidableBoxes();
}

function createTacticalSites() {
  [[-85, -75], [85, -60], [-100, 85], [95, 105]].forEach(([x, z]) => { if (!isNearStructure(x, z, 2)) addHideout(x, z); });
  [[-60, 75], [80, 55], [-115, -25], [30, -110]].forEach(([x, z]) => { if (!isNearStructure(x, z, 2)) addSniperNest(x, z); });
  [[-25, 55], [45, -80], [-125, 25], [120, -90], [105, 12]].forEach(([x, z]) => { if (!isNearStructure(x, z, 2)) addLootChest(x, z); });
}

// Abrigo de concreto semienterrado com cobertura gramada
function addHideout(x, z) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, groundY, z); g.rotation.y = rotToCenter(x, z) * Math.PI / 2;
  const colliders = [];
  const wall = (ww, hh, dd, px, py, pz) => { const m = tbox(ww, hh, dd, MATS.concreteDark, 3); put(g, m, px, py, pz); colliders.push(m); };
  wall(6.4, 3.2, 0.5, 0, 1.0, -3); wall(0.5, 3.2, 6, -3.1, 1.0, 0); wall(0.5, 3.2, 6, 3.1, 1.0, 0);
  wall(2.0, 3.2, 0.5, -2.2, 1.0, 3); wall(2.0, 3.2, 0.5, 2.2, 1.0, 3);
  const roof = tbox(7.2, 0.5, 6.8, MATS.concreteDark, 3); put(g, roof, 0, 2.85, 0); colliders.push(roof);
  const D = new Deco();
  D.box('d', 7.4, 0.5, 7.0, 0, 3.25, 0, 0x2e4a24, 0, 0x4a6a30);
  D.box('d', 3.0, 0.6, 1.0, 0, 0.3, -2.2, 0x5a4a30); D.box('d', 0.6, 0.6, 0.6, 2.0, 0.3, -1.6, 0x6a5a38);
  D.box('lit', 0.6, 0.05, 0.6, 0, 2.55, 0, 0xffe0a0);
  for (let i = 0; i < 8; i++) D.cyl('d', 0.28, 0.28, 0.9, 8, -1.9 + (i % 4) * 0.9 + (i > 3 ? 0.4 : 0), 0.36 + (i > 3 ? 0.4 : 0), 3.7, 0xa09070, 0, 0, Math.PI / 2);
  D.flush(g);
  mapStructuresGroup.add(g); mapStructuresGroup.updateMatrixWorld(true);
  colliders.forEach(c => registerCollidable(c));
  buildingSpots.push({ x, z, w: 9, d: 9 });
  const cp = g.localToWorld(new THREE.Vector3(0, 0, -1.4));
  addLootChest(cp.x, cp.z, { y: groundY + 0.1 });
}

function addSniperNest(x, z) {
  buildWatchtower(x, z, 5.5, {});
}

// =====================================================================
// 14. INTERAÇÕES
// =====================================================================
function updatePortals(dt) {
  if (activePortals.length === 0 || !gameRunning || !player.alive) return;
  const playerPos = yawObject.position;

  activePortals.forEach(portal => {
    if (!portal.mesh) return;
    if (portal.cooldown > 0) portal.cooldown -= dt;
    portal.mesh.children[0].rotation.z += dt * 1.8;

    if (portal.cooldown <= 0 && playerPos.distanceTo(portal.mesh.position) < 2.2) {
      portal.cooldown = 3.0;
      yawObject.position.copy(portal.targetPos);
      playSound('dash');
      addScreenShake(0.04);
      showStatus('🌀 TELETRANSPORTE QUÂNTICO CONCLUÍDO!', 1500);
    }
  });
}

function findClimbPoint(pos) {
  return climbPoints.find(p =>
    Math.hypot(p.x - pos.x, p.z - pos.z) < 2.3 &&
    pos.y >= (p.minY !== undefined ? p.minY : -Infinity) &&
    pos.y <= (p.maxY !== undefined ? p.maxY : Infinity));
}

function tryInteract() {
  if (!gameRunning || !player.alive) return;
  const pos = yawObject.position;

  const doorEntry = houseEntries.find(h => !h.opened && Math.hypot(h.doorX - pos.x, h.doorZ - pos.z) < 2.3);
  if (doorEntry) { openHouse(doorEntry); return; }

  const chest = lootChests.find(c => !c.opened && Math.hypot(c.group.position.x - pos.x, c.group.position.z - pos.z) < 3 &&
    Math.abs(c.group.position.y - (pos.y - 2)) < 3.2);
  if (chest) {
    chest.opened = true;
    chest.group.visible = false;
    if (typeof spawnHitBurst === 'function') spawnHitBurst(chest.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xffd36a);
    inventory.supplies++;
    inventory.barricades++;
    inventory.grenades = Math.min(inventory.grenades + 1, 5);
    if (Math.random() < .45) inventory.medkits++;
    player.armor = Math.min(player.maxArmor, player.armor + 25 + Math.floor(Math.random() * 26));
    updateArmorHud();
    ammoState.forEach((a, i) => a.reserve += Math.ceil(WEAPONS[i].magSize * .35));
    if (!unlockedWeapons.has('sniper')) {
      unlockedWeapons.add('sniper');
      showStatus('PROJETO ENCONTRADO: SNIPER SPECTRE', 2600);
    } else {
      showStatus('BAÚ SAQUEADO: munição, armadura e suprimentos', 2000);
    }
    updateAmmoHud();
    updateInventory();
    updateGrenadeHud();
    playSound('reload');
    return;
  }

  const ladder = findClimbPoint(pos);
  if (ladder) {
    yawObject.position.y = ladder.targetY;
    if (ladder.toX !== undefined) { yawObject.position.x = ladder.toX; yawObject.position.z = ladder.toZ; }
    player.velocity.y = 0;
    player.onGround = true;
    playSound('step');
    showStatus(ladder.label === 'DESCER' ? 'DESCEU ATÉ O SOLO' : 'POSTO ELEVADO — BOM CAMPO DE VISÃO');
  }
}

function openHouse(entry) {
  if (entry.opened) return;
  entry.opened = true;
  if (entry.collidable) {
    const idx = collidables.indexOf(entry.collidable);
    if (idx !== -1) collidables.splice(idx, 1);
    entry.collidable = null;
  }
  entry.doorMesh.visible = false;
  if (!entry.lootCreated) {
    addLootChest(entry.doorX - 0.8, entry.doorZ + 2.2);
    addLootChest(entry.doorX + 0.8, entry.doorZ + 2.2);
    entry.lootCreated = true;
  }
  showStatus('Porta aberta — dentro você pode encontrar munição, kit médico e barricadas', 3000);
  playSound('reload');
}

function updateInteractionHint() {
  const hint = document.getElementById('interactHint');
  if (!hint || !gameRunning) return;
  const pos = yawObject.position;

  const doorEntry = houseEntries.find(h => !h.opened && Math.hypot(h.doorX - pos.x, h.doorZ - pos.z) < 2.3);
  const chest = lootChests.find(c => !c.opened && Math.hypot(c.group.position.x - pos.x, c.group.position.z - pos.z) < 3 &&
    Math.abs(c.group.position.y - (pos.y - 2)) < 3.2);
  const ladder = findClimbPoint(pos);

  hint.textContent = doorEntry ? '[F] ENTRAR NA ESTRUTURA'
    : chest ? '[F] SAQUEAR BAÚ'
    : ladder ? (ladder.label === 'DESCER' ? '[F] DESCER AO SOLO' : '[F] SUBIR PARA O POSTO')
    : '';
  hint.classList.toggle('show', !!(doorEntry || chest || ladder));
}
