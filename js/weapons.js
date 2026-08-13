// =====================================================================
// WEAPONS.JS — ARSENAL ULTRA-DIVERSINHO COM 14 ARMAS PROCEDURAIS 3D
// (Rifles, Pistolas, Akimbo, SMGs, Escopetas, Snipers, LMG, Plasma, RPG)
// =====================================================================

const WEAPON_BASE_POS = new THREE.Vector3(0.28, -0.24, -0.45);
const weaponGroup = new THREE.Group();
pitchObject.add(weaponGroup);

const WEAPONS = [
  { key: 'rifle',    name: 'Rifle M4 Phantom',  soundKind: 'rifle',       damage: 28, fireRate: 0.10, magSize: 30, auto: true,  spread: 0.022, recoil: 0.025, kick: 0.012, range: 120, zoomFov: 50, muzzleLocal: new THREE.Vector3(0.28, -0.22, -1.03) },
  { key: 'ak47',     name: 'AK-47 Inferno',    soundKind: 'rifle_heavy', damage: 38, fireRate: 0.13, magSize: 30, auto: true,  spread: 0.035, recoil: 0.045, kick: 0.022, range: 130, zoomFov: 52, muzzleLocal: new THREE.Vector3(0.28, -0.22, -1.05) },
  { key: 'scar',     name: 'SCAR Titan',       soundKind: 'rifle_heavy', damage: 42, fireRate: 0.14, magSize: 20, auto: true,  spread: 0.018, recoil: 0.032, kick: 0.016, range: 150, zoomFov: 48, muzzleLocal: new THREE.Vector3(0.28, -0.22, -1.10) },
  { key: 'pistol',   name: 'Pistola M9 Tática',soundKind: 'pistol',      damage: 36, fireRate: 0.22, magSize: 15, auto: false, spread: 0.015, recoil: 0.038, kick: 0.018, range: 75,  zoomFov: 58, muzzleLocal: new THREE.Vector3(0.28, -0.20, -0.65) },
  { key: 'magnum',   name: 'Magnum .50 Heavy', soundKind: 'magnum',      damage: 85, fireRate: 0.45, magSize: 6,  auto: false, spread: 0.012, recoil: 0.090, kick: 0.045, range: 100, zoomFov: 54, muzzleLocal: new THREE.Vector3(0.28, -0.20, -0.72) },
  { key: 'akimbo',   name: 'Pistolas Akimbo',  soundKind: 'pistol',      damage: 30, fireRate: 0.11, magSize: 30, auto: true,  spread: 0.045, recoil: 0.035, kick: 0.015, range: 60,  zoomFov: 60, muzzleLocal: new THREE.Vector3(0.28, -0.20, -0.65) },
  { key: 'smg',      name: 'SMG Vector Neon',  soundKind: 'smg',         damage: 19, fireRate: 0.06, magSize: 40, auto: true,  spread: 0.038, recoil: 0.018, kick: 0.008, range: 65,  zoomFov: 55, muzzleLocal: new THREE.Vector3(0.28, -0.19, -0.61) },
  { key: 'mp5',      name: 'MP5 Shadow',       soundKind: 'smg',         damage: 24, fireRate: 0.08, magSize: 30, auto: true,  spread: 0.024, recoil: 0.020, kick: 0.010, range: 80,  zoomFov: 54, muzzleLocal: new THREE.Vector3(0.28, -0.19, -0.68) },
  { key: 'shotgun',  name: 'Escopeta Striker', soundKind: 'shotgun',     damage: 18, fireRate: 0.75, magSize: 8,  auto: false, spread: 0.085, recoil: 0.095, kick: 0.045, range: 35,  pellets: 8, zoomFov: 62, muzzleLocal: new THREE.Vector3(0.28, -0.21, -0.77) },
  { key: 'spas',     name: 'Spas-12 Rampage',  soundKind: 'shotgun',     damage: 26, fireRate: 0.95, magSize: 6,  auto: false, spread: 0.110, recoil: 0.120, kick: 0.060, range: 30,  pellets: 10, zoomFov: 64, muzzleLocal: new THREE.Vector3(0.28, -0.21, -0.82) },
  { key: 'sniper',   name: 'Sniper Spectre 50',soundKind: 'sniper',      damage: 140,fireRate: 1.40, magSize: 5,  auto: false, spread: 0.002, recoil: 0.140, kick: 0.075, range: 240, zoomFov: 20, scoped: true, muzzleLocal: new THREE.Vector3(0.28, -0.22, -1.50) },
  { key: 'lmg',      name: 'Devastator LMG',   soundKind: 'lmg',         damage: 32, fireRate: 0.09, magSize: 100,auto: true,  spread: 0.040, recoil: 0.038, kick: 0.018, range: 140, zoomFov: 52, muzzleLocal: new THREE.Vector3(0.28, -0.22, -1.15) },
  { key: 'plasma',   name: 'Plasma Cannon',    soundKind: 'plasma',      damage: 65, fireRate: 0.25, magSize: 20, auto: true,  spread: 0.010, recoil: 0.030, kick: 0.015, range: 180, zoomFov: 45, isPlasma: true, muzzleLocal: new THREE.Vector3(0.28, -0.22, -0.90) },
  { key: 'rpg',      name: 'Lança-Foguetes RPG-7', soundKind: 'rocket', damage: 220,fireRate: 2.00, magSize: 1,  auto: false, spread: 0.005, recoil: 0.180, kick: 0.090, range: 250, zoomFov: 50, isRocket: true, muzzleLocal: new THREE.Vector3(0.28, -0.20, -1.20) }
];

