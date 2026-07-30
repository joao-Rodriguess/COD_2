// =====================================================================
// MENUS.JS — Telas de Menu, Loja, Briefing, Game Over
// =====================================================================

const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
if (startBtn) startBtn.addEventListener('click', e => {
  e.preventDefault();
  overlay.classList.remove('hidden');
  showBriefing();
});

function beginGame() {
  overlay.classList.add('hidden');
  gameRunning = true;
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

  // Reset wave
  waveEnemiesTotal = 5;
  waveEnemiesKilled = 0;
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

function showStore() {
  const cards = WEAPONS.map((w, i) => `
    <div class="storeCard">
      <b>${w.name}</b>
      <small>${w.damage} dano · ${w.magSize} projéteis${w.pellets ? ' · ' + w.pellets + ' pellets' : ''}<br>
      ${unlockedWeapons.has(w.key) ? 'ADQUIRIDA' : w.price + ' créditos'}</small><br>
      <button data-buy="${i}" ${unlockedWeapons.has(w.key) ? 'disabled' : ''}>${unlockedWeapons.has(w.key) ? 'EQUIPADA' : 'COMPRAR'}</button>
    </div>
  `).join('');
  overlay.innerHTML = `
    <div class="menuPanel">
      <h2>ARSENAL</h2>
      <p class="credits">CRÉDITOS: ${credits}</p>
      <div class="menuGrid">${cards}</div>
      <div class="menuActions">
        <button class="secondary" id="backMenu">VOLTAR</button>
      </div>
    </div>
  `;
  overlay.classList.remove('hidden');
  document.getElementById('backMenu').onclick = showMainMenu;
  overlay.querySelectorAll('[data-buy]').forEach(btn => {
    btn.onclick = () => {
      const w = WEAPONS[+btn.dataset.buy];
      if (credits < w.price) { showStatus('CRÉDITOS INSUFICIENTES'); return; }
      credits -= w.price;
      unlockedWeapons.add(w.key);
      switchWeapon(+btn.dataset.buy);
      saveProgress();
      showStore();
    };
  });
}

function showBriefing() {
  const map = MAPS[selectedMap];
  overlay.innerHTML = `
    <div class="menuPanel">
      <h2>OPERAÇÃO: QUEDA FANTASMA</h2>
      <p>Após a evacuação falhar, seu esquadrão recebe uma única rota de entrada: salto de alta altitude sobre <strong>${map.name}</strong>.
      Tome o terreno, elimine os hostis e extraia recursos para ampliar seu arsenal.</p>
      <div class="keys">
        <div><b>1–5</b></div><div>Selecionar arma</div>
        <div><b>R</b></div><div>Recarregar</div>
        <div><b>SHIFT</b></div><div>Correr</div>
        <div><b>G</b></div><div>Granada</div>
        <div><b>C</b></div><div>Dash tático</div>
        <div><b>CTRL</b></div><div>Agachar</div>
        <div><b>E</b></div><div>Interagir</div>
        <div><b>H</b></div><div>Kit médico</div>
        <div><b>B</b></div><div>Barricada</div>
        <div><b>I</b></div><div>Inventário</div>
      </div>
      <div class="menuActions">
        <button id="deployBtn">SALTAR DO AVIÃO</button>
        <button class="secondary" id="backMenu">VOLTAR</button>
      </div>
    </div>
  `;
  overlay.classList.remove('hidden');
  const deployBtn = document.getElementById('deployBtn');
  const backMenu = document.getElementById('backMenu');
  if (deployBtn) deployBtn.addEventListener('click', beginGame);
  if (backMenu) backMenu.addEventListener('click', showMainMenu);
}

function exitGame() {
  gameRunning = false;
  dropActive = false;
  transportPlane.visible = false;
  setWind(false);
  overlay.classList.remove('hidden');
  showMainMenu();
}

function showMainMenu() {
  const maps = Object.entries(MAPS).map(([key, map]) => `
    <div class="mapCard ${key === selectedMap ? 'selected' : ''}" data-map="${key}">
      <b>${map.name}</b>
      <small>${map.subtitle}</small>
    </div>
  `).join('');

  const accuracy = player.accuracy.shots > 0 ? Math.round(player.accuracy.hits / player.accuracy.shots * 100) : 0;

  overlay.innerHTML = `
    <div class="menuPanel">
      <h1>OPERAÇÃO WARZONE</h1>
      <p>Um FPS de sobrevivência em zona aberta. Escolha o teatro de operações, prepare o equipamento e inicie a queda.</p>
      <div class="menuGrid">${maps}</div>
      <div class="statsGrid">
        <span class="stat-label">Nível</span><span class="stat-value">${player.level}</span>
        <span class="stat-label">XP</span><span class="stat-value">${player.xp} / ${player.level * XP_PER_LEVEL}</span>
        <span class="stat-label">Kills Totais</span><span class="stat-value">${player.totalKills}</span>
        <span class="stat-label">Headshots</span><span class="stat-value">${player.headshots}</span>
        <span class="stat-label">Melhor Streak</span><span class="stat-value">${player.bestStreak}</span>
        <span class="stat-label">Precisão</span><span class="stat-value">${accuracy}%</span>
      </div>
      <div class="menuActions">
        <button id="briefingBtn">INICIAR OPERAÇÃO</button>
        <button id="storeBtn" class="secondary">LOJA E ARSENAL</button>
        <button id="exitBtn" class="secondary">SAIR DO JOGO</button>
      </div>
      <p class="credits">CRÉDITOS DISPONÍVEIS: ${credits}</p>
    </div>
  `;
  overlay.classList.remove('hidden');
  overlay.querySelectorAll('[data-map]').forEach(card => {
    card.onclick = () => { selectedMap = card.dataset.map; applyMapTheme(); showMainMenu(); };
  });
  document.getElementById('briefingBtn').onclick = showBriefing;
  document.getElementById('storeBtn').onclick = showStore;
  document.getElementById('exitBtn').onclick = showExitModal;
}

function showExitModal() {
  const modal = document.getElementById('confirmModal');
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
}

function showGameOverScreen() {
  gameRunning = false;
  const accuracy = player.accuracy.shots > 0 ? Math.round(player.accuracy.hits / player.accuracy.shots * 100) : 0;
  overlay.innerHTML = `
    <h1>VOCÊ FOI ELIMINADO</h1>
    <div class="statsGrid" style="max-width:320px;">
      <span class="stat-label">Eliminações</span><span class="stat-value">${kills}</span>
      <span class="stat-label">Onda Alcançada</span><span class="stat-value">${wave}</span>
      <span class="stat-label">Melhor Streak</span><span class="stat-value">${player.bestStreak}</span>
      <span class="stat-label">Headshots</span><span class="stat-value">${player.headshots}</span>
      <span class="stat-label">Precisão</span><span class="stat-value">${accuracy}%</span>
      <span class="stat-label">Nível</span><span class="stat-value">${player.level}</span>
    </div>
    <button id="respawnBtn">VOLTAR AO COMBATE</button>
    <button id="menuBtn" class="secondary">MENU PRINCIPAL</button>
  `;
  overlay.classList.remove('hidden');
  document.getElementById('respawnBtn').addEventListener('click', () => {
    respawnPlayer();
    overlay.classList.add('hidden');
    gameRunning = true;
    lastTime = performance.now();
    canvas.requestPointerLock();
    showStatus('DE VOLTA AO COMBATE', 1500);
    animate();
  });
  document.getElementById('menuBtn').addEventListener('click', () => {
    showMainMenu();
  });
}
