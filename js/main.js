// =====================================================================
// MAIN.JS — Loop Principal + Performance Throttling + Portais + AirDrops
// =====================================================================

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  let rawDt = (now - lastTime) / 1000;
  rawDt = Math.min(rawDt, 0.05);
  lastTime = now;

  // Slow-Motion Update
  if (slowMoTimer > 0) {
    slowMoTimer -= rawDt;
    if (slowMoTimer <= 0) timeScale = 1.0;
  }
  const dt = rawDt * timeScale;

  frameCount++;

  // --- MODO MENU PRINCIPAL (Câmera 3D em Órbita Cinemática) ---
  if (!gameRunning) {
    menuCameraAngle += rawDt * 0.15;
    const radius = 90;
    const height = 45;
    yawObject.position.set(
      Math.cos(menuCameraAngle) * radius,
      height,
      Math.sin(menuCameraAngle) * radius
    );
    yawObject.rotation.y = -menuCameraAngle - Math.PI / 2;
    pitchObject.rotation.x = -0.35;

    updateAmbientParticles(rawDt);
    renderer.render(scene, camera);
    return;
  }

  // --- MODO JOGO PAUSADO ---
  if (isPaused) {
    renderer.render(scene, camera);
    return;
  }

  // --- MODO EM JOGO ATIVO ---
  if (mouseDown && pointerLocked && player.alive) {
    const w = currentWeapon();
    if (w.auto) doShoot();
  }

  if (reloading && now >= reloadEndTime) finishReload();

  // Updates de gameplay
  updatePlayerMovement(dt);
  updatePlane(dt);
  updateDrop(dt);
  updateBots(dt);
  updateGrenades(dt);
  updateAirDrops(dt);
  updatePortals(dt); // Atualização de portais quânticos de teletransporte
  updateAmbientParticles(dt);
  updateInteractionHint();
  updateDamageIndicators(dt);
  updateScreenShake();

  // Tracers (pool-based: desativa e oculta em vez de remover)
  for (let i = tracers.length - 1; i >= 0; i--) {
    tracers[i].life -= dt;
    if (tracers[i].life <= 0) {
      tracers[i].line.visible = false;
      tracers[i].active = false;
      tracers.splice(i, 1);
    }
  }

  // Hit effects + shell casings + explosions
  for (let i = hitEffects.length - 1; i >= 0; i--) {
    const fx = hitEffects[i];
    fx.life -= dt;

    if (fx.isShell) {
      const vel = fx.velocities[0];
      fx.pts.position.x += vel.x * dt;
      fx.pts.position.y += vel.y * dt;
      fx.pts.position.z += vel.z * dt;
      vel.y -= 9 * dt;
      fx.pts.rotation.x += dt * 12;
      fx.pts.material.opacity = Math.max(fx.life / fx.maxLife, 0);
    } else if (fx.isExplosion) {
      const scale = 1 + (1 - fx.life / fx.maxLife) * 3;
      fx.pts.scale.setScalar(scale);
      fx.pts.material.opacity = Math.max(fx.life / fx.maxLife * 0.6, 0);
    } else {
      const posAttr = fx.pts.geometry.attributes.position;
      for (let j = 0; j < fx.velocities.length; j++) {
        posAttr.array[j * 3] += fx.velocities[j].x * dt;
        posAttr.array[j * 3 + 1] += fx.velocities[j].y * dt;
        posAttr.array[j * 3 + 2] += fx.velocities[j].z * dt;
        fx.velocities[j].y -= 9 * dt;
      }
      posAttr.needsUpdate = true;
      fx.pts.material.opacity = Math.max(fx.life / fx.maxLife, 0);
    }

    if (fx.life <= 0) {
      if (fx._poolSlot) {
        // Devolve cartucho ao pool
        fx.pts.visible = false;
        fx._poolSlot.active = false;
      } else {
        scene.remove(fx.pts);
        if (fx.pts.geometry) fx.pts.geometry.dispose();
        if (fx.pts.material) fx.pts.material.dispose();
      }
      hitEffects.splice(i, 1);
    }
  }

  // Shadow map segue o jogador para sombras nítidas ao redor
  sun.position.set(yawObject.position.x + 120, 160, yawObject.position.z + 80);
  sun.target.position.copy(yawObject.position);
  sun.target.updateMatrixWorld();

  drawMinimap();
  renderer.render(scene, camera);
}

// =====================================================================
// INICIALIZAÇÃO
// =====================================================================
updateAmmoHud();
updateHealthHud();
updateArmorHud();
updateStaminaHud();
updateGrenadeHud();
updateInventory();
updateXpHud();
updateStreakHud();
updateWaveHud();
applyMapTheme();
showMainMenu();
animate();
