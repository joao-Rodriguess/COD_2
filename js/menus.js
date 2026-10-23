// =====================================================================
// MENUS.JS — SISTEMA DE MENUS AAA, ARSENAL GUNSMITH & TEATRO DE OPERAÇÕES
// (Lobby Cinemático, Seletor Tático de Missões, Customização de Skins 3D,
// Registro Militar do Operador, Central de Controle & Relatório Pós-Ação AAR)
// =====================================================================

let activeTab = 'operation';
let selectedSkinWeaponKey = 'rifle';
let selectedWeaponCategory = 'all';
let selectedSettingsTab = 'gameplay';

// Injeta estilos visuais profissionais dedicados para menus AAA
(function injectMenuStyles() {
  if (document.getElementById('proMenuStyles')) return;
  const style = document.createElement('style');
  style.id = 'proMenuStyles';
  style.textContent = `
    .proBadge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 4px; font-family: 'Orbitron', sans-serif;
      font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
    }
    .badgeCyan { background: rgba(0, 240, 255, 0.12); color: #00f0ff; border: 1px solid rgba(0, 240, 255, 0.35); }
    .badgeGold { background: rgba(255, 184, 0, 0.12); color: #ffb800; border: 1px solid rgba(255, 184, 0, 0.35); }
    .badgeGreen { background: rgba(68, 170, 85, 0.12); color: #55dd77; border: 1px solid rgba(68, 170, 85, 0.35); }
    .badgePurple { background: rgba(157, 0, 255, 0.12); color: #b84dff; border: 1px solid rgba(157, 0, 255, 0.35); }
    .badgeRed { background: rgba(255, 56, 56, 0.12); color: #ff5555; border: 1px solid rgba(255, 56, 56, 0.35); }

    .statBarRow { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 12px; font-weight: 700; }
    .statBarLabel { color: #9fb3d9; font-family: 'Orbitron', sans-serif; font-size: 11px; letter-spacing: 1px; min-width: 90px; }
    .statBarTrack { flex: 1; height: 6px; background: rgba(255, 255, 255, 0.08); border-radius: 3px; overflow: hidden; margin: 0 12px; }
    .statBarFill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #00f0ff, #2a6bff); transition: width 0.3s cubic-bezier(0.2,0.8,0.2,1); }
    .statBarVal { font-family: 'Orbitron', sans-serif; font-size: 12px; color: #eaf2ff; min-width: 32px; text-align: right; }

    .keycap {
      display: inline-block; padding: 2px 7px; background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.25); border-bottom-width: 2px;
      border-radius: 4px; font-family: 'Orbitron', monospace; font-size: 11px;
      color: #00f0ff; font-weight: 800; text-shadow: 0 0 4px rgba(0, 240, 255, 0.5);
    }

    .subTabBtn {
      font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 1.5px;
      padding: 7px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(0, 0, 0, 0.3);
      color: #9fb3d9; border-radius: 6px; cursor: pointer; transition: all 0.2s;
    }
    .subTabBtn:hover { background: rgba(0, 240, 255, 0.15); color: #fff; border-color: rgba(0, 240, 255, 0.4); }
    .subTabBtn.active { background: rgba(0, 240, 255, 0.22); color: #00f0ff; border-color: #00f0ff; box-shadow: 0 0 12px rgba(0, 240, 255, 0.3); }

    .weaponCardSelect {
      padding: 12px 14px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
      background: rgba(255, 255, 255, 0.02); cursor: pointer; transition: all 0.2s;
      display: flex; flex-direction: column; gap: 4px; text-align: left;
    }
    .weaponCardSelect:hover { background: rgba(0, 240, 255, 0.08); border-color: rgba(0, 240, 255, 0.4); transform: translateY(-2px); }
    .weaponCardSelect.active { background: rgba(0, 240, 255, 0.16); border-color: #00f0ff; box-shadow: 0 0 16px rgba(0, 240, 255, 0.25); }

    .medalCard {
      display: flex; align-items: center; gap: 14px; padding: 12px 16px;
      background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px; transition: all 0.2s;
    }
    .medalCard.unlocked { border-color: rgba(255, 184, 0, 0.45); background: rgba(255, 184, 0, 0.05); }
    .medalIcon { font-size: 26px; }
    .medalInfo b { display: block; font-family: 'Orbitron', sans-serif; font-size: 13px; color: #fff; margin-bottom: 2px; }
    .medalInfo small { font-size: 12px; color: #9fb3d9; }
  `;
  document.head.appendChild(style);
})();

// Acopla efeitos sonoros táticos a botões e controles interativos
function attachUiSoundEvents() {
  document.querySelectorAll('.tabBtn, .subTabBtn, .mapCardAAA, .skinCardAAA, .weaponCardSelect, .btnAAA, button, input[type="range"]').forEach(el => {
    if (el.dataset.soundBound) return;
    el.dataset.soundBound = 'true';
    el.addEventListener('mouseenter', () => playSound('ui_hover'));
    el.addEventListener('click', () => playSound('ui_click'));
  });
}

