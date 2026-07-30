// =====================================================================
// BOTS.JS — IA dos Inimigos (MELHORADA)
// =====================================================================
// Estados: patrol, attack, cover, flank, retreat
// =====================================================================

function createBotMesh(color, isBoss = false) {
  const g = new THREE.Group();
  const scale = isBoss ? 1.4 : 1.0;
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xd9a172, roughness: 0.8 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * scale, 0.42 * scale, 1.1 * scale, 8), bodyMat);
  torso.position.y = 1.15 * scale; torso.castShadow = true; g.add(torso);

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.42 * scale, 8, 8), bodyMat);
  shoulder.position.y = 1.7 * scale; shoulder.scale.y = 0.6; shoulder.castShadow = true; g.add(shoulder);

  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.4 * scale, 8, 8), bodyMat);
  hip.position.y = 0.6 * scale; hip.scale.y = 0.5; g.add(hip);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28 * scale, 10, 10), headMat);
  head.position.y = 1.85 * scale; head.castShadow = true; g.add(head);

  // Boss tem capacete
  if (isBoss) {
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.32 * scale, 10, 10), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 }));
    helmet.position.y = 1.92 * scale; helmet.scale.y = 0.8; g.add(helmet);
  }

  const gunArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.55), new THREE.MeshStandardMaterial({ color: 0x1c1c1c }));
  gunArm.position.set(0.32 * scale, 1.25 * scale, -0.35 * scale); g.add(gunArm);

  const barBg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthTest: false }));
  barBg.scale.set(1.1, 0.14, 1); barBg.position.y = 2.35 * scale; g.add(barBg);

  const barFg = new THREE.Sprite(new THREE.SpriteMaterial({ color: isBoss ? 0xff8800 : 0xff3838, transparent: true, depthTest: false }));
  barFg.scale.set(1.05, 0.1, 1); barFg.position.y = 2.35 * scale; g.add(barFg);

  return { group: g, torso, head, barFg };
}

function spawnBot(isBoss = false) {
  if (bots.filter(b => b.alive).length >= BOT_MAX) return;
  let x, z, tries = 0;
  do {
    x = (Math.random() * 2 - 1) * (WORLD_SIZE - 20);
    z = (Math.random() * 2 - 1) * (WORLD_SIZE - 20);
    tries++;
  } while (Math.hypot(x - yawObject.position.x, z - yawObject.position.z) < 30 && tries < 30);

  const colors = [0xb03030, 0x306ab0, 0x8a6a30, 0x4f7a3a];
  const meshData = createBotMesh(
    isBoss ? 0x880000 : colors[Math.floor(Math.random() * colors.length)],
    isBoss
  );
  meshData.group.position.set(x, 0, z);
  scene.add(meshData.group);

  // Escalamento por onda
  const waveScale = 1 + (wave - 1) * 0.1;
  const baseHp = isBoss ? 500 : 100;

  const bot = {
    id: botIdCounter++,
    group: meshData.group,
    hitMeshes: [meshData.torso, meshData.head],
    head: meshData.head,
    barFg: meshData.barFg,
    health: baseHp * waveScale,
    maxHealth: baseHp * waveScale,
    alive: true,
    isBoss: isBoss,
    // IA melhorada
    state: 'patrol',
    patrolTarget: new THREE.Vector3(x + (Math.random() - 0.5) * 20, 0, z + (Math.random() - 0.5) * 20),
    speed: (isBoss ? 1.5 : 2.0 + Math.random() * 1.1) * (1 + (wave - 1) * 0.08),
    lastShotTime: 0,
    fireRateMs: isBoss ? 600 : (900 + Math.random() * 500) / (1 + (wave - 1) * 0.05),
    accuracy: Math.min(0.7, (isBoss ? 0.5 : 0.35 + Math.random() * 0.25) + (wave - 1) * 0.03),
    damage: isBoss ? 25 : 8 + Math.random() * 10,
    lastSeenPlayer: false,
    // Novos comportamentos
    dodgeTimer: 0,
    dodgeDir: new THREE.Vector3(),
    coverTarget: null,
    flankAngle: 0,
    stateTimer: 0,
    lastStateChange: 0
  };
  bots.push(bot);
}

