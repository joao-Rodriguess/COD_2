// =====================================================================
// BUILDINGS.JS — Edifícios, Obstáculos, Interação
// =====================================================================

const buildingColors = [0x6b6f78, 0x8a8f9a, 0x9c9fa8, 0xa7a9b4, 0x70787e];

function addBuilding(x, z, w, d, h, color) {
  const groundY = getTerrainHeight(x, z);
  const geo = new THREE.BoxGeometry(w, h, d);
  const wallTex = makeWallTexture(`#${color.toString(16).padStart(6, '0')}`);
  const mat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.76, metalness: 0.06, envMapIntensity: 0.35 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, groundY + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  const box = new THREE.Box3().setFromObject(mesh);
  collidables.push({ mesh, box });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x8fa6c8, metalness: 0.9, roughness: 0.08, transparent: true, opacity: 0.85,
    envMap: cubeRenderTarget.texture, envMapIntensity: 1.4
  });
  reflectiveMaterials.push(glassMat);
  const rows = Math.max(2, Math.floor(h / 2));
  for (let i = 0; i < rows; i++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 0.4), glassMat);
    win.position.set(x, groundY + 1.2 + i * 1.1, z - d / 2 - 0.01);
    win.castShadow = false;
    scene.add(win);
    const side = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.8, 0.4), glassMat);
    side.rotation.y = Math.PI / 2;
    side.position.set(x - w / 2 - 0.01, groundY + 1.2 + i * 1.1, z);
    side.castShadow = false;
    scene.add(side);
  }

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.4, 0.4, d + 0.4),
    new THREE.MeshStandardMaterial({ color: 0x2b2b2f, roughness: 0.9, metalness: 0.1 })
  );
  roof.position.set(x, groundY + h + 0.2, z);
  roof.castShadow = true;
  scene.add(roof);
}

function addHouse(x, z, w, d, h, color) {
  const groundY = getTerrainHeight(x, z);
  const wallTex = makeWallTexture(`#${color.toString(16).padStart(6, '0')}`);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.76, metalness: 0.06, envMapIntensity: 0.35 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2f, roughness: 0.9, metalness: 0.1 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x3b2d1c, roughness: 0.78 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x8fa6c8, metalness: 0.9, roughness: 0.08, transparent: true, opacity: 0.85,
    envMap: cubeRenderTarget.texture, envMapIntensity: 1.4
  });
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0x3c4d53, roughness: 0.82 });
  const house = new THREE.Group();
  house.position.set(x, groundY, z);
  scene.add(house);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), new THREE.MeshStandardMaterial({ color: 0x5f4f3a, roughness: 0.96 }));
  floor.position.set(0, 0.08, 0);
  floor.receiveShadow = true;
  house.add(floor);

  const doorWidth = Math.min(1.8, w * 0.4);
  const doorHeight = 2.1;
  const wallThickness = 0.16;

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, h, d), wallMat);
  leftWall.position.set(-w / 2 + wallThickness / 2, h / 2, 0);
  house.add(leftWall);
  collidables.push({ mesh: leftWall, box: new THREE.Box3().setFromObject(leftWall) });

  const rightWall = leftWall.clone();
  rightWall.position.x = w / 2 - wallThickness / 2;
  house.add(rightWall);
  collidables.push({ mesh: rightWall, box: new THREE.Box3().setFromObject(rightWall) });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThickness), wallMat);
  backWall.position.set(0, h / 2, d / 2 - wallThickness / 2);
  house.add(backWall);
  collidables.push({ mesh: backWall, box: new THREE.Box3().setFromObject(backWall) });

  const frontLeft = new THREE.Mesh(new THREE.BoxGeometry((w - doorWidth) / 2, h, wallThickness), wallMat);
  frontLeft.position.set(-(w - doorWidth) / 4 - doorWidth / 2, h / 2, -d / 2 + wallThickness / 2);
  house.add(frontLeft);
  collidables.push({ mesh: frontLeft, box: new THREE.Box3().setFromObject(frontLeft) });

  const frontRight = frontLeft.clone();
  frontRight.position.x = (w - doorWidth) / 4 + doorWidth / 2;
  house.add(frontRight);
  collidables.push({ mesh: frontRight, box: new THREE.Box3().setFromObject(frontRight) });

  const frontTop = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, h - doorHeight, wallThickness), wallMat);
  frontTop.position.set(0, doorHeight + (h - doorHeight) / 2, -d / 2 + wallThickness / 2);
  house.add(frontTop);
  collidables.push({ mesh: frontTop, box: new THREE.Box3().setFromObject(frontTop) });

  const door = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.14), doorMat);
  door.position.set(0, doorHeight / 2 + 0.04, -d / 2 - 0.05);
  house.add(door);
  const doorCollidable = { mesh: door, box: new THREE.Box3().setFromObject(door) };
  collidables.push(doorCollidable);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.35, d + 0.4), roofMat);
  roof.position.set(0, h + 0.18, 0);
  roof.castShadow = true;
  house.add(roof);

  const window1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), glassMat);
  window1.position.set(-w / 3, 1.15, -d / 2 - 0.01);
  house.add(window1);
  const window2 = window1.clone();
  window2.position.x = w / 3;
  house.add(window2);

  const table = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.6), interiorMat);
  table.position.set(0.8, 0.5, -1.2);
  house.add(table);
  const stool = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.36, 0.35), interiorMat);
  stool.position.set(1.1, 0.18, -0.9);
  house.add(stool);

  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.34, 2.0), new THREE.MeshStandardMaterial({ color: 0x886e62, roughness: 0.82 }));
  bed.position.set(-1.05, 0.17, 1.1);
  house.add(bed);

  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.25), new THREE.MeshStandardMaterial({ color: 0x4a4237, roughness: 0.9 }));
  shelf.position.set(-w / 2 + 0.4, 0.7, -0.8);
  shelf.rotation.y = Math.PI / 12;
  house.add(shelf);

  const interiorLight = new THREE.PointLight(0xffdcb3, 0.8, 8);
  interiorLight.position.set(0, h - 0.5, 0);
  house.add(interiorLight);

  houseEntries.push({
    doorX: x, doorZ: z - d / 2,
    doorMesh: door, opened: false,
    collidable: doorCollidable, lootCreated: false
  });
}

