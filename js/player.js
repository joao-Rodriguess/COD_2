// =====================================================================
// PLAYER.JS — MOTOR FÍSICO DO OPERADOR, INÉRCIA, SWAY, PARKOUR & COMBATE AAA
// (Inércia Cinemática, Step-Up Automático, Wall-Sliding, Slide Cancel,
// Mantle/Vaulting de Muretas, Lissajous Bobbing, Look Sway, Lean com Translação,
// Detecção de Superfícies, Quebra de Colete, Placas Balísticas & Ragdoll Death)
// =====================================================================

// ---------------------------------------------------------------------
// 1. ESTADO INTERNO & VARIÁVEIS DE DINÂMICA DO JOGADOR
// ---------------------------------------------------------------------

let prevYaw = 0;
let prevPitch = 0;
let mouseSwayX = 0;
let mouseSwayY = 0;

let landingDip = 0;
let landingDipVelocity = 0;
let lastGroundedY = 0;
let prevVelocityY = 0;

let breathingTime = 0;
let mantleActive = false;
let mantleTimer = 0;
let mantleDuration = 0.35;
let mantleStartPos = new THREE.Vector3();
let mantleTargetPos = new THREE.Vector3();

let invulnerableTimer = 0;
let deathAnimTimer = 0;
let isDying = false;

// ---------------------------------------------------------------------
// 2. SISTEMA DE DANO, ARMADURA, IMPACTO & MORTE CINEMÁTICA
// ---------------------------------------------------------------------

function damagePlayer(amount, attackerPos) {
  if (!player.alive || invulnerableTimer > 0) return;
  lastDamageTime = performance.now();

  const hadArmor = player.armor > 0;
  let finalDmg = amount;

  if (player.armor > 0) {
    const armorAbsorb = Math.min(player.armor, amount * 0.72);
    player.armor -= armorAbsorb;
    finalDmg -= armorAbsorb;
    updateArmorHud();

    // Som e feedback de quebra de colete / placa estilhaçada
    if (hadArmor && player.armor <= 0) {
      playSound('ui_click', { pitch: 0.45, volume: 1.6 });
      showStatus('⚠️ PLACA DE BLINDAGEM DESTRUÍDA!', 1400);
      addScreenShake(0.045);
    }
  }

  player.health -= finalDmg;

  // Flash vermelho periférico na tela
  const flash = document.getElementById('damageFlash');
  if (flash) {
    flash.classList.add('show');
    setTimeout(() => flash.classList.remove('show'), 220);
  }

  // Flinch / Coice de mira de quem tomou o tiro
  addScreenShake(0.035);
  pitch += (Math.random() - 0.3) * 0.025;
  pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch));
  pitchObject.rotation.x = pitch;

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
  if (!player.alive) return;
  player.alive = false;
  isDying = true;
  deathAnimTimer = 1.2;

  setWind(false);
  deaths++;
  resetStreaks();

  const deathCountEl = document.getElementById('deathCount');
  if (deathCountEl) deathCountEl.textContent = deaths;

  document.exitPointerLock();
  saveProgress();

  // Som de tombo / morte
  playSound('jump', { pitch: 0.5, volume: 1.5 });

  // Exibe a tela de Game Over após a queda da câmera
  setTimeout(() => {
    isDying = false;
    showGameOverScreen();
  }, 1200);
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
  player.velocity.set(0, 0, 0);
  player.alive = true;
  isDying = false;
  mantleActive = false;
  invulnerableTimer = 2.0; // 2 segundos de proteção de spawn

  resetStreaks();

  // Localiza um ponto seguro sobre o terreno
  const spawnAngle = Math.random() * Math.PI * 2;
  const spawnDist = 15 + Math.random() * 35;
  const x = Math.cos(spawnAngle) * spawnDist;
  const z = Math.sin(spawnAngle) * spawnDist;
  const groundH = (typeof getTerrainHeight === 'function') ? getTerrainHeight(x, z) : 0;

  yawObject.position.set(x, groundH + 2.0, z);
  yaw = spawnAngle + Math.PI;
  pitch = 0;
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = 0;
  camera.rotation.set(0, 0, 0);
  camera.position.set(0, 0, 0);

  updateHealthHud();
  updateArmorHud();
  updateStaminaHud();
  updateCrouchHud();
  showStatus('🛡️ OPERADOR IMPLANTADO — PROTEÇÃO DE SPAWN ATIVA', 2000);
}

// ---------------------------------------------------------------------
// 3. UTILITÁRIOS: KITS MÉDICOS & PLACAS DE BLINDAGEM TÁTICAS
// ---------------------------------------------------------------------