function killBot(bot, isHeadshot = false) {
  bot.alive = false;
  bot.group.visible = false;
  kills++;
  player.totalKills++;
  waveEnemiesKilled++;

  // Créditos (boss dá mais)
  const baseCredits = bot.isBoss ? 500 : 100;
  credits += baseCredits;

  // XP
  const xpGain = isHeadshot ? XP_PER_HEADSHOT : XP_PER_KILL;
  addXp(xpGain);

  // Kill Streak
  player.killStreak++;
  if (player.killStreak > player.bestStreak) player.bestStreak = player.killStreak;
  checkStreak();
  updateStreakHud();

  document.getElementById('killCount').textContent = kills;
  addKillFeed(bot.isBoss ? `BOSS ELIMINADO (+${baseCredits})` : `Você eliminou um inimigo (+${baseCredits})`);

  // Atualizar wave HUD
  updateWaveHud();

  setTimeout(() => {
    const idx = bots.indexOf(bot);
    if (idx >= 0) { scene.remove(bot.group); bots.splice(idx, 1); }
  }, 2500);

  // Verificar fim da wave
  if (waveEnemiesKilled >= waveEnemiesTotal && bots.filter(b => b.alive).length === 0) {
    startNextWave();
  }
}

// --- Sistema de Ondas Progressivo ---
function startNextWave() {
  wave++;
  document.getElementById('waveCount').textContent = wave;

  // Bônus de onda
  const waveBonus = XP_PER_WAVE * wave;
  addXp(waveBonus);
  credits += 50 * wave;
  addKillFeed(`ONDA ${wave - 1} COMPLETA — +${waveBonus} XP, +${50 * wave} créditos`);

  // Munição e suprimentos bônus
  ammoState.forEach((a, i) => a.reserve += Math.ceil(WEAPONS[i].magSize * 0.25));
  updateAmmoHud();

  saveProgress();

  // Countdown antes da próxima onda
  const isBossWave = wave % 5 === 0;
  waveEnemiesTotal = Math.min(BOT_MAX, 3 + wave + (isBossWave ? 1 : 0));
  waveEnemiesKilled = 0;
  updateWaveHud();

  showWaveCountdown(5, () => {
    // Spawn inimigos da nova onda
    const regularCount = isBossWave ? waveEnemiesTotal - 1 : waveEnemiesTotal;
    for (let i = 0; i < regularCount; i++) {
      setTimeout(() => spawnBot(false), i * 400);
    }
    if (isBossWave) {
      setTimeout(() => {
        spawnBot(true);
        showStatus('⚠ BOSS APARECEU — CUIDADO! ⚠', 3000);
        addScreenShake(0.04);
      }, regularCount * 400 + 200);
    }
  });
}

// --- Kill Streak ---
function checkStreak() {
  for (let i = 0; i < streakRewards.length; i++) {
    const sr = streakRewards[i];
    if (player.killStreak === sr.kills && !sr.active) {
      activateStreak(i);
      break;
    }
  }
}

function activateStreak(idx) {
  const sr = streakRewards[idx];
  sr.active = true;
  showStreakActivation(sr.name, sr.desc);
  playSound('streak');

  switch (idx) {
    case 0: // UAV
      uavActive = true;
      uavEndTime = performance.now() + sr.duration;
      showStatus('UAV ATIVADO — Inimigos revelados por 15s', 2000);
      break;
    case 1: // Ataque Aéreo
      performAirstrike();
      break;
    case 2: // Armor Drop
      player.armor = Math.min(player.maxArmor, player.armor + 50);
      updateArmorHud();
      playSound('armor');
      showStatus('ARMADURA +50', 1500);
      break;
    case 3: // Nuke
      performNuke();
      break;
  }
}

function performAirstrike() {
  showStatus('⚠ ATAQUE AÉREO INCOMING ⚠', 2000);
  addScreenShake(0.05);
  setTimeout(() => {
    bots.forEach(bot => {
      if (!bot.alive) return;
      const dist = bot.group.position.distanceTo(yawObject.position);
      if (dist < 50) {
        bot.health -= 60;
        spawnHitBurst(bot.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xff6622);
        if (bot.health <= 0 && bot.alive) killBot(bot, false);
      }
    });
    playSound('explosion');
    addScreenShake(0.07);
  }, 1500);
}

function performNuke() {
  showStatus('☢ NUKE ATIVADA — ELIMINANDO TODOS ☢', 3000);
  addScreenShake(0.08);
  setTimeout(() => {
    bots.forEach(bot => {
      if (!bot.alive) return;
      bot.health = 0;
      killBot(bot, false);
    });
    playSound('explosion');
    addScreenShake(0.08);
  }, 2000);
}

function resetStreaks() {
  player.killStreak = 0;
  nextStreakIdx = 0;
  streakRewards.forEach(sr => sr.active = false);
  uavActive = false;
  updateStreakHud();
}

// --- XP ---
function addXp(amount) {
  player.xp += amount;
  showXpGain(amount);
  const newLevel = Math.floor(player.xp / XP_PER_LEVEL) + 1;
  if (newLevel > player.level) {
    player.level = newLevel;
    playSound('levelup');
    showStatus(`NÍVEL ${player.level} ALCANÇADO!`, 2500);
    addKillFeed(`LEVEL UP → NV ${player.level}`);
  }
  updateXpHud();
  saveProgress();
}