// ---------------------------------------------------------------------
// 1. ESTRUTURA GERAL DO MENU PRINCIPAL (LOBBY MILITAR)
// ---------------------------------------------------------------------

function renderMenuLayout() {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;

  overlay.style.display = 'flex';
  overlay.classList.remove('hidden');

  const kdRatio = deaths > 0 ? (player.totalKills / deaths).toFixed(2) : player.totalKills;
  const xpCurrentLevel = player.xp % 500;
  const xpPct = Math.min(100, Math.round((xpCurrentLevel / 500) * 100));

  overlay.innerHTML = `
    <div class="menuHeader">
      <div class="menuBrand">
        <div>
          <h1>WARZONE</h1>
          <div class="sub">OPERAÇÃO QUEDA FANTASMA • COMBATE TÁTICO PBR</div>
        </div>
        <div class="proBadge badgeGreen" style="margin-left:14px;">
          <span style="font-size:8px;">●</span> SERVIDOR ATIVO • AMÉRICA LATINA • 22MS
        </div>
      </div>

      <div class="menuTabs">
        <button class="tabBtn ${activeTab === 'operation' ? 'active' : ''}" onclick="switchTab('operation')">
          <span class="keycap" style="margin-right:6px;">Q</span> MISSÕES
        </button>
        <button class="tabBtn ${activeTab === 'arsenal' ? 'active' : ''}" onclick="switchTab('arsenal')">
          🔫 ARSENAL & SKINS
        </button>
        <button class="tabBtn ${activeTab === 'stats' ? 'active' : ''}" onclick="switchTab('stats')">
          🎖️ OPERADOR
        </button>
        <button class="tabBtn ${activeTab === 'settings' ? 'active' : ''}" onclick="switchTab('settings')">
          CONFIGURAÇÕES <span class="keycap" style="margin-left:6px;">E</span>
        </button>
      </div>

      <!-- Perfil Rápido do Operador no Canto Superior Direito -->
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="display:flex; flex-direction:column; align-items:flex-end;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-family:'Orbitron',sans-serif; font-size:11px; color:#9fb3d9; font-weight:700;">PRESTÍGIO</span>
            <span class="proBadge badgeGold">NV ${player.level}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
            <div style="width:90px; height:5px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
              <div style="width:${xpPct}%; height:100%; background:#ffb800;"></div>
            </div>
            <span style="font-size:11px; color:#ffb800; font-family:'Orbitron',sans-serif; font-weight:800;">${xpCurrentLevel}/500 XP</span>
          </div>
        </div>
        <div class="proBadge badgeCyan" style="padding:6px 14px; font-size:13px;">
          💳 ${credits} <span style="font-size:10px; color:#9fb3d9;">CRÉDITOS</span>
        </div>
      </div>
    </div>

    <div class="menuMainContent">
      <div id="tabContent" class="menuPanelAAA" style="width:min(1120px, 96vw);"></div>
    </div>
  `;

  renderTabContent();
  attachUiSoundEvents();
}

function switchTab(tabName) {
  activeTab = tabName;
  renderMenuLayout();
}

// ---------------------------------------------------------------------
// 2. CONTEÚDO DINÂMICO DAS ABAS DO MENU
// ---------------------------------------------------------------------

