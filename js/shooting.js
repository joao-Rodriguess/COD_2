// =====================================================================
// SHOOTING.JS — MOTOR BALÍSTICO, IMPACTOS PBR, DECALS & AIR DROP AAA
// (Muzzle Flash Cinematográfico, Luz Dinâmica de Disparo, Tracers Balísticos,
// Projéteis Físicos RPG-7, Decals de Perfuração/Sangue/Explosão, Ejeção de
// Cápsulas por Calibre, Granadas Táticas M67 & Sinalizadores de Air Drop)
// =====================================================================

// ---------------------------------------------------------------------
// 1. CLARÃO DE DISPARO (MUZZLE FLASH) & LUZ DINÂMICA PROCEDURAL
// ---------------------------------------------------------------------

// Sprite de Boca de Cano utilizando TEX.muzzle de alta fidelidade
const flashSpriteMat = new THREE.SpriteMaterial({
  map: (typeof TEX !== 'undefined' && TEX.muzzle) ? TEX.muzzle : null,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false
});

const flashSprite = new THREE.Sprite(flashSpriteMat);
flashSprite.scale.set(0.7, 0.7, 0.7);
flashSprite.visible = false;
weaponGroup.add(flashSprite);

// Luz Dinâmica de Disparo (ilumina corredores e paredes próximas a cada tiro)
const muzzleLight = new THREE.PointLight(0xffa533, 0, 16, 2.0);
scene.add(muzzleLight);
let muzzleLightTimer = 0;

function worldMuzzlePosition(w) {
  const localPos = w && w.muzzleLocal ? w.muzzleLocal : new THREE.Vector3(0.28, -0.22, -1.0);
  return localPos.clone().applyMatrix4(camera.matrixWorld);
}

// ---------------------------------------------------------------------
// 2. POOL DE DECALS PROCEDURAIS (FUROS DE BALA, SANGUE E QUEIMADURAS)
// ---------------------------------------------------------------------

const MAX_BULLET_DECALS = 45;
const _bulletDecalPool = [];
const _decalGeo = new THREE.PlaneGeometry(0.22, 0.22);
const _decalMat = new THREE.MeshBasicMaterial({
  map: (typeof TEX !== 'undefined' && TEX.bulletHole) ? TEX.bulletHole : null,
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2
});

for (let i = 0; i < MAX_BULLET_DECALS; i++) {
  const m = new THREE.Mesh(_decalGeo, _decalMat);
  m.visible = false;
  scene.add(m);
  _bulletDecalPool.push({ mesh: m, life: 0, active: false });
}

const MAX_BLOOD_DECALS = 25;
const _bloodDecalPool = [];
const _bloodGeo = new THREE.PlaneGeometry(0.55, 0.55);
const _bloodMat = new THREE.MeshBasicMaterial({
  map: (typeof TEX !== 'undefined' && TEX.bloodSplat) ? TEX.bloodSplat : null,
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2
});

for (let i = 0; i < MAX_BLOOD_DECALS; i++) {
  const m = new THREE.Mesh(_bloodGeo, _bloodMat);
  m.visible = false;
  scene.add(m);
  _bloodDecalPool.push({ mesh: m, life: 0, active: false });
}

const MAX_SCORCH_DECALS = 15;
const _scorchDecalPool = [];
const _scorchGeo = new THREE.PlaneGeometry(3.6, 3.6);
const _scorchMat = new THREE.MeshBasicMaterial({
  map: (typeof TEX !== 'undefined' && TEX.scorch) ? TEX.scorch : null,
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2
});

for (let i = 0; i < MAX_SCORCH_DECALS; i++) {
  const m = new THREE.Mesh(_scorchGeo, _scorchMat);
  m.visible = false;
  scene.add(m);
  _scorchDecalPool.push({ mesh: m, life: 0, active: false });
}

function spawnDecal(pool, pos, normal, duration = 18) {
  let slot = pool.find(d => !d.active);
  if (!slot) {
    // Recicla o mais antigo
    slot = pool[0];
    for (const d of pool) { if (d.life < slot.life) slot = d; }
  }
  const mesh = slot.mesh;
  const n = normal ? normal.clone().normalize() : new THREE.Vector3(0, 1, 0);

  // Eleva sutilmente na normal para evitar qualquer z-fighting
  mesh.position.copy(pos).addScaledVector(n, 0.015);
  mesh.lookAt(mesh.position.clone().add(n));
  mesh.rotateZ(Math.random() * Math.PI * 2);

  mesh.visible = true;
  slot.active = true;
  slot.life = duration;
}

// ---------------------------------------------------------------------
// 3. POOL DE TRACERS BALÍSTICOS CINÉTICOS
// ---------------------------------------------------------------------