// =====================================================================
// IA DOS BOTS — ATUALIZAÇÃO PRINCIPAL
// =====================================================================

function hasLineOfSight(fromPos, toPos) {
  const dir = new THREE.Vector3().subVectors(toPos, fromPos);
  const dist = dir.length();
  dir.normalize();
  raycaster.set(fromPos, dir);
  raycaster.far = dist;
  const meshes = collidables.map(c => c.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  return hits.length === 0;
}

function findNearestCover(botPos, playerPos) {
  let best = null, bestScore = Infinity;
  for (const c of collidables) {
    const center = new THREE.Vector3();
    c.box.getCenter(center);
    const distToBot = botPos.distanceTo(center);
    if (distToBot < 3 || distToBot > 30) continue;

    // Preferir cobertura que esteja entre o bot e o jogador
    const dirToPlayer = new THREE.Vector3().subVectors(playerPos, center).normalize();
    const dirToBot = new THREE.Vector3().subVectors(botPos, center).normalize();
    const dotProduct = dirToPlayer.dot(dirToBot);

    // Score: menor distância ao bot + preferência por cobertura entre bot e player
    const score = distToBot + (dotProduct > 0 ? 10 : -5);
    if (score < bestScore) {
      bestScore = score;
      best = center.clone();
    }
  }
  return best;
}

function updateBots(dt) {
  const playerPos = new THREE.Vector3();
  yawObject.getWorldPosition(playerPos);
  playerPos.y = 1.2;

  // UAV timeout
  if (uavActive && performance.now() > uavEndTime) {
    uavActive = false;
    showStatus('UAV EXPIRADO', 1000);
  }

  bots.forEach(bot => {
    if (!bot.alive) return;
    const botPos = bot.group.position.clone();
    botPos.y = 1.2;
    const distToPlayer = botPos.distanceTo(playerPos);

    // Esquiva (quando atingido)
    if (bot.dodgeTimer > 0) {
      bot.dodgeTimer -= dt;
      moveBot(bot, bot.dodgeDir, bot.speed * 2.5 * dt);
    }

    // Detecção
    let canSee = false;
    if (distToPlayer < 55) {
      canSee = hasLineOfSight(botPos, playerPos);
    }

    // Timer de estado
    bot.stateTimer += dt;

    // Máquina de estados melhorada
    if (canSee && player.alive) {
      // Transição de estado baseada na situação
      if (bot.health < bot.maxHealth * 0.3 && bot.state !== 'retreat') {
        // HP baixo: recuar para cobertura
        bot.state = 'retreat';
        bot.coverTarget = findNearestCover(botPos, playerPos);
        bot.stateTimer = 0;
      } else if (distToPlayer > 30 && bot.state !== 'flank' && Math.random() < 0.3 && bot.stateTimer > 3) {
        // Longe: tentar flanquear
        bot.state = 'flank';
        bot.flankAngle = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3 + Math.random() * Math.PI / 4);
        bot.stateTimer = 0;
      } else if (bot.state === 'patrol') {
        bot.state = 'attack';
        bot.stateTimer = 0;
      }
    } else if (bot.state === 'attack' || bot.state === 'flank' || bot.state === 'retreat') {
      // Perdeu visão: voltar a patrulhar
      if (!canSee && bot.stateTimer > 2) {
        bot.state = 'patrol';
        bot.patrolTarget.set(
          bot.group.position.x + (Math.random() - 0.5) * 20, 0,
          bot.group.position.z + (Math.random() - 0.5) * 20
        );
        bot.stateTimer = 0;
      }
    }

    // Executar comportamento do estado
    switch (bot.state) {
      case 'attack':
        executeAttack(bot, botPos, playerPos, distToPlayer, dt);
        break;
      case 'flank':
        executeFlank(bot, botPos, playerPos, distToPlayer, dt);
        break;
      case 'retreat':
        executeRetreat(bot, botPos, playerPos, distToPlayer, dt);
        break;
      default:
        executePatrol(bot, dt);
        break;
    }

    // Limites do mapa
    bot.group.position.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, bot.group.position.x));
    bot.group.position.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, bot.group.position.z));

    // Barra de vida
    bot.barFg.scale.x = 1.05 * Math.max(bot.health, 0) / bot.maxHealth;
    bot.barFg.position.x = -1.05 * (1 - Math.max(bot.health, 0) / bot.maxHealth) / 2;
  });
}

