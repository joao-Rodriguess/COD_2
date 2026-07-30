// =====================================================================
// PLAYER.JS — Movimento, Colisão, Dano, Stamina, Agachamento, Dash
// =====================================================================

// =====================================================================
// DANO AO JOGADOR (com Armadura + Direção)
// =====================================================================
function damagePlayer(amount, attackerPos) {
  if (!player.alive) return;
  lastDamageTime = performance.now();

  // Armadura absorve 70% do dano
  let finalDmg = amount;
  if (player.armor > 0) {
    const armorAbsorb = Math.min(player.armor, amount * 0.7);
    player.armor -= armorAbsorb;
    finalDmg -= armorAbsorb;
    updateArmorHud();
  }

  player.health -= finalDmg;

  // Flash de dano
  const flash = document.getElementById('damageFlash');
  flash.classList.add('show');
  setTimeout(() => flash.classList.remove('show'), 220);

  // Screen shake
  addScreenShake(0.025);

  // Indicador direcional
  if (attackerPos) {
    showDamageDirection(attackerPos);
  }

  if (player.health <= 0) {
    player.health = 0;
    playerDie();
  }
  updateHealthHud();
}

function playerDie() {
  player.alive = false;
  setWind(false);
  deaths++;
  resetStreaks();
  document.getElementById('deathCount').textContent = deaths;
  document.exitPointerLock();
  saveProgress();
  showGameOverScreen();
}

function respawnPlayer() {
  player.health = 100;
  player.armor = 0;
  player.stamina = 100;
  player.staminaExhausted = false;
  player.crouching = false;
  player.crouchLerp = 0;
  player.alive = true;
  resetStreaks();
  const x = (Math.random() * 2 - 1) * 40;
  const z = (Math.random() * 2 - 1) * 40;
  yawObject.position.set(x, getTerrainHeight(x, z) + 2, z);
  updateHealthHud();
  updateArmorHud();
  updateStaminaHud();
  updateCrouchHud();
}

function useMedkit() {
  if (!player.alive || inventory.medkits <= 0 || player.health >= player.maxHealth) return;
  inventory.medkits--;
  player.health = Math.min(player.maxHealth, player.health + 55);
  updateHealthHud();
  updateInventory();
  showStatus('KIT MÉDICO UTILIZADO');
  playSound('reload');
}

// =====================================================================
// COLISÃO
// =====================================================================
function checkBuildingCollision(nextPos) {
  const r = player.radius;
  for (const c of collidables) {
    const box = c.box;
    const closestX = Math.max(box.min.x, Math.min(nextPos.x, box.max.x));
    const closestZ = Math.max(box.min.z, Math.min(nextPos.z, box.max.z));
    const dx = nextPos.x - closestX;
    const dz = nextPos.z - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < r * r) {
      const dist = Math.sqrt(distSq) || 0.0001;
      const pushX = (dx / dist) * (r - dist);
      const pushZ = (dz / dist) * (r - dist);
      nextPos.x += pushX;
      nextPos.z += pushZ;
    }
  }
  return nextPos;
}

function floorHeightAt(x, z) {
  let floor = getTerrainHeight(x, z) + 2;
  for (const platform of elevatedPlatforms) {
    if (x >= platform.minX && x <= platform.maxX && z >= platform.minZ && z <= platform.maxZ) {
      floor = Math.max(floor, platform.y + 2);
    }
  }
  return floor;
}

