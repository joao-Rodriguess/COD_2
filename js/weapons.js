// =====================================================================
// WEAPONS.JS — MODELOS 3D ULTRA-REALISTAS DE ARMAS (MULTI-PEÇAS)
// (Rifle, Pistola, SMG, Escopeta, Sniper Spectre)
// =====================================================================

const WEAPON_BASE_POS = new THREE.Vector3(0.28, -0.24, -0.45);
const weaponGroup = new THREE.Group();
pitchObject.add(weaponGroup);

const WEAPONS = [
  { key: 'rifle',   name: 'Rifle M4 Phantom',  damage: 28, fireRate: 0.1,  magSize: 30, auto: true,  spread: 0.022, recoil: 0.025, kick: 0.012, range: 120, zoomFov: 50, muzzleLocal: new THREE.Vector3(0.28, -0.22, -1.03) },
  { key: 'pistol',  name: 'Pistola M9 Tática', damage: 36, fireRate: 0.22, magSize: 15, auto: false, spread: 0.015, recoil: 0.038, kick: 0.018, range: 75,  zoomFov: 58, muzzleLocal: new THREE.Vector3(0.28, -0.2, -0.65) },
  { key: 'smg',     name: 'SMG Vector Neon',   damage: 19, fireRate: 0.06, magSize: 40, auto: true,  spread: 0.038, recoil: 0.018, kick: 0.008, range: 65,  zoomFov: 55, muzzleLocal: new THREE.Vector3(0.28, -0.19, -0.61) },
  { key: 'shotgun', name: 'Escopeta Striker',  damage: 18, fireRate: 0.85, magSize: 8,  auto: false, spread: 0.085, recoil: 0.095, kick: 0.045, range: 35,  pellets: 8, zoomFov: 62, muzzleLocal: new THREE.Vector3(0.28, -0.21, -0.77) },
  { key: 'sniper',  name: 'Sniper Spectre 50', damage: 130,fireRate: 1.4,  magSize: 5,  auto: false, spread: 0.002, recoil: 0.140, kick: 0.075, range: 220, zoomFov: 20, scoped: true, muzzleLocal: new THREE.Vector3(0.28, -0.22, -1.5) }
];

const ammoState = WEAPONS.map(w => ({ inMag: w.magSize, reserve: w.magSize * 4 }));

// =====================================================================
// 1. RIFLE M4 PHANTOM ULTRA-REALISTA
// =====================================================================
function createRifleMesh() {
  const g = new THREE.Group();
  const gunMetal = new THREE.MeshStandardMaterial({ color: 0x1b2028, metalness: 0.85, roughness: 0.25, envMap: cubeRenderTarget.texture });
  const darkPoly = new THREE.MeshStandardMaterial({ color: 0x0f131a, roughness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75, metalness: 0.9 });

  // Corpo Principal / Receiver
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.45), gunMetal);
  g.add(body);

  // Cano com Muzzle Brake Integrado
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.38, 12), gunMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.38);
  g.add(barrel);

  const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.08, 12), gunMetal);
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, 0.02, -0.58);
  g.add(muzzleBrake);

  // Protetor de Mão Picatinny Rail
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.28), darkPoly);
  handguard.position.set(0, 0.02, -0.28);
  g.add(handguard);

  // Carregador Curvado
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.1), gunMetal);
  mag.position.set(0, -0.15, -0.05);
  mag.rotation.x = -0.22;
  g.add(mag);

  // Coronha Telescópica (Stock)
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.25), darkPoly);
  stock.position.set(0, 0.01, 0.32);
  g.add(stock);

  // Empunhadura Pistol Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.07), darkPoly);
  grip.position.set(0, -0.11, 0.12);
  grip.rotation.x = 0.35;
  g.add(grip);

  // Mira Red Dot Reflex Sight
  const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.1), gunMetal);
  sightBase.position.set(0, 0.085, -0.05);
  g.add(sightBase);

  const sightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.01), glassMat);
  sightGlass.position.set(0, 0.09, -0.08);
  g.add(sightGlass);

  g.position.copy(WEAPON_BASE_POS);
  return g;
}

// =====================================================================
// 2. PISTOLA M9 TÁTICA
// =====================================================================
function createPistolMesh() {
  const g = new THREE.Group();
  const slideMetal = new THREE.MeshStandardMaterial({ color: 0x252b35, metalness: 0.9, roughness: 0.2, envMap: cubeRenderTarget.texture });
  const framePoly = new THREE.MeshStandardMaterial({ color: 0x12161f, roughness: 0.5 });

  // Ferrolho / Slide Superior
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.075, 0.26), slideMetal);
  slide.position.set(0, 0.04, -0.05);
  g.add(slide);

  // Corpo Inferior / Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.22), framePoly);
  frame.position.set(0, 0.0, -0.04);
  g.add(frame);

  // Cabo / Empunhadura
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.07), framePoly);
  grip.position.set(0, -0.08, 0.03);
  grip.rotation.x = 0.3;
  g.add(grip);

  // Cano
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 12), slideMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -0.08);
  g.add(barrel);

  g.position.copy(WEAPON_BASE_POS);
  return g;
}