function useMedkit() {
  if (!player.alive || inventory.medkits <= 0 || player.health >= player.maxHealth) return;
  inventory.medkits--;
  player.health = Math.min(player.maxHealth, player.health + 60);
  updateHealthHud();
  updateInventory();
  showStatus('💉 KIT MÉDICO UTILIZADO (+60 HP)', 1500);
  playSound('reload');
}

function useArmorPlate() {
  if (!player.alive || player.armor >= player.maxArmor) return;
  // Utiliza suprimentos como placas balísticas
  if (!inventory.supplies || inventory.supplies <= 0) {
    showStatus('SEM PLACAS BALÍSTICAS (COLETE CHEIO DE SUPRIMENTOS)', 1200);
    return;
  }
  inventory.supplies--;
  player.armor = Math.min(player.maxArmor, player.armor + 50);
  updateArmorHud();
  updateInventory();
  showStatus('🛡️ PLACA DE BLINDAGEM INSERIDA (+50 ARMADURA)', 1600);
  playSound('reload', { pitch: 1.25 });
}

// ---------------------------------------------------------------------
// 4. COLISÃO FÍSICA IMPENETRÁVEL COM WALL-SLIDING & STEP-UP
// ---------------------------------------------------------------------

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

        // Empurra para fora da colisão
        nextPos.x += nx * pushDist;
        nextPos.z += nz * pushDist;

        // Wall-Sliding: Anula a velocidade normal contra a parede mantendo o deslizamento tangencial
        const dot = player.velocity.x * nx + player.velocity.z * nz;
        if (dot < 0) {
          player.velocity.x -= dot * nx;
          player.velocity.z -= dot * nz;
        }
      }
    }
  }
  return nextPos;
}

function floorHeightAt(x, z) {
  let floor = (typeof getTerrainHeight === 'function') ? getTerrainHeight(x, z) + 2 : 2;
  for (const platform of elevatedPlatforms) {
    if (x >= platform.minX && x <= platform.maxX && z >= platform.minZ && z <= platform.maxZ) {
      floor = Math.max(floor, platform.y + 2);
    }
  }
  return floor;
}

