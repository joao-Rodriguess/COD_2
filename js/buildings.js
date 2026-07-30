// =====================================================================
// BUILDINGS.JS — ARQUITETURA & OBJETOS 3D REALISTAS E DETALHADOS
// =====================================================================

const mapStructuresGroup = new THREE.Group();
scene.add(mapStructuresGroup);

const activePortals = [];
let interactiveMetalDoor = null;

function clearMapStructures() {
  while (mapStructuresGroup.children.length > 0) {
    const child = mapStructuresGroup.children[0];
    mapStructuresGroup.remove(child);
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
  interactiveMetalDoor = null;
}

function registerCollidable(mesh) {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  collidables.push({ mesh, box });
  return box;
}

function syncAllCollidableBoxes() {
  scene.updateMatrixWorld(true);
  collidables.forEach(c => {
    c.box.setFromObject(c.mesh);
  });
}

// MATERIAIS REALISTAS DE ALTA FIDELIDADE
const MATS = {
  concreteDark:  new THREE.MeshStandardMaterial({ color: 0x141a24, metalness: 0.8, roughness: 0.3, envMap: cubeRenderTarget.texture }),
  concreteLight: new THREE.MeshStandardMaterial({ color: 0x222d3d, metalness: 0.6, roughness: 0.4 }),
  frameMetal:    new THREE.MeshStandardMaterial({ color: 0x090d14, metalness: 0.9, roughness: 0.2 }),
  glassCyber:    new THREE.MeshStandardMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65, metalness: 0.9, roughness: 0.1, envMap: cubeRenderTarget.texture, envMapIntensity: 2.0 }),
  neonCyan:      new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
  neonPurple:    new THREE.MeshBasicMaterial({ color: 0x9d00ff }),
  neonOrange:    new THREE.MeshBasicMaterial({ color: 0xff6600 }),
  stoneRuins:    new THREE.MeshStandardMaterial({ color: 0x3d473b, roughness: 0.92 }),
  stoneMoss:     new THREE.MeshStandardMaterial({ color: 0x2a3828, roughness: 0.95 }),
  rockMat:       new THREE.MeshStandardMaterial({ color: 0x4a4e54, roughness: 0.9, bumpScale: 0.2 }),
  woodTribal:    new THREE.MeshStandardMaterial({ color: 0x4a321a, roughness: 0.9 }),
  thatchRoof:    new THREE.MeshStandardMaterial({ color: 0x6e5628, roughness: 1.0 }),
  obsidianVoid:  new THREE.MeshStandardMaterial({ color: 0x0a0414, roughness: 0.2, metalness: 0.8 }),
  crystalVoid:   new THREE.MeshStandardMaterial({ color: 0x100526, emissive: 0x9d00ff, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.1, envMap: cubeRenderTarget.texture }),
  hazardYellow:  new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.4, roughness: 0.5 }),
  barrelRed:     new THREE.MeshStandardMaterial({ color: 0xaa2222, metalness: 0.7, roughness: 0.3 }),
  ironDark:      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.3 }),
  woodChest:     new THREE.MeshStandardMaterial({ color: 0x5a3418, roughness: 0.8 })
};

reflectiveMaterials.push(MATS.glassCyber);

// =====================================================================
// 1. BAÚ DE SAQUE REALISTA MULTI-PEÇA (LOOT CHEST DE ALTA DEFINIÇÃO)
// =====================================================================
function addLootChest(x, z) {
  const baseY = getTerrainHeight(x, z);
  const group = new THREE.Group();

  // Corpo de Madeira
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.8), MATS.woodChest);
  base.position.y = 0.35;
  base.castShadow = true;
  group.add(base);

  // Tampa de Madeira Biselada
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 12, 1, false, 0, Math.PI), MATS.woodChest);
  lid.rotation.z = Math.PI / 2;
  lid.position.y = 0.7;
  lid.castShadow = true;
  group.add(lid);

  // Cantoneiras e Fivelas de Ferro Escuro
  for (const sx of [-0.62, 0.62]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.84), MATS.ironDark);
    band.position.set(sx, 0.37, 0);
    group.add(band);
  }

  // Fechadura Central de Metal
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.1), MATS.hazardYellow);
  lock.position.set(0, 0.55, 0.42);
  group.add(lock);

  // Núcleo de Bateria Emissiva
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8), MATS.neonCyan);
  core.position.set(0, 0.55, 0.44);
  group.add(core);

  const beacon = new THREE.PointLight(0x00f0ff, 1.2, 8);
  beacon.position.y = 1.1;
  group.add(beacon);

  group.position.set(x, baseY, z);
  mapStructuresGroup.add(group);
  lootChests.push({ group, opened: false });
}

