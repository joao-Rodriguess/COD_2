// =====================================================================
// INPUT.JS — REGISTRO UNIVERSAL DE TECLAS & CONTROLES TÁTICOS
// =====================================================================

window.addEventListener('keydown', (e) => {
  if (document.activeElement.tagName !== 'INPUT') {
    keys[e.code] = true;
    if (e.key) {
      keys[e.key] = true;
      keys[e.key.toLowerCase()] = true;
      keys[e.key.toUpperCase()] = true;
    }
  }

  if (!gameRunning) return;

  // Inclinada de Canto (Corner Lean Q / E)
  if (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q') { isLeaningLeft = true; }
  if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') { isLeaningRight = true; }

  // Silenciador Tático (Tecla T)
  if (e.code === 'KeyT' || e.key === 't' || e.key === 'T') {
    isSilenced = !isSilenced;
    playSound('reload');
    showStatus(isSilenced ? '🤫 SILENCIADOR EQUIPADO (ATENUAÇÃO DE SOM)' : '💥 SILENCIADOR REMOVIDO', 1600);
  }

  // Visão Noturna NVG (Tecla N)
  if (e.code === 'KeyN' || e.key === 'n' || e.key === 'N') {
    toggleNvg();
  }

  // Interagir (Tecla F ou E)
  if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
    tryInteract();
  }

  // Recarregar (Tecla R)
  if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
    tryReload();
  }

  // Uso de Kit Médico (Tecla H)
  if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
    useMedkit();
  }

  // Dash / Slide Tático (Tecla C)
  if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
    toggleCrouchOrSlide();
  }

  // Lançamento de Granada (Tecla G)
  if (e.code === 'KeyG' || e.key === 'g' || e.key === 'G') {
    throwGrenade();
  }

  // Troca de Armas Teclado Numérico (1 a 0 e roda do mouse)
  if (e.code === 'Digit1' || e.key === '1') switchWeapon(0);
  if (e.code === 'Digit2' || e.key === '2') switchWeapon(1);
  if (e.code === 'Digit3' || e.key === '3') switchWeapon(2);
  if (e.code === 'Digit4' || e.key === '4') switchWeapon(3);
  if (e.code === 'Digit5' || e.key === '5') switchWeapon(4);
  if (e.code === 'Digit6' || e.key === '6') switchWeapon(5);
  if (e.code === 'Digit7' || e.key === '7') switchWeapon(6);
  if (e.code === 'Digit8' || e.key === '8') switchWeapon(7);
  if (e.code === 'Digit9' || e.key === '9') switchWeapon(8);
  if (e.code === 'Digit0' || e.key === '0') switchWeapon(9);

  // Menu de Pausa (ESC)
  if (e.code === 'Escape') {
    togglePauseMenu();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.key) {
    keys[e.key] = false;
    keys[e.key.toLowerCase()] = false;
    keys[e.key.toUpperCase()] = false;
  }

  if (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q') isLeaningLeft = false;
  if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') isLeaningRight = false;
});

// Suporte a Roda do Mouse para Troca de Armas
window.addEventListener('wheel', (e) => {
  if (!gameRunning || isPaused) return;
  if (e.deltaY > 0) {
    switchWeapon((currentWeaponIdx + 1) % WEAPONS.length);
  } else if (e.deltaY < 0) {
    switchWeapon((currentWeaponIdx - 1 + WEAPONS.length) % WEAPONS.length);
  }
});

// Pointer Lock / Mira com Mouse
canvas.addEventListener('click', () => {
  if (gameRunning && !isPaused && !pointerLocked) {
    safeRequestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  pointerLocked = (document.pointerLockElement === canvas);
});

window.addEventListener('mousemove', (e) => {
  if (!pointerLocked || !gameRunning || isPaused) return;
  const sens = settings.sensitivity;
  yaw -= e.movementX * sens;
  pitch -= e.movementY * sens;
  pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch));

  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
});

// Disparo e Mira Zoom
window.addEventListener('mousedown', (e) => {
  if (!gameRunning || isPaused) return;
  if (e.button === 0) {
    mouseDown = true;
    const w = currentWeapon();
    if (!w.auto) doShoot();
  } else if (e.button === 2) {
    const w = currentWeapon();
    applyFov(w.zoomFov || 55);
    if (w.scoped) {
      const scope = document.getElementById('sniperScope');
      if (scope) scope.style.display = 'block';
    }
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseDown = false;
  else if (e.button === 2) {
    applyFov(settings.fov);
    const scope = document.getElementById('sniperScope');
    if (scope) scope.style.display = 'none';
  }
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

function toggleNvg() {
  isNvgActive = !isNvgActive;
  playSound('dash');

  let nvgFilter = document.getElementById('nvgFilter');
  if (!nvgFilter) {
    nvgFilter = document.createElement('div');
    nvgFilter.id = 'nvgFilter';
    nvgFilter.style.position = 'fixed';
    nvgFilter.style.top = '0'; nvgFilter.style.left = '0';
    nvgFilter.style.width = '100vw'; nvgFilter.style.height = '100vh';
    nvgFilter.style.pointerEvents = 'none';
    nvgFilter.style.background = 'rgba(0, 255, 120, 0.15)';
    nvgFilter.style.boxShadow = 'inset 0 0 100px rgba(0, 255, 120, 0.4)';
    nvgFilter.style.mixBlendMode = 'overlay';
    nvgFilter.style.zIndex = '999';
    document.body.appendChild(nvgFilter);
  }

  nvgFilter.style.display = isNvgActive ? 'block' : 'none';
  showStatus(isNvgActive ? '🟢 VISÃO NOTURNA TÁTICA ATIVADA [N]' : '🔴 VISÃO NOTURNA DESATIVADA', 1600);
}
