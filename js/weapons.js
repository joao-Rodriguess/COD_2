// =====================================================================
// WEAPONS.JS — Modelos de Arma + Dados + Viewmodel
// =====================================================================

const weaponGroup = new THREE.Group();
camera.add(weaponGroup);
weaponGroup.scale.setScalar(0.62);

function buildGunMesh(kind) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x232323, metalness: 0.6, roughness: 0.35 });
  const metalLight = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.5, roughness: 0.4 });
  const grip = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

  if (kind === 'rifle' || kind === 'smg') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(kind === 'smg' ? 0.1 : 0.09, 0.09, kind === 'smg' ? 0.45 : 0.6), metal);
    body.position.set(0, 0, -0.1); g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.35, 8), metalLight);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.01, kind === 'smg' ? -0.43 : -0.55); g.add(barrel);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.07), grip);
    mag.position.set(0, -0.16, -0.05); mag.rotation.x = 0.15; g.add(mag);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.22), grip);
    stock.position.set(0, -0.01, 0.28); g.add(stock);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), grip);
    handle.position.set(0, -0.12, 0.08); handle.rotation.x = -0.3; g.add(handle);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.12), metalLight);
    sight.position.set(0, 0.065, -0.05); g.add(sight);
  } else if (kind === 'shotgun') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.55), metal);
    body.position.set(0, 0, -0.08); g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 10), metalLight);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.025, -0.52); g.add(barrel);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.18), grip);
    pump.position.set(0, -0.04, -0.38); g.add(pump);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.28), grip);
    stock.position.set(0, -0.02, 0.31); g.add(stock);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.17, 0.08), grip);
    handle.position.set(0, -0.13, 0.08); handle.rotation.x = -0.32; g.add(handle);
  } else {
    // Pistol
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.3), metal);
    body.position.set(0, 0, -0.05); g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), metalLight);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.24); g.add(barrel);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.17, 0.07), grip);
    handle.position.set(0, -0.13, 0.06); handle.rotation.x = -0.25; g.add(handle);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.13, 0.05), grip);
    mag.position.set(0, -0.09, 0.02); mag.rotation.x = 0.2; g.add(mag);
  }
  return g;
}

const gunRifle = buildGunMesh('rifle');
const gunPistol = buildGunMesh('pistol');
const gunSmg = buildGunMesh('smg');
const gunShotgun = buildGunMesh('shotgun');
const gunSniper = buildGunMesh('rifle');
gunSniper.scale.set(1.05, 1.05, 1.35);
const sniperScope = new THREE.Mesh(
  new THREE.CylinderGeometry(.042, .042, .22, 10),
  new THREE.MeshStandardMaterial({ color: 0x101216, metalness: .8, roughness: .25 })
);
sniperScope.rotation.x = Math.PI / 2;
sniperScope.position.set(0, .09, -.18);
gunSniper.add(sniperScope);
weaponGroup.add(gunRifle, gunPistol, gunSmg, gunShotgun, gunSniper);

const WEAPON_BASE_POS = new THREE.Vector3(0.34, -0.34, -0.75);
weaponGroup.position.copy(WEAPON_BASE_POS);

const muzzleLocalRifle = new THREE.Vector3(0, 0.01, -0.72);
const muzzleLocalPistol = new THREE.Vector3(0, 0.02, -0.36);
const muzzleLocalSmg = new THREE.Vector3(0, 0.01, -0.6);
const muzzleLocalShotgun = new THREE.Vector3(0, 0.02, -0.85);
const muzzleLocalSniper = new THREE.Vector3(0, 0.02, -0.98);

// Muzzle Flash
function makeFlashTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx2 = c.getContext('2d');
  const grad = ctx2.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,200,1)');
  grad.addColorStop(0.4, 'rgba(255,200,80,0.9)');
  grad.addColorStop(1, 'rgba(255,120,20,0)');
  ctx2.fillStyle = grad;
  ctx2.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const flashTex = makeFlashTexture();
const flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: flashTex, transparent: true, depthTest: false, blending: THREE.AdditiveBlending
}));
flashSprite.scale.set(0.28, 0.28, 0.28);
flashSprite.visible = false;
weaponGroup.add(flashSprite);

// Mãos do jogador
function addPlayerHands() {
  const skin = new THREE.MeshStandardMaterial({ color: 0xc88763, roughness: .78 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x263a2f, roughness: .9 });
  [[.13, -.28, -.18, -.45], [.32, -.31, -.12, .18]].forEach(([x, y, z, rot]) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.052, .07, .34, 8), sleeve);
    arm.position.set(x, y, z); arm.rotation.z = rot; arm.rotation.x = .9; weaponGroup.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.075, 10, 8), skin);
    hand.scale.set(.8, 1.15, .8); hand.position.set(x + (x > .2 ? .015 : -.01), y - .16, z - .12); weaponGroup.add(hand);
    const finger = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .075, 6), skin);
    finger.position.set(x, y - .21, z - .17); finger.rotation.x = Math.PI / 2; weaponGroup.add(finger);
  });
}
addPlayerHands();

// =====================================================================
// DADOS DAS ARMAS
// =====================================================================
const WEAPONS = [
  {
    key: 'rifle', name: 'Rifle de Assalto', mesh: gunRifle, muzzleLocal: muzzleLocalRifle,
    damage: 19, fireRateMs: 105, auto: true, magSize: 30, reserve: 90,
    spread: 0.018, recoil: 0.028, kick: 0.007, sound: 'rifle', price: 0
  },
  {
    key: 'pistol', name: 'Pistola Tática', mesh: gunPistol, muzzleLocal: muzzleLocalPistol,
    damage: 32, fireRateMs: 260, auto: false, magSize: 12, reserve: 48,
    spread: 0.01, recoil: 0.045, kick: 0.014, sound: 'pistol', price: 0
  },
  {
    key: 'smg', name: 'SMG Viper', mesh: gunSmg, muzzleLocal: muzzleLocalSmg,
    damage: 14, fireRateMs: 72, auto: true, magSize: 40, reserve: 120,
    spread: 0.035, recoil: 0.018, kick: 0.004, sound: 'smg', price: 600
  },
  {
    key: 'shotgun', name: 'Escopeta Breacher', mesh: gunShotgun, muzzleLocal: muzzleLocalShotgun,
    damage: 13, pellets: 8, fireRateMs: 720, auto: false, magSize: 6, reserve: 36,
    spread: 0.075, recoil: 0.085, kick: 0.025, sound: 'shotgun', price: 900
  },
  {
    key: 'sniper', name: 'Sniper Spectre', mesh: gunSniper, muzzleLocal: muzzleLocalSniper,
    damage: 95, fireRateMs: 950, auto: false, magSize: 5, reserve: 25,
    spread: 0.004, recoil: 0.11, kick: 0.034, sound: 'shotgun', price: 1500
  }
];

const ammoState = WEAPONS.map(w => ({ inMag: w.magSize, reserve: w.reserve }));

function currentWeapon() { return WEAPONS[currentWeaponIdx]; }

function switchWeapon(idx) {
  if (!WEAPONS[idx] || !unlockedWeapons.has(WEAPONS[idx].key)) {
    showStatus('ARMA BLOQUEADA — COMPRE NA LOJA');
    return;
  }
  if (idx === currentWeaponIdx || reloading) return;
  currentWeaponIdx = idx;
  WEAPONS.forEach((w, i) => w.mesh.visible = (i === idx));
  updateAmmoHud();
  document.getElementById('weaponName').textContent = currentWeapon().name;

  // Sniper scope overlay
  const scope = document.getElementById('sniperScope');
  if (scope) scope.classList.toggle('show', WEAPONS[idx].key === 'sniper');
}

switchWeapon(0);