// =====================================================================
// 2. BARRIL INDUSTRIAL REFORÇADO (OIL DRUM REALISTA)
// =====================================================================
function buildIndustrialDebris(x, z) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);

  // Barril Redondo de Combustível com Anéis de Reforço
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.5, 16), MATS.barrelRed);
  barrel.position.set(0, 0.75, 0);
  barrel.castShadow = true;
  g.add(barrel);

  // Anéis de Aço
  for (const ry of [0.35, 0.75, 1.15]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.03, 8, 16), MATS.ironDark);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, ry, 0);
    g.add(ring);
  }

  // Faixa Amarela de Perigo Hazard
  const hazardBand = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.2, 16), MATS.hazardYellow);
  hazardBand.position.set(0, 0.95, 0);
  g.add(hazardBand);

  // Caixote de Madeira com Moldura
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), MATS.woodChest);
  crate.position.set(1.2, 0.65, 0.3);
  crate.rotation.y = 0.35;
  crate.castShadow = true;
  g.add(crate);

  const crateTrim = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.15, 1.34), MATS.ironDark);
  crateTrim.position.set(1.2, 0.65, 0.3);
  crateTrim.rotation.y = 0.35;
  g.add(crateTrim);

  mapStructuresGroup.add(g);
  registerCollidable(barrel);
  registerCollidable(crate);
}

// =====================================================================
// 3. POSTE DE ILUMINAÇÃO DE RUA COM MOLDURA CURVA & CAIXA ELÉTRICA
// =====================================================================
function buildStreetLamp(x, z, colorHex = 0x00f0ff) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);

  // Poste Octogonal
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 6.0, 8), MATS.frameMetal);
  pole.position.y = 3.0;
  pole.castShadow = true;
  g.add(pole);

  // Caixa Elétrica de Base
  const baseBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.5), MATS.ironDark);
  baseBox.position.y = 0.4;
  g.add(baseBox);

  // Braço Curvo
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.14), MATS.frameMetal);
  arm.position.set(0.65, 5.8, 0);
  arm.rotation.z = -0.15;
  g.add(arm);

  // Luminária Ciano
  const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.4), MATS.ironDark);
  lampHead.position.set(1.3, 5.65, 0);
  g.add(lampHead);

  const lampBulb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: colorHex }));
  lampBulb.position.set(1.3, 5.52, 0);
  g.add(lampBulb);

  const light = new THREE.PointLight(colorHex, 2.0, 20);
  light.position.set(1.3, 5.3, 0);
  g.add(light);

  mapStructuresGroup.add(g);
  registerCollidable(pole);
}

// =====================================================================
// 4. ÁRVORES DE SELVA MULTI-CAMADA COM RAÍZES (JUNGLE TREE AAA)
// =====================================================================
function buildJungleGiantTree(x, z) {
  const baseY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, baseY, z);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.95 });

  // Tronco Principal Cônico
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.8, 12, 10), trunkMat);
  trunk.position.y = 6.0;
  trunk.castShadow = true;
  g.add(trunk);

  // Raízes Salientes na Base
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const root = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 2.2), trunkMat);
    root.position.set(Math.cos(angle) * 1.4, 0.9, Math.sin(angle) * 1.4);
    root.rotation.y = angle;
    g.add(root);
  }

  // Folhagem Multi-Camada (Copa Orgânica em 3 Níveis)
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1a4516, roughness: 0.9 });
  const leafHeights = [10.5, 12.5, 14.5];
  const leafScales = [6.0, 4.8, 3.2];

  leafHeights.forEach((ly, i) => {
    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(leafScales[i], 1), leafMat);
    canopy.position.y = ly;
    canopy.scale.y = 0.55;
    canopy.castShadow = true;
    g.add(canopy);
  });

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);

  registerCollidable(trunk);
}