const ammoState = WEAPONS.map(w => ({ inMag: w.magSize, reserve: w.magSize * 4 }));

// =====================================================================
// MODELOS PROCEDURAIS 3D PARA AS 14 ARMAS
// =====================================================================

// Material Helper
function createStandardMetal(colorHex, metalness = 0.85, roughness = 0.25) {
  return new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness,
    roughness,
    envMap: typeof cubeRenderTarget !== 'undefined' ? cubeRenderTarget.texture : null
  });
}

function createRifleMesh() {
  const g = new THREE.Group();
  const metal = createStandardMetal(0x1b2028);
  const poly = new THREE.MeshStandardMaterial({ color: 0x0f131a, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.45), metal); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.38, 12), metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.38); g.add(barrel);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.1), metal);
  mag.position.set(0, -0.15, -0.05); mag.rotation.x = -0.22; g.add(mag);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.25), poly);
  stock.position.set(0, 0.01, 0.32); g.add(stock);
  const sightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.01), glass);
  sightGlass.position.set(0, 0.09, -0.08); g.add(sightGlass);

  g.position.copy(WEAPON_BASE_POS); return g;
}

function createAk47Mesh() {
  const g = new THREE.Group();
  const metal = createStandardMetal(0x2a2a2a, 0.9, 0.2);
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.13, 0.48), metal); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 12), metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -0.42); g.add(barrel);
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.25), wood);
  handguard.position.set(0, 0.02, -0.28); g.add(handguard);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.32), wood);
  stock.position.set(0, -0.01, 0.34); stock.rotation.x = -0.1; g.add(stock);
  const bananaMag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.12), wood);
  bananaMag.position.set(0, -0.16, -0.08); bananaMag.rotation.x = -0.35; g.add(bananaMag);

  g.position.copy(WEAPON_BASE_POS); return g;
}

function createScarMesh() {
  const g = new THREE.Group();
  const tan = new THREE.MeshStandardMaterial({ color: 0x8c7355, roughness: 0.5 });
  const darkMetal = createStandardMetal(0x181818);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.14, 0.50), tan); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.48, 12), darkMetal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -0.45); g.add(barrel);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.22, 0.1), darkMetal);
  mag.position.set(0, -0.15, -0.05); g.add(mag);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.13, 0.28), tan);
  stock.position.set(0, 0.01, 0.35); g.add(stock);

  g.position.copy(WEAPON_BASE_POS); return g;
}