function addContainer(x, z) {
  const baseY = getTerrainHeight(x, z);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x556270, roughness: 0.4, metalness: 0.28,
    envMap: cubeRenderTarget.texture, envMapIntensity: 0.7
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.4), mat);
  mesh.position.set(x, baseY + 0.6, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  collidables.push({ mesh, box: new THREE.Box3().setFromObject(mesh) });
}

function addCrate(x, z) {
  const baseY = getTerrainHeight(x, z);
  const mat = new THREE.MeshStandardMaterial({ color: 0x5f482f, roughness: 0.95 });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mat);
  crate.position.set(x, baseY + 0.6, z);
  crate.castShadow = true;
  scene.add(crate);
  collidables.push({ mesh: crate, box: new THREE.Box3().setFromObject(crate) });
}

function addTree(x, z) {
  const baseY = getTerrainHeight(x, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.4, 7), new THREE.MeshStandardMaterial({ color: 0x5b3d24 }));
  trunk.position.set(x, baseY + 1.7, z);
  trunk.castShadow = true;
  scene.add(trunk);
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5, 8), new THREE.MeshStandardMaterial({ color: 0x2f5c2a }));
  leaves.position.set(x, baseY + 5.4, z);
  leaves.castShadow = true;
  scene.add(leaves);
}

function addLootChest(x, z) {
  const baseY = getTerrainHeight(x, z);
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6d4020, roughness: .85 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xe1a83d, metalness: .45, roughness: .4 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, .62, .72), wood);
  base.position.y = .34;
  group.add(base);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.16, .16, .78), trim);
  lid.position.y = .72;
  group.add(lid);
  const beacon = new THREE.PointLight(0xffba45, .8, 9);
  beacon.position.y = 1.25;
  group.add(beacon);
  group.position.set(x, baseY, z);
  scene.add(group);
  lootChests.push({ group, opened: false });
}

function addSniperNest(x, z) {
  const baseY = getTerrainHeight(x, z);
  const height = 4.2, width = 5;
  const mat = new THREE.MeshStandardMaterial({ color: 0x6c6252, roughness: .95 });
  const platform = new THREE.Mesh(new THREE.BoxGeometry(width, .28, width), mat);
  platform.position.set(x, baseY + height, z);
  platform.receiveShadow = true;
  platform.castShadow = true;
  scene.add(platform);
  elevatedPlatforms.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - width / 2, maxZ: z + width / 2, y: baseY + height });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.28, height, .28), mat);
    leg.position.set(x + sx * 2.15, baseY + height / 2, z + sz * 2.15);
    scene.add(leg);
  }
  const ladder = new THREE.Mesh(new THREE.BoxGeometry(.65, height, .12), new THREE.MeshStandardMaterial({ color: 0x84745c, roughness: .8 }));
  ladder.position.set(x + 2.7, baseY + height / 2, z);
  scene.add(ladder);
  climbPoints.push({ x: x + 2.7, z, targetY: baseY + height + 2 });
  addLootChest(x, z);
}