function isStandingOnPlatform(x, z, y) {
  for (const platform of elevatedPlatforms) {
    if (x >= platform.minX && x <= platform.maxX && z >= platform.minZ && z <= platform.maxZ) {
      if (Math.abs(y - (platform.y + 2)) < 0.4) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------
// 5. ESCALADA TÁTICA DE MURETAS / BARRICADAS (MANTLE / VAULTING)
// ---------------------------------------------------------------------

function checkMantle(forwardDir) {
  if (mantleActive || !player.onGround || player.crouching || player.isSliding) return false;

  const origin = yawObject.position.clone();
  origin.y -= 0.3; // Altura do abdômen

  // Raycast à frente para encontrar borda escalável (0.8m a 2.1m)
  const ray = new THREE.Raycaster(origin, forwardDir, 0.1, 1.35);
  const hits = ray.intersectObjects(collidables.map(c => c.mesh), false);

  if (hits.length > 0) {
    const box = new THREE.Box3().setFromObject(hits[0].object);
    const topY = box.max.y + 2.0;
    const heightDiff = topY - yawObject.position.y;

    // Obstáculo transponível (caixa, mureta, parapeito baixo)
    if (heightDiff > 0.5 && heightDiff < 2.2) {
      mantleActive = true;
      mantleTimer = 0;
      mantleDuration = 0.32;
      mantleStartPos.copy(yawObject.position);
      mantleTargetPos.copy(yawObject.position)
        .addScaledVector(forwardDir, 1.25);
      mantleTargetPos.y = topY;

      playSound('dash', { pitch: 1.4, volume: 0.8 });
      showStatus('MANTLE TÁTICO', 500);
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------
// 6. MOTOR PRINCIPAL DE MOVIMENTAÇÃO DO OPERADOR (UPDATE_PLAYER_MOVEMENT)
// ---------------------------------------------------------------------

function updatePlayerMovement(dt) {
  // Se estiver em queda do avião, plane.js gerencia a física aérea
  if (dropActive || inPlane) return;

  // Animação de Morte Cinemática (Ragdoll Camera Drop)
  if (!player.alive) {
    if (isDying && deathAnimTimer > 0) {
      deathAnimTimer -= dt;
      // Câmera desaba e inclina suavemente no chão
      camera.rotation.z += dt * 1.8;
      pitchObject.rotation.x = Math.max(-0.6, pitchObject.rotation.x - dt * 2.2);
      yawObject.position.y = Math.max(floorHeightAt(yawObject.position.x, yawObject.position.z) - 1.4, yawObject.position.y - dt * 4.5);
    }
    return;
  }

  // Invulnerabilidade temporária pós-spawn
  if (invulnerableTimer > 0) {
    invulnerableTimer -= dt;
  }

  // Teclas de atalho integradas para Placas e Dash
  if (keys['KeyU'] || keys['KeyP'] || keys['KeyB']) {
    useArmorPlate();
    keys['KeyU'] = keys['KeyP'] = keys['KeyB'] = false;
  }
  if (keys['KeyV'] || keys['KeyX']) {
    performDash();
    keys['KeyV'] = keys['KeyX'] = false;
  }

  // Atualização do Mantle Tático
  if (mantleActive) {
    mantleTimer += dt;
    const t = Math.min(1.0, mantleTimer / mantleDuration);
    // Curva cúbica suave de subida e projeção à frente
    const ease = t * t * (3 - 2 * t);
    yawObject.position.lerpVectors(mantleStartPos, mantleTargetPos, ease);

    if (t >= 1.0) {
      mantleActive = false;
      player.onGround = true;
      player.velocity.set(0, 0, 0);
    }
    return;
  }

  // Vetores de orientação relativos ao ângulo Yaw
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).negate();
  const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));

  let inputX = 0, inputZ = 0;
  if (keys['KeyW']) { inputX += forward.x; inputZ += forward.z; }
  if (keys['KeyS']) { inputX -= forward.x; inputZ -= forward.z; }
  if (keys['KeyA']) { inputX -= right.x; inputZ -= right.z; }
  if (keys['KeyD']) { inputX += right.x; inputZ += right.z; }

  const inputLen = Math.hypot(inputX, inputZ);
  const isMoving = inputLen > 0.001;
  if (isMoving) { inputX /= inputLen; inputZ /= inputLen; }

  // Inclinada de Canto Tática (Lean Q / E com translação física de câmera)
  const targetLean = isLeaningLeft ? -0.24 : isLeaningRight ? 0.24 : 0;
  leanAngle += (targetLean - leanAngle) * dt * 11;
  camera.rotation.z = leanAngle;
  camera.position.x = leanAngle * 0.42; // Translação lateral real para espiar cantos!

  // Stamina & Corrida Tática
  const wantsSprint = (keys['ShiftLeft'] || keys['ShiftRight']) && isMoving && !player.crouching && !player.isSliding;
  let sprinting = false;

  if (wantsSprint && !player.staminaExhausted && player.stamina > 0) {
    sprinting = true;
    player.stamina = Math.max(0, player.stamina - 18 * dt);
    if (player.stamina <= 0) player.staminaExhausted = true;
  } else {
    const regenRate = isMoving ? 9 : 18;
    player.stamina = Math.min(player.maxStamina, player.stamina + regenRate * dt);
    if (player.staminaExhausted && player.stamina > 32) player.staminaExhausted = false;
  }
  updateStaminaHud();

  // Slide Tático com Slide Cancel & Aceleração em Declives
  if (player.isSliding) {
    player.slideTimer -= dt;

    // Slide Cancel com pulo (Space)
    if (keys['Space']) {
      player.isSliding = false;
      player.onGround = false;
      player.velocity.y = JUMP_SPEED * 1.05;
      playSound('jump');
      showStatus('⚡ SLIDE CANCEL', 500);
      keys['Space'] = false;
    }

    const slideProgress = Math.max(0, player.slideTimer / 0.65);
    const slideSpeed = player.speed * 2.05 * slideProgress;

    const nextPos = yawObject.position.clone().addScaledVector(player.slideDir, slideSpeed * dt);
    nextPos.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.x));
    nextPos.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.z));
    checkBuildingCollision(nextPos);
    yawObject.position.x = nextPos.x;
    yawObject.position.z = nextPos.z;

    player.crouchLerp += (1.25 - player.crouchLerp) * dt * 14;

    // Partículas de atrito nos pés
    if (Math.random() < 0.35) {
      spawnHitBurst(yawObject.position.clone().add(new THREE.Vector3(0, -0.6, 0)), 0xb0b8c0);
    }

    if (player.slideTimer <= 0) {
      player.isSliding = false;
      player.crouching = true;
      updateCrouchHud();
    }

    player.velocity.y += GRAVITY * dt;
    yawObject.position.y += player.velocity.y * dt;
    const floorY = floorHeightAt(yawObject.position.x, yawObject.position.z) - 0.95;
    if (yawObject.position.y <= floorY) {
      yawObject.position.y = floorY;
      player.velocity.y = 0;
      player.onGround = true;
    }
    return;
  }

  // Agachamento Lerp
  const targetCrouch = player.crouching ? 1 : 0;
  player.crouchLerp += (targetCrouch - player.crouchLerp) * dt * 11;
  const crouchHeightOffset = player.crouchLerp * -0.85;

  const crouchSpeedMult = player.crouching ? 0.48 : 1.0;
  const exhaustedMult = player.staminaExhausted ? 0.72 : 1.0;
  const targetMaxSpeed = player.speed * (sprinting ? player.sprintMult : 1.0) * crouchSpeedMult * exhaustedMult;

  // Dash Update (Esquiva de Emergência)
  if (dashActive) {
    dashTimer -= dt;
    const dashMove = dashDirection.clone().multiplyScalar(DASH_SPEED * dt);
    const nextPos = yawObject.position.clone().add(dashMove);
    nextPos.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.x));
    nextPos.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.z));
    checkBuildingCollision(nextPos);
    yawObject.position.x = nextPos.x;
    yawObject.position.z = nextPos.z;
    if (dashTimer <= 0) dashActive = false;
    return;
  }

  // Inércia Física Horizontal com Aceleração e Atrito
  const accel = player.onGround ? (sprinting ? 26 : 34) : 6.5;
  const friction = player.onGround ? (isMoving ? 14 : 22) : 1.5;

  if (isMoving) {
    const targetVelX = inputX * targetMaxSpeed;
    const targetVelZ = inputZ * targetMaxSpeed;
    player.velocity.x += (targetVelX - player.velocity.x) * Math.min(1.0, accel * dt);
    player.velocity.z += (targetVelZ - player.velocity.z) * Math.min(1.0, accel * dt);
  } else if (player.onGround) {
    player.velocity.x += (0 - player.velocity.x) * Math.min(1.0, friction * dt);
    player.velocity.z += (0 - player.velocity.z) * Math.min(1.0, friction * dt);
  }

  // Movimento com Step-Up de soleiras
  const nextPos = yawObject.position.clone();
  nextPos.x += player.velocity.x * dt;
  nextPos.z += player.velocity.z * dt;
  nextPos.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.x));
  nextPos.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, nextPos.z));

  checkBuildingCollision(nextPos);

  yawObject.position.x = nextPos.x;
  yawObject.position.z = nextPos.z;

  // Pulo, Mantle & Gravidade
  prevVelocityY = player.velocity.y;

  if (keys['Space'] && player.onGround && !player.crouching) {
    // Tenta Mantle primeiro se houver mureta à frente
    if (!checkMantle(forward)) {
      player.velocity.y = JUMP_SPEED;
      player.onGround = false;
      playSound('jump');
    }
    keys['Space'] = false;
  }

  player.velocity.y += GRAVITY * dt;
  yawObject.position.y += player.velocity.y * dt;

  // Amortecimento elástico do pouso (Landing Dip)
  if (landingDip > 0) {
    landingDip = Math.max(0, landingDip - dt * 1.8);
  }

  const floorY = floorHeightAt(yawObject.position.x, yawObject.position.z) + crouchHeightOffset;
  if (yawObject.position.y <= floorY) {
    yawObject.position.y = floorY;

    // Detecta impacto de pouso após queda
    if (!player.onGround && prevVelocityY < -6.0) {
      landingDip = Math.min(0.24, Math.abs(prevVelocityY) * 0.022);
      playSound('step', { pitch: 0.65, volume: 1.35 });

      // Levanta poeira nos pés
      const dustColors = {
        desert: 0xd4a853,
        arctic: 0xddeeff,
        jungle_temple: 0x446622,
        void_core: 0x8833cc,
        neon_rust: 0x778899
      };
      const dustCol = dustColors[selectedMap] || 0x888888;
      spawnHitBurst(yawObject.position.clone().add(new THREE.Vector3(0, -0.8, 0)), dustCol);

      // Dano de queda se cair de altura extrema
      if (prevVelocityY < -17.5) {
        const fallDmg = Math.min(85, Math.floor((Math.abs(prevVelocityY) - 17.5) * 5.2));
        damagePlayer(fallDmg);
        addScreenShake(0.08);
        showStatus(`⚠️ DANO DE QUEDA (-${fallDmg} HP)`, 1200);
      }
    }

    player.velocity.y = 0;
    player.onGround = true;
  }

  // Passos Procedurais com Detecção Acústica por Superfície
  const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
  const isWalking = horizontalSpeed > 0.4 && player.onGround;

  if (isWalking) {
    bobTime += dt * (sprinting ? 12.0 : 7.8);
    stepTimer -= dt;
    if (stepTimer <= 0) {
      // Ajuste de som de acordo com o material do chão
      const onPlatform = isStandingOnPlatform(yawObject.position.x, yawObject.position.z, yawObject.position.y);
      let stepPitch = 1.0;
      let stepVol = player.crouching ? 0.35 : (sprinting ? 1.15 : 0.85);

      if (onPlatform) {
        stepPitch = 1.55; // Metal ou madeira oca
      } else if (selectedMap === 'arctic') {
        stepPitch = 1.35; // Neve crujente
      } else if (selectedMap === 'desert') {
        stepPitch = 0.82; // Areia suave
      } else if (selectedMap === 'neon_rust') {
        stepPitch = 1.12; // Asfalto
      }

      playSound('step', { pitch: stepPitch, volume: stepVol });
      stepTimer = sprinting ? 0.28 : (player.crouching ? 0.58 : 0.42);
    }
  } else {
    stepTimer = 0;
  }

  // View Bobbing em Oito (Lissajous Figure-8)
  const bobScale = isWalking ? (sprinting ? 0.024 : 0.015) : 0;
  const bobY = Math.sin(bobTime) * bobScale;
  const bobX = Math.cos(bobTime * 0.5) * Math.sin(bobTime * 0.5) * bobScale * 1.5;

  // Inércia de Rotação do Mouse (Weapon Look Sway)
  const deltaYaw = yaw - prevYaw;
  const deltaPitch = pitch - prevPitch;
  prevYaw = yaw;
  prevPitch = pitch;

  mouseSwayX += (deltaYaw * 0.35 - mouseSwayX) * dt * 11;
  mouseSwayY += (deltaPitch * 0.35 - mouseSwayY) * dt * 11;
  mouseSwayX = clamp(mouseSwayX, -0.06, 0.06);
  mouseSwayY = clamp(mouseSwayY, -0.05, 0.05);

  // Respiração Orgânica Idle
  breathingTime += dt * 1.8;
  const breatheY = Math.sin(breathingTime) * 0.003;

  recoilOffset *= 0.84;

  // Aplicação de Posição & Rotação na Arma
  const w = currentWeapon();
  weaponGroup.position.set(
    WEAPON_BASE_POS.x + bobX + leanAngle * 0.22 - mouseSwayX,
    WEAPON_BASE_POS.y + bobY + breatheY - landingDip - mouseSwayY,
    WEAPON_BASE_POS.z
  );
  weaponGroup.rotation.z = -leanAngle * 0.5 - mouseSwayX * 1.4;
  weaponGroup.rotation.y = mouseSwayX * 1.6;
  weaponGroup.rotation.x = -mouseSwayY * 1.6;

  if (w && w.mesh) {
    w.mesh.position.set(0, 0, recoilOffset);
  }

  // Regeneração Natural de Saúde fora de combate
  if (player.health < player.maxHealth && performance.now() - lastDamageTime > 4000) {
    player.health = Math.min(player.maxHealth, player.health + dt * 5);
    updateHealthHud();
  }
}