const TRACER_POOL_SIZE = 30;
const _tracerMat = new THREE.LineBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0.95 });
const _tracerPlasmaMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.95 });
const _tracerPool = [];

for (let i = 0; i < TRACER_POOL_SIZE; i++) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(geo, _tracerMat);
  line.visible = false;
  line.frustumCulled = false;
  scene.add(line);
  _tracerPool.push({ line, active: false, life: 0 });
}

function spawnTracer(origin, dir, dist, isPlasma = false) {
  let slot = _tracerPool.find(t => !t.active);
  if (!slot) {
    let oldest = _tracerPool[0];
    for (const t of _tracerPool) { if (t.life < oldest.life) oldest = t; }
    slot = oldest;
  }

  slot.line.material = isPlasma ? _tracerPlasmaMat : _tracerMat;
  const end = origin.clone().addScaledVector(dir, dist);
  const posAttr = slot.line.geometry.attributes.position;
  posAttr.array[0] = origin.x; posAttr.array[1] = origin.y; posAttr.array[2] = origin.z;
  posAttr.array[3] = end.x;    posAttr.array[4] = end.y;    posAttr.array[5] = end.z;
  posAttr.needsUpdate = true;
  slot.line.geometry.computeBoundingSphere();
  slot.line.visible = true;
  slot.active = true;
  slot.life = 0.075;
  tracers.push(slot);
}

// ---------------------------------------------------------------------
// 4. PARTÍCULAS DE IMPACTO ESPECÍFICAS POR MATERIAL
// ---------------------------------------------------------------------

const MAX_HIT_EFFECTS = 40;

function spawnHitBurst(pos, color, normal = null, surfaceType = 'generic') {
  if (hitEffects.length >= MAX_HIT_EFFECTS) {
    const old = hitEffects.shift();
    scene.remove(old.pts);
    if (old.pts.geometry) old.pts.geometry.dispose();
    if (old.pts.material) old.pts.material.dispose();
  }

  const isMetal = surfaceType === 'metal';
  const isFlesh = surfaceType === 'flesh';
  const count = isMetal ? 14 : isFlesh ? 12 : 8;

  const positions = new Float32Array(count * 3);
  const velocities = [];

  const baseNorm = normal ? normal.clone().normalize() : new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    // Dispersão cônica ao longo da normal de reflexão
    const speed = isMetal ? (4 + Math.random() * 6) : (2 + Math.random() * 4);
    const vel = baseNorm.clone().multiplyScalar(speed * 0.7);
    vel.x += (Math.random() - 0.5) * speed;
    vel.y += (Math.random() - 0.2) * speed;
    vel.z += (Math.random() - 0.5) * speed;
    velocities.push(vel);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: isMetal ? 0.12 : 0.08,
    transparent: true,
    opacity: 1,
    blending: isMetal ? THREE.AdditiveBlending : THREE.NormalBlending
  });

  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  hitEffects.push({ pts, velocities, life: 0.45, maxLife: 0.45 });
}

// ---------------------------------------------------------------------
// 5. POOL DE CARTUCHOS EJETADOS POR CALIBRE
// ---------------------------------------------------------------------

const _shellGeoPistol = new THREE.CylinderGeometry(0.009, 0.009, 0.024, 6);
const _shellGeoRifle  = new THREE.CylinderGeometry(0.010, 0.010, 0.042, 6);
const _shellGeoShotgun = new THREE.CylinderGeometry(0.018, 0.018, 0.055, 8);

const _shellMatBrass = new THREE.MeshStandardMaterial({ color: 0xd4a836, metalness: 0.9, roughness: 0.25 });
const _shellMatShotgun = new THREE.MeshStandardMaterial({ color: 0xcc2222, metalness: 0.3, roughness: 0.5 });

const SHELL_POOL_SIZE = 20;
const _shellPool = [];

for (let i = 0; i < SHELL_POOL_SIZE; i++) {
  const shell = new THREE.Mesh(_shellGeoRifle, _shellMatBrass);
  shell.visible = false;
  shell.frustumCulled = false;
  scene.add(shell);
  _shellPool.push({ mesh: shell, active: false });
}

