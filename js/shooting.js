// =====================================================================
// SHOOTING.JS — Tiro, Efeitos, Recarga + GRANADAS
// =====================================================================

function worldMuzzlePosition(w) {
  return w.muzzleLocal.clone().applyMatrix4(camera.matrixWorld);
}

function spawnTracer(origin, dir, dist) {
  const end = origin.clone().add(dir.clone().multiplyScalar(dist));
  const geo = new THREE.BufferGeometry().setFromPoints([origin, end]);
  const mat = new THREE.LineBasicMaterial({ color: 0xfff4c2, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  tracers.push({ line, life: 0.06 });
}

function spawnHitBurst(pos, color) {
  const count = 10;
  const positions = new Float32Array(count * 3);
  const velocities = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;
    velocities.push(new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color, size: 0.09, transparent: true, opacity: 1 });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  hitEffects.push({ pts, velocities, life: 0.5, maxLife: 0.5 });
}

// --- Ejeção de cartucho ---
function spawnShellCasing() {
  const shellGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.04, 6);
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xd4a836, metalness: 0.8, roughness: 0.3 });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  const muzzle = worldMuzzlePosition(currentWeapon());
  shell.position.copy(muzzle);
  shell.position.x += (Math.random() - 0.5) * 0.1;
  scene.add(shell);

  const vel = new THREE.Vector3(
    (Math.random() - 0.3) * 3,
    2 + Math.random() * 2,
    (Math.random() - 0.5) * 2
  );
  hitEffects.push({
    pts: shell, velocities: [vel], life: 1.2, maxLife: 1.2,
    isShell: true
  });
}

function applyRecoil(amount) {
  recoilOffset += amount;
}

// =====================================================================
// TIRO PRINCIPAL
// =====================================================================
function doShoot() {
  const w = currentWeapon();
  const now = performance.now();
  if (reloading) return;
  const ammo = ammoState[currentWeaponIdx];
  if (ammo.inMag <= 0) { tryReload(); return; }
  if (now - lastShotTime < w.fireRateMs) return;
  lastShotTime = now;
  ammo.inMag--;
  player.accuracy.shots++;
  updateAmmoHud();

  applyRecoil(w.recoil);
  pitch = Math.max(-Math.PI / 2 + 0.05, pitch - w.kick);
  pitchObject.rotation.x = pitch;
  playSound(w.sound);
  flashSprite.visible = true;
  flashSprite.material.rotation = Math.random() * Math.PI;
  setTimeout(() => { flashSprite.visible = false; }, 45);

  // Ejetar cartucho
  spawnShellCasing();

  // Spread melhor quando agachado
  const spreadMult = player.crouching ? 0.6 : 1.0;

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
    raycaster.far = 260;

    const targets = [];
    bots.forEach(b => { if (b.alive) targets.push(...b.hitMeshes); });
    const intersects = raycaster.intersectObjects(targets.concat(collidables.map(c => c.mesh)), false);
    let hitDist = 100;
    if (intersects.length) {
      hitDist = intersects[0].distance;
      const hitObj = intersects[0].object;
      const bot = bots.find(b => b.hitMeshes.includes(hitObj));
      if (bot) {
        const head = bot.head === hitObj;
        registerHit(bot, w.damage * (head ? 2 : 1), intersects[0].point, head);
      } else {
        spawnHitBurst(intersects[0].point, 0xcccccc);
      }
    }
    if (pellet === 0) spawnTracer(worldMuzzlePosition(w), dir, hitDist);
  }

  // Screen shake leve ao atirar
  addScreenShake(w.kick * 0.3);
}

function registerHit(bot, dmg, point, isHeadshot = false) {
  bot.health -= dmg;
  player.accuracy.hits++;
  showHitmarker();
  playSound('hit');
  spawnHitBurst(point, 0xff3838);

  // Bot esquiva ao receber dano (nova mecânica)
  if (bot.alive && bot.health > 0) {
    bot.dodgeTimer = 0.4;
    bot.dodgeDir = new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2).normalize();
  }

  if (isHeadshot) {
    addKillFeed('ACERTO NA CABEÇA');
    player.headshots++;
  }
  if (bot.health <= 0 && bot.alive) {
    killBot(bot, isHeadshot);
  }
}

// =====================================================================
// RECARGA
// =====================================================================
function tryReload() {
  if (reloading) return;
  const ammo = ammoState[currentWeaponIdx];
  const w = currentWeapon();
  if (ammo.inMag >= w.magSize || ammo.reserve <= 0) return;
  reloading = true;
  playSound('reload');
  reloadEndTime = performance.now() + (w.key === 'rifle' ? 1700 : 1150);
  document.getElementById('reloadText').classList.add('show');
}