// =====================================================================
// 5. BARRICADA TÁTICA DE SACOS DE AREIA (SANDBAG BARRICADE AAA)
// =====================================================================
function deployBarricade() {
  if (!gameRunning || !player.alive || inventory.barricades <= 0) return;
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).negate();
  const pos = yawObject.position.clone().addScaledVector(forward, 2.4);
  pos.y = getTerrainHeight(pos.x, pos.z);

  const g = new THREE.Group();
  g.position.copy(pos);
  g.rotation.y = yaw;

  const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x8a785d, roughness: 0.95 });

  // Sacos de Areia Empilhados em 3 Fileiras Intercaladas
  for (let row = 0; row < 3; row++) {
    const ry = row * 0.55 + 0.28;
    const bagCount = (row === 2) ? 2 : 3;

    for (let b = 0; b < bagCount; b++) {
      const bx = (b - (bagCount - 1) / 2) * 0.9;
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.45), sandbagMat);
      bag.position.set(bx, ry, 0);
      bag.castShadow = true; bag.receiveShadow = true;
      g.add(bag);
    }
  }

  // Estacas de Madeira nas Pontas
  const stakeMat = new THREE.MeshStandardMaterial({ color: 0x4a321a, roughness: 0.9 });
  for (const sx of [-1.3, 1.3]) {
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8), stakeMat);
    stake.position.set(sx, 1.0, 0);
    g.add(stake);
  }

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);

  g.children.forEach(c => registerCollidable(c));

  barricades.push(g);
  inventory.barricades--;
  updateInventory();
  showStatus('🛡️ BARRICADA DE SACOS DE AREIA POSICIONADA!');
}

// =====================================================================
// ROCHAS ORGÂNICAS MULTI-FACETADAS (ROCKS AAA)
// =====================================================================
function buildRockFormation(x, z, scale = 1.0) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);

  const rockGeo = new THREE.DodecahedronGeometry(2.0 * scale, 1);
  const rock = new THREE.Mesh(rockGeo, MATS.rockMat);
  rock.position.y = 1.1 * scale;
  rock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
  rock.scale.set(1 + Math.random() * 0.4, 0.75 + Math.random() * 0.4, 1 + Math.random() * 0.4);
  rock.castShadow = true; rock.receiveShadow = true;
  g.add(rock);

  // Rocha Menor Encostada
  const smallRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0 * scale, 1), MATS.rockMat);
  smallRock.position.set(1.4 * scale, 0.5 * scale, 0.4 * scale);
  g.add(smallRock);

  mapStructuresGroup.add(g);
  registerCollidable(rock);
}

// =====================================================================
// TORRE DE VIGIA COM MOLDURAS E HOLOFOTE (WATCHTOWER AAA)
// =====================================================================
function buildWatchtower(x, z, height = 12) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);

  const width = 6.0;

  const platform = new THREE.Mesh(new THREE.BoxGeometry(width, 0.4, width), MATS.frameMetal);
  platform.position.y = height;
  platform.castShadow = true;
  g.add(platform);

  elevatedPlatforms.push({
    minX: x - width / 2, maxX: x + width / 2,
    minZ: z - width / 2, maxZ: z + width / 2,
    y: groundY + height
  });

  // Guarda-Corpo Metálico
  for (const side of [-width / 2, width / 2]) {
    const railX = new THREE.Mesh(new THREE.BoxGeometry(width, 1.0, 0.1), MATS.concreteLight);
    railX.position.set(0, height + 0.5, side);
    g.add(railX);

    const railZ = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, width), MATS.concreteLight);
    railZ.position.set(side, height + 0.5, 0);
    g.add(railZ);
  }

  // 4 Pernas de Sustentação
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, height, 8), MATS.frameMetal);
      leg.position.set(sx * (width / 2 - 0.4), height / 2, sz * (width / 2 - 0.4));
      g.add(leg);
    }
  }

  // Escada
  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.8, height, 0.15), MATS.frameMetal);
  ladder.position.set(width / 2 + 0.1, height / 2, 0);
  g.add(ladder);
  climbPoints.push({ x: x + width / 2 + 0.1, z, targetY: groundY + height + 2 });

  // Holofote Vermelho
  const beacon = new THREE.PointLight(0xff3838, 2.5, 22);
  beacon.position.y = height + 2;
  g.add(beacon);

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);

  g.children.forEach(c => registerCollidable(c));

  addLootChest(x, z);
}