function executeAttack(bot, botPos, playerPos, dist, dt) {
  const lookDir = new THREE.Vector3().subVectors(playerPos, bot.group.position);
  const angle = Math.atan2(lookDir.x, lookDir.z);
  bot.group.rotation.y = angle;

  // Movimento: aproximar ou recuar baseado na distância ideal
  if (dist > 22) {
    const move = new THREE.Vector3().subVectors(playerPos, bot.group.position).normalize();
    moveBot(bot, move, bot.speed * dt);
  } else if (dist < 10) {
    const move = new THREE.Vector3().subVectors(bot.group.position, playerPos).normalize();
    moveBot(bot, move, bot.speed * dt * 0.7);
  }

  // Atirar
  const now = performance.now();
  if (now - bot.lastShotTime > bot.fireRateMs) {
    bot.lastShotTime = now;
    botShoot(bot, botPos, playerPos, dist);
  }
}

function executeFlank(bot, botPos, playerPos, dist, dt) {
  // Mover lateralmente em relação ao jogador
  const toPlayer = new THREE.Vector3().subVectors(playerPos, bot.group.position).normalize();
  const flankDir = toPlayer.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), bot.flankAngle);

  // Olhar para o jogador enquanto se move
  const angle = Math.atan2(toPlayer.x, toPlayer.z);
  bot.group.rotation.y = angle;

  moveBot(bot, flankDir, bot.speed * 1.2 * dt);

  // Atirar enquanto flanqueia (com menos precisão)
  const now = performance.now();
  if (now - bot.lastShotTime > bot.fireRateMs * 1.3) {
    bot.lastShotTime = now;
    botShoot(bot, botPos, playerPos, dist);
  }

  // Depois de flanquear um tempo, atacar normalmente
  if (bot.stateTimer > 4) {
    bot.state = 'attack';
    bot.stateTimer = 0;
  }
}

function executeRetreat(bot, botPos, playerPos, dist, dt) {
  if (bot.coverTarget) {
    const toCover = new THREE.Vector3().subVectors(bot.coverTarget, bot.group.position);
    toCover.y = 0;
    if (toCover.length() < 2) {
      // Chegou na cobertura: atirar agachado
      const lookDir = new THREE.Vector3().subVectors(playerPos, bot.group.position);
      bot.group.rotation.y = Math.atan2(lookDir.x, lookDir.z);
      const now = performance.now();
      if (now - bot.lastShotTime > bot.fireRateMs * 1.5) {
        bot.lastShotTime = now;
        botShoot(bot, botPos, playerPos, dist);
      }
      // Se regenerou um pouco, voltar a atacar
      if (bot.stateTimer > 6) {
        bot.state = 'attack';
        bot.stateTimer = 0;
      }
    } else {
      toCover.normalize();
      moveBot(bot, toCover, bot.speed * 1.4 * dt);
      bot.group.rotation.y = Math.atan2(toCover.x, toCover.z);
    }
  } else {
    // Sem cobertura: fugir do jogador
    const away = new THREE.Vector3().subVectors(bot.group.position, playerPos).normalize();
    moveBot(bot, away, bot.speed * 1.2 * dt);
    bot.group.rotation.y = Math.atan2(away.x, away.z);
    if (bot.stateTimer > 3) {
      bot.state = 'attack';
      bot.stateTimer = 0;
    }
  }
}

function executePatrol(bot, dt) {
  const toTarget = new THREE.Vector3().subVectors(bot.patrolTarget, bot.group.position);
  toTarget.y = 0;
  if (toTarget.length() < 1.5) {
    bot.patrolTarget.set(
      bot.group.position.x + (Math.random() - 0.5) * 30, 0,
      bot.group.position.z + (Math.random() - 0.5) * 30
    );
  } else {
    toTarget.normalize();
    moveBot(bot, toTarget, bot.speed * 0.5 * dt);
    bot.group.rotation.y = Math.atan2(toTarget.x, toTarget.z);
  }
}

function moveBot(bot, direction, distance) {
  const next = bot.group.position.clone().addScaledVector(direction, distance);
  const radius = 0.48;
  for (const c of collidables) {
    const box = c.box;
    const x = Math.max(box.min.x, Math.min(next.x, box.max.x));
    const z = Math.max(box.min.z, Math.min(next.z, box.max.z));
    if ((next.x - x) ** 2 + (next.z - z) ** 2 < radius ** 2) return;
  }
  bot.group.position.copy(next);
}

function botShoot(bot, botPos, playerPos, dist) {
  const accuracy = Math.max(0.06, bot.accuracy - dist / 140);
  const dir = new THREE.Vector3().subVectors(playerPos, botPos).normalize();
  const start = bot.group.position.clone();
  start.y = 1.5;
  spawnTracer(start, dir, dist);
  playSound('enemy');

  if (Math.random() < accuracy && player.alive) {
    const dmg = bot.damage || (8 + Math.random() * 10);
    damagePlayer(dmg, bot.group.position.clone());
  }
}