function spawnShellCasing(w) {
  let slot = _shellPool.find(s => !s.active);
  if (!slot) {
    slot = _shellPool[0];
    const oldIdx = hitEffects.findIndex(fx => fx.pts === slot.mesh);
    if (oldIdx !== -1) hitEffects.splice(oldIdx, 1);
  }

  const isShotgun = w && (w.key === 'shotgun' || w.key === 'spas');
  const isPistol = w && (w.key === 'pistol' || w.key === 'smg' || w.key === 'akimbo');

  slot.mesh.geometry = isShotgun ? _shellGeoShotgun : (isPistol ? _shellGeoPistol : _shellGeoRifle);
  slot.mesh.material = isShotgun ? _shellMatShotgun : _shellMatBrass;

  const muzzle = worldMuzzlePosition(w);
  slot.mesh.position.copy(muzzle);

  // Vetores de câmera para ejeção tática para a direita e para trás
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

  slot.mesh.position.addScaledVector(right, 0.12).addScaledVector(forward, -0.2);
  slot.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  slot.mesh.visible = true;
  slot.active = true;

  const ejectionSpeed = 2.2 + Math.random() * 1.2;
  const vel = right.multiplyScalar(ejectionSpeed)
    .addScaledVector(up, 1.6 + Math.random() * 0.8)
    .addScaledVector(forward, -0.6 - Math.random() * 0.6);

  hitEffects.push({
    pts: slot.mesh,
    velocities: [vel],
    life: 1.4,
    maxLife: 1.4,
    isShell: true,
    _poolSlot: slot
  });
}

function applyRecoil(amount) {
  recoilOffset += amount;
}

// ---------------------------------------------------------------------
// 6. PROJÉTIL FÍSICO DO LANÇA-FOGUETES (RPG-7)
// ---------------------------------------------------------------------

const activeRockets = [];

function createRocketMesh() {
  const g = new THREE.Group();

  // Ogiva cônica pontiaguda
  const warhead = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.28, 8),
    new THREE.MeshStandardMaterial({ color: 0x3d4a2a, roughness: 0.6, metalness: 0.3 })
  );
  warhead.rotation.x = Math.PI / 2;
  warhead.position.z = -0.15;
  g.add(warhead);

  // Corpo cilíndrico do motor
  const motor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8),
    new THREE.MeshStandardMaterial({ color: 0x242a20, roughness: 0.7, metalness: 0.4 })
  );
  motor.rotation.x = Math.PI / 2;
  motor.position.z = 0.15;
  g.add(motor);

  // Aletas estabilizadoras na cauda
  const finMat = new THREE.MeshStandardMaterial({ color: 0x111612, metalness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.08), finMat);
    fin.rotation.z = (i * Math.PI) / 2;
    fin.position.z = 0.32;
    g.add(fin);
  }

  // Fogo de exaustão na cauda
  const flameSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: (typeof TEX !== 'undefined' && TEX.muzzle) ? TEX.muzzle : null,
      blending: THREE.AdditiveBlending,
      color: 0xffaa33,
      transparent: true
    })
  );
  flameSprite.scale.set(0.35, 0.35, 0.35);
  flameSprite.position.z = 0.42;
  g.add(flameSprite);

  return g;
}

function launchRocket(origin, dir, weapon) {
  const rocketMesh = createRocketMesh();
  rocketMesh.position.copy(origin);
  rocketMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
  scene.add(rocketMesh);

  activeRockets.push({
    mesh: rocketMesh,
    dir: dir.clone().normalize(),
    speed: 72, // ~72 m/s balísticos
    distanceTraveled: 0,
    maxDistance: weapon.range || 240,
    damage: weapon.damage || 220,
    smokeTimer: 0
  });

  // Som potente de lançamento de foguete
  playSound('rocket', { volume: 1.0 });
  addScreenShake(0.08);
}

function updateRockets(dt) {
  for (let i = activeRockets.length - 1; i >= 0; i--) {
    const r = activeRockets[i];
    const step = r.speed * dt;
    r.distanceTraveled += step;

    const prevPos = r.mesh.position.clone();
    r.mesh.position.addScaledVector(r.dir, step);

    // Rastro de fumaça de exaustão cinza contínua
    r.smokeTimer += dt;
    if (r.smokeTimer > 0.02) {
      r.smokeTimer = 0;
      spawnHitBurst(prevPos, 0xd0d5dd);
    }

    // Raycast de colisão no percurso do foguete
    raycaster.set(prevPos, r.dir);
    raycaster.far = step * 1.2;

    const targets = [];
    bots.forEach(b => { if (b.alive) targets.push(...b.hitMeshes); });
    if (typeof beasts !== 'undefined') beasts.forEach(b => { if (b.alive) targets.push(...b.hitMeshes); });
    const collMeshTargets = collidables.map(c => c.mesh);

    const intersects = raycaster.intersectObjects(targets.concat(collMeshTargets), false);

    let hitTerrain = false;
    let hitPos = null;

    if (typeof getTerrainHeight === 'function') {
      const gH = getTerrainHeight(r.mesh.position.x, r.mesh.position.z);
      if (r.mesh.position.y <= gH) {
        hitTerrain = true;
        hitPos = new THREE.Vector3(r.mesh.position.x, gH, r.mesh.position.z);
      }
    }

    if (intersects.length || hitTerrain || r.distanceTraveled >= r.maxDistance) {
      const impactPoint = intersects.length ? intersects[0].point : (hitPos || r.mesh.position);
      explodeRocket(impactPoint, r.damage);
      scene.remove(r.mesh);
      activeRockets.splice(i, 1);
    }
  }
}

