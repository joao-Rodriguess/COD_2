// =====================================================================
// BOTS.JS — IA de Inimigos Especializados + Slow-Motion Killcam + AirDrop Trigger
// =====================================================================

function createBotMesh(color, type = 'regular') {
  const g = new THREE.Group();
  const isBoss = (type === 'boss');
  const isRusher = (type === 'rusher');
  const isSniper = (type === 'sniper');
  const scale = isBoss ? 1.4 : isRusher ? 0.9 : 1.0;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: isSniper ? 0x223344 : isRusher ? 0x992222 : color,
    roughness: 0.7
  });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xd9a172, roughness: 0.8 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * scale, 0.42 * scale, 1.1 * scale, 8), bodyMat);
  torso.position.y = 1.15 * scale; torso.castShadow = true; g.add(torso);

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.42 * scale, 8, 8), bodyMat);
  shoulder.position.y = 1.7 * scale; shoulder.scale.y = 0.6; shoulder.castShadow = true; g.add(shoulder);

  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.4 * scale, 8, 8), bodyMat);
  hip.position.y = 0.6 * scale; hip.scale.y = 0.5; g.add(hip);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28 * scale, 10, 10), headMat);
  head.position.y = 1.85 * scale; head.castShadow = true; g.add(head);

  if (isBoss) {
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.32 * scale, 10, 10), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 }));
    helmet.position.y = 1.92 * scale; helmet.scale.y = 0.8; g.add(helmet);
  }

  const gunArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.55), new THREE.MeshStandardMaterial({ color: 0x1c1c1c }));
  gunArm.position.set(0.32 * scale, 1.25 * scale, -0.35 * scale); g.add(gunArm);

  // Laser de visão para Sniper Inimigo
  let laserLine = null;
  if (isSniper) {
    const laserMat = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.65 });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -40)]);
    laserLine = new THREE.Line(laserGeo, laserMat);
    laserLine.position.set(0.32, 1.25, -0.5);
    laserLine.visible = false;
    g.add(laserLine);
  }

  const barBg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthTest: false }));
  barBg.scale.set(1.1, 0.14, 1); barBg.position.y = 2.35 * scale; g.add(barBg);

  const barFg = new THREE.Sprite(new THREE.SpriteMaterial({ color: isBoss ? 0xff8800 : isRusher ? 0xff3838 : isSniper ? 0x00f0ff : 0xffcc44, transparent: true, depthTest: false }));
  barFg.scale.set(1.05, 0.1, 1); barFg.position.y = 2.35 * scale; g.add(barFg);

  return { group: g, torso, head, barFg, laserLine };
}

function spawnBot(typeOverride = null) {
  if (bots.filter(b => b.alive).length >= BOT_MAX) return;
  let x, z, tries = 0;
  do {
    x = (Math.random() * 2 - 1) * (WORLD_SIZE - 20);
    z = (Math.random() * 2 - 1) * (WORLD_SIZE - 20);
    tries++;
  } while (Math.hypot(x - yawObject.position.x, z - yawObject.position.z) < 30 && tries < 30);

  // Selecionar tipo aleatório de inimigo
  const types = ['regular', 'rusher', 'sniper'];
  const botType = typeOverride || (Math.random() < 0.25 ? 'rusher' : Math.random() < 0.2 ? 'sniper' : 'regular');

  const colors = [0xb03030, 0x306ab0, 0x8a6a30, 0x4f7a3a];
  const meshData = createBotMesh(
    colors[Math.floor(Math.random() * colors.length)],
    botType
  );
  meshData.group.position.set(x, 0, z);
  scene.add(meshData.group);

  const waveScale = 1 + (wave - 1) * 0.1;
  const baseHp = (botType === 'boss') ? 500 : (botType === 'rusher') ? 70 : (botType === 'sniper') ? 80 : 100;
  const baseSpeed = (botType === 'rusher') ? 3.8 : (botType === 'boss') ? 1.5 : (botType === 'sniper') ? 1.8 : (2.0 + Math.random() * 1.1);

  const bot = {
    id: botIdCounter++,
    group: meshData.group,
    hitMeshes: [meshData.torso, meshData.head],
    head: meshData.head,
    barFg: meshData.barFg,
    laserLine: meshData.laserLine,
    health: baseHp * waveScale,
    maxHealth: baseHp * waveScale,
    alive: true,
    type: botType,
    isBoss: botType === 'boss',
    state: 'patrol',
    patrolTarget: new THREE.Vector3(x + (Math.random() - 0.5) * 20, 0, z + (Math.random() - 0.5) * 20),
    speed: baseSpeed * (1 + (wave - 1) * 0.08),
    lastShotTime: 0,
    fireRateMs: (botType === 'sniper') ? 1800 : (botType === 'rusher') ? 600 : (900 + Math.random() * 500) / (1 + (wave - 1) * 0.05),
    accuracy: Math.min(0.85, ((botType === 'sniper') ? 0.7 : (botType === 'boss') ? 0.5 : 0.35 + Math.random() * 0.25) + (wave - 1) * 0.03),
    damage: (botType === 'sniper') ? 35 : (botType === 'boss') ? 25 : (botType === 'rusher') ? 12 : (8 + Math.random() * 10),
    dodgeTimer: 0,
    dodgeDir: new THREE.Vector3(),
    coverTarget: null,
    flankAngle: 0,
    stateTimer: 0
  };
  bots.push(bot);
}