// =====================================================================
// 3. SMG VECTOR NEON
// =====================================================================
function createSmgMesh() {
  const g = new THREE.Group();
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x141a24, metalness: 0.8, roughness: 0.3 });
  const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

  // Corpo Compacto Vector
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.32), darkMetal);
  g.add(body);

  // Mag de Tambor Circular
  const drumMag = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 16), darkMetal);
  drumMag.rotation.z = Math.PI / 2;
  drumMag.position.set(0, -0.12, -0.04);
  g.add(drumMag);

  // Faixa Neon Emissiva
  const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.02, 0.33), neonMat);
  neonStrip.position.set(0, 0.05, 0);
  g.add(neonStrip);

  // Coronha Dobrável
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.22), darkMetal);
  stock.position.set(0, 0.02, 0.25);
  g.add(stock);

  g.position.copy(WEAPON_BASE_POS);
  return g;
}

// =====================================================================
// 4. ESCOPETA STRIKER DUAL BARREL
// =====================================================================
function createShotgunMesh() {
  const g = new THREE.Group();
  const heavyMetal = new THREE.MeshStandardMaterial({ color: 0x181c24, metalness: 0.9, roughness: 0.25 });
  const woodPoly = new THREE.MeshStandardMaterial({ color: 0x4a321a, roughness: 0.8 });

  // Cano Duplo Pesado
  const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.52, 12), heavyMetal);
  barrel1.rotation.x = Math.PI / 2;
  barrel1.position.set(-0.02, 0.03, -0.32);
  g.add(barrel1);

  const barrel2 = barrel1.clone();
  barrel2.position.x = 0.02;
  g.add(barrel2);

  // Telha Ranhurada de Madeira (Pump Handle)
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 12), woodPoly);
  pump.rotation.x = Math.PI / 2;
  pump.position.set(0, 0.01, -0.28);
  g.add(pump);

  // Coronha de Madeira
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.12, 0.35), woodPoly);
  stock.position.set(0, -0.02, 0.3);
  g.add(stock);

  g.position.copy(WEAPON_BASE_POS);
  return g;
}

// =====================================================================
// 5. SNIPER SPECTRE 50 DE ALTA PRECISÃO (COM LUNETA DE DUPLA LENTE)
// =====================================================================
function createSniperMesh() {
  const g = new THREE.Group();
  const sniperMetal = new THREE.MeshStandardMaterial({ color: 0x10141c, metalness: 0.92, roughness: 0.15, envMap: cubeRenderTarget.texture });
  const glassLens = new THREE.MeshStandardMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, metalness: 0.95 });

  // Corpo Longo do Receptor
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.65), sniperMetal);
  g.add(body);

  // Cano Extralongo com Supressor Integrado
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.75, 16), sniperMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.68);
  g.add(barrel);

  const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 16), sniperMetal);
  suppressor.rotation.x = Math.PI / 2;
  suppressor.position.set(0, 0.02, -1.05);
  g.add(suppressor);

  // Luneta / Scope Sniper de Alta Ampliação
  const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.32, 16), sniperMetal);
  scopeTube.rotation.x = Math.PI / 2;
  scopeTube.position.set(0, 0.12, -0.1);
  g.add(scopeTube);

  const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.01, 16), glassLens);
  scopeLens.rotation.x = Math.PI / 2;
  scopeLens.position.set(0, 0.12, -0.26);
  g.add(scopeLens);

  // Bípede Dobrável
  for (const sx of [-0.06, 0.06]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8), sniperMetal);
    leg.position.set(sx, -0.12, -0.5);
    leg.rotation.z = sx * 0.4;
    g.add(leg);
  }

  g.position.copy(WEAPON_BASE_POS);
  return g;
}

// =====================================================================
// INICIALIZAÇÃO DE ARMAS NA CENA
// =====================================================================
WEAPONS[0].mesh = createRifleMesh();
WEAPONS[1].mesh = createPistolMesh();
WEAPONS[2].mesh = createSmgMesh();
WEAPONS[3].mesh = createShotgunMesh();
WEAPONS[4].mesh = createSniperMesh();

WEAPONS.forEach((w, i) => {
  w.mesh.visible = (i === 0);
  weaponGroup.add(w.mesh);
});

function currentWeapon() {
  return WEAPONS[currentWeaponIdx];
}

function updateAllWeaponSkins() {
  WEAPONS.forEach(w => {
    const skinKey = equippedSkins[w.key] || 'default';
    applySkinToWeapon(w, skinKey);
  });
}

function applySkinToWeapon(w, skinKey) {
  const skin = SKINS[skinKey] || SKINS.default;
  w.mesh.traverse(child => {
    if (child.isMesh && child.material) {
      if (skin.color) child.material.color.setHex(skin.color);
      if (skin.metalness !== undefined) child.material.metalness = skin.metalness;
      if (skin.roughness !== undefined) child.material.roughness = skin.roughness;
      if (skin.emissive) child.material.emissive = new THREE.Color(skin.emissive);
      else if (child.material.emissive) child.material.emissive.setHex(0x000000);
      child.material.needsUpdate = true;
    }
  });
}

function switchWeapon(idx) {
  if (idx < 0 || idx >= WEAPONS.length) return;
  if (!unlockedWeapons.has(WEAPONS[idx].key)) {
    showStatus('ARMA BLOQUEADA — ENCONTRE PROJETOS NOS BAÚS');
    return;
  }
  if (reloading) reloading = false;

  WEAPONS[currentWeaponIdx].mesh.visible = false;
  currentWeaponIdx = idx;

  const newW = WEAPONS[currentWeaponIdx];
  newW.mesh.visible = true;

  applySkinToWeapon(newW, equippedSkins[newW.key] || 'default');

  updateAmmoHud();
  playSound('reload');

  const scopeOverlay = document.getElementById('sniperScope');
  if (scopeOverlay) scopeOverlay.style.display = 'none';

  showStatus('ARMA: ' + newW.name.toUpperCase());
}