function finishReload() {
  const ammo = ammoState[currentWeaponIdx];
  const w = currentWeapon();
  const needed = w.magSize - ammo.inMag;
  const take = Math.min(needed, ammo.reserve);
  ammo.inMag += take;
  ammo.reserve -= take;
  reloading = false;
  document.getElementById('reloadText').classList.remove('show');
  updateAmmoHud();
}

// =====================================================================
// GRANADAS
// =====================================================================
function throwGrenade() {
  if (!gameRunning || !player.alive) return;
  if (inventory.grenades <= 0) { showStatus('SEM GRANADAS'); return; }
  const now = performance.now();
  if (now - lastGrenadeTime < GRENADE_COOLDOWN) return;
  lastGrenadeTime = now;
  inventory.grenades--;
  updateGrenadeHud();
  updateInventory();

  // Criar mesh da granada
  const grenadeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 0.7, metalness: 0.3 })
  );
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const origin = yawObject.position.clone();
  origin.y += 0.5;
  grenadeMesh.position.copy(origin);
  scene.add(grenadeMesh);

  const velocity = dir.clone().multiplyScalar(18);
  velocity.y += 6;

  grenadeObjects.push({
    mesh: grenadeMesh,
    velocity: velocity,
    life: GRENADE_FUSE,
    bounces: 0
  });

  playSound('dash');
  showStatus('GRANADA LANÇADA', 800);
}

function updateGrenades(dt) {
  for (let i = grenadeObjects.length - 1; i >= 0; i--) {
    const g = grenadeObjects[i];
    g.life -= dt;

    // Física
    g.velocity.y += GRAVITY * dt;
    g.mesh.position.addScaledVector(g.velocity, dt);
    g.mesh.rotation.x += dt * 8;
    g.mesh.rotation.z += dt * 5;

    // Quicar no chão
    const groundY = getTerrainHeight(g.mesh.position.x, g.mesh.position.z);
    if (g.mesh.position.y < groundY + 0.15) {
      g.mesh.position.y = groundY + 0.15;
      g.velocity.y *= -0.35;
      g.velocity.x *= 0.6;
      g.velocity.z *= 0.6;
      g.bounces++;
    }

    // Explodir
    if (g.life <= 0) {
      explodeGrenade(g.mesh.position.clone());
      scene.remove(g.mesh);
      grenadeObjects.splice(i, 1);
    }
  }
}

function explodeGrenade(pos) {
  playSound('explosion');
  addScreenShake(0.06);

  // Efeito visual: esfera de luz
  const explosionLight = new THREE.PointLight(0xff6622, 5, 20);
  explosionLight.position.copy(pos);
  scene.add(explosionLight);
  setTimeout(() => scene.remove(explosionLight), 300);

  // Partículas de explosão
  for (let i = 0; i < 3; i++) {
    const burstPos = pos.clone();
    burstPos.x += (Math.random() - 0.5) * 2;
    burstPos.y += Math.random() * 2;
    burstPos.z += (Math.random() - 0.5) * 2;
    spawnHitBurst(burstPos, 0xff6622);
    spawnHitBurst(burstPos, 0xffaa44);
  }

  // Esfera de explosão visual
  const sphereGeo = new THREE.SphereGeometry(GRENADE_RADIUS * 0.3, 12, 12);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0xff4400, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.copy(pos);
  scene.add(sphere);
  hitEffects.push({
    pts: sphere, velocities: [],
    life: 0.4, maxLife: 0.4,
    isExplosion: true
  });

  // Dano em área nos bots
  bots.forEach(bot => {
    if (!bot.alive) return;
    const dist = bot.group.position.distanceTo(pos);
    if (dist < GRENADE_RADIUS) {
      const dmg = GRENADE_DAMAGE * (1 - dist / GRENADE_RADIUS);
      bot.health -= dmg;
      spawnHitBurst(bot.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xff3838);
      if (bot.health <= 0 && bot.alive) {
        killBot(bot, false);
      }
    }
  });

  // Dano no jogador
  const playerDist = yawObject.position.distanceTo(pos);
  if (playerDist < GRENADE_RADIUS && player.alive) {
    const dmg = GRENADE_DAMAGE * 0.5 * (1 - playerDist / GRENADE_RADIUS);
    damagePlayer(dmg);
  }
}