function killBot(bot, isHeadshot = false) {
  bot.alive = false;
  bot.group.visible = false;
  kills++;
  player.totalKills++;
  waveEnemiesKilled++;

  const baseCredits = bot.isBoss ? 500 : (bot.type === 'sniper') ? 150 : 100;
  credits += baseCredits;

  const xpGain = isHeadshot ? XP_PER_HEADSHOT : XP_PER_KILL;
  addXp(xpGain);

  player.killStreak++;
  if (player.killStreak > player.bestStreak) player.bestStreak = player.killStreak;
  checkStreak();
  updateStreakHud();

  document.getElementById('killCount').textContent = kills;
  addKillFeed(bot.isBoss ? `BOSS ELIMINADO (+${baseCredits})` : `Você eliminou um ${bot.type.toUpperCase()} (+${baseCredits})`);

  updateWaveHud();

  // SLOW-MOTION KILLCAM NA ÚLTIMA ELIMINAÇÃO DA ONDA!
  if (waveEnemiesKilled >= waveEnemiesTotal && bots.filter(b => b.alive).length === 0) {
    timeScale = 0.25;
    slowMoTimer = 1.5;
    addScreenShake(0.06);
    playSound('explosion');
    showStatus('💥 ÚLTIMA ELIMINAÇÃO! ONDA LIMPA!', 2000);
    startNextWave();
  }

  setTimeout(() => {
    const idx = bots.indexOf(bot);
    if (idx >= 0) { scene.remove(bot.group); bots.splice(idx, 1); }
  }, 2500);
}

// --- Sistema de Ondas Progressivo & Air Drop ---
function startNextWave() {
  wave++;
  document.getElementById('waveCount').textContent = wave;

  const waveBonus = XP_PER_WAVE * wave;
  addXp(waveBonus);
  credits += 50 * wave;
  addKillFeed(`ONDA ${wave - 1} COMPLETA — +${waveBonus} XP, +${50 * wave} créditos`);

  ammoState.forEach((a, i) => a.reserve += Math.ceil(WEAPONS[i].magSize * 0.25));
  updateAmmoHud();

  saveProgress();

  // Spawna Air Drop a cada 2 ondas
  if (wave % 2 === 0) {
    setTimeout(spawnAirDrop, 3000);
  }

  const isBossWave = wave % 5 === 0;
  waveEnemiesTotal = Math.min(BOT_MAX, 3 + wave + (isBossWave ? 1 : 0));
  waveEnemiesKilled = 0;
  updateWaveHud();

  showWaveCountdown(5, () => {
    const regularCount = isBossWave ? waveEnemiesTotal - 1 : waveEnemiesTotal;
    for (let i = 0; i < regularCount; i++) {
      setTimeout(() => spawnBot(), i * 400);
    }
    if (isBossWave) {
      setTimeout(() => {
        spawnBot('boss');
        showStatus('⚠ BOSS JUGGERNAUT APARECEU! ⚠', 3000);
        addScreenShake(0.05);
      }, regularCount * 400 + 200);
    }
  });
}