function explodeRocket(pos, damage) {
  playSound('explosion');
  addScreenShake(0.12);

  // Luz do clarão explosivo
  const explosionLight = new THREE.PointLight(0xff6622, 8, 30);
  explosionLight.position.copy(pos);
  scene.add(explosionLight);
  setTimeout(() => scene.remove(explosionLight), 250);

  // Decalque de cratera e terra queimada no solo
  let norm = new THREE.Vector3(0, 1, 0);
  if (typeof getTerrainNormal === 'function') {
    norm = getTerrainNormal(pos.x, pos.z);
  }
  spawnDecal(_scorchDecalPool, pos, norm, 24);

  // Efeitos visuais volumétricos
  for (let i = 0; i < 5; i++) {
    const burstPos = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3));
    spawnHitBurst(burstPos, 0xff5511);
    spawnHitBurst(burstPos, 0xffaa33);
  }

  // Esfera expansiva de onda de choque
  const sphereGeo = new THREE.SphereGeometry(3.5, 12, 12);
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.copy(pos);
  scene.add(sphere);
  hitEffects.push({ pts: sphere, velocities: [], life: 0.45, maxLife: 0.45, isExplosion: true });

  const blastRadius = 14;

  // Dano em área em bots
  bots.forEach(bot => {
    if (!bot.alive) return;
    const dist = bot.group.position.distanceTo(pos);
    if (dist < blastRadius) {
      const dmg = damage * (1 - dist / blastRadius);
      registerHit(bot, dmg, bot.group.position.clone().add(new THREE.Vector3(0, 1, 0)), false);
    }
  });

  // Dano em monstros / criaturas
  if (typeof beasts !== 'undefined') {
    beasts.forEach(beast => {
      if (!beast.alive) return;
      const dist = beast.group.position.distanceTo(pos);
      if (dist < blastRadius) {
        const dmg = damage * (1 - dist / blastRadius);
        damageBeast(beast, dmg, beast.group.position.clone().add(new THREE.Vector3(0, 1, 0)), false);
      }
    });
  }

  // Dano acidental no jogador se muito próximo
  const playerDist = yawObject.position.distanceTo(pos);
  if (playerDist < blastRadius && player.alive) {
    const dmg = damage * 0.45 * (1 - playerDist / blastRadius);
    damagePlayer(dmg, pos);
  }
}

// ---------------------------------------------------------------------
// 7. SISTEMA PRINCIPAL DE DISPARO (DO_SHOOT)
// ---------------------------------------------------------------------

