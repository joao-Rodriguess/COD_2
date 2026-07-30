// =====================================================================
// MENUS.JS — Menus AAA + Seletor dos Mapas de Level Design
// =====================================================================

let activeTab = 'operation';
let selectedSkinWeaponKey = 'rifle';

function attachUiSoundEvents() {
  document.querySelectorAll('.tabBtn, .mapCardAAA, .storeCardAAA, .skinCardAAA, .btnAAA, button').forEach(el => {
    if (el.dataset.soundBound) return;
    el.dataset.soundBound = 'true';
    el.addEventListener('mouseenter', () => playSound('ui_hover'));
    el.addEventListener('click', () => playSound('ui_click'));
  });
}

function renderMenuLayout() {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;

  overlay.style.display = 'flex';
  overlay.classList.remove('hidden');

  overlay.innerHTML = `
    <div class="menuHeader">
      <div class="menuBrand">
        <h1>WARZONE</h1>
        <div class="sub">Operação Queda Fantasma</div>
      </div>
      <div class="menuTabs">
        <button class="tabBtn ${activeTab === 'operation' ? 'active' : ''}" onclick="switchTab('operation')">OPERAÇÕES DE LEVEL DESIGN</button>
        <button class="tabBtn ${activeTab === 'arsenal' ? 'active' : ''}" onclick="switchTab('arsenal')">ARSENAL & SKINS</button>
        <button class="tabBtn ${activeTab === 'stats' ? 'active' : ''}" onclick="switchTab('stats')">OPERADOR</button>
        <button class="tabBtn ${activeTab === 'settings' ? 'active' : ''}" onclick="switchTab('settings')">CONFIGURAÇÕES</button>
      </div>
    </div>
    <div class="menuMainContent">
      <div id="tabContent" class="menuPanelAAA"></div>
    </div>
  `;

  renderTabContent();
  attachUiSoundEvents();
}

function switchTab(tabName) {
  activeTab = tabName;
  renderMenuLayout();
}

