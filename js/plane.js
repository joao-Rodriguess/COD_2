// =====================================================================
// PLANE.JS — CONTROLES TÁTICOS 1ª PESSOA DE DENTRO DO AVIÃO (SEM INVERSÃO)
// =====================================================================

const transportPlane = new THREE.Group();
const interiorGroup = new THREE.Group();
transportPlane.add(interiorGroup);

let operatorMirrorMesh = null;

function buildDetailedCargoPlane() {
  while (transportPlane.children.length) transportPlane.remove(transportPlane.children[0]);
  while (interiorGroup.children.length) interiorGroup.remove(interiorGroup.children[0]);
  transportPlane.add(interiorGroup);

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x222a36, metalness: 0.85, roughness: 0.25, envMap: cubeRenderTarget.texture });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x18202c, roughness: 0.5, metalness: 0.7 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f141d, roughness: 0.3, metalness: 0.85 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x111620, metalness: 0.9, roughness: 0.3 });
  const redAlertMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });
  const mirrorGlassMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.98, roughness: 0.05, envMap: cubeRenderTarget.texture, envMapIntensity: 3.0 });
  reflectiveMaterials.push(mirrorGlassMat);

  const length = 26;
  const radius = 3.2;

  // Fusolagem Exterior
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 24), metalMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.set(0, 0, 0);
  fuselage.castShadow = true; fuselage.receiveShadow = true;
  transportPlane.add(fuselage);

  // Bico Cockpit
  const nose = new THREE.Mesh(new THREE.ConeGeometry(radius, 5.5, 24), metalMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0, -length / 2 - 2.75);
  transportPlane.add(nose);

  // Asas & Turbinas
  const wings = new THREE.Mesh(new THREE.BoxGeometry(40, 0.4, 5.5), new THREE.MeshStandardMaterial({ color: 0x1a222e, metalness: 0.8, roughness: 0.3 }));
  wings.position.set(0, 1.2, -3);
  transportPlane.add(wings);

  [-12, -6, 6, 12].forEach(tx => {
    const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.8, 16), darkMetal);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(tx, 0.8, -4.5);
    transportPlane.add(nacelle);

    const prop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 0.2), darkMetal);
    prop.position.set(tx, 0.8, -6.5);
    transportPlane.add(prop);
  });

  // Cauda T-Tail
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.5, 5.0), metalMat);
  tailFin.position.set(0, 4.8, length / 2 - 2.5);
  tailFin.rotation.x = -0.3;
  transportPlane.add(tailFin);

  // INTERIOR 100% FECHADO E DETALHADO DO CABIN DE CARGA
  const roomW = 5.4;
  const roomH = 3.6;
  const roomL = 18.0;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.2, roomL), floorMat);
  floor.position.set(0, -1.7, 0);
  interiorGroup.add(floor);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.2, roomL), wallMat);
  ceiling.position.set(0, roomH - 1.7, 0);
  interiorGroup.add(ceiling);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, roomH, roomL), wallMat);
  leftWall.position.set(-roomW / 2 + 0.1, roomH / 2 - 1.7, 0);
  interiorGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, roomH, roomL), wallMat);
  rightWall.position.set(roomW / 2 - 0.1, roomH / 2 - 1.7, 0);
  interiorGroup.add(rightWall);

  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, 0.2), wallMat);
  frontWall.position.set(0, roomH / 2 - 1.7, -roomL / 2);
  interiorGroup.add(frontWall);

  const cockpitDoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.1), darkMetal);
  cockpitDoor.position.set(0, -0.4, -roomL / 2 + 0.15);
  interiorGroup.add(cockpitDoor);

  for (let z = -6.5; z <= 5.5; z += 2.2) {
    const seatL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.4), darkMetal);
    seatL.position.set(-roomW / 2 + 0.6, -1.2, z);
    interiorGroup.add(seatL);

    const seatR = seatL.clone();
    seatR.position.x = roomW / 2 - 0.6;
    interiorGroup.add(seatR);
  }

  for (let z = -7; z <= 7; z += 3.5) {
    const alertLight = new THREE.PointLight(0xff2222, 2.2, 12);
    alertLight.position.set(0, 1.6, z);
    interiorGroup.add(alertLight);

    const lampFixture = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), redAlertMat);
    lampFixture.position.set(0, 1.75, z);
    interiorGroup.add(lampFixture);
  }

  // ESPELHO DA SKIN DO OPERADOR
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 1.6), darkMetal);
  mirrorFrame.position.set(-roomW / 2 + 0.2, 0.1, -1.5);
  interiorGroup.add(mirrorFrame);

  const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), mirrorGlassMat);
  mirrorGlass.rotation.y = Math.PI / 2;
  mirrorGlass.position.set(-roomW / 2 + 0.26, 0.1, -1.5);
  interiorGroup.add(mirrorGlass);

  operatorMirrorMesh = buildOperatorSkinCharacter();
  operatorMirrorMesh.position.set(-roomW / 2 + 1.2, -1.6, -1.5);
  operatorMirrorMesh.rotation.y = -Math.PI / 2;
  interiorGroup.add(operatorMirrorMesh);

  const labelText = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 1.2), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
  labelText.position.set(-roomW / 2 + 0.22, 1.45, -1.5);
  interiorGroup.add(labelText);

  // Rampa Traseira Aberta
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 6.5), darkMetal);
  ramp.position.set(0, -2.4, roomL / 2 + 1.5);
  ramp.rotation.x = 0.22;
  interiorGroup.add(ramp);

  scene.add(transportPlane);
}

