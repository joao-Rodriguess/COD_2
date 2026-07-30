// =====================================================================
// INPUT.JS — Controles do Jogador
// =====================================================================

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();

  // Armas
  if (e.code === 'Digit1') switchWeapon(0);
  if (e.code === 'Digit2') switchWeapon(1);
  if (e.code === 'Digit3') switchWeapon(2);
  if (e.code === 'Digit4') switchWeapon(3);
  if (e.code === 'Digit5') switchWeapon(4);

  // Ações
  if (e.code === 'KeyR') tryReload();
  if (e.code === 'KeyI') toggleInventory();
  if (e.code === 'KeyH') useMedkit();
  if (e.code === 'KeyB') deployBarricade();
  if (e.code === 'KeyE') tryInteract();
  if (e.code === 'KeyG') throwGrenade();
  if (e.code === 'KeyC') performDash();
  if (e.code === 'ControlLeft' || e.code === 'ControlRight') { e.preventDefault(); toggleCrouch(); }

  // Avião
  if (e.code === 'Space' && inPlane && !planeJumpReady) {
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).negate();
    const testPos = yawObject.position.clone().addScaledVector(forward, 1.6);
    if (testPos.distanceTo(yawObject.position) > 0.5) {
      planeJumpReady = true;
      showStatus('PRESSIONE ESPAÇO NOVAMENTE PARA PULAR DO AVIÃO', 2600);
    }
  } else if (e.code === 'Space' && inPlane && planeJumpReady) {
    jumpFromPlane();
  }

  // Escape
  if (e.code === 'Escape' && gameRunning) {
    document.exitPointerLock();
    gameRunning = false;
    dropActive = false;
    inPlane = false;
    transportPlane.visible = false;
    setWind(false);
    showMainMenu();
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

canvas.addEventListener('click', () => {
  if (!pointerLocked && gameRunning) canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
});

document.addEventListener('mousemove', e => {
  if (!pointerLocked) return;
  yaw -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0022;
  pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch));
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
});

document.addEventListener('mousedown', e => {
  if (e.button !== 0 || !pointerLocked || !player.alive) return;
  unlockAudio();
  mouseDown = true;
  if (!currentWeapon().auto) doShoot();
});

document.addEventListener('mouseup', e => {
  if (e.button === 0) mouseDown = false;
});