function renderTabContent() {
  const container = document.getElementById('tabContent');
  if (!container) return;

  // --- ABA 1: OPERAÇÕES / MAPAS DE LEVEL DESIGN ---
  if (activeTab === 'operation') {
    const mapBadges = {
      neon_rust:     { badge: 'badgeCyan', tag: 'CHUVOSA & NÉON', icon: '🏙️' },
      jungle_temple: { badge: 'badgeGreen', tag: 'SELVA FECHADA', icon: '🌿' },
      void_core:     { badge: 'badgePurple', tag: 'ANOMALIA QUÂNTICA', icon: '🌌' },
      desert:        { badge: 'badgeGold', tag: 'TEMPESTADE DE AREIA', icon: '🏜️' },
      arctic:        { badge: 'badgeCyan', tag: 'NOITE POLAR & AURORA', icon: '❄️' }
    };

    const maps = Object.entries(MAPS).map(([key, m]) => {
      const b = mapBadges[key] || { badge: 'badgeCyan', tag: 'ZONA DE GUERRA', icon: '📍' };
      const isSel = key === selectedMap;
      return `
        <div class="mapCardAAA ${isSel ? 'selected' : ''}" onclick="selectMap('${key}')" style="display:flex; flex-direction:column; justify-content:space-between; min-height:145px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <b style="color:${isSel ? '#00f0ff' : '#eaf2ff'}; font-size:15px;">${b.icon} ${m.name}</b>
              <span class="proBadge ${b.badge}">${b.tag}</span>
            </div>
            <small style="display:block; margin-bottom:8px; color:#a2b7db; line-height:1.4;">${m.subtitle}</small>
          </div>
          <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:8px; display:flex; justify-content:space-between; font-size:11px; font-weight:700;">
            <span style="color:#ffcc44;">🎯 ${m.mode || 'Combate Tático'}</span>
            <span style="color:#9fb3d9;">📐 ${m.size || 'Médio'}</span>
          </div>
        </div>
      `;
    }).join('');

    const currentMapInfo = MAPS[selectedMap] || MAPS.neon_rust;

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
        <div>
          <h2>TEATRO DE OPERAÇÕES MILITARES</h2>
          <p class="desc" style="margin-bottom:0;">Selecione o setor de desdobramento. Cada mapa possui rotas táticas, coberturas e ameaças específicas.</p>
        </div>
        <span class="proBadge badgeCyan" style="padding:6px 14px;">ZONA SELECIONADA: ${currentMapInfo.name.toUpperCase()}</span>
      </div>

      <div class="menuGridAAA" style="grid-template-columns:repeat(auto-fit, minmax(290px, 1fr)); gap:16px;">
        ${maps}
      </div>

      <!-- Barra Inferior de Ação Tática -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:28px; padding-top:20px; border-top:1px solid rgba(0,240,255,0.2);">
        <div style="display:flex; align-items:center; gap:16px;">
          <button class="btnAAA secondary" onclick="showExitModal()">
            RETORNAR AO DESKTOP
          </button>
          <span style="font-size:12px; color:#88a0c4; font-weight:600;">Pressione <span class="keycap">ESPAÇO</span> para saltar diretamente</span>
        </div>

        <button class="btnAAA" onclick="beginGame()" style="padding:14px 44px; font-size:15px;">
          ⚡ INICIAR SALTO DE COMBATE [ESPAÇO]
        </button>
      </div>
    `;

  // --- ABA 2: ARSENAL & GUNSMITH DE SKINS ---
  } else if (activeTab === 'arsenal') {
    const categories = [
      { id: 'all', name: 'TODAS AS ARMAS' },
      { id: 'assault', name: 'FUZIS DE ASSALTO', match: ['rifle', 'ak47', 'scar'] },
      { id: 'smg', name: 'SMGS', match: ['smg', 'mp5'] },
      { id: 'sidearm', name: 'PISTOLAS', match: ['pistol', 'magnum', 'akimbo'] },
      { id: 'shotgun', name: 'ESCOPETAS', match: ['shotgun', 'spas'] },
      { id: 'heavy', name: 'PESADAS & SNIPERS', match: ['sniper', 'lmg', 'plasma', 'rpg'] }
    ];

    const categoryButtons = categories.map(c => `
      <button class="subTabBtn ${selectedWeaponCategory === c.id ? 'active' : ''}" onclick="selectWeaponCategory('${c.id}')">
        ${c.name}
      </button>
    `).join('');

    const filteredWeapons = WEAPONS.filter(w => {
      if (selectedWeaponCategory === 'all') return true;
      const cat = categories.find(c => c.id === selectedWeaponCategory);
      return cat && cat.match && cat.match.includes(w.key);
    });

    const weaponCards = filteredWeapons.map(w => {
      const isSel = w.key === selectedSkinWeaponKey;
      return `
        <div class="weaponCardSelect ${isSel ? 'active' : ''}" onclick="selectSkinWeapon('${w.key}')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:${isSel ? '#00f0ff' : '#fff'}; font-family:'Orbitron',sans-serif; font-size:13px;">${w.name}</b>
            <span class="proBadge ${w.auto ? 'badgeCyan' : 'badgeGold'}" style="font-size:9px;">${w.auto ? 'AUTO' : 'SEMI'}</span>
          </div>
          <small style="color:#8ca2c7;">Dano: ${w.damage} • Cadência: ${(1 / w.fireRate).toFixed(1)}/s • Mag: ${w.magSize}</small>
        </div>
      `;
    }).join('');

    const activeW = WEAPONS.find(w => w.key === selectedSkinWeaponKey) || WEAPONS[0];

    // Cálculos de Barras Gunsmith Proporcional
    const dmgPct = Math.min(100, Math.round((activeW.damage / 140) * 100));
    const ratePct = Math.min(100, Math.round(((1 / activeW.fireRate) / 16) * 100));
    const rangePct = Math.min(100, Math.round((activeW.range / 240) * 100));
    const ctrlPct = Math.max(10, Math.min(100, Math.round(100 - activeW.recoil * 480)));

    const skinCards = Object.entries(SKINS).map(([sKey, s]) => {
      const isUnlocked = unlockedSkins.has(`${activeW.key}_${sKey}`) || sKey === 'default';
      const isEquipped = equippedSkins[activeW.key] === sKey;
      const col = s.color ? '#' + s.color.toString(16).padStart(6, '0') : '#ffffff';

      return `
        <div class="skinCardAAA ${isEquipped ? 'equipped' : isUnlocked ? 'unlocked' : ''}" style="padding:16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <div style="width:14px; height:14px; border-radius:50%; background:${col}; box-shadow:0 0 8px ${col};"></div>
            <b style="color:${col}; font-size:13px;">${s.name}</b>
          </div>
          <div style="font-size:11px; font-weight:700; color:${isEquipped ? '#00f0ff' : isUnlocked ? '#55dd77' : '#ffb800'}; margin-bottom:12px;">
            ${isEquipped ? '✓ EQUIPADA' : isUnlocked ? 'DISPONÍVEL' : `💳 ${s.price} CRÉDITOS`}
          </div>
          <button class="btnAAA ${isEquipped ? '' : 'secondary'}" style="width:100%; font-size:11px; padding:7px 0;"
            onclick="handleSkinClick('${activeW.key}', '${sKey}', ${s.price}, ${isUnlocked}, ${isEquipped})">
            ${isEquipped ? 'EM USO' : isUnlocked ? 'EQUIPAR' : 'DESBLOQUEAR'}
          </button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <h2>ARSENAL MILITAR & GUNSMITH 3D</h2>
          <p class="desc" style="margin-bottom:0;">Inspecione o desempenho balístico e aplique camuflagens especiais renderizadas em PBR.</p>
        </div>
        <div class="proBadge badgeGold" style="padding:6px 14px;">SALDO: ${credits} CRÉDITOS</div>
      </div>

      <!-- Filtros de Categorias de Armas -->
      <div style="display:flex; gap:8px; margin-bottom:16px; overflow-x:auto; padding-bottom:4px;">
        ${categoryButtons}
      </div>

      <!-- Grid Duplo: Seletor de Armas à Esquerda, Dossiê e Skins à Direita -->
      <div style="display:grid; grid-template-columns:1fr 1.6fr; gap:20px;">
        <!-- Coluna de Lista de Armas -->
        <div style="display:flex; flex-direction:column; gap:8px; max-height:420px; overflow-y:auto; padding-right:6px;">
          ${weaponCards}
        </div>

        <!-- Coluna de Dossiê Balístico & Skins -->
        <div style="background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:20px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
            <div>
              <span class="proBadge badgeCyan" style="margin-bottom:6px;">ARMA SELECIONADA</span>
              <h3 style="font-family:'Orbitron',sans-serif; font-size:20px; color:#fff; margin:0;">${activeW.name.toUpperCase()}</h3>
            </div>
            <div style="text-align:right;">
              <span style="font-size:11px; color:#8ba0c2; display:block;">PENTE / CAPACIDADE</span>
              <b style="font-family:'Orbitron',sans-serif; color:#ffb800; font-size:16px;">${activeW.magSize} RDS</b>
            </div>
          </div>

          <!-- Barras de Performance Balística -->
          <div style="margin-bottom:20px;">
            <div class="statBarRow">
              <span class="statBarLabel">DANO</span>
              <div class="statBarTrack"><div class="statBarFill" style="width:${dmgPct}%; background:linear-gradient(90deg,#ff5555,#ff8833);"></div></div>
              <span class="statBarVal">${activeW.damage}</span>
            </div>
            <div class="statBarRow">
              <span class="statBarLabel">CADÊNCIA</span>
              <div class="statBarTrack"><div class="statBarFill" style="width:${ratePct}%;"></div></div>
              <span class="statBarVal">${(1 / activeW.fireRate).toFixed(1)}/s</span>
            </div>
            <div class="statBarRow">
              <span class="statBarLabel">ALCANCE</span>
              <div class="statBarTrack"><div class="statBarFill" style="width:${rangePct}%;"></div></div>
              <span class="statBarVal">${activeW.range}m</span>
            </div>
            <div class="statBarRow">
              <span class="statBarLabel">CONTROLE</span>
              <div class="statBarTrack"><div class="statBarFill" style="width:${ctrlPct}%; background:linear-gradient(90deg,#55dd77,#00f0ff);"></div></div>
              <span class="statBarVal">${ctrlPct}%</span>
            </div>
          </div>

          <!-- Grade de Camuflagens PBR -->
          <span style="font-family:'Orbitron',sans-serif; font-size:12px; color:#9fb3d9; font-weight:800; display:block; margin-bottom:10px; letter-spacing:1px;">
            CAMUFLAGENS E ACABAMENTOS (PBR):
          </span>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
            ${skinCards}
          </div>
        </div>
      </div>
    `;

  // --- ABA 3: OPERADOR & HISTÓRICO MILITAR ---
  } else if (activeTab === 'stats') {
    const accuracy = player.accuracy.shots > 0 ? Math.round((player.accuracy.hits / player.accuracy.shots) * 100) : 0;
    const kd = deaths > 0 ? (player.totalKills / deaths).toFixed(2) : player.totalKills;
    const hsRate = player.totalKills > 0 ? Math.round((player.headshots / player.totalKills) * 100) : 0;

    // Condecorações Militares
    const medals = [
      { id: 'hs', icon: '🎯', name: 'ATIRADOR DE ELITE', desc: 'Realize 10 ou mais acertos na cabeça', unlocked: player.headshots >= 10 },
      { id: 'streak', icon: '⚡', name: 'FÚRIA DE COMBATE', desc: 'Alcance uma sequência de 5 baixas sem morrer', unlocked: player.bestStreak >= 5 },
      { id: 'veteran', icon: '🏆', name: 'VETERANO DA ZONA', desc: 'Neutralize mais de 25 inimigos no total', unlocked: player.totalKills >= 25 },
      { id: 'wave', icon: '🛡️', name: 'SOBREVIVENTE DA ONDA', desc: 'Alcance ou supere a Onda 5 de invasão', unlocked: wave >= 5 }
    ];

    const medalHtml = medals.map(m => `
      <div class="medalCard ${m.unlocked ? 'unlocked' : ''}">
        <div class="medalIcon">${m.icon}</div>
        <div class="medalInfo">
          <b>${m.name} ${m.unlocked ? '<span style="color:#ffb800; font-size:11px;">[CONQUISTADO]</span>' : ''}</b>
          <small>${m.desc}</small>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <h2>REGISTRO DE SERVIÇO DO OPERADOR</h2>
      <p class="desc">Dossiê militar de desempenho balístico, condecorações e eficiência tática.</p>

      <!-- Grade Principal de Estatísticas Estilizada -->
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; margin-bottom:26px;">
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:16px; text-align:center;">
          <small style="color:#8aa2c4; font-weight:700; font-family:'Orbitron',sans-serif; letter-spacing:1px;">K/D RATIO</small>
          <div style="font-family:'Orbitron',sans-serif; font-size:32px; font-weight:900; color:#55dd77; margin-top:4px;">${kd}</div>
          <small style="color:#55dd77; font-size:10px;">EFICIÊNCIA DE COMBATE</small>
        </div>

        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:16px; text-align:center;">
          <small style="color:#8aa2c4; font-weight:700; font-family:'Orbitron',sans-serif; letter-spacing:1px;">INIMIGOS ELIMINADOS</small>
          <div style="font-family:'Orbitron',sans-serif; font-size:32px; font-weight:900; color:#00f0ff; margin-top:4px;">${player.totalKills}</div>
          <small style="color:#00f0ff; font-size:10px;">${player.headshots} TIROS NA CABEÇA (${hsRate}%)</small>
        </div>

        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:16px; text-align:center;">
          <small style="color:#8aa2c4; font-weight:700; font-family:'Orbitron',sans-serif; letter-spacing:1px;">PRECISÃO GLOBAL</small>
          <div style="font-family:'Orbitron',sans-serif; font-size:32px; font-weight:900; color:#ffb800; margin-top:4px;">${accuracy}%</div>
          <small style="color:#ffb800; font-size:10px;">${player.accuracy.hits}/${player.accuracy.shots} DISPAROS CONECTADOS</small>
        </div>
      </div>

      <!-- Condecorações & Medalhas -->
      <span style="font-family:'Orbitron',sans-serif; font-size:13px; color:#00f0ff; font-weight:800; display:block; margin-bottom:12px; letter-spacing:1.5px;">
        CONDECORAÇÕES & MEDALHAS MILITARES:
      </span>
      <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;">
        ${medalHtml}
      </div>
    `;

  // --- ABA 4: CONFIGURAÇÕES & GUIA DE COMANDOS TÁTICOS ---
  } else if (activeTab === 'settings') {
    const settingsSubTabs = [
      { id: 'gameplay', name: 'JOGABILIDADE & MOUSE' },
      { id: 'audio', name: 'ÁUDIO TÁTICO' },
      { id: 'controls', name: 'GUIA DE CONTROLES TÁTICOS' }
    ];

    const subTabButtons = settingsSubTabs.map(st => `
      <button class="subTabBtn ${selectedSettingsTab === st.id ? 'active' : ''}" onclick="selectSettingsSubTab('${st.id}')">
        ${st.name}
      </button>
    `).join('');

    let contentHtml = '';

    if (selectedSettingsTab === 'gameplay') {
      contentHtml = `
        <div class="settingsGroup" style="max-width:100%;">
          <div class="settingRow">
            <div>
              <label>SENSIBILIDADE DO MOUSE</label>
              <div style="font-size:11px; color:#8ba2c7;">Velocidade de resposta da câmera em combate livre</div>
            </div>
            <div class="settingControl">
              <input type="range" id="sensSlider" min="0.0005" max="0.0050" step="0.0001" value="${settings.sensitivity}">
              <span class="valLabel" id="sensVal">${Math.round(settings.sensitivity * 20000)}</span>
            </div>
          </div>

          <div class="settingRow">
            <div>
              <label>CAMPO DE VISÃO (FOV)</label>
              <div style="font-size:11px; color:#8ba2c7;">Amplitude periférica da câmera óptica (60° a 110°)</div>
            </div>
            <div class="settingControl">
              <input type="range" id="fovSlider" min="60" max="110" step="1" value="${settings.fov}">
              <span class="valLabel" id="fovVal">${settings.fov}°</span>
            </div>
          </div>
        </div>
      `;
    } else if (selectedSettingsTab === 'audio') {
      contentHtml = `
        <div class="settingsGroup" style="max-width:100%;">
          <div class="settingRow">
            <div>
              <label>VOLUME MASTER DO JOGO</label>
              <div style="font-size:11px; color:#8ba2c7;">Controle de ganho mestre da Web Audio API e DSP Compressor</div>
            </div>
            <div class="settingControl">
              <input type="range" id="volSlider" min="0" max="1" step="0.05" value="${settings.volume}">
              <span class="valLabel" id="volVal">${Math.round(settings.volume * 100)}%</span>
            </div>
          </div>

          <div style="margin-top:16px; display:flex; justify-content:flex-end;">
            <button class="btnAAA secondary" onclick="playSound('rifle', { volume: settings.volume }); showStatus('🔊 DISPARO DE TESTE DE ÁUDIO', 1000);" style="font-size:12px; padding:8px 18px;">
              TESTAR DISPARO DE ÁUDIO
            </button>
          </div>
        </div>
      `;
    } else if (selectedSettingsTab === 'controls') {
      contentHtml = `
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px 24px; font-size:13px; font-weight:600;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span>Movimentação com Inércia</span>
            <span><span class="keycap">W</span> <span class="keycap">A</span> <span class="keycap">S</span> <span class="keycap">D</span></span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span>Corrida Tática (Sprint)</span>
            <span><span class="keycap">SHIFT</span></span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span>Pulo / Mantle / Slide Cancel</span>
            <span><span class="keycap">ESPAÇO</span></span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span>Agachamento / Slide Tático</span>
            <span><span class="keycap">C</span></span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span>Lean Tático (Espiar Cantos)</span>
            <span><span class="keycap">Q</span> / <span class="keycap">E</span></span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span>Dash Tático (Esquiva Rápida)</span>
            <span><span class="keycap">V</span> / <span class="keycap">X</span></span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span>Disparo / Mira Zoom ADS</span>
            <span><span class="keycap">M1</span> / <span class="keycap">M2</span></span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span>Silenciador Tático (Supressão)</span>
            <span><span class="keycap">T</span></span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span>Lançar Granada M67</span>
            <span><span class="keycap">G</span></span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <span>Usar Kit Médico / Inserir Placa</span>
            <span><span class="keycap">H</span> / <span class="keycap">U</span></span>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <h2>CONFIGURAÇÕES TÁTICAS & CONTROLE</h2>
      <p class="desc">Ajuste os parâmetros operacionais de combate, sensibilidade óptica e calibração de áudio.</p>

      <div style="display:flex; gap:10px; margin-bottom:20px;">
        ${subTabButtons}
      </div>

      ${contentHtml}
    `;

    bindSettingsEvents();
  }

  attachUiSoundEvents();
}

function selectWeaponCategory(catId) {
  selectedWeaponCategory = catId;
  renderTabContent();
}

function selectSettingsSubTab(subTabId) {
  selectedSettingsTab = subTabId;
  renderTabContent();
}

function selectSkinWeapon(weaponKey) {
  selectedSkinWeaponKey = weaponKey;
  const idx = WEAPONS.findIndex(w => w.key === weaponKey);
  if (idx !== -1 && typeof switchWeapon === 'function') {
    switchWeapon(idx);
  }
  renderTabContent();
}

function handleSkinClick(weaponKey, skinKey, price, isUnlocked, isEquipped) {
  if (isEquipped) return;

  if (!isUnlocked) {
    if (credits < price) {
      playSound('ui_hover', { pitch: 0.6 });
      showStatus('❌ CRÉDITOS INSUFICIENTES', 1500);
      return;
    }
    credits -= price;
    unlockedSkins.add(`${weaponKey}_${skinKey}`);
    playSound('levelup', { pitch: 1.2 });
  } else {
    playSound('reload', { pitch: 1.3 });
  }

  equippedSkins[weaponKey] = skinKey;
  updateAllWeaponSkins();
  saveProgress();
  showStatus(`✨ SKIN ${SKINS[skinKey].name.toUpperCase()} EQUIPADA!`, 1600);
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
    if (typeof updateMasterVolume === 'function') updateMasterVolume();
    const volVal = document.getElementById('volVal');
    if (volVal) volVal.textContent = Math.round(settings.volume * 100) + '%';
    saveSettings();
  };
}

function selectMap(key) {
  selectedMap = key;
  if (typeof applyMapTheme === 'function') applyMapTheme();
  renderTabContent();
}

// ---------------------------------------------------------------------
// 3. FLUXO DO JOGO & TRANSIÇÕES DE ESTADO
// ---------------------------------------------------------------------

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

  if (typeof applyMapTheme === 'function') applyMapTheme();
  inPlane = true;
  planeJumpReady = false;
  planeWalkDistance = 0;
  planeCorridorOffset.set(0, 0, 0);
  dropActive = false;
  player.onGround = true;
  player.velocity.set(0, 0, 0);
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

  const killEl = document.getElementById('killCount');
  const deathEl = document.getElementById('deathCount');
  if (killEl) killEl.textContent = kills;
  if (deathEl) deathEl.textContent = deaths;

  if (typeof updateWaveHud === 'function') updateWaveHud();

  setWind(true);
  lastTime = performance.now();
  safeRequestPointerLock();

  if (bots.filter(bot => bot.alive).length === 0) {
    for (let i = 0; i < 5; i++) spawnBot();
  }

  showStatus('🛩️ CARGO FLIGHT — ANDE ATÉ A RAMPA TRASEIRA PARA SALTAR!', 3500);
  animate();
}

// ---------------------------------------------------------------------
// 4. MENU DE PAUSA DE COMBATE EM CAMPO (ESC)
// ---------------------------------------------------------------------

function renderPauseMenuContent() {
  const pauseMenu = document.getElementById('pauseMenu');
  if (!pauseMenu) return;

  const map = MAPS[selectedMap] || MAPS.neon_rust;
  const curWeapon = currentWeapon();
  const accuracy = player.accuracy.shots > 0 ? Math.round((player.accuracy.hits / player.accuracy.shots) * 100) : 0;
  const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills;

  pauseMenu.innerHTML = `
    <div class="pauseContainer" style="max-width:940px;">
      <div class="pauseHeader">
        <div>
          <h2>PAUSA DE COMBATE</h2>
          <small style="color:#8ba2c7; font-weight:700; letter-spacing:1px;">OPERAÇÃO EM ANDAMENTO • SISTEMA EM ESPERA</small>
        </div>
        <span class="proBadge badgeCyan" style="padding:6px 16px; font-size:12px;">
          📍 ZONA: ${map.name.toUpperCase()}
        </span>
      </div>

      <div class="pauseBody">
        <!-- Lado Esquerdo: Estatísticas & Recursos da Partida -->
        <div class="pauseLeft">
          <div class="pauseSectionTitle">RELATÓRIO TÁTICO DA SESSÃO</div>
          <div class="pauseStatsGrid">
            <div class="pauseStatBox"><label>ONDA ATUAL</label><val style="color:#00f0ff;">ONDA ${wave}</val></div>
            <div class="pauseStatBox"><label>INVASORES RESTANTES</label><val>${waveEnemiesTotal - waveEnemiesKilled}</val></div>
            <div class="pauseStatBox"><label>ELIMINAÇÕES</label><val style="color:#55dd77;">${kills}</val></div>
            <div class="pauseStatBox"><label>K/D DA PARTIDA</label><val style="color:#ffb800;">${kd}</val></div>
            <div class="pauseStatBox"><label>KILL STREAK ATIVA</label><val style="color:#ffb800;">${player.killStreak}</val></div>
            <div class="pauseStatBox"><label>PRECISÃO DE TIRO</label><val>${accuracy}%</val></div>
          </div>

          <div class="pauseSectionTitle">EQUIPAMENTO & BLINDAGEM ATIVA</div>
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:14px; font-size:13px; line-height:1.7;">
            <div>🔫 Arma Primária: <strong style="color:#00f0ff;">${curWeapon.name}</strong> (${curWeapon.magSize} RDS)</div>
            <div>🛡️ Blindagem: <strong style="color:${player.armor > 50 ? '#55dd77' : '#ffb800'};">${Math.round(player.armor)} / 100</strong></div>
            <div>💉 Kits Médicos: <strong>${inventory.medkits}</strong> | 💣 Granadas M67: <strong>${inventory.grenades}</strong></div>
          </div>
        </div>

        <!-- Lado Direito: Ajustes Rápidos & Ações -->
        <div class="pauseRight">
          <div class="pauseSectionTitle">CALIBRAÇÃO RÁPIDA</div>
          <div class="settingsGroup" style="gap:10px; margin-bottom:20px;">
            <div class="settingRow" style="padding:8px 14px;">
              <label style="font-size:11px;">SENSIBILIDADE</label>
              <div class="settingControl">
                <input type="range" id="pauseSens" min="0.0005" max="0.0050" step="0.0001" value="${settings.sensitivity}">
              </div>
            </div>
            <div class="settingRow" style="padding:8px 14px;">
              <label style="font-size:11px;">CAMPO DE VISÃO (${settings.fov}°)</label>
              <div class="settingControl">
                <input type="range" id="pauseFov" min="60" max="110" step="1" value="${settings.fov}">
              </div>
            </div>
            <div class="settingRow" style="padding:8px 14px;">
              <label style="font-size:11px;">VOLUME GERAL</label>
              <div class="settingControl">
                <input type="range" id="pauseVol" min="0" max="1" step="0.05" value="${settings.volume}">
              </div>
            </div>
          </div>

          <div class="pauseActions">
            <button class="btnAAA" onclick="resumeGame()">
              ⚡ CONTINUAR COMBATE [ESPAÇO]
            </button>
            <button class="btnAAA secondary" onclick="restartMatch()">
              🔄 REINICIAR PARTIDA
            </button>
            <button class="btnAAA danger" onclick="showExitModal()">
              SAIR PARA O MENU PRINCIPAL
            </button>
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
  if (pVol) pVol.oninput = (e) => { settings.volume = parseFloat(e.target.value); if (typeof updateMasterVolume === 'function') updateMasterVolume(); saveSettings(); };

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
    safeRequestPointerLock();
  }
}