function renderTabContent() {
  const container = document.getElementById('tabContent');
  if (!container) return;

  if (activeTab === 'operation') {
    const maps = Object.entries(MAPS).map(([key, m]) => `
      <div class="mapCardAAA ${key === selectedMap ? 'selected' : ''}" onclick="selectMap('${key}')">
        <b style="color:#4fd8ff;">${m.name}</b>
        <small style="display:block; margin-bottom:6px;">${m.subtitle}</small>
        <small style="color:#ffcc44;">🎯 Modo: ${m.mode || 'Combate Tático'}</small><br>
        <small style="color:#9fb3d9;">📐 Tamanho: ${m.size || 'Médio'}</small>
      </div>
    `).join('');

    container.innerHTML = `
      <h2>TEATRO DE OPERAÇÕES DE LEVEL DESIGN</h2>
      <p class="desc">Selecione o mapa projetado para o blockout. Cada ambiente possui rotas estratégicas, chokepoints e mecânicas interativas próprias.</p>
      <div class="menuGridAAA" style="grid-template-columns:repeat(3,1fr);">${maps}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px;">
        <span class="credits" style="font-family:'Orbitron',sans-serif; font-size:14px;">CRÉDITOS: <strong style="color:#ffcc44;">${credits}</strong></span>
        <div style="display:flex; gap:12px;">
          <button class="btnAAA secondary" onclick="showExitModal()">SAIR DO JOGO</button>
          <button class="btnAAA" onclick="beginGame()">INICIAR SALTO DE COMBATE</button>
        </div>
      </div>
    `;
  } else if (activeTab === 'arsenal') {
    const weaponButtons = WEAPONS.map(w => `
      <button class="tabBtn ${w.key === selectedSkinWeaponKey ? 'active' : ''}" onclick="selectSkinWeapon('${w.key}')">${w.name.toUpperCase()}</button>
    `).join('');

    const skinCards = Object.entries(SKINS).map(([sKey, s]) => {
      const isUnlocked = unlockedSkins.has(`${selectedSkinWeaponKey}_${sKey}`) || sKey === 'default';
      const isEquipped = equippedSkins[selectedSkinWeaponKey] === sKey;

      return `
        <div class="skinCardAAA ${isEquipped ? 'equipped' : isUnlocked ? 'unlocked' : ''}">
          <b style="color:${s.color ? '#' + s.color.toString(16).padStart(6, '0') : '#fff'};">${s.name}</b>
          <small>${isEquipped ? 'EQUIPADA' : isUnlocked ? 'DESBLOQUEADA' : s.price + ' Créditos'}</small><br>
          <button class="btnAAA secondary" style="margin-top:10px; font-size:11px; padding:6px 14px;"
            onclick="handleSkinClick('${selectedSkinWeaponKey}', '${sKey}', ${s.price}, ${isUnlocked}, ${isEquipped})">
            ${isEquipped ? 'EM USO' : isUnlocked ? 'EQUIPAR' : 'COMPRAR'}
          </button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <h2>ARSENAL & CUSTOMIZAÇÃO DE SKINS</h2>
      <p class="desc">Personalize o acabamento e estilo visual das suas armas em 3D.</p>
      <div style="display:flex; gap:8px; margin-bottom:20px;">${weaponButtons}</div>
      <div class="menuGridAAA" style="grid-template-columns:repeat(3,1fr);">${skinCards}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
        <span class="credits" style="font-family:'Orbitron',sans-serif; font-size:14px;">CRÉDITOS DISPONÍVEIS: <strong style="color:#ffcc44;">${credits}</strong></span>
        <button class="btnAAA secondary" onclick="switchTab('operation')">VOLTAR</button>
      </div>
    `;
  } else if (activeTab === 'stats') {
    const accuracy = player.accuracy.shots > 0 ? Math.round(player.accuracy.hits / player.accuracy.shots * 100) : 0;
    container.innerHTML = `
      <h2>ESTATÍSTICAS DO OPERADOR</h2>
      <p class="desc">Seu histórico militar acumulado e progresso registrado.</p>
      <div class="statsGrid" style="max-width:540px; margin:20px auto; gap:12px 32px; font-size:15px;">
        <span class="stat-label">Nível de Operador</span><span class="stat-value">NV ${player.level}</span>
        <span class="stat-label">XP Total</span><span class="stat-value">${player.xp} XP</span>
        <span class="stat-label">Inimigos Eliminados</span><span class="stat-value">${player.totalKills}</span>
        <span class="stat-label">Acertos na Cabeça</span><span class="stat-value">${player.headshots}</span>
        <span class="stat-label">Melhor Kill Streak</span><span class="stat-value">${player.bestStreak}</span>
        <span class="stat-label">Precisão Global</span><span class="stat-value">${accuracy}%</span>
      </div>
    `;
  } else if (activeTab === 'settings') {
    container.innerHTML = `
      <h2>CONFIGURAÇÕES DE JOGO</h2>
      <p class="desc">Ajuste os controles, câmera e áudio do seu combate.</p>
      <div class="settingsGroup">
        <div class="settingRow">
          <label>SENSIBILIDADE DO MOUSE</label>
          <div class="settingControl">
            <input type="range" id="sensSlider" min="0.0005" max="0.0050" step="0.0001" value="${settings.sensitivity}">
            <span class="valLabel" id="sensVal">${Math.round(settings.sensitivity * 20000)}</span>
          </div>
        </div>
        <div class="settingRow">
          <label>CAMPO DE VISÃO (FOV)</label>
          <div class="settingControl">
            <input type="range" id="fovSlider" min="60" max="110" step="1" value="${settings.fov}">
            <span class="valLabel" id="fovVal">${settings.fov}°</span>
          </div>
        </div>
        <div class="settingRow">
          <label>VOLUME GERAL</label>
          <div class="settingControl">
            <input type="range" id="volSlider" min="0" max="1" step="0.05" value="${settings.volume}">
            <span class="valLabel" id="volVal">${Math.round(settings.volume * 100)}%</span>
          </div>
        </div>
      </div>
    `;
    bindSettingsEvents();
  }

  attachUiSoundEvents();
}

function selectSkinWeapon(weaponKey) {
  selectedSkinWeaponKey = weaponKey;
  renderTabContent();
}

function handleSkinClick(weaponKey, skinKey, price, isUnlocked, isEquipped) {
  if (isEquipped) return;

  if (!isUnlocked) {
    if (credits < price) { showStatus('CRÉDITOS INSUFICIENTES'); return; }
    credits -= price;
    unlockedSkins.add(`${weaponKey}_${skinKey}`);
  }

  equippedSkins[weaponKey] = skinKey;
  updateAllWeaponSkins();
  saveProgress();
  showStatus(`SKIN ${SKINS[skinKey].name.toUpperCase()} EQUIPADA!`, 1500);
  renderTabContent();
}

function bindSettingsEvents() {
  const sensSlider = document.getElementById('sensSlider');
  const fovSlider = document.getElementById('fovSlider');
  const volSlider = document.getElementById('volSlider');

  if (sensSlider) sensSlider.oninput = (e) => {
    settings.sensitivity = parseFloat(e.target.value);
    const sensVal = document.getElementById('sensVal');
    if (sensVal) sensVal.textContent = Math.round(settings.sensitivity * 20000);
    saveSettings();
  };

  if (fovSlider) fovSlider.oninput = (e) => {
    const val = parseInt(e.target.value);
    applyFov(val);
    const fovVal = document.getElementById('fovVal');
    if (fovVal) fovVal.textContent = val + '°';
  };

  if (volSlider) volSlider.oninput = (e) => {
    settings.volume = parseFloat(e.target.value);
    updateMasterVolume();
    const volVal = document.getElementById('volVal');
    if (volVal) volVal.textContent = Math.round(settings.volume * 100) + '%';
    saveSettings();
  };
}

function selectMap(key) {
  selectedMap = key;
  applyMapTheme();
  renderTabContent();
}

function showMainMenu() {
  gameRunning = false;
  isPaused = false;
  dropActive = false;
  inPlane = false;
  transportPlane.visible = false;
  setWind(false);

  const pauseMenu = document.getElementById('pauseMenu');
  if (pauseMenu) pauseMenu.classList.remove('show');

  renderMenuLayout();
}

function beginGame() {
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
  }

  const pauseMenu = document.getElementById('pauseMenu');
  if (pauseMenu) pauseMenu.classList.remove('show');

  gameRunning = true;
  isPaused = false;

  applyMapTheme();
  inPlane = true;
  planeJumpReady = false;
  planeWalkDistance = 0;
  planeCorridorOffset.set(0, 0, 0);
  dropActive = false;
  player.onGround = true;
  player.velocity.y = 0;
  planeFlightAngle = Math.random() * Math.PI * 2;
  planePosition.set(Math.cos(planeFlightAngle) * planeFlightRadius, planePathHeight, Math.sin(planeFlightAngle) * planeFlightRadius);
  yaw = Math.PI - planeFlightAngle;
  yawObject.rotation.y = yaw;

  const planeRotation = yaw;
  transportPlane.position.copy(planePosition);
  transportPlane.rotation.y = planeRotation;
  transportPlane.visible = true;

  const cameraAnchor = planeLocalPosition.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), planeRotation);
  yawObject.position.copy(planePosition).add(cameraAnchor);

  waveEnemiesTotal = 5;
  waveEnemiesKilled = 0;
  kills = 0;
  deaths = 0;
  wave = 1;
  document.getElementById('killCount').textContent = kills;
  document.getElementById('deathCount').textContent = deaths;
  updateWaveHud();

  setWind(true);
  lastTime = performance.now();
  canvas.requestPointerLock();

  if (bots.filter(bot => bot.alive).length === 0) {
    for (let i = 0; i < 5; i++) spawnBot();
  }
  showStatus('EMPENHE-SE NO AVIÃO — ANDE PARA FRENTE PARA PODER PULAR', 3200);
  animate();
}