function doShoot() {
  const w = currentWeapon();
  const now = performance.now();
  if (reloading) return;

  const ammo = ammoState[currentWeaponIdx];
  if (ammo.inMag <= 0) { tryReload(); return; }
  if (now - lastShotTime < w.fireRate * 1000) return;
  lastShotTime = now;
  ammo.inMag--;
  player.accuracy.shots++;
  updateAmmoHud();

  // Recoil Balístico com componente horizontal orgânico
  applyRecoil(w.recoil);
  const kickVal = w.kick || (w.recoil * 0.5);
  pitch = Math.min(Math.PI / 2 - 0.05, pitch + kickVal);
  yaw += (Math.random() - 0.5) * kickVal * 0.35; // Desvio horizontal
  pitchObject.rotation.x = pitch;
  yawObject.rotation.y = yaw;

  // Áudio com suporte ao Silenciador Tático (Tecla T)
  const soundName = w.soundKind || w.sound || 'rifle';
  if (isSilenced) {
    playSound(soundName, { volume: 0.32, pitch: 1.65 });
  } else {
    playSound(soundName, { volume: 1.0 });
  }

  // Clarão de Boca de Cano (Muzzle Flash) & Luz Dinâmica
  const muzzlePos = worldMuzzlePosition(w);
  if (w.muzzleLocal) {
    flashSprite.position.copy(w.muzzleLocal);
    flashSprite.position.z += recoilOffset;
  }

  // Se silenciado, clarão é praticamente imperceptível e sem luz externa
  if (isSilenced) {
    flashSprite.scale.set(0.18, 0.18, 0.18);
    flashSprite.material.color.setHex(0x555555);
  } else {
    const flashScale = (w.key === 'shotgun' || w.key === 'spas') ? 1.25 :
                       (w.key === 'sniper' || w.key === 'magnum') ? 1.10 :
                       (w.isPlasma) ? 0.95 : 0.70;
    flashSprite.scale.set(flashScale, flashScale, flashScale);
    flashSprite.material.color.setHex(w.isPlasma ? 0x00f0ff : 0xffffff);

    // Ativa luz dinâmica de disparo na boca da arma
    muzzleLight.position.copy(muzzlePos);
    muzzleLight.color.setHex(w.isPlasma ? 0x00f0ff : 0xffaa33);
    muzzleLight.intensity = (w.key === 'sniper' || w.key === 'magnum') ? 5.0 : 3.2;
    muzzleLightTimer = 0.045; // 45 milissegundos
  }

  flashSprite.visible = true;
  flashSprite.material.rotation = Math.random() * Math.PI * 2;
  setTimeout(() => { flashSprite.visible = false; }, 42);

  // Ejeção realista de cartucho quente
  spawnShellCasing(w);

  // Dispersão com base na postura (agachado, correndo ou com mira óptica ADS)
  const isAiming = (camera.fov < settings.fov - 5);
  const stanceSpread = player.crouching ? 0.65 : player.isSliding ? 1.25 : 1.0;
  const adsSpread = isAiming ? 0.45 : 1.0;
  const spreadMult = stanceSpread * adsSpread;

  // Tratar Lança-Foguetes RPG-7 como Projétil Físico
  if (w.isRocket) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    launchRocket(worldMuzzlePosition(w), dir, w);
    return;
  }

  const pellets = w.pellets || 1;
  for (let pellet = 0; pellet < pellets; pellet++) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.x += (Math.random() - 0.5) * w.spread * spreadMult;
    dir.y += (Math.random() - 0.5) * w.spread * spreadMult;
    dir.z += (Math.random() - 0.5) * w.spread * spreadMult;
    dir.normalize();

    const origin = new THREE.Vector3();
    camera.getWorldPosition(origin);
    raycaster.set(origin, dir);
    raycaster.far = w.range || 260;

    const targets = [];
    bots.forEach(b => { if (b.alive) targets.push(...b.hitMeshes); });
    if (typeof beasts !== 'undefined') beasts.forEach(b => { if (b.alive) targets.push(...b.hitMeshes); });

    let terrainDist = -1;
    if (typeof raycastTerrain === 'function') {
      terrainDist = raycastTerrain(origin, dir, raycaster.far);
    }

    const intersects = raycaster.intersectObjects(targets.concat(collidables.map(c => c.mesh)), false);
    let hitDist = (terrainDist > 0) ? terrainDist : 160;

    if (intersects.length && (terrainDist < 0 || intersects[0].distance < terrainDist)) {
      hitDist = intersects[0].distance;
      const hit = intersects[0];
      const hitObj = hit.object;
      const hitPoint = hit.point;

      // Normal da superfície no ponto de impacto
      let hitNormal = new THREE.Vector3(0, 1, 0);
      if (hit.face && hit.face.normal) {
        hitNormal.copy(hit.face.normal).transformDirection(hitObj.matrixWorld);
      } else {
        hitNormal.copy(dir).multiplyScalar(-1);
      }

      const bot = bots.find(b => b.hitMeshes.includes(hitObj));
      const beast = typeof beasts !== 'undefined' ? beasts.find(b => b.hitMeshes.includes(hitObj)) : null;

      if (bot) {
        const head = bot.head === hitObj;
        registerHit(bot, w.damage * (head ? 2.2 : 1.0), hitPoint, head);
        // Decalque de sangue na superfície mais próxima
        spawnDecal(_bloodDecalPool, hitPoint, hitNormal, 16);
      } else if (beast) {
        const head = beast.head === hitObj;
        damageBeast(beast, w.damage * (head ? 2.2 : 1.0), hitPoint, head);
        showHitmarker();
        spawnDecal(_bloodDecalPool, hitPoint, hitNormal, 16);
      } else {
        // Impacto em estrutura sólida / parede / obstáculo
        const burstCol = w.isPlasma ? 0x00f0ff : 0xd8dde4;
        spawnHitBurst(hitPoint, burstCol, hitNormal, 'metal');
        spawnDecal(_bulletDecalPool, hitPoint, hitNormal, 18);
      }

      // Penetração Balística Tática (Wallbang para Snipers e Fuzis Pesados)
      if (w.key === 'sniper' || w.key === 'magnum' || w.key === 'scar') {
        const penOrigin = hitPoint.clone().addScaledVector(dir, 0.4);
        raycaster.set(penOrigin, dir);
        raycaster.far = 80;
        const penHits = raycaster.intersectObjects(targets, false);
        if (penHits.length) {
          const penObj = penHits[0].object;
          const targetBot = bots.find(b => b.hitMeshes.includes(penObj));
          if (targetBot) {
            registerHit(targetBot, w.damage * 0.6, penHits[0].point, false);
          }
        }
      }

    } else if (terrainDist > 0) {
      const terrainHitPos = origin.clone().addScaledVector(dir, terrainDist);
      const dustColors = {
        desert: 0xd4a853,
        arctic: 0xddeeff,
        jungle_temple: 0x446622,
        void_core: 0x8833cc,
        neon_rust: 0x778899
      };
      const burstCol = w.isPlasma ? 0x00f0ff : (dustColors[selectedMap] || 0x999999);

      let terrainNorm = new THREE.Vector3(0, 1, 0);
      if (typeof getTerrainNormal === 'function') {
        terrainNorm = getTerrainNormal(terrainHitPos.x, terrainHitPos.z);
      }
      spawnHitBurst(terrainHitPos, burstCol, terrainNorm, 'terrain');
      spawnDecal(_bulletDecalPool, terrainHitPos, terrainNorm, 16);
    }

    if (pellet === 0 || (pellets > 1 && pellet % 2 === 0)) {
      spawnTracer(worldMuzzlePosition(w), dir, hitDist, w.isPlasma);
    }
  }

  addScreenShake(kickVal * (w.key === 'sniper' ? 0.7 : 0.35));
}