function resumeGame() {
  isPaused = false;
  const pauseMenu = document.getElementById('pauseMenu');
  if (pauseMenu) pauseMenu.classList.remove('show');
  safeRequestPointerLock();
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

// ---------------------------------------------------------------------
// 5. RELATÓRIO PÓS-AÇÃO (AFTER-ACTION REPORT - AAR)
// ---------------------------------------------------------------------

function showGameOverScreen() {
  gameRunning = false;
  isPaused = false;
  document.exitPointerLock();
  setWind(false);

  const accuracy = player.accuracy.shots > 0 ? Math.round((player.accuracy.hits / player.accuracy.shots) * 100) : 0;
  const earnedXp = kills * 50 + player.headshots * 50 + wave * 100;
  const earnedCredits = kills * 30 + wave * 80;

  credits += earnedCredits;
  player.xp += earnedXp;
  saveProgress();

  const overlay = document.getElementById('overlay');
  overlay.style.display = 'flex';
  overlay.classList.remove('hidden');

  overlay.innerHTML = `
    <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:30px; animation:panelFade 0.35s ease-out;">
      <span class="proBadge badgeRed" style="padding:6px 18px; margin-bottom:12px; font-size:13px;">OPERADOR ABATIDO EM COMBATE</span>
      <h1 style="font-family:'Orbitron',sans-serif; font-size:46px; color:#ff3838; text-shadow:0 0 35px rgba(255,56,56,0.85); letter-spacing:4px; margin-bottom:8px;">
        RELATÓRIO PÓS-AÇÃO (AAR)
      </h1>
      <p style="font-size:15px; color:#9fb3d9; margin-bottom:28px; font-weight:600;">Sua operação foi encerrada. Todos os créditos e XP acumulados foram salvos no seu perfil.</p>

      <!-- Recompensas da Partida -->
      <div style="display:flex; gap:16px; margin-bottom:24px;">
        <div class="proBadge badgeGold" style="padding:10px 22px; font-size:14px;">+${earnedXp} XP ADQUIRIDO</div>
        <div class="proBadge badgeCyan" style="padding:10px 22px; font-size:14px;">+${earnedCredits} CRÉDITOS RESGATADOS</div>
      </div>

      <!-- Grade de Estatísticas do Debriefing -->
      <div class="statsGrid" style="max-width:440px; margin-bottom:32px; font-size:14px; gap:10px 24px;">
        <span class="stat-label">Inimigos Eliminados</span><span class="stat-value" style="color:#00f0ff;">${kills}</span>
        <span class="stat-label">Onda Alcançada</span><span class="stat-value" style="color:#ffb800;">ONDA ${wave}</span>
        <span class="stat-label">Tiros na Cabeça</span><span class="stat-value">${player.headshots}</span>
        <span class="stat-label">Melhor Killstreak</span><span class="stat-value">${player.bestStreak}</span>
        <span class="stat-label">Precisão Balística</span><span class="stat-value">${accuracy}%</span>
        <span class="stat-label">Nível de Operador</span><span class="stat-value">NV ${player.level}</span>
      </div>

      <!-- Botões de Ação Imediata -->
      <div style="display:flex; gap:16px;">
        <button class="btnAAA" id="respawnBtn" style="padding:14px 40px; font-size:15px;">
          ⚡ NOVO SALTO DE COMBATE [ESPAÇO]
        </button>
        <button class="btnAAA secondary" id="menuBtn" style="padding:14px 30px;">
          RETORNAR À BASE [ESC]
        </button>
      </div>
    </div>
  `;

  document.getElementById('respawnBtn').addEventListener('click', () => {
    respawnPlayer();
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
    gameRunning = true;
    lastTime = performance.now();
    safeRequestPointerLock();
    showStatus('DE VOLTA AO COMBATE', 1500);
    animate();
  });

  document.getElementById('menuBtn').addEventListener('click', () => {
    showMainMenu();
  });

  attachUiSoundEvents();
}

// ---------------------------------------------------------------------
// 6. NAVEGAÇÃO POR TECLADO EM MENUS (ATALHOS TÁTICOS Q / E / ESPAÇO)
// ---------------------------------------------------------------------

window.addEventListener('keydown', (e) => {
  const overlay = document.getElementById('overlay');
  const isMenuOpen = overlay && !overlay.classList.contains('hidden') && overlay.style.display !== 'none';
  const pauseMenu = document.getElementById('pauseMenu');
  const isPauseOpen = pauseMenu && pauseMenu.classList.contains('show');

  // Navegação no Lobby Principal
  if (isMenuOpen) {
    const tabs = ['operation', 'arsenal', 'stats', 'settings'];
    const curIdx = tabs.indexOf(activeTab);

    if (e.code === 'KeyQ') {
      const prevIdx = (curIdx - 1 + tabs.length) % tabs.length;
      switchTab(tabs[prevIdx]);
    } else if (e.code === 'KeyE') {
      const nextIdx = (curIdx + 1) % tabs.length;
      switchTab(tabs[nextIdx]);
    } else if (e.code === 'Space' || e.code === 'Enter') {
      if (activeTab === 'operation') {
        beginGame();
      }
    }
  } else if (isPauseOpen) {
    if (e.code === 'Space') {
      resumeGame();
    }
  }
});