function buildOperatorSkinCharacter() {
  const g = new THREE.Group();

  const skin = SKINS[equippedSkins[currentWeapon().key] || 'default'] || SKINS.default;
  const suitMat = new THREE.MeshStandardMaterial({ color: skin.color || 0x222d3d, metalness: skin.metalness || 0.5, roughness: skin.roughness || 0.4 });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x111622, metalness: 0.8, roughness: 0.3 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a07b, roughness: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.3), suitMat);
  body.position.y = 0.95;
  g.add(body);

  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.55, 0.34), armorMat);
  vest.position.y = 0.98;
  g.add(vest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), skinMat);
  head.position.y = 1.5;
  g.add(head);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), armorMat);
  helmet.position.y = 1.54;
  helmet.scale.set(1.05, 0.9, 1.05);
  g.add(helmet);

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), suitMat);
  legL.position.set(-0.15, 0.35, 0);
  g.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.15;
  g.add(legR);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), suitMat);
  armL.position.set(-0.35, 0.95, 0.1);
  armL.rotation.x = -0.5;
  g.add(armL);

  const armR = armL.clone();
  armR.position.x = 0.35;
  g.add(armR);

  return g;
}

function ensureJumpUiButton() {
  let btn = document.getElementById('planeJumpBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'planeJumpBtn';
    btn.innerHTML = '🪂 PULAR DO AVIÃO (ESPAÇO)';
    btn.style.position = 'fixed';
    btn.style.top = '14%';
    btn.style.left = '50%';
    btn.style.transform = 'translateX(-50%)';
    btn.style.padding = '14px 28px';
    btn.style.fontSize = '16px';
    btn.style.fontFamily = "'Orbitron', sans-serif";
    btn.style.fontWeight = 'bold';
    btn.style.color = '#fff';
    btn.style.background = 'linear-gradient(135deg, #ff3838, #b90000)';
    btn.style.border = '2px solid #ffaa00';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.zIndex = '999999';
    btn.style.boxShadow = '0 0 20px rgba(255, 56, 56, 0.6)';
    btn.onclick = () => startParachuteJump();
    document.body.appendChild(btn);
  }
  btn.style.display = inPlane ? 'block' : 'none';
}