// ---------------------------------------------------------------------
// 7. DASH TÁTICO & ESQUIVA
// ---------------------------------------------------------------------

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
  showStatus('💨 DASH TÁTICO', 450);

  // Efeito de vento e impulso
  spawnHitBurst(yawObject.position.clone().add(new THREE.Vector3(0, -0.5, 0)), 0xd0e0f0);
}

// ---------------------------------------------------------------------
// 8. ALTERNAR AGACHAMENTO & SLIDE TÁTICO
// ---------------------------------------------------------------------

function toggleCrouchOrSlide() {
  if (!gameRunning || !player.alive) return;

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).negate();
  const sprinting = (keys['ShiftLeft'] || keys['ShiftRight']) && (keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD']);

  if (sprinting && player.onGround && !player.isSliding && player.stamina >= 14) {
    player.isSliding = true;
    player.slideTimer = 0.65;
    player.slideDir.copy(forward);
    player.stamina -= 14;
    updateStaminaHud();
    playSound('slide');
    spawnHitBurst(yawObject.position.clone().add(new THREE.Vector3(0, -0.7, 0)), 0xaaaaaa);
    showStatus('⚡ SLIDE TÁTICO', 550);
    return;
  }

  player.crouching = !player.crouching;
  updateCrouchHud();
}