function createPistolMesh() {
  const g = new THREE.Group();
  const slideMetal = createStandardMetal(0x252b35, 0.9, 0.2);
  const framePoly = new THREE.MeshStandardMaterial({ color: 0x12161f, roughness: 0.5 });

  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.075, 0.26), slideMetal);
  slide.position.set(0, 0.04, -0.05); g.add(slide);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.22), framePoly);
  frame.position.set(0, 0.0, -0.04); g.add(frame);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.07), framePoly);
  grip.position.set(0, -0.08, 0.03); grip.rotation.x = 0.3; g.add(grip);

  g.position.copy(WEAPON_BASE_POS); return g;
}

function createMagnumMesh() {
  const g = new THREE.Group();
  const silver = createStandardMetal(0xcccccc, 0.95, 0.1);
  const woodGrip = new THREE.MeshStandardMaterial({ color: 0x3d1e08, roughness: 0.6 });

  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), silver);
  cylinder.rotation.x = Math.PI / 2; cylinder.position.set(0, 0.03, -0.05); g.add(cylinder);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.32), silver);
  barrel.position.set(0, 0.04, -0.22); g.add(barrel);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.15, 0.08), woodGrip);
  grip.position.set(0, -0.08, 0.04); grip.rotation.x = 0.35; g.add(grip);

  g.position.copy(WEAPON_BASE_POS); return g;
}

function createAkimboMesh() {
  const g = new THREE.Group();
  const p1 = createPistolMesh(); p1.position.set(-0.18, 0, 0); g.add(p1);
  const p2 = createPistolMesh(); p2.position.set(0.18, 0, 0); g.add(p2);
  g.position.copy(WEAPON_BASE_POS); return g;
}

function createSmgMesh() {
  const g = new THREE.Group();
  const darkMetal = createStandardMetal(0x141a24);
  const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.32), darkMetal); g.add(body);
  const drumMag = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 16), darkMetal);
  drumMag.rotation.z = Math.PI / 2; drumMag.position.set(0, -0.12, -0.04); g.add(drumMag);
  const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.02, 0.33), neonMat);
  neonStrip.position.set(0, 0.05, 0); g.add(neonStrip);

  g.position.copy(WEAPON_BASE_POS); return g;
}

function createMp5Mesh() {
  const g = new THREE.Group();
  const metal = createStandardMetal(0x1a1a1a);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.07), metal);
  mag.position.set(0, -0.12, -0.08); mag.rotation.x = -0.15; g.add(mag);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.36), metal); g.add(body);
  g.position.copy(WEAPON_BASE_POS); return g;
}

function createShotgunMesh() {
  const g = new THREE.Group();
  const heavyMetal = createStandardMetal(0x181c24);
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a321a, roughness: 0.8 });

  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.52, 12), heavyMetal);
  b1.rotation.x = Math.PI / 2; b1.position.set(-0.02, 0.03, -0.32); g.add(b1);
  const b2 = b1.clone(); b2.position.x = 0.02; g.add(b2);
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 12), wood);
  pump.rotation.x = Math.PI / 2; pump.position.set(0, 0.01, -0.28); g.add(pump);

  g.position.copy(WEAPON_BASE_POS); return g;
}

function createSpasMesh() {
  const g = new THREE.Group();
  const blackMetal = createStandardMetal(0x111111, 0.9, 0.3);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.60, 12), blackMetal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -0.35); g.add(barrel);
  const heatGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.35, 12), blackMetal);
  heatGuard.rotation.x = Math.PI / 2; heatGuard.position.set(0, 0.03, -0.32); g.add(heatGuard);
  g.position.copy(WEAPON_BASE_POS); return g;
}