function addHideout(x, z) {
  const baseY = getTerrainHeight(x, z);
  const color = 0x5c6657;
  addBuilding(x - 2, z, 0.55, 5, 2.2, color);
  addBuilding(x + 2, z, 0.55, 5, 2.2, color);
  addBuilding(x, z + 2.2, 4.5, .55, 2.2, color);
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 5), new THREE.MeshStandardMaterial({ color: 0x344036, side: THREE.DoubleSide }));
  roof.rotation.x = -Math.PI / 2;
  roof.position.set(x, baseY + 2.45, z);
  scene.add(roof);
  addLootChest(x, z - 1.2);
}

function createTacticalSites() {
  [[-72, -58], [65, -42], [-90, 78], [84, 94]].forEach(([x, z]) => addHideout(x, z));
  [[-48, 64], [72, 44], [-105, -18], [22, -98]].forEach(([x, z]) => addSniperNest(x, z));
  [[-20, 48], [40, -70], [-118, 20], [112, -80], [95, 8]].forEach(([x, z]) => addLootChest(x, z));
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() * 2 - 1) * (WORLD_SIZE - 18);
    const z = (Math.random() * 2 - 1) * (WORLD_SIZE - 18);
    addContainer(x, z);
  }
}

// --- Gerar construções iniciais ---
for (let ix = -2; ix <= 2; ix++) {
  for (let iz = -2; iz <= 2; iz++) {
    if (Math.abs(ix) + Math.abs(iz) > 3) continue;
    const x = ix * 18 + (Math.random() - 0.5) * 6;
    const z = iz * 18 + (Math.random() - 0.5) * 6;
    if (Math.random() < 0.45) {
      const w = 8 + Math.random() * 3;
      const d = 8 + Math.random() * 3;
      const h = 4 + Math.random() * 2;
      addHouse(x, z, w, d, h, buildingColors[Math.floor(Math.random() * buildingColors.length)]);
      buildingSpots.push({ x, z, w, d, house: true });
    } else {
      const w = 10 + Math.random() * 6;
      const d = 10 + Math.random() * 6;
      const h = 6 + Math.random() * 9;
      addBuilding(x, z, w, d, h, buildingColors[Math.floor(Math.random() * buildingColors.length)]);
      buildingSpots.push({ x, z, w, d });
    }
    centerPositions.push({ x, z });
  }
}
for (let i = 0; i < 16; i++) {
  const x = (Math.random() * 2 - 1) * (WORLD_SIZE - 26);
  const z = (Math.random() * 2 - 1) * (WORLD_SIZE - 26);
  addBuilding(x, z, 4 + Math.random() * 3, 1.2, 1.3 + Math.random() * 0.6, 0x5c5c58);
}
for (let i = 0; i < 24; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 30 + Math.random() * 48;
  addContainer(Math.cos(angle) * radius, Math.sin(angle) * radius);
}
for (let i = 0; i < 18; i++) {
  addCrate((Math.random() * 2 - 1) * (WORLD_SIZE - 20), (Math.random() * 2 - 1) * (WORLD_SIZE - 20));
}
for (let i = 0; i < 56; i++) {
  addTree((Math.random() * 2 - 1) * (WORLD_SIZE - 12), (Math.random() * 2 - 1) * (WORLD_SIZE - 12));
}

// --- Interação ---
function deployBarricade() {
  if (!gameRunning || !player.alive || inventory.barricades <= 0) return;
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).negate();
  const pos = yawObject.position.clone().addScaledVector(forward, 2.4);
  pos.y = 1;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.8, .34),
    new THREE.MeshStandardMaterial({ color: 0x62745a, roughness: .9 })
  );
  mesh.position.copy(pos);
  mesh.rotation.y = yaw;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  collidables.push({ mesh, box: new THREE.Box3().setFromObject(mesh) });
  barricades.push(mesh);
  inventory.barricades--;
  updateInventory();
  showStatus('BARRICADA POSICIONADA');
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
    // Armadura nos baús
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

function updateInteractionHint() {
  const hint = document.getElementById('interactHint');
  if (!hint || !gameRunning) return;
  const pos = yawObject.position;
  const doorEntry = houseEntries.find(h => !h.opened && Math.hypot(h.doorX - pos.x, h.doorZ - pos.z) < 2.3);
  const chest = lootChests.find(c => !c.opened && Math.hypot(c.group.position.x - pos.x, c.group.position.z - pos.z) < 3);
  const ladder = climbPoints.find(p => Math.hypot(p.x - pos.x, p.z - pos.z) < 2.3);
  hint.textContent = doorEntry ? '[E] ENTRAR NA CASA' : chest ? '[E] SAQUEAR BAÚ' : ladder ? '[E] SUBIR PARA O POSTO' : '';
  hint.classList.toggle('show', !!(doorEntry || chest || ladder));
}