function registerHit(bot, dmg, point, isHeadshot = false) {
  bot.health -= dmg;
  player.accuracy.hits++;
  showHitmarker();

  // Áudio diferenciado de estalo crítico no headshot
  if (isHeadshot) {
    playSound('hit', { pitch: 1.5, volume: 1.3 });
  } else {
    playSound('hit', { pitch: 1.0, volume: 1.0 });
  }

  spawnHitBurst(point, 0xff2828, null, 'flesh');

  if (bot.alive && bot.health > 0) {
    bot.dodgeTimer = 0.45;
    bot.dodgeDir = new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2).normalize();
  }

  if (isHeadshot) {
    addKillFeed('💥 TIRO NA CABEÇA');
    player.headshots++;
  }
  if (bot.health <= 0 && bot.alive) {
    killBot(bot, isHeadshot);
  }
}

// ---------------------------------------------------------------------
// 8. RECARGA
// ---------------------------------------------------------------------

function tryReload() {
  if (reloading) return;
  const ammo = ammoState[currentWeaponIdx];
  const w = currentWeapon();
  if (ammo.inMag >= w.magSize || ammo.reserve <= 0) return;
  reloading = true;
  playSound('reload');
  reloadEndTime = performance.now() + (w.key === 'rifle' ? 1700 : (w.key === 'sniper' ? 2200 : 1200));
  const el = document.getElementById('reloadText');
  if (el) el.classList.add('show');
}

function finishReload() {
  const ammo = ammoState[currentWeaponIdx];
  const w = currentWeapon();
  const needed = w.magSize - ammo.inMag;
  const take = Math.min(needed, ammo.reserve);
  ammo.inMag += take;
  ammo.reserve -= take;
  reloading = false;
  const el = document.getElementById('reloadText');
  if (el) el.classList.remove('show');
  updateAmmoHud();
}

// ---------------------------------------------------------------------
// 9. GRANADAS TÁTICAS DE FRAGMENTAÇÃO (M67)
// ---------------------------------------------------------------------

function createTacticalGrenadeMesh() {
  const g = new THREE.Group();

  // Corpo ranhurado verde-oliva da granada (Pineapple pattern)
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0x3e4a2c,
      roughness: 0.65,
      metalness: 0.35,
      map: (typeof TEX !== 'undefined' && TEX.metalPanel) ? TEX.metalPanel : null
    })
  );
  g.add(body);

  // Espoleta / Detonador cilíndrico de topo
  const fuse = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.08, 8),
    new THREE.MeshStandardMaterial({ color: 0x9098a0, metalness: 0.85, roughness: 0.2 })
  );
  fuse.position.y = 0.12;
  g.add(fuse);

  // Alavanca de segurança metálica
  const spoon = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.14, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x181a1c, metalness: 0.9 })
  );
  spoon.position.set(0.04, 0.07, 0);
  g.add(spoon);

  // LED Vermelho pulsante que indica o fusível ativado
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  led.position.set(0, 0.16, 0);
  g.add(led);

  g.userData.led = led;
  return g;
}