function createSniperMesh() {
  const g = new THREE.Group();
  const sniperMetal = createStandardMetal(0x10141c, 0.92, 0.15);
  const glassLens = new THREE.MeshStandardMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.65), sniperMetal); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.75, 16), sniperMetal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.68); g.add(barrel);
  const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.32, 16), sniperMetal);
  scopeTube.rotation.x = Math.PI / 2; scopeTube.position.set(0, 0.12, -0.1); g.add(scopeTube);
  const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.01, 16), glassLens);
  scopeLens.rotation.x = Math.PI / 2; scopeLens.position.set(0, 0.12, -0.26); g.add(scopeLens);

  g.position.copy(WEAPON_BASE_POS); return g;
}

function createLmgMesh() {
  const g = new THREE.Group();
  const heavyMat = createStandardMetal(0x151b22);
  const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.18), new THREE.MeshStandardMaterial({ color: 0x3d4a21 }));
  ammoBox.position.set(-0.08, -0.12, -0.05); g.add(ammoBox);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.15, 0.58), heavyMat); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 12), heavyMat);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.52); g.add(barrel);

  g.position.copy(WEAPON_BASE_POS); return g;
}

function createPlasmaMesh() {
  const g = new THREE.Group();
  const cyanMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const darkMetal = createStandardMetal(0x0a1018, 0.9, 0.1);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.45), darkMetal); g.add(body);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 12), cyanMat);
  core.rotation.x = Math.PI / 2; core.position.set(0, 0.03, -0.1); g.add(core);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.40, 12), darkMetal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.40); g.add(barrel);

  g.position.copy(WEAPON_BASE_POS); return g;
}

function createRpgMesh() {
  const g = new THREE.Group();
  const olive = new THREE.MeshStandardMaterial({ color: 0x3a482b, roughness: 0.7 });
  const warheadMat = new THREE.MeshStandardMaterial({ color: 0x992211, roughness: 0.4 });

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.85, 14), olive);
  tube.rotation.x = Math.PI / 2; tube.position.set(0, 0.04, -0.30); g.add(tube);
  const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 12), warheadMat);
  warhead.rotation.x = -Math.PI / 2; warhead.position.set(0, 0.04, -0.85); g.add(warhead);

  g.position.copy(WEAPON_BASE_POS); return g;
}

// INICIALIZAÇÃO DE MALHAS
WEAPONS[0].mesh = createRifleMesh();
WEAPONS[1].mesh = createAk47Mesh();
WEAPONS[2].mesh = createScarMesh();
WEAPONS[3].mesh = createPistolMesh();
WEAPONS[4].mesh = createMagnumMesh();
WEAPONS[5].mesh = createAkimboMesh();
WEAPONS[6].mesh = createSmgMesh();
WEAPONS[7].mesh = createMp5Mesh();
WEAPONS[8].mesh = createShotgunMesh();
WEAPONS[9].mesh = createSpasMesh();
WEAPONS[10].mesh = createSniperMesh();
WEAPONS[11].mesh = createLmgMesh();
WEAPONS[12].mesh = createPlasmaMesh();
WEAPONS[13].mesh = createRpgMesh();

WEAPONS.forEach((w, i) => {
  w.mesh.visible = (i === 0);
  weaponGroup.add(w.mesh);
});

// Desbloquear armas principais por padrão
['rifle', 'ak47', 'pistol', 'smg', 'shotgun', 'sniper'].forEach(k => unlockedWeapons.add(k));

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
  if (!w.mesh) return;
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
    showStatus('ARMA BLOQUEADA — ENCONTRE PROJETOS NOS BAÚS DE MUNDO ABERTO');
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
  if (scopeOverlay) {
    scopeOverlay.style.display = newW.scoped ? 'none' : 'none';
  }

  showStatus('ARMA: ' + newW.name.toUpperCase());
}