// TORRES CYBER CILÍNDRICAS E ESTRUTURAS
function buildCyberSkyscraper(x, z, floors = 4, radius = 9.0) {
  const groundY = getTerrainHeight(x, z);
  const floorHeight = 4.2;
  const totalH = floors * floorHeight;
  const g = new THREE.Group();
  g.position.set(x, groundY, z);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, totalH, 16), MATS.concreteDark);
  body.position.y = totalH / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  for (let fl = 0; fl < floors; fl++) {
    const fy = fl * floorHeight;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.15, 0.15, 8, 24), fl % 2 === 0 ? MATS.neonCyan : MATS.neonPurple);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = fy + floorHeight;
    g.add(ring);

    const balcony = new THREE.Mesh(new THREE.CylinderGeometry(radius + 1.2, radius + 1.2, 0.3, 12, 1, false, 0, Math.PI), MATS.concreteLight);
    balcony.rotation.y = Math.PI / 2;
    balcony.position.y = fy + floorHeight * 0.5;
    g.add(balcony);

    elevatedPlatforms.push({
      minX: x - radius - 1, maxX: x + radius + 1,
      minZ: z - radius - 1, maxZ: z + radius + 1,
      y: groundY + fy + floorHeight
    });
  }

  const helipad = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, 0.4, 16), MATS.frameMetal);
  helipad.position.y = totalH + 0.2;
  g.add(helipad);

  const roofBeacon = new THREE.PointLight(0x00f0ff, 2.5, 25);
  roofBeacon.position.y = totalH + 2.5;
  g.add(roofBeacon);

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);

  g.children.forEach(child => registerCollidable(child));

  addLootChest(x, z);
  buildingSpots.push({ x, z, w: radius * 2, d: radius * 2 });
}

function buildSkybridge(x1, z1, y1, x2, z2, y2) {
  const start = new THREE.Vector3(x1, y1, z1);
  const end = new THREE.Vector3(x2, y2, z2);
  const dist = start.distanceTo(end);
  const mid = start.clone().add(end).multiplyScalar(0.5);

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.4, dist), MATS.frameMetal);
  bridge.position.copy(mid);
  bridge.lookAt(end);
  bridge.castShadow = true; bridge.receiveShadow = true;
  mapStructuresGroup.add(bridge);
  registerCollidable(bridge);

  for (const side of [-1.4, 1.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, dist), MATS.concreteLight);
    rail.position.copy(mid);
    rail.lookAt(end);
    rail.translateX(side);
    rail.position.y += 0.5;
    mapStructuresGroup.add(rail);
    registerCollidable(rail);
  }

  elevatedPlatforms.push({
    minX: Math.min(x1, x2) - 1.5, maxX: Math.max(x1, x2) + 1.5,
    minZ: Math.min(z1, z2) - 1.5, maxZ: Math.max(z1, z2) + 1.5,
    y: (y1 + y2) / 2
  });
}

function buildIndustrialHangar(x, z, w = 24, d = 28, h = 9) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);

  const wallThick = 0.6;

  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), MATS.concreteDark);
  back.position.set(0, h / 2, -d / 2);
  g.add(back);

  const left = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), MATS.concreteDark);
  left.position.set(-w / 2, h / 2, 0);
  g.add(left);

  const right = left.clone();
  right.position.x = w / 2;
  g.add(right);

  const roof = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, d, 12, 1, false, 0, Math.PI), MATS.frameMetal);
  roof.rotation.x = Math.PI / 2;
  roof.rotation.z = Math.PI / 2;
  roof.position.set(0, h, 0);
  g.add(roof);

  for (let i = 0; i < 4; i++) {
    const cx = (i % 2 === 0 ? -1 : 1) * (w * 0.28);
    const cz = (i < 2 ? -1 : 1) * (d * 0.25);
    const container = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 9), MATS.concreteLight);
    container.position.set(cx, 1.6, cz);
    g.add(container);
  }

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);

  g.children.forEach(c => registerCollidable(c));

  addLootChest(x, z);
  buildingSpots.push({ x, z, w, d });
}