function throwGrenade() {
  if (!gameRunning || !player.alive) return;
  if (inventory.grenades <= 0) { showStatus('SEM GRANADAS'); return; }
  const now = performance.now();
  if (now - lastGrenadeTime < GRENADE_COOLDOWN) return;
  lastGrenadeTime = now;
  inventory.grenades--;
  updateGrenadeHud();
  updateInventory();

  const grenadeMesh = createTacticalGrenadeMesh();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const origin = yawObject.position.clone();
  origin.y += 0.5;
  grenadeMesh.position.copy(origin);
  scene.add(grenadeMesh);

  const velocity = dir.clone().multiplyScalar(19);
  velocity.y += 6.5;

  grenadeObjects.push({
    mesh: grenadeMesh,
    velocity: velocity,
    life: GRENADE_FUSE,
    bounces: 0,
    blinkTimer: 0
  });

  playSound('dash');
  showStatus('💣 GRANADA LANÇADA!', 900);
}

function updateGrenades(dt) {
  // 1. Atualizar Foguetes RPG ativos
  updateRockets(dt);

  // 2. Decaimento da Luz Dinâmica de Disparo
  if (muzzleLightTimer > 0) {
    muzzleLightTimer -= dt;
    if (muzzleLightTimer <= 0) muzzleLight.intensity = 0;
  }

  // 3. Atualizar Granadas M67
  for (let i = grenadeObjects.length - 1; i >= 0; i--) {
    const g = grenadeObjects[i];
    g.life -= dt;
    g.blinkTimer += dt;

    // LED de fusível pisca mais rápido conforme chega ao fim
    if (g.mesh.userData && g.mesh.userData.led) {
      const freq = (g.life < 1.0) ? 0.08 : 0.20;
      g.mesh.userData.led.visible = (g.blinkTimer % (freq * 2) < freq);
    }

    g.velocity.y += GRAVITY * dt;
    g.mesh.position.addScaledVector(g.velocity, dt);
    g.mesh.rotation.x += dt * 9;
    g.mesh.rotation.z += dt * 6;

    const groundY = (typeof getTerrainHeight === 'function') ? getTerrainHeight(g.mesh.position.x, g.mesh.position.z) : 0;
    if (g.mesh.position.y < groundY + 0.15) {
      g.mesh.position.y = groundY + 0.15;
      g.velocity.y *= -0.38;
      g.velocity.x *= 0.62;
      g.velocity.z *= 0.62;
      g.bounces++;
    }

    if (g.life <= 0) {
      explodeGrenade(g.mesh.position.clone());
      scene.remove(g.mesh);
      grenadeObjects.splice(i, 1);
    }
  }

  // 4. Atualizar tempo de vida dos decals
  _bulletDecalPool.forEach(d => {
    if (d.active) {
      d.life -= dt;
      if (d.life <= 0) { d.mesh.visible = false; d.active = false; }
    }
  });
  _bloodDecalPool.forEach(d => {
    if (d.active) {
      d.life -= dt;
      if (d.life <= 0) { d.mesh.visible = false; d.active = false; }
    }
  });
  _scorchDecalPool.forEach(d => {
    if (d.active) {
      d.life -= dt;
      if (d.life <= 0) { d.mesh.visible = false; d.active = false; }
    }
  });
}

function explodeGrenade(pos) {
  playSound('explosion');
  addScreenShake(0.09);

  const explosionLight = new THREE.PointLight(0xff6622, 6, 24);
  explosionLight.position.copy(pos);
  scene.add(explosionLight);
  setTimeout(() => scene.remove(explosionLight), 280);

  // Decalque de queimadura no chão
  let norm = new THREE.Vector3(0, 1, 0);
  if (typeof getTerrainNormal === 'function') {
    norm = getTerrainNormal(pos.x, pos.z);
  }
  spawnDecal(_scorchDecalPool, pos, norm, 24);

  for (let i = 0; i < 4; i++) {
    const burstPos = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.5, Math.random() * 2, (Math.random() - 0.5) * 2.5));
    spawnHitBurst(burstPos, 0xff5511);
    spawnHitBurst(burstPos, 0xffaa44);
  }

  const sphereGeo = new THREE.SphereGeometry(GRENADE_RADIUS * 0.35, 12, 12);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0xff3b00, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.copy(pos);
  scene.add(sphere);
  hitEffects.push({
    pts: sphere, velocities: [],
    life: 0.42, maxLife: 0.42,
    isExplosion: true
  });

  bots.forEach(bot => {
    if (!bot.alive) return;
    const dist = bot.group.position.distanceTo(pos);
    if (dist < GRENADE_RADIUS) {
      const dmg = GRENADE_DAMAGE * (1 - dist / GRENADE_RADIUS);
      registerHit(bot, dmg, bot.group.position.clone().add(new THREE.Vector3(0, 1, 0)), false);
    }
  });

  if (typeof beasts !== 'undefined') {
    beasts.forEach(beast => {
      if (!beast.alive) return;
      const dist = beast.group.position.distanceTo(pos);
      if (dist < GRENADE_RADIUS) {
        const dmg = GRENADE_DAMAGE * (1 - dist / GRENADE_RADIUS);
        damageBeast(beast, dmg, beast.group.position.clone().add(new THREE.Vector3(0, 1, 0)), false);
      }
    });
  }

  const playerDist = yawObject.position.distanceTo(pos);
  if (playerDist < GRENADE_RADIUS && player.alive) {
    const dmg = GRENADE_DAMAGE * 0.5 * (1 - playerDist / GRENADE_RADIUS);
    damagePlayer(dmg, pos);
  }
}