// --- Kill Streaks ---
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
    case 0:
      uavActive = true;
      uavEndTime = performance.now() + sr.duration;
      showStatus('UAV ATIVADO — Inimigos revelados por 15s', 2000);
      break;
    case 1:
      performAirstrike();
      break;
    case 2:
      player.armor = Math.min(player.maxArmor, player.armor + 50);
      updateArmorHud();
      playSound('armor');
      showStatus('ARMADURA +50', 1500);
      break;
    case 3:
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
// IA DOS BOTS — ATUALIZAÇÃO COM LASERS & COMPORTAMENTOS
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

    const dirToPlayer = new THREE.Vector3().subVectors(playerPos, center).normalize();
    const dirToBot = new THREE.Vector3().subVectors(botPos, center).normalize();
    const dotProduct = dirToPlayer.dot(dirToBot);

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

  if (uavActive && performance.now() > uavEndTime) {
    uavActive = false;
    showStatus('UAV EXPIRADO', 1000);
  }

  bots.forEach(bot => {
    if (!bot.alive) return;
    const botPos = bot.group.position.clone();
    botPos.y = 1.2;
    const distToPlayer = botPos.distanceTo(playerPos);

    if (bot.dodgeTimer > 0) {
      bot.dodgeTimer -= dt;
      moveBot(bot, bot.dodgeDir, bot.speed * 2.5 * dt);
    }

    let canSee = false;
    if (distToPlayer < 65) {
      canSee = hasLineOfSight(botPos, playerPos);
    }

    bot.stateTimer += dt;

    if (canSee && player.alive) {
      if (bot.health < bot.maxHealth * 0.3 && bot.state !== 'retreat') {
        bot.state = 'retreat';
        bot.coverTarget = findNearestCover(botPos, playerPos);
        bot.stateTimer = 0;
      } else if (bot.type === 'rusher') {
        bot.state = 'attack'; // Rusher sempre avança com tudo
      } else if (distToPlayer > 30 && bot.state !== 'flank' && Math.random() < 0.3 && bot.stateTimer > 3) {
        bot.state = 'flank';
        bot.flankAngle = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3 + Math.random() * Math.PI / 4);
        bot.stateTimer = 0;
      } else if (bot.state === 'patrol') {
        bot.state = 'attack';
        bot.stateTimer = 0;
      }
    } else if (bot.state === 'attack' || bot.state === 'flank' || bot.state === 'retreat') {
      if (!canSee && bot.stateTimer > 2) {
        bot.state = 'patrol';
        bot.patrolTarget.set(
          bot.group.position.x + (Math.random() - 0.5) * 20, 0,
          bot.group.position.z + (Math.random() - 0.5) * 20
        );
        bot.stateTimer = 0;
      }
    }

    // Laser da Sniper
    if (bot.laserLine) {
      bot.laserLine.visible = (canSee && bot.state === 'attack');
    }

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

    bot.group.position.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, bot.group.position.x));
    bot.group.position.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, bot.group.position.z));

    bot.barFg.scale.x = 1.05 * Math.max(bot.health, 0) / bot.maxHealth;
    bot.barFg.position.x = -1.05 * (1 - Math.max(bot.health, 0) / bot.maxHealth) / 2;
  });
}

function executeAttack(bot, botPos, playerPos, dist, dt) {
  const lookDir = new THREE.Vector3().subVectors(playerPos, bot.group.position);
  const angle = Math.atan2(lookDir.x, lookDir.z);
  bot.group.rotation.y = angle;

  // Rusher avança rápido, Sniper mantém distância
  const idealMinDist = (bot.type === 'rusher') ? 2 : (bot.type === 'sniper') ? 25 : 10;

  if (dist > idealMinDist + 5) {
    const move = new THREE.Vector3().subVectors(playerPos, bot.group.position).normalize();
    moveBot(bot, move, bot.speed * dt);
  } else if (dist < idealMinDist - 2) {
    const move = new THREE.Vector3().subVectors(bot.group.position, playerPos).normalize();
    moveBot(bot, move, bot.speed * dt * 0.7);
  }

  const now = performance.now();
  if (now - bot.lastShotTime > bot.fireRateMs) {
    bot.lastShotTime = now;
    botShoot(bot, botPos, playerPos, dist);
  }
}

function executeFlank(bot, botPos, playerPos, dist, dt) {
  const toPlayer = new THREE.Vector3().subVectors(playerPos, bot.group.position).normalize();
  const flankDir = toPlayer.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), bot.flankAngle);
  const angle = Math.atan2(toPlayer.x, toPlayer.z);
  bot.group.rotation.y = angle;

  moveBot(bot, flankDir, bot.speed * 1.2 * dt);

  const now = performance.now();
  if (now - bot.lastShotTime > bot.fireRateMs * 1.3) {
    bot.lastShotTime = now;
    botShoot(bot, botPos, playerPos, dist);
  }

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
      const lookDir = new THREE.Vector3().subVectors(playerPos, bot.group.position);
      bot.group.rotation.y = Math.atan2(lookDir.x, lookDir.z);
      const now = performance.now();
      if (now - bot.lastShotTime > bot.fireRateMs * 1.5) {
        bot.lastShotTime = now;
        botShoot(bot, botPos, playerPos, dist);
      }
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