function buildResidentialHouse(x, z, w = 12, d = 12, h = 6.5) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);

  const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MATS.concreteLight);
  base.position.y = h / 2;
  base.castShadow = true;
  g.add(base);

  const balcony = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.3, 3.2), MATS.frameMetal);
  balcony.position.set(0, h * 0.55, d / 2 + 1.2);
  g.add(balcony);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.4, d + 0.6), MATS.concreteDark);
  roof.position.y = h + 0.2;
  g.add(roof);

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);

  g.children.forEach(c => registerCollidable(c));

  addLootChest(x, z);
  buildingSpots.push({ x, z, w, d, house: true });
}

// GERADORES DE LAYOUT
function buildNeonRustLayout() {
  buildCyberSkyscraper(0, 0, 5, 10);
  buildCyberSkyscraper(-35, -35, 4, 9);
  buildCyberSkyscraper(35, 35, 4, 9);

  const groundY = getTerrainHeight(0, 0);
  buildSkybridge(0, 0, groundY + 12.6, -35, -35, groundY + 12.6);
  buildSkybridge(0, 0, groundY + 12.6, 35, 35, groundY + 12.6);

  buildIndustrialHangar(-55, 40, 22, 28, 9);
  buildIndustrialHangar(55, -40, 22, 28, 9);

  [[-70, -70], [70, 70], [-70, 70], [70, -70], [-25, 60], [25, -60], [60, -25], [-60, 25]].forEach(([hx, hz]) => {
    buildResidentialHouse(hx, hz, 14, 14, 7);
  });

  [[-110, -110], [110, 110], [-110, 110], [110, -110]].forEach(([wx, wz]) => {
    buildWatchtower(wx, wz, 14);
  });

  for (let i = 0; i < 25; i++) {
    const rx = (Math.random() * 2 - 1) * 110;
    const rz = (Math.random() * 2 - 1) * 110;
    if (Math.hypot(rx, rz) > 15) {
      if (i % 3 === 0) buildRockFormation(rx, rz, 1.2 + Math.random() * 0.8);
      else if (i % 3 === 1) buildStreetLamp(rx, rz, 0x00f0ff);
      else buildIndustrialDebris(rx, rz);
    }
  }
}

function buildVoidCoreLayout() {
  buildVoidMonolithComplex(0, 0, 26, 26, 14);

  const portalA = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.2, 16), new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide }));
  portalA.position.set(-45, getTerrainHeight(-45, 0) + 2, 0);
  mapStructuresGroup.add(portalA);

  const portalB = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.2, 16), new THREE.MeshBasicMaterial({ color: 0x9d00ff, side: THREE.DoubleSide }));
  portalB.position.set(45, getTerrainHeight(45, 0) + 2, 0);
  mapStructuresGroup.add(portalB);

  activePortals.push(
    { mesh: portalA, targetPos: new THREE.Vector3(42, getTerrainHeight(45, 0) + 2, 0), cooldown: 0 },
    { mesh: portalB, targetPos: new THREE.Vector3(-42, getTerrainHeight(-45, 0) + 2, 0), cooldown: 0 }
  );

  const grid = [-85, -45, 45, 85];
  grid.forEach(gx => {
    grid.forEach(gz => {
      if (Math.abs(gx) !== Math.abs(gz)) {
        buildVoidMonolithComplex(gx, gz, 16, 16, 9);
      }
    });
  });

  for (let i = 0; i < 30; i++) {
    const rx = (Math.random() * 2 - 1) * 110;
    const rz = (Math.random() * 2 - 1) * 110;
    buildRockFormation(rx, rz, 1.5 + Math.random());
  }
}

function buildVoidMonolithComplex(x, z, w, d, h) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  const floatY = groundY + 1.5;
  g.position.set(x, floatY, z);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 1.4, 16), MATS.obsidianVoid);
  base.position.y = 0.7;
  base.castShadow = true; base.receiveShadow = true;
  g.add(base);

  elevatedPlatforms.push({
    minX: x - w / 2, maxX: x + w / 2,
    minZ: z - d / 2, maxZ: z + d / 2,
    y: floatY + 1.4
  });

  const obelisk = new THREE.Mesh(new THREE.ConeGeometry(w * 0.35, h, 6), MATS.crystalVoid);
  obelisk.position.y = h / 2 + 1.4;
  obelisk.castShadow = true;
  g.add(obelisk);

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);
  g.children.forEach(c => registerCollidable(c));

  addLootChest(x, z);
  buildingSpots.push({ x, z, w, d });
}