function updatePlane(dt) {
  if (!inPlane || dropActive) {
    ensureJumpUiButton();
    return;
  }

  ensureJumpUiButton();

  // Trajetória circular do avião
  planeFlightAngle += planeSpeed * dt * 0.15;
  planePosition.set(
    Math.cos(planeFlightAngle) * planeFlightRadius,
    planePathHeight,
    Math.sin(planeFlightAngle) * planeFlightRadius
  );

  const planeRotation = Math.PI - planeFlightAngle;
  transportPlane.position.copy(planePosition);
  transportPlane.rotation.y = planeRotation;

  // CÁLCULO DE MOVIMENTO RELATIVO À MIRA DA CÂMERA (SEM INVERSÃO)
  const relYaw = yaw - planeRotation;
  const localForward = new THREE.Vector3(-Math.sin(relYaw), 0, -Math.cos(relYaw));
  const localRight = new THREE.Vector3(Math.cos(relYaw), 0, -Math.sin(relYaw));

  const moveDir = new THREE.Vector3(0, 0, 0);

  if (isKeyPressed('KeyW', 'w', 'ArrowUp')) moveDir.add(localForward);
  if (isKeyPressed('KeyS', 's', 'ArrowDown')) moveDir.sub(localForward);
  if (isKeyPressed('KeyA', 'a', 'ArrowLeft')) moveDir.sub(localRight);
  if (isKeyPressed('KeyD', 'd', 'ArrowRight')) moveDir.add(localRight);

  if (moveDir.lengthSq() > 0) {
    moveDir.normalize().multiplyScalar(8.5 * dt);
    planeCorridorOffset.add(moveDir);
  }

  // Limites do Corredor Interno do Avião
  planeCorridorOffset.x = Math.max(-2.2, Math.min(2.2, planeCorridorOffset.x));
  planeCorridorOffset.z = Math.max(-7.5, Math.min(7.5, planeCorridorOffset.z));

  // Posição Final da Câmera no Espaço Global
  const cameraLocalPos = planeLocalPosition.clone().add(planeCorridorOffset);
  const cameraWorldPos = cameraLocalPos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), planeRotation);

  yawObject.position.copy(planePosition).add(cameraWorldPos);

  // Espelho Notificação
  const isNearMirror = Math.hypot(planeCorridorOffset.x - (-1.5), planeCorridorOffset.z - (-1.5)) < 2.0;
  if (isNearMirror) {
    showStatus('🪞 ESPELHO DO OPERADOR — UNIFORME & ARMA EQUIPADA', 800);
  }

  // Pular se andar até a rampa traseira aberta (z > 6.5) ou pressionar Espaço
  if (planeCorridorOffset.z > 6.5 || isKeyPressed('Space', ' ')) {
    startParachuteJump();
  }
}

function startParachuteJump() {
  inPlane = false;
  dropActive = true;
  transportPlane.visible = false;

  let btn = document.getElementById('planeJumpBtn');
  if (btn) btn.style.display = 'none';

  player.velocity.set(0, -12, 0);
  player.onGround = false;

  playSound('airdrop');
  showStatus('🪂 SALTO DE PARAQUEDAS REALIZADO! MIRE E DESÇA ATÉ O SOLO', 2800);
}

function updateDrop(dt) {
  if (!dropActive) return;

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).negate();
  const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));

  let moveX = 0, moveZ = 0;
  if (isKeyPressed('KeyW', 'w', 'ArrowUp')) { moveX += forward.x; moveZ += forward.z; }
  if (isKeyPressed('KeyS', 's', 'ArrowDown')) { moveX -= forward.x; moveZ -= forward.z; }
  if (isKeyPressed('KeyA', 'a', 'ArrowLeft')) { moveX -= right.x; moveZ -= right.z; }
  if (isKeyPressed('KeyD', 'd', 'ArrowRight')) { moveX += right.x; moveZ += right.z; }

  const airSpeed = 16;
  yawObject.position.x += moveX * airSpeed * dt;
  yawObject.position.z += moveZ * airSpeed * dt;

  yawObject.position.y -= 14 * dt;

  const floorY = getTerrainHeight(yawObject.position.x, yawObject.position.z) + 2;
  if (yawObject.position.y <= floorY) {
    yawObject.position.y = floorY;
    player.velocity.y = 0;
    player.onGround = true;
    dropActive = false;
    showStatus('🪂 POUSO TÁTICO CONCLUÍDO! INICIE A OPERAÇÃO', 2200);
    playSound('jump');
  }
}

buildDetailedCargoPlane();
