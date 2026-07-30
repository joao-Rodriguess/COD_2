// =====================================================================
// PLAYER.JS — MOVIMENTO DO JOGADOR
// =====================================================================

function damagePlayer(amount, attackerPos) {
  if (!player.alive) return;
  lastDamageTime = performance.now();

  let finalDmg = amount;
  if (player.armor > 0) {
    const armorAbsorb = Math.min(player.armor, amount * 0.7);
    player.armor -= armorAbsorb;
    finalDmg -= armorAbsorb;
    updateArmorHud();
  }

  player.health -= finalDmg;

  const flash = document.getElementById('damageFlash');
  flash.classList.add('show');
  setTimeout(() => flash.classList.remove('show'), 220);

  addScreenShake(0.025);

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
  player.isSliding = false;
  player.slideTimer = 0;
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

function checkBuildingCollision(nextPos) {
  const r = player.radius;
  const pMinY = nextPos.y - player.height * 0.8;
  const pMaxY = nextPos.y + 0.2;

  for (let iter = 0; iter < 2; iter++) {
    for (let i = 0; i < collidables.length; i++) {
      const box = collidables[i].box;
      if (pMaxY < box.min.y || pMinY > box.max.y) continue;

      const closestX = Math.max(box.min.x, Math.min(nextPos.x, box.max.x));
      const closestZ = Math.max(box.min.z, Math.min(nextPos.z, box.max.z));
      const dx = nextPos.x - closestX;
      const dz = nextPos.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < r * r) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const pushDist = r - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        nextPos.x += nx * pushDist;
        nextPos.z += nz * pushDist;
      }
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

function updatePlayerMovement(dt) {
  if (!player.alive || dropActive || inPlane) return; // Se estiver no avião ou em queda livre, plane.js gerencia!

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

  // Processar Inclinada de Canto (Lean Q / E)
  const targetLean = isLeaningLeft ? -0.22 : isLeaningRight ? 0.22 : 0;
  leanAngle += (targetLean - leanAngle) * dt * 10;
  camera.rotation.z = leanAngle;

  // Stamina & Sprint
  const wantsSprint = keys['ShiftLeft'] && isMoving && !player.crouching && !player.isSliding;
  let sprinting = false;

  if (wantsSprint && !player.staminaExhausted && player.stamina > 0) {
    sprinting = true;
    player.stamina = Math.max(0, player.stamina - 20 * dt);
    if (player.stamina <= 0) player.staminaExhausted = true;
  } else {
    const regenRate = isMoving ? 8 : 15;
    player.stamina = Math.min(player.maxStamina, player.stamina + regenRate * dt);
    if (player.staminaExhausted && player.stamina > 30) player.staminaExhausted = false;
  }
  updateStaminaHud();

  // Slide Tático
  if (player.isSliding) {
    player.slideTimer -= dt;
    const slideSpeed = player.speed * 1.85 * (player.slideTimer / 0.6);
    const nextPos = yawObject.position.clone().addScaledVector(player.slideDir, slideSpeed * dt);
    nextPos.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.x));
    nextPos.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.z));
    checkBuildingCollision(nextPos);
    yawObject.position.x = nextPos.x;
    yawObject.position.z = nextPos.z;

    player.crouchLerp += (1.2 - player.crouchLerp) * dt * 12;

    if (player.slideTimer <= 0) {
      player.isSliding = false;
      player.crouching = true;
      updateCrouchHud();
    }

    player.velocity.y += GRAVITY * dt;
    yawObject.position.y += player.velocity.y * dt;
    const floorY = floorHeightAt(yawObject.position.x, yawObject.position.z) - 0.9;
    if (yawObject.position.y <= floorY) {
      yawObject.position.y = floorY;
      player.velocity.y = 0;
      player.onGround = true;
    }
    return;
  }

  // Agachamento Lerp
  const targetCrouch = player.crouching ? 1 : 0;
  player.crouchLerp += (targetCrouch - player.crouchLerp) * dt * 10;
  const crouchHeightOffset = player.crouchLerp * -0.8;

  const crouchSpeedMult = player.crouching ? 0.5 : 1.0;
  const exhaustedMult = player.staminaExhausted ? 0.75 : 1.0;
  const speed = player.speed * (sprinting ? player.sprintMult : 1) * crouchSpeedMult * exhaustedMult;

  // Dash Update
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
    return;
  }

  // Movimento Normal + Colisão Impenetrável de Parede
  const nextPos = yawObject.position.clone();
  nextPos.x += moveX * speed * dt;
  nextPos.z += moveZ * speed * dt;
  nextPos.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.x));
  nextPos.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.z));

  checkBuildingCollision(nextPos);

  yawObject.position.x = nextPos.x;
  yawObject.position.z = nextPos.z;

  // Pulo & Gravidade
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

  // View Bob + Lean Offset na Arma
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

  recoilOffset *= 0.85;

  const w = currentWeapon();
  weaponGroup.position.set(
    WEAPON_BASE_POS.x + bobX + leanAngle * 0.2,
    WEAPON_BASE_POS.y + bobY,
    WEAPON_BASE_POS.z
  );
  w.mesh.position.set(0, 0, recoilOffset);

  if (player.health < player.maxHealth && performance.now() - lastDamageTime > 4000) {
    player.health = Math.min(player.maxHealth, player.health + dt * 4);
    updateHealthHud();
  }
}

function performDash() {
  if (!gameRunning || !player.alive || player.crouching || player.isSliding) return;
  const now = performance.now();
  if (now - lastDashTime < DASH_COOLDOWN) return;
  if (player.stamina < DASH_COST) { showStatus('STAMINA INSUFICIENTE'); return; }

  lastDashTime = now;
  player.stamina -= DASH_COST;
  updateStaminaHud();

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

function toggleCrouchOrSlide() {
  if (!gameRunning || !player.alive) return;

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).negate();
  const sprinting = keys['ShiftLeft'] && (keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD']);

  if (sprinting && player.onGround && !player.isSliding && player.stamina >= 15) {
    player.isSliding = true;
    player.slideTimer = 0.6;
    player.slideDir.copy(forward);
    player.stamina -= 15;
    updateStaminaHud();
    playSound('slide');
    spawnHitBurst(yawObject.position.clone(), 0xaaaaaa);
    showStatus('SLIDE TÁTICO', 500);
    return;
  }

  player.crouching = !player.crouching;
  updateCrouchHud();
}