function buildJungleTempleLayout() {
  buildJungleTempleComplex(0, 0);

  [
    [-50, -50], [-65, -35], [-35, -65],
    [50, 50], [65, 35], [35, 65],
    [-50, 50], [-65, 35], [-35, 65],
    [50, -50], [65, -35], [35, -65]
  ].forEach(([hx, hz]) => {
    buildJungleTribalHut(hx, hz, 9, 4.5);
  });

  for (let i = 0; i < 60; i++) {
    const tx = (Math.random() * 2 - 1) * (WORLD_SIZE - 25);
    const tz = (Math.random() * 2 - 1) * (WORLD_SIZE - 25);
    if (Math.hypot(tx, tz) > 25) {
      buildJungleGiantTree(tx, tz);
    }
  }

  for (let i = 0; i < 35; i++) {
    const rx = (Math.random() * 2 - 1) * 110;
    const rz = (Math.random() * 2 - 1) * 110;
    buildRockFormation(rx, rz, 1.2 + Math.random() * 1.2);
  }
}

function buildJungleTempleComplex(x, z) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);

  const steps = [
    { r: 18, h: 2.2 },
    { r: 14, h: 2.2 },
    { r: 10, h: 2.2 },
    { r: 6,  h: 2.2 },
    { r: 3,  h: 2.2 }
  ];

  let currentY = 0;
  steps.forEach((st, i) => {
    const stepMesh = new THREE.Mesh(new THREE.CylinderGeometry(st.r, st.r + 0.5, st.h, 16), i % 2 === 0 ? MATS.stoneRuins : MATS.stoneMoss);
    stepMesh.position.set(0, currentY + st.h / 2, 0);
    stepMesh.castShadow = true; stepMesh.receiveShadow = true;
    g.add(stepMesh);

    elevatedPlatforms.push({
      minX: x - st.r, maxX: x + st.r,
      minZ: z - st.r, maxZ: z + st.r,
      y: groundY + currentY + st.h
    });

    currentY += st.h;
  });

  const stairRamp = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.4, 40), MATS.stoneRuins);
  stairRamp.position.set(0, currentY / 2, 0);
  stairRamp.rotation.x = Math.PI / 7;
  g.add(stairRamp);

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);
  g.children.forEach(c => registerCollidable(c));

  addLootChest(x, z);
  buildingSpots.push({ x, z, w: 36, d: 36 });
}

function buildJungleTribalHut(x, z, w, h) {
  const groundY = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, groundY, z);

  const radius = w / 2;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, h, 12), MATS.woodTribal);
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.35, 2.5, 12), MATS.thatchRoof);
  roof.position.y = h + 1.25;
  roof.castShadow = true;
  g.add(roof);

  mapStructuresGroup.add(g);
  mapStructuresGroup.updateMatrixWorld(true);
  registerCollidable(body);
  registerCollidable(roof);

  addLootChest(x, z);
  buildingSpots.push({ x, z, w, d: w, house: true });
}

function generateMapStructures(mapKey) {
  clearMapStructures();

  if (mapKey === 'neon_rust') {
    buildNeonRustLayout();
  } else if (mapKey === 'void_core') {
    buildVoidCoreLayout();
  } else if (mapKey === 'jungle_temple') {
    buildJungleTempleLayout();
  } else if (mapKey === 'cyber') {
    buildCyberSkyscraper(0, 0, 5, 10);
    buildCyberSkyscraper(-40, 30, 4, 8);
    buildCyberSkyscraper(40, -30, 4, 8);
  } else {
    for (let ix = -2; ix <= 2; ix++) {
      for (let iz = -2; iz <= 2; iz++) {
        const x = ix * 35; const z = iz * 35;
        buildResidentialHouse(x, z, 14, 14, 7);
      }
    }
  }

  createTacticalSites();
  syncAllCollidableBoxes();
}

