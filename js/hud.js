// =====================================================================
// HUD.JS — Atualizações de Interface
// =====================================================================

function updateAmmoHud() {
  const ammo = ammoState[currentWeaponIdx];
  document.getElementById('ammoInMag').textContent = ammo.inMag;
  document.getElementById('ammoSub').textContent = '/ ' + ammo.reserve;
}

function updateHealthHud() {
  const fill = document.getElementById('healthBarFill');
  fill.style.width = Math.max(player.health, 0) + '%';
  fill.classList.toggle('low', player.health <= 30);
  document.getElementById('healthText').textContent = Math.max(Math.round(player.health), 0);
}

function updateArmorHud() {
  const fill = document.getElementById('armorBarFill');
  if (!fill) return;
  fill.style.width = (player.armor / player.maxArmor * 100) + '%';
  const text = document.getElementById('armorText');
  if (text) text.textContent = Math.round(player.armor);
  const wrap = document.getElementById('armorWrap');
  if (wrap) wrap.style.display = player.armor > 0 ? 'flex' : 'none';
}

function updateStaminaHud() {
  const fill = document.getElementById('staminaBarFill');
  if (!fill) return;
  fill.style.width = (player.stamina / player.maxStamina * 100) + '%';
  fill.classList.toggle('exhausted', player.staminaExhausted);
}

function updateGrenadeHud() {
  const el = document.getElementById('grenadeCount');
  if (el) el.textContent = inventory.grenades;
}

function updateWaveHud() {
  document.getElementById('waveCount').textContent = wave;
  const fill = document.getElementById('waveBarFill');
  if (fill && waveEnemiesTotal > 0) {
    fill.style.width = (waveEnemiesKilled / waveEnemiesTotal * 100) + '%';
  }
  const label = document.getElementById('waveLabel');
  if (label) {
    label.textContent = `ONDA ${wave} — ${waveEnemiesKilled}/${waveEnemiesTotal}`;
  }
}

function updateStreakHud() {
  const progress = document.getElementById('streakProgress');
  if (!progress) return;
  const dots = progress.querySelectorAll('.streakDot');
  dots.forEach((dot, i) => {
    const threshold = streakRewards[i].kills;
    dot.classList.toggle('filled', player.killStreak >= threshold);
    dot.classList.toggle('next', player.killStreak < threshold && (i === 0 || player.killStreak >= streakRewards[i - 1].kills));
  });
}

function showStreakActivation(name, desc) {
  const wrap = document.getElementById('streakWrap');
  const nameEl = document.getElementById('streakName');
  const descEl = document.getElementById('streakDesc');
  if (!wrap || !nameEl || !descEl) return;
  nameEl.textContent = name;
  descEl.textContent = desc;
  wrap.classList.add('show');
  setTimeout(() => wrap.classList.remove('show'), 3000);
}

function updateXpHud() {
  const xpInLevel = player.xp % XP_PER_LEVEL;
  const fill = document.getElementById('xpBarFill');
  if (fill) fill.style.width = (xpInLevel / XP_PER_LEVEL * 100) + '%';
  const badge = document.getElementById('levelBadge');
  if (badge) badge.textContent = 'NV ' + player.level;
}

function showXpGain(amount) {
  const el = document.getElementById('xpGainFloat');
  if (!el) return;
  el.textContent = '+' + amount + ' XP';
  el.classList.remove('show');
  void el.offsetWidth; // force reflow
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1200);
}

function updateCrouchHud() {
  const el = document.getElementById('crouchIndicator');
  if (el) el.classList.toggle('show', player.crouching);
}

function showStatus(message, duration = 1100) {
  const status = document.getElementById('statusText');
  status.textContent = message;
  status.classList.add('show');
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => status.classList.remove('show'), duration);
}

function showHitmarker() {
  const hm = document.getElementById('hitmarker');
  hm.classList.add('show');
  clearTimeout(hitmarkerTimeout);
  hitmarkerTimeout = setTimeout(() => hm.classList.remove('show'), 120);
}

function addKillFeed(msg) {
  const el = document.createElement('div');
  el.className = 'killMsg';
  el.textContent = msg;
  const feed = document.getElementById('killFeed');
  feed.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function updateInventory() {
  const rows = document.getElementById('inventoryRows');
  if (!rows) return;
  rows.innerHTML =
    `<div class="invRow"><span>Kit médico [H]</span><span>${inventory.medkits}</span></div>` +
    `<div class="invRow"><span>Barricada [B]</span><span>${inventory.barricades}</span></div>` +
    `<div class="invRow"><span>Granada [G]</span><span>${inventory.grenades}</span></div>` +
    `<div class="invRow"><span>Suprimentos</span><span>${inventory.supplies}</span></div>`;
}

function toggleInventory() {
  inventoryOpen = !inventoryOpen;
  document.getElementById('inventoryPanel').classList.toggle('show', inventoryOpen);
  updateInventory();
}

// --- Wave Countdown ---
function showWaveCountdown(seconds, callback) {
  waveTransition = true;
  const el = document.getElementById('waveCountdown');
  const bossEl = document.getElementById('waveBossLabel');
  let count = seconds;

  if (wave % 5 === 0 && bossEl) {
    bossEl.textContent = '⚠ BOSS WAVE ⚠';
    bossEl.classList.add('show');
  }

  function tick() {
    if (count <= 0) {
      el.classList.remove('show');
      if (bossEl) bossEl.classList.remove('show');
      waveTransition = false;
      if (callback) callback();
      return;
    }
    el.textContent = count;
    el.classList.add('show');
    count--;
    waveCountdownInterval = setTimeout(tick, 1000);
  }
  tick();
}

// --- Damage Direction Indicators ---
function showDamageDirection(attackerPos) {
  const container = document.getElementById('damageDirContainer');
  if (!container) return;

  const playerPos = yawObject.position;
  const dx = attackerPos.x - playerPos.x;
  const dz = attackerPos.z - playerPos.z;
  const angle = Math.atan2(dx, dz) - yaw;

  const indicator = document.createElement('div');
  indicator.className = 'damageDir show';
  const dist = 80;
  const ix = Math.sin(angle) * dist;
  const iy = -Math.cos(angle) * dist;
  indicator.style.left = ix + 'px';
  indicator.style.top = iy + 'px';
  indicator.style.transform = `rotate(${angle}rad)`;
  container.appendChild(indicator);

  damageIndicators.push({ el: indicator, life: 2.0 });
}

function updateDamageIndicators(dt) {
  for (let i = damageIndicators.length - 1; i >= 0; i--) {
    damageIndicators[i].life -= dt;
    damageIndicators[i].el.style.opacity = Math.max(0, damageIndicators[i].life / 2.0);
    if (damageIndicators[i].life <= 0) {
      damageIndicators[i].el.remove();
      damageIndicators.splice(i, 1);
    }
  }
}

// --- Screen Shake ---
function addScreenShake(intensity) {
  shakeIntensity = Math.min(shakeIntensity + intensity, 0.08);
}

function updateScreenShake() {
  if (shakeIntensity > 0.001) {
    camera.position.x = (Math.random() - 0.5) * shakeIntensity;
    camera.position.y = (Math.random() - 0.5) * shakeIntensity;
    shakeIntensity *= SHAKE_DECAY;
  } else {
    shakeIntensity = 0;
    // Não resetar camera.position aqui — a posição base é (0,0,0) no rig
  }
}