// =====================================================================
// MOVIMENTO PRINCIPAL
// =====================================================================
function updatePlayerMovement(dt) {
  if (!player.alive || dropActive) return;
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).negate();
  const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));

  let moveX = 0, moveZ = 0;
  if (keys['KeyW']) { moveX += forward.x; moveZ += forward.z; }
  if (keys['KeyS']) { moveX -= forward.x; moveZ -= forward.z; }
  if (keys['KeyA']) { moveX -= right.x; moveZ -= right.z; }
  if (keys['KeyD']) { moveX += right.x; moveZ += right.z; }

  const len = Math.hypot(moveX, moveZ);
  const isMoving = len > 0.001;
  if (isMoving) { moveX /= len; moveZ /= len; }

  // --- Stamina ---
  const wantsSprint = keys['ShiftLeft'] && isMoving && !player.crouching;
  let sprinting = false;

  if (wantsSprint && !player.staminaExhausted && player.stamina > 0) {
    sprinting = true;
    player.stamina = Math.max(0, player.stamina - 20 * dt);
    if (player.stamina <= 0) {
      player.staminaExhausted = true;
    }
  } else {
    // Regenerar stamina
    const regenRate = isMoving ? 8 : 15;
    player.stamina = Math.min(player.maxStamina, player.stamina + regenRate * dt);
    if (player.staminaExhausted && player.stamina > 30) {
      player.staminaExhausted = false;
    }
  }
  updateStaminaHud();

  // --- Agachamento ---
  const targetCrouch = player.crouching ? 1 : 0;
  player.crouchLerp += (targetCrouch - player.crouchLerp) * dt * 10;
  const crouchHeightOffset = player.crouchLerp * -0.8;

  // --- Velocidade ---
  const crouchSpeedMult = player.crouching ? 0.5 : 1.0;
  const exhaustedMult = player.staminaExhausted ? 0.75 : 1.0;
  const speed = player.speed * (sprinting ? player.sprintMult : 1) * crouchSpeedMult * exhaustedMult;

  // --- Dash ---
  if (dashActive) {
    dashTimer -= dt;
    const dashMove = dashDirection.clone().multiplyScalar(DASH_SPEED * dt);
    const nextPos = yawObject.position.clone();
    nextPos.x += dashMove.x;
    nextPos.z += dashMove.z;
    nextPos.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.x));
    nextPos.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.z));
    checkBuildingCollision(nextPos);
    yawObject.position.x = nextPos.x;
    yawObject.position.z = nextPos.z;
    if (dashTimer <= 0) dashActive = false;
    return; // Durante dash, pular o movimento normal
  }

  // Dentro do avião
  if (inPlane) {
    planeCorridorOffset.x += moveX * speed * dt * 0.35;
    planeCorridorOffset.z += moveZ * speed * dt * 0.35;
    planeCorridorOffset.x = Math.max(-1.2, Math.min(1.2, planeCorridorOffset.x));
    planeCorridorOffset.z = Math.max(-1.0, Math.min(3.0, planeCorridorOffset.z));
    if (isMoving) {
      planeWalkDistance += speed * dt;
      if (planeWalkDistance > 1.8) {
        planeJumpReady = true;
      }
    }
    return;
  }

  // --- Movimento normal ---
  const nextPos = yawObject.position.clone();
  nextPos.x += moveX * speed * dt;
  nextPos.z += moveZ * speed * dt;
  nextPos.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.x));
  nextPos.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.z));
  checkBuildingCollision(nextPos);
  yawObject.position.x = nextPos.x;
  yawObject.position.z = nextPos.z;

  // Pulo
  if (keys['Space'] && player.onGround && !player.crouching) {
    player.velocity.y = JUMP_SPEED;
    player.onGround = false;
  }
  player.velocity.y += GRAVITY * dt;
  yawObject.position.y += player.velocity.y * dt;

  const floorY = floorHeightAt(yawObject.position.x, yawObject.position.z) + crouchHeightOffset;
  if (yawObject.position.y <= floorY) {
    yawObject.position.y = floorY;
    player.velocity.y = 0;
    player.onGround = true;
  }

  // --- View Bob ---
  if (isMoving && player.onGround) {
    bobTime += dt * (sprinting ? 11 : 7.5);
    stepTimer -= dt;
    if (stepTimer <= 0) {
      playSound('step');
      stepTimer = sprinting ? .28 : .42;
    }
  } else {
    stepTimer = 0;
  }
  const bobY = Math.sin(bobTime) * (isMoving ? 0.018 : 0);
  const bobX = Math.cos(bobTime * 0.5) * (isMoving ? 0.012 : 0);

  // --- Recoil ---
  recoilOffset *= 0.85;

  // --- Weapon position ---
  const w = currentWeapon();
  weaponGroup.position.set(
    WEAPON_BASE_POS.x + bobX,
    WEAPON_BASE_POS.y + bobY,
    WEAPON_BASE_POS.z
  );
  w.mesh.position.set(0, 0, recoilOffset);

  // --- Regeneração de vida ---
  if (player.health < player.maxHealth && performance.now() - lastDamageTime > 4000) {
    player.health = Math.min(player.maxHealth, player.health + dt * 4);
    updateHealthHud();
  }
}

// --- Dash ---
function performDash() {
  if (!gameRunning || !player.alive || player.crouching) return;
  const now = performance.now();
  if (now - lastDashTime < DASH_COOLDOWN) return;
  if (player.stamina < DASH_COST) { showStatus('STAMINA INSUFICIENTE'); return; }

  lastDashTime = now;
  player.stamina -= DASH_COST;
  updateStaminaHud();

  // Direção do dash baseada nas teclas
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).negate();
  const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));
  dashDirection.set(0, 0, 0);

  if (keys['KeyA']) dashDirection.sub(right);
  else if (keys['KeyD']) dashDirection.add(right);
  else if (keys['KeyS']) dashDirection.sub(forward);
  else dashDirection.add(forward);

  dashDirection.normalize();
  dashActive = true;
  dashTimer = DASH_DURATION;
  playSound('dash');
  showStatus('DASH', 400);
}

// --- Agachamento ---
function toggleCrouch() {
  if (!gameRunning || !player.alive) return;
  player.crouching = !player.crouching;
  updateCrouchHud();
}