function createTacticalSites() {
  [[-85, -75], [85, -60], [-100, 85], [95, 105]].forEach(([x, z]) => addHideout(x, z));
  [[-60, 75], [80, 55], [-115, -25], [30, -110]].forEach(([x, z]) => addSniperNest(x, z));
  [[-25, 55], [45, -80], [-125, 25], [120, -90], [105, 12]].forEach(([x, z]) => addLootChest(x, z));
}

function addHideout(x, z) {
  const baseY = getTerrainHeight(x, z);
  const mat = new THREE.MeshStandardMaterial({ color: 0x5c6657, roughness: 0.9 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.6, 6.0), mat);
  mesh.position.set(x, baseY + 1.3, z);
  mapStructuresGroup.add(mesh);
  registerCollidable(mesh);
  addLootChest(x, z - 1.2);
}

function addSniperNest(x, z) {
  const baseY = getTerrainHeight(x, z);
  const height = 5.0, width = 6.0;
  const mat = new THREE.MeshStandardMaterial({ color: 0x6c6252, roughness: .95 });
  const platform = new THREE.Mesh(new THREE.BoxGeometry(width, .35, width), mat);
  platform.position.set(x, baseY + height, z);
  platform.receiveShadow = true; platform.castShadow = true;
  mapStructuresGroup.add(platform);
  registerCollidable(platform);

  elevatedPlatforms.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - width / 2, maxZ: z + width / 2, y: baseY + height });

  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.35, height, .35), mat);
    leg.position.set(x + sx * 2.5, baseY + height / 2, z + sz * 2.5);
    mapStructuresGroup.add(leg);
    registerCollidable(leg);
  }

  const ladder = new THREE.Mesh(new THREE.BoxGeometry(.8, height, .16), new THREE.MeshStandardMaterial({ color: 0x84745c, roughness: .8 }));
  ladder.position.set(x + 3.1, baseY + height / 2, z);
  mapStructuresGroup.add(ladder);
  climbPoints.push({ x: x + 3.1, z, targetY: baseY + height + 2 });
  addLootChest(x, z);
}

function updatePortals(dt) {
  if (activePortals.length === 0 || !gameRunning || !player.alive) return;
  const playerPos = yawObject.position;

  activePortals.forEach(portal => {
    if (!portal.mesh) return;
    if (portal.cooldown > 0) portal.cooldown -= dt;
    portal.mesh.rotation.z += dt * 2;

    if (portal.cooldown <= 0 && playerPos.distanceTo(portal.mesh.position) < 2.2) {
      portal.cooldown = 3.0;
      yawObject.position.copy(portal.targetPos);
      playSound('dash');
      addScreenShake(0.04);
      showStatus('🌀 TELETRANSPORTE QUÂNTICO CONCLUÍDO!', 1500);
    }
  });
}

function tryInteract() {
  if (!gameRunning || !player.alive) return;
  const pos = yawObject.position;

  const doorEntry = houseEntries.find(h => !h.opened && Math.hypot(h.doorX - pos.x, h.doorZ - pos.z) < 2.3);
  if (doorEntry) { openHouse(doorEntry); return; }

  const chest = lootChests.find(c => !c.opened && Math.hypot(c.group.position.x - pos.x, c.group.position.z - pos.z) < 3);
  if (chest) {
    chest.opened = true;
    chest.group.visible = false;
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

  const ladder = climbPoints.find(p => Math.hypot(p.x - pos.x, p.z - pos.z) < 2.3);
  if (ladder) {
    yawObject.position.y = ladder.targetY;
    player.velocity.y = 0;
    player.onGround = true;
    showStatus('POSTO ELEVADO — BOM CAMPO DE VISÃO');
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
  const chest = lootChests.find(c => !c.opened && Math.hypot(c.group.position.x - pos.x, c.group.position.z - pos.z) < 3);
  const ladder = climbPoints.find(p => Math.hypot(p.x - pos.x, p.z - pos.z) < 2.3);

  hint.textContent = doorEntry ? '[E] ENTRAR NA ESTRUTURA' : chest ? '[E] SAQUEAR BAÚ' : ladder ? '[E] SUBIR PARA O POSTO' : '';
  hint.classList.toggle('show', !!(doorEntry || chest || ladder));
}