// ---------------------------------------------------------------------
// 10. AIR DROP TÁTICO MILITAR COM FEIXE DE LUZ CELESTE
// ---------------------------------------------------------------------

function spawnAirDrop() {
  const x = (Math.random() * 2 - 1) * (WORLD_SIZE - 40);
  const z = (Math.random() * 2 - 1) * (WORLD_SIZE - 40);
  const startY = 88;

  const group = new THREE.Group();

  // Caixote militar com faixas de perigo industrial PBR
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x1d364f,
    metalness: 0.7,
    roughness: 0.35,
    map: (typeof TEX !== 'undefined' && TEX.metalPanel) ? TEX.metalPanel : null
  });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 1.3), crateMat);
  crate.position.y = 0.65;
  crate.castShadow = true;
  group.add(crate);

  // Faixa de advertência amarela e preta
  const stripeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.25, 1.32),
    new THREE.MeshStandardMaterial({
      map: (typeof TEX !== 'undefined' && TEX.hazardStripes) ? TEX.hazardStripes : null,
      metalness: 0.3,
      roughness: 0.5
    })
  );
  stripeMesh.position.y = 0.65;
  group.add(stripeMesh);

  // Paraquedas translúcido com nervuras
  const chuteMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const chute = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2.0, 14, 1, true), chuteMat);
  chute.position.y = 4.0;
  group.add(chute);

  // Cordas do paraquedas conectando ao caixote
  const ropeMat = new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.7 });
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const ropeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(angle) * 2.5, 3.2, Math.sin(angle) * 2.5),
      new THREE.Vector3(Math.cos(angle) * 0.8, 1.3, Math.sin(angle) * 0.8)
    ]);
    group.add(new THREE.Line(ropeGeo, ropeMat));
  }

  // Sinalizador tático de topo com fumaça
  const flareLight = new THREE.PointLight(0x00f0ff, 3, 20);
  flareLight.position.y = 1.6;
  group.add(flareLight);

  group.position.set(x, startY, z);
  scene.add(group);

  airDrops.push({
    group,
    chute,
    targetY: (typeof getTerrainHeight === 'function') ? getTerrainHeight(x, z) : 0,
    landed: false,
    x, z
  });

  playSound('airdrop');
  showStatus('📦 AIR DROP TÁTICO A CAMINHO — BUSQUE O CAIXOTE!', 3500);
}

function updateAirDrops(dt) {
  for (let i = airDrops.length - 1; i >= 0; i--) {
    const ad = airDrops[i];
    if (ad.landed) continue;

    // Descida suave com paraquedas
    ad.group.position.y -= 7.2 * dt;

    // Oscilação suave do caixote pelo vento
    ad.group.rotation.z = Math.sin(performance.now() * 0.003) * 0.06;

    if (ad.group.position.y <= ad.targetY) {
      ad.group.position.y = ad.targetY;
      ad.landed = true;
      ad.chute.visible = false;

      // Adiciona Baú de Loot no chão
      if (typeof addLootChest === 'function') {
        addLootChest(ad.x, ad.z);
      }

      // Decalque de marca no chão
      let norm = new THREE.Vector3(0, 1, 0);
      if (typeof getTerrainNormal === 'function') {
        norm = getTerrainNormal(ad.x, ad.z);
      }
      spawnDecal(_scorchDecalPool, new THREE.Vector3(ad.x, ad.targetY, ad.z), norm, 35);

      // Coluna vertical de luz tática celeste (TEX.beam) guiando o jogador
      if (typeof TEX !== 'undefined' && TEX.beam) {
        const beamGeo = new THREE.CylinderGeometry(0.6, 0.6, 90, 8, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
          map: TEX.beam,
          color: 0x00f0ff,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        beamMesh.position.set(ad.x, ad.targetY + 45, ad.z);
        scene.add(beamMesh);
        // Desvanece após 25 segundos
        setTimeout(() => scene.remove(beamMesh), 25000);
      }

      scene.remove(ad.group);
      airDrops.splice(i, 1);
      showStatus('📦 AIR DROP TOCOU O SOLO! SINALIZADOR ATIVO', 2500);
      playSound('jump');
    }
  }
}