function renderPauseMenuContent() {
  const pauseMenu = document.getElementById('pauseMenu');
  if (!pauseMenu) return;

  const map = MAPS[selectedMap];
  const curWeapon = currentWeapon();
  const accuracy = player.accuracy.shots > 0 ? Math.round(player.accuracy.hits / player.accuracy.shots * 100) : 0;

  pauseMenu.innerHTML = `
    <div class="pauseContainer">
      <div class="pauseHeader">
        <h2>PAUSA DE COMBATE</h2>
        <div class="zoneBadge">ZONA: ${map.name.toUpperCase()}</div>
      </div>
      <div class="pauseBody">
        <div class="pauseLeft">
          <div class="pauseSectionTitle">DADOS DA PARTIDA</div>
          <div class="pauseStatsGrid">
            <div class="pauseStatBox"><label>Onda Atual</label><val>ONDA ${wave}</val></div>
            <div class="pauseStatBox"><label>Inimigos Na Wave</label><val>${waveEnemiesKilled} / ${waveEnemiesTotal}</val></div>
            <div class="pauseStatBox"><label>Eliminações</label><val style="color:#4fd8ff;">${kills}</val></div>
            <div class="pauseStatBox"><label>Mortes</label><val style="color:#ff3838;">${deaths}</val></div>
            <div class="pauseStatBox"><label>Kill Streak</label><val style="color:#ffcc44;">${player.killStreak}</val></div>
            <div class="pauseStatBox"><label>Precisão</label><val>${accuracy}%</val></div>
          </div>
          <div class="pauseSectionTitle">EQUIPAMENTO & RECURSOS</div>
          <div style="font-size:13px; font-weight:600; color:#b9d9e8; line-height:1.7;">
            <div>🔫 Arma Equipada: <strong style="color:#4fd8ff;">${curWeapon.name}</strong></div>
            <div>🛡️ Armadura: <strong style="color:#4fd8ff;">${Math.round(player.armor)} / 100</strong></div>
            <div>💊 Kits Médicos: <strong>${inventory.medkits}</strong> | 🧱 Barricadas: <strong>${inventory.barricades}</strong> | 💣 Granadas: <strong>${inventory.grenades}</strong></div>
          </div>
        </div>
        <div class="pauseRight">
          <div class="pauseSectionTitle">CONFIGURAÇÕES RÁPIDAS</div>
          <div class="settingsGroup" style="gap:10px; margin-bottom:20px;">
            <div class="settingRow" style="padding:8px 14px;">
              <label style="font-size:11px;">SENSIBILIDADE</label>
              <div class="settingControl">
                <input type="range" id="pauseSens" min="0.0005" max="0.0050" step="0.0001" value="${settings.sensitivity}">
              </div>
            </div>
            <div class="settingRow" style="padding:8px 14px;">
              <label style="font-size:11px;">FOV (${settings.fov}°)</label>
              <div class="settingControl">
                <input type="range" id="pauseFov" min="60" max="110" step="1" value="${settings.fov}">
              </div>
            </div>
            <div class="settingRow" style="padding:8px 14px;">
              <label style="font-size:11px;">VOLUME</label>
              <div class="settingControl">
                <input type="range" id="pauseVol" min="0" max="1" step="0.05" value="${settings.volume}">
              </div>
            </div>
          </div>
          <div class="pauseActions">
            <button class="btnAAA" onclick="resumeGame()">CONTINUAR COMBATE</button>
            <button class="btnAAA secondary" onclick="restartMatch()">REINICIAR PARTIDA</button>
            <button class="btnAAA danger" onclick="showExitModal()">VOLTAR AO MENU PRINCIPAL</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const pSens = document.getElementById('pauseSens');
  const pFov = document.getElementById('pauseFov');
  const pVol = document.getElementById('pauseVol');

  if (pSens) pSens.oninput = (e) => { settings.sensitivity = parseFloat(e.target.value); saveSettings(); };
  if (pFov) pFov.oninput = (e) => { applyFov(parseInt(e.target.value)); };
  if (pVol) pVol.oninput = (e) => { settings.volume = parseFloat(e.target.value); updateMasterVolume(); saveSettings(); };

  attachUiSoundEvents();
}

function togglePauseMenu() {
  if (!gameRunning) return;
  isPaused = !isPaused;
  const pauseMenu = document.getElementById('pauseMenu');

  if (isPaused) {
    document.exitPointerLock();
    renderPauseMenuContent();
    if (pauseMenu) pauseMenu.classList.add('show');
  } else {
    if (pauseMenu) pauseMenu.classList.remove('show');
    canvas.requestPointerLock();
  }
}

function resumeGame() {
  isPaused = false;
  const pauseMenu = document.getElementById('pauseMenu');
  if (pauseMenu) pauseMenu.classList.remove('show');
  canvas.requestPointerLock();
}

function restartMatch() {
  isPaused = false;
  const pauseMenu = document.getElementById('pauseMenu');
  if (pauseMenu) pauseMenu.classList.remove('show');
  respawnPlayer();
  beginGame();
}

function exitGame() {
  gameRunning = false;
  isPaused = false;
  dropActive = false;
  transportPlane.visible = false;
  setWind(false);
  document.exitPointerLock();

  const pauseMenu = document.getElementById('pauseMenu');
  if (pauseMenu) pauseMenu.classList.remove('show');

  showMainMenu();
}

function showExitModal() {
  const modal = document.getElementById('confirmModal');
  if (!modal) return;
  modal.classList.add('show');
  modal.classList.remove('hidden');
  document.getElementById('confirmYes').onclick = () => {
    modal.classList.remove('show');
    modal.classList.add('hidden');
    exitGame();
  };
  document.getElementById('confirmNo').onclick = () => {
    modal.classList.remove('show');
    modal.classList.add('hidden');
  };
  attachUiSoundEvents();
}

function showGameOverScreen() {
  gameRunning = false;
  isPaused = false;
  document.exitPointerLock();
  setWind(false);

  const accuracy = player.accuracy.shots > 0 ? Math.round(player.accuracy.hits / player.accuracy.shots * 100) : 0;
  const overlay = document.getElementById('overlay');

  overlay.style.display = 'flex';
  overlay.classList.remove('hidden');

  overlay.innerHTML = `
    <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:20px;">
      <h1 style="font-family:'Orbitron',sans-serif; font-size:48px; color:#ff3838; text-shadow:0 0 30px #ff3838; letter-spacing:4px;">VOCÊ FOI ELIMINADO</h1>
      <p style="font-size:16px; color:#9fb3d9; margin-bottom:24px;">Operação encerrada. Seu relatório de combate:</p>
      <div class="statsGrid" style="max-width:360px; margin-bottom:30px; font-size:15px;">
        <span class="stat-label">Eliminações</span><span class="stat-value">${kills}</span>
        <span class="stat-label">Onda Alcançada</span><span class="stat-value">${wave}</span>
        <span class="stat-label">Melhor Kill Streak</span><span class="stat-value">${player.bestStreak}</span>
        <span class="stat-label">Acertos na Cabeça</span><span class="stat-value">${player.headshots}</span>
        <span class="stat-label">Precisão</span><span class="stat-value">${accuracy}%</span>
        <span class="stat-label">Nível Atual</span><span class="stat-value">NV ${player.level}</span>
      </div>
      <div style="display:flex; gap:16px;">
        <button class="btnAAA" id="respawnBtn">VOLTAR AO COMBATE</button>
        <button class="btnAAA secondary" id="menuBtn">MENU PRINCIPAL</button>
      </div>
    </div>
  `;

  document.getElementById('respawnBtn').addEventListener('click', () => {
    respawnPlayer();
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
    gameRunning = true;
    lastTime = performance.now();
    canvas.requestPointerLock();
    showStatus('DE VOLTA AO COMBATE', 1500);
    animate();
  });

  document.getElementById('menuBtn').addEventListener('click', () => {
    showMainMenu();
  });

  attachUiSoundEvents();
}
