// =====================================================================
// PLANE.JS — SALTO DE CARGUEIRO MILITAR C-130 & SISTEMA DE SKYDIVING AAA
// (Interior PBR de Alta Fidelidade, Hélices Animadas, Luzes de Alerta Red/Green,
// Espelho do Operador, Queda Livre Wingsuit, Abertura/Corte de Paraquedas 3D,
// Altímetro Tático & Aterrissagem com Amortecimento de Impacto)
// =====================================================================

const transportPlane = new THREE.Group();
const interiorGroup = new THREE.Group();
transportPlane.add(interiorGroup);

const parachuteGroup = new THREE.Group();
scene.add(parachuteGroup);
parachuteGroup.visible = false;

const propellerMeshes = [];
let jumpLightRed = null;
let jumpLightGreen = null;
let operatorMirrorMesh = null;

let isParachuteDeployed = false;
let currentDropSpeedY = -34.0; // Velocidade terminal de queda livre
let dropGlideSpeed = 26.0;    // Velocidade horizontal de planeio
let jumpHudElement = null;
let altimeterHudElement = null;

// ---------------------------------------------------------------------
// 1. CONSTRUÇÃO DETALHADA DO CARGUEIRO C-130 COM TEXTURAS PBR
// ---------------------------------------------------------------------

function buildDetailedCargoPlane() {
  while (transportPlane.children.length) transportPlane.remove(transportPlane.children[0]);
  while (interiorGroup.children.length) interiorGroup.remove(interiorGroup.children[0]);
  propellerMeshes.length = 0;
  transportPlane.add(interiorGroup);

  // Materiais Militares com suporte a PBR de textures.js
  const hasTex = typeof TEX !== 'undefined';
  const fuselageMat = new THREE.MeshStandardMaterial({
    color: 0x1f2733,
    metalness: 0.85,
    roughness: 0.35,
    map: hasTex ? TEX.metalPanel : null
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1c2430,
    metalness: 0.75,
    roughness: 0.45,
    map: hasTex ? TEX.corrugated : null
  });

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x141a24,
    metalness: 0.90,
    roughness: 0.30,
    map: hasTex ? (TEX.metalGrate || TEX.metalPanel) : null
  });

  const hazardMat = new THREE.MeshStandardMaterial({
    map: hasTex ? TEX.hazardStripes : null,
    metalness: 0.3,
    roughness: 0.6
  });

  const darkAlloy = new THREE.MeshStandardMaterial({ color: 0x10151f, metalness: 0.9, roughness: 0.25 });
  const redAlertMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });
  const greenJumpMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });

  const mirrorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    metalness: 0.98,
    roughness: 0.05,
    envMapIntensity: 2.2
  });
  if (typeof reflectiveMaterials !== 'undefined') reflectiveMaterials.push(mirrorGlassMat);

  const length = 28;
  const radius = 3.3;

  // --- FUSELAGEM EXTERIOR ---
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 28), fuselageMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.castShadow = true; fuselage.receiveShadow = true;
  transportPlane.add(fuselage);

  // Bico Aerodinâmico / Cockpit
  const nose = new THREE.Mesh(new THREE.ConeGeometry(radius, 6.0, 28), fuselageMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0, -length / 2 - 3.0);
  transportPlane.add(nose);

  // Vidros do Cockpit
  const cockpitGlass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.4), darkAlloy);
  cockpitGlass.position.set(0, 1.4, -length / 2 - 2.8);
  cockpitGlass.rotation.x = 0.55;
  transportPlane.add(cockpitGlass);

  // Asas Principais
  const wings = new THREE.Mesh(new THREE.BoxGeometry(44, 0.45, 6.0), fuselageMat);
  wings.position.set(0, 1.3, -3.5);
  transportPlane.add(wings);

  // 4 Turbinas com Hélices Giratórias Animadas
  [-13.5, -6.5, 6.5, 13.5].forEach(tx => {
    const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 4.2, 18), darkAlloy);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(tx, 0.85, -5.2);
    transportPlane.add(nacelle);

    // Eixo e hélice de 4 pás
    const propGroup = new THREE.Group();
    propGroup.position.set(tx, 0.85, -7.4);

    const propBlade1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 0.05), darkAlloy);
    const propBlade2 = propBlade1.clone();
    propBlade2.rotation.z = Math.PI / 2;
    propGroup.add(propBlade1);
    propGroup.add(propBlade2);

    transportPlane.add(propGroup);
    propellerMeshes.push(propGroup);
  });

  // Cauda T-Tail Estilizada
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 8.2, 5.5), fuselageMat);
  tailFin.position.set(0, 5.2, length / 2 - 2.8);
  tailFin.rotation.x = -0.32;
  transportPlane.add(tailFin);

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 3.2), fuselageMat);
  tailWing.position.set(0, 8.8, length / 2 - 3.8);
  transportPlane.add(tailWing);

  // --- COMPARTIMENTO INTERNO DE CARGA (CARGO HOLD) ---
  const roomW = 5.6;
  const roomH = 3.8;
  const roomL = 19.0;

  // Piso de Grelha Metálica Antiderrapante
  const floor = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.2, roomL), floorMat);
  floor.position.set(0, -1.75, 0);
  interiorGroup.add(floor);

  // Faixa de Perigo Industrial na Soleira da Rampa de Salto
  const rampStripe = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.22, 1.2), hazardMat);
  rampStripe.position.set(0, -1.74, roomL / 2 - 0.6);
  interiorGroup.add(rampStripe);

  // Trilhos Centrais de Roletes de Carga
  [-0.9, 0.9].forEach(rx => {
    const rollerRail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, roomL - 2), darkAlloy);
    rollerRail.position.set(rx, -1.62, -1);
    interiorGroup.add(rollerRail);
  });

  // Teto e Paredes Estruturais
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.2, roomL), wallMat);
  ceiling.position.set(0, roomH - 1.75, 0);
  interiorGroup.add(ceiling);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, roomH, roomL), wallMat);
  leftWall.position.set(-roomW / 2 + 0.1, roomH / 2 - 1.75, 0);
  interiorGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, roomH, roomL), wallMat);
  rightWall.position.set(roomW / 2 - 0.1, roomH / 2 - 1.75, 0);
  interiorGroup.add(rightWall);

  // Parede Frontal & Porta Blindada do Cockpit
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, 0.2), wallMat);
  frontWall.position.set(0, roomH / 2 - 1.75, -roomL / 2);
  interiorGroup.add(frontWall);

  const cockpitDoor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.5, 0.12), darkAlloy);
  cockpitDoor.position.set(0, -0.4, -roomL / 2 + 0.15);
  interiorGroup.add(cockpitDoor);

  // Costelas de Reforço Estrutural da Fuselagem (Ribs)
  for (let z = -7.5; z <= 7.5; z += 2.5) {
    const ribArch = new THREE.Mesh(new THREE.BoxGeometry(roomW + 0.1, 0.25, 0.25), darkAlloy);
    ribArch.position.set(0, roomH - 1.75, z);
    interiorGroup.add(ribArch);
  }

  // Bancos de Tropa Rebatíveis nas Laterais
  for (let z = -7.0; z <= 5.0; z += 2.2) {
    const seatL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 1.3), darkAlloy);
    seatL.position.set(-roomW / 2 + 0.55, -1.25, z);
    interiorGroup.add(seatL);

    const seatR = seatL.clone();
    seatR.position.x = roomW / 2 - 0.55;
    interiorGroup.add(seatR);
  }

  // Caixas de Suprimentos Amarradas
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x223522,
    roughness: 0.6,
    metalness: 0.3,
    map: hasTex ? TEX.metalPanel : null
  });
  const cargoCrate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.8), crateMat);
  cargoCrate.position.set(roomW / 2 - 1.2, -1.15, -4.5);
  interiorGroup.add(cargoCrate);

  // Luzes Táticas de Salto no Teto (Vermelha de Alerta e Verde de Salto)
  for (let z = -6.5; z <= 6.5; z += 3.5) {
    const alertLight = new THREE.PointLight(0xff2222, 2.5, 14);
    alertLight.position.set(0, 1.65, z);
    interiorGroup.add(alertLight);

    const lampFixture = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), redAlertMat);
    lampFixture.position.set(0, 1.80, z);
    interiorGroup.add(lampFixture);

    if (z > 4) {
      jumpLightRed = alertLight;
    }
  }

  // Luz Verde de Salto Principal na Soleira da Rampa
  jumpLightGreen = new THREE.PointLight(0x00ff44, 0, 16);
  jumpLightGreen.position.set(0, 1.65, roomL / 2 - 1.0);
  interiorGroup.add(jumpLightGreen);

  const greenLamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), greenJumpMat);
  greenLamp.position.set(0, 1.80, roomL / 2 - 1.0);
  interiorGroup.add(greenLamp);

  // Espelho do Operador para Inspeção de Skin/Arma
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 1.7), darkAlloy);
  mirrorFrame.position.set(-roomW / 2 + 0.22, 0.1, -1.8);
  interiorGroup.add(mirrorFrame);

  const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.3), mirrorGlassMat);
  mirrorGlass.rotation.y = Math.PI / 2;
  mirrorGlass.position.set(-roomW / 2 + 0.28, 0.1, -1.8);
  interiorGroup.add(mirrorGlass);

  operatorMirrorMesh = buildOperatorSkinCharacter();
  operatorMirrorMesh.position.set(-roomW / 2 + 1.25, -1.65, -1.8);
  operatorMirrorMesh.rotation.y = -Math.PI / 2;
  interiorGroup.add(operatorMirrorMesh);

  // Rampa Traseira Hidráulica Aberta
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.2, 7.2), darkAlloy);
  ramp.position.set(0, -2.45, roomL / 2 + 1.8);
  ramp.rotation.x = 0.24;
  interiorGroup.add(ramp);

  // Pistões Hidráulicos nas Laterais da Rampa
  [-2.2, 2.2].forEach(px => {
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), darkAlloy);
    piston.position.set(px, -1.6, roomL / 2 + 0.8);
    piston.rotation.x = -0.55;
    interiorGroup.add(piston);
  });

  scene.add(transportPlane);
  buildParachuteCanopy3D();
}

// Constrói o modelo 3D do paraquedas tático militar
function buildParachuteCanopy3D() {
  while (parachuteGroup.children.length) parachuteGroup.remove(parachuteGroup.children[0]);

  // Cúpula / Asa Ram-Air Retangular Tática
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    roughness: 0.45,
    metalness: 0.2,
    side: THREE.DoubleSide
  });

  const canopyMesh = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.5, 3.8), canopyMat);
  canopyMesh.position.set(0, 4.2, -0.6);
  canopyMesh.rotation.x = 0.12;
  parachuteGroup.add(canopyMesh);

  // Painéis de reforço preto e ciano
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x111923, metalness: 0.6 });
  const centerStripe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.52, 3.82), stripeMat);
  centerStripe.position.set(0, 4.2, -0.6);
  centerStripe.rotation.x = 0.12;
  parachuteGroup.add(centerStripe);

  // Linhas de suspensão / Tirantes
  const ropeMat = new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.75 });
  [-3.2, -1.2, 1.2, 3.2].forEach(lx => {
    [-1.4, 1.4].forEach(lz => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(lx, 4.0, lz - 0.6),
        new THREE.Vector3(lx * 0.15, 0.8, 0)
      ]);
      parachuteGroup.add(new THREE.Line(geo, ropeMat));
    });
  });
}

// ---------------------------------------------------------------------
// 2. PERSONAGEM REFLEXO DO OPERADOR NO ESPELHO
// ---------------------------------------------------------------------

function buildOperatorSkinCharacter() {
  const g = new THREE.Group();

  const curW = typeof currentWeapon === 'function' ? currentWeapon() : { key: 'rifle' };
  const skinKey = (typeof equippedSkins !== 'undefined' && equippedSkins[curW.key]) ? equippedSkins[curW.key] : 'default';
  const skin = (typeof SKINS !== 'undefined' && SKINS[skinKey]) ? SKINS[skinKey] : { color: 0x222d3d };

  const suitMat = new THREE.MeshStandardMaterial({ color: skin.color || 0x222d3d, metalness: skin.metalness || 0.5, roughness: 0.4 });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x111622, metalness: 0.85, roughness: 0.25 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a07b, roughness: 0.7 });
  const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

  // Tronco com Colete Balístico Molle
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.3), suitMat);
  body.position.y = 0.95;
  g.add(body);

  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.55, 0.35), armorMat);
  vest.position.y = 0.98;
  g.add(vest);

  // Cabeça e Capacete Militar com Viseira
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), skinMat);
  head.position.y = 1.5;
  g.add(head);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 12), armorMat);
  helmet.position.y = 1.54;
  helmet.scale.set(1.05, 0.9, 1.05);
  g.add(helmet);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.1), visorMat);
  visor.position.set(0, 1.52, 0.16);
  g.add(visor);

  // Pernas com Coturnos Táticos
  [-0.15, 0.15].forEach(lx => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), suitMat);
    leg.position.set(lx, 0.35, 0);
    g.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.32), armorMat);
    boot.position.set(lx, 0.1, 0.04);
    g.add(boot);
  });

  // Braços segurando o fuzil
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), suitMat);
  armL.position.set(-0.35, 0.95, 0.1);
  armL.rotation.x = -0.55;
  g.add(armL);

  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), suitMat);
  armR.position.set(0.35, 0.95, 0.1);
  armR.rotation.x = -0.55;
  g.add(armR);

  return g;
}

// ---------------------------------------------------------------------
// 3. HUD MILITAR DE SALTO & ALTÍMETRO TÁTICO
// ---------------------------------------------------------------------

function ensureJumpUiButton() {
  if (!jumpHudElement) {
    jumpHudElement = document.createElement('div');
    jumpHudElement.id = 'planeJumpHud';
    jumpHudElement.style.position = 'fixed';
    jumpHudElement.style.top = '12%';
    jumpHudElement.style.left = '50%';
    jumpHudElement.style.transform = 'translateX(-50%)';
    jumpHudElement.style.padding = '12px 28px';
    jumpHudElement.style.fontFamily = "'Orbitron', sans-serif";
    jumpHudElement.style.fontWeight = '900';
    jumpHudElement.style.fontSize = '15px';
    jumpHudElement.style.letterSpacing = '2px';
    jumpHudElement.style.color = '#fff';
    jumpHudElement.style.background = 'linear-gradient(135deg, rgba(8,18,36,0.95), rgba(3,6,16,0.98))';
    jumpHudElement.style.border = '2px solid #00f0ff';
    jumpHudElement.style.borderRadius = '30px';
    jumpHudElement.style.cursor = 'pointer';
    jumpHudElement.style.zIndex = '99999';
    jumpHudElement.style.boxShadow = '0 0 24px rgba(0,240,255,0.5)';
    jumpHudElement.style.display = 'flex';
    jumpHudElement.style.alignItems = 'center';
    jumpHudElement.style.gap = '10px';
    jumpHudElement.innerHTML = `
      <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#00ff44; box-shadow:0 0 10px #00ff44;"></span>
      <span>SALTAR DO CARGUEIRO [ESPAÇO]</span>
    `;
    jumpHudElement.onclick = () => startParachuteJump();
    document.body.appendChild(jumpHudElement);
  }
  jumpHudElement.style.display = inPlane ? 'flex' : 'none';
}

function updateAltimeterHud(altitude, speedY, isCanopy) {
  if (!altimeterHudElement) {
    altimeterHudElement = document.createElement('div');
    altimeterHudElement.id = 'skydivingHud';
    altimeterHudElement.style.position = 'fixed';
    altimeterHudElement.style.bottom = '22%';
    altimeterHudElement.style.left = '50%';
    altimeterHudElement.style.transform = 'translateX(-50%)';
    altimeterHudElement.style.padding = '10px 24px';
    altimeterHudElement.style.background = 'rgba(4, 10, 22, 0.85)';
    altimeterHudElement.style.border = '1px solid rgba(0, 240, 255, 0.4)';
    altimeterHudElement.style.borderRadius = '8px';
    altimeterHudElement.style.fontFamily = "'Orbitron', sans-serif";
    altimeterHudElement.style.color = '#eaf2ff';
    altimeterHudElement.style.textAlign = 'center';
    altimeterHudElement.style.zIndex = '9999';
    altimeterHudElement.style.backdropFilter = 'blur(6px)';
    document.body.appendChild(altimeterHudElement);
  }

  if (!dropActive) {
    altimeterHudElement.style.display = 'none';
    return;
  }

  altimeterHudElement.style.display = 'block';
  altimeterHudElement.innerHTML = `
    <div style="font-size:12px; color:#9fb3d9; letter-spacing:1.5px; margin-bottom:2px;">
      MODO: <strong style="color:${isCanopy ? '#00f0ff' : '#ffb800'};">${isCanopy ? 'PARAQUEDAS ABERTO' : 'QUEDA LIVRE (WINGSUIT)'}</strong>
    </div>
    <div style="font-size:20px; font-weight:900; letter-spacing:2px; color:#fff;">
      ALTITUDE: <span style="color:#00f0ff;">${Math.round(altitude)}M</span> • VEL: <span style="color:#ffcc44;">${Math.abs(Math.round(speedY))} M/S</span>
    </div>
    <div style="font-size:11px; color:#9fb3d9; margin-top:4px;">
      [ESPAÇO] ${isCanopy ? 'CORTAR PARAQUEDAS' : 'ABRIR PARAQUEDAS'}
    </div>
  `;
}

// ---------------------------------------------------------------------
// 4. ATUALIZAÇÃO DO VOO DO AVIÃO & MOVIMENTO INTERNO 1ª PESSOA
// ---------------------------------------------------------------------

function updatePlane(dt) {
  if (!inPlane || dropActive) {
    ensureJumpUiButton();
    if (altimeterHudElement) altimeterHudElement.style.display = 'none';
    return;
  }

  ensureJumpUiButton();

  // Rotação contínua das 4 hélices animadas dos motores turboélice
  propellerMeshes.forEach(p => {
    p.rotation.z += dt * 45;
  });

  // Trajetória circular tática do cargueiro em torno do mapa
  planeFlightAngle += planeSpeed * dt * 0.15;
  planePosition.set(
    Math.cos(planeFlightAngle) * planeFlightRadius,
    planePathHeight,
    Math.sin(planeFlightAngle) * planeFlightRadius
  );

  const planeRotation = Math.PI - planeFlightAngle;
  transportPlane.position.copy(planePosition);
  transportPlane.rotation.y = planeRotation;

  // Lógica de Luz de Salto Verde / Vermelha
  const isNearRamp = planeCorridorOffset.z > 3.5;
  if (jumpLightGreen) {
    jumpLightGreen.intensity = isNearRamp ? 3.5 : 0;
  }
  if (jumpLightRed) {
    // Alerta pulsante
    jumpLightRed.intensity = isNearRamp ? 0.8 : (1.5 + Math.sin(performance.now() * 0.008) * 1.0);
  }

  // CÁLCULO DE MOVIMENTO INTERNO RELATIVO À MIRA DA CÂMERA (SEM INVERSÃO)
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

  // Limites físicos das paredes internas do C-130
  planeCorridorOffset.x = Math.max(-2.2, Math.min(2.2, planeCorridorOffset.x));
  planeCorridorOffset.z = Math.max(-7.8, Math.min(7.8, planeCorridorOffset.z));

  // Posição Final da Câmera do Jogador no Espaço Global
  const cameraLocalPos = planeLocalPosition.clone().add(planeCorridorOffset);
  const cameraWorldPos = cameraLocalPos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), planeRotation);

  yawObject.position.copy(planePosition).add(cameraWorldPos);

  // Notificação ao inspecionar o espelho
  const isNearMirror = Math.hypot(planeCorridorOffset.x - (-1.4), planeCorridorOffset.z - (-1.8)) < 1.8;
  if (isNearMirror) {
    showStatus('🪞 ESPELHO DO OPERADOR — UNIFORME & ARMA DE COMBATE', 800);
  }

  // Salto automático ao atingir o final da rampa ou tecla de salto (Espaço)
  if (planeCorridorOffset.z > 6.6 || isKeyPressed('Space', ' ')) {
    startParachuteJump();
  }
}

// ---------------------------------------------------------------------
// 5. TRANSIÇÃO DE SALTO & FÍSICA AERODINÂMICA DE QUEDA LIVRE
// ---------------------------------------------------------------------

function startParachuteJump() {
  inPlane = false;
  dropActive = true;
  transportPlane.visible = false;
  isParachuteDeployed = false;
  parachuteGroup.visible = false;

  if (jumpHudElement) jumpHudElement.style.display = 'none';

  // Impulso inicial para fora da rampa do avião
  currentDropSpeedY = -24.0;
  player.velocity.set(0, currentDropSpeedY, 0);
  player.onGround = false;

  playSound('airdrop');
  showStatus('🪂 SALTO DE COMBATE! MERGULHE E PRESSIONE [ESPAÇO] PARA ABRIR O PARAQUEDAS', 3200);
}

function updateDrop(dt) {
  if (!dropActive) {
    if (altimeterHudElement) altimeterHudElement.style.display = 'none';
    parachuteGroup.visible = false;
    return;
  }

  // Alternar Abertura / Corte do Paraquedas (Tecla Espaço)
  if (isKeyPressed('Space', ' ')) {
    isParachuteDeployed = !isParachuteDeployed;
    if (isParachuteDeployed) {
      playSound('dash', { pitch: 0.8, volume: 1.2 });
      showStatus('🪂 PARAQUEDAS IMPLANTADO', 1200);
    } else {
      playSound('dash', { pitch: 1.4, volume: 1.0 });
      showStatus('⚡ PARAQUEDAS CORTADO — QUEDA LIVRE', 1200);
    }
    // Consome a tecla para evitar disparo em repetição rápida
    if (typeof keys !== 'undefined') keys['Space'] = false;
  }

  const floorY = (typeof floorHeightAt === 'function')
    ? floorHeightAt(yawObject.position.x, yawObject.position.z)
    : ((typeof getTerrainHeight === 'function' ? getTerrainHeight(yawObject.position.x, yawObject.position.z) : 0) + 2);

  const currentAltitude = Math.max(0, yawObject.position.y - floorY);

  // Abertura de emergência obrigatória abaixo de 24 metros
  if (currentAltitude < 24 && !isParachuteDeployed) {
    isParachuteDeployed = true;
    playSound('dash', { pitch: 0.8, volume: 1.2 });
    showStatus('⚠️ ABERTURA DE EMERGÊNCIA AUTOMÁTICA!', 1400);
  }

  // Física de Velocidade Vertical: Queda livre vs Paraquedas Aberto
  const targetSpeedY = isParachuteDeployed ? -9.2 : -34.0;
  const lerpRate = isParachuteDeployed ? 5.5 : 2.5;
  currentDropSpeedY += (targetSpeedY - currentDropSpeedY) * Math.min(1.0, dt * lerpRate);

  yawObject.position.y += currentDropSpeedY * dt;

  // Direção de Movimento Horizontal
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).negate();
  const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));

  let moveX = 0, moveZ = 0;
  if (isKeyPressed('KeyW', 'w', 'ArrowUp')) { moveX += forward.x; moveZ += forward.z; }
  if (isKeyPressed('KeyS', 's', 'ArrowDown')) { moveX -= forward.x; moveZ -= forward.z; }
  if (isKeyPressed('KeyA', 'a', 'ArrowLeft')) { moveX -= right.x; moveZ -= right.z; }
  if (isKeyPressed('KeyD', 'd', 'ArrowRight')) { moveX += right.x; moveZ += right.z; }

  const glideSpeed = isParachuteDeployed ? 16.0 : 25.0;
  yawObject.position.x += moveX * glideSpeed * dt;
  yawObject.position.z += moveZ * glideSpeed * dt;

  // Efeito de Paraquedas 3D acoplado ao jogador
  if (isParachuteDeployed) {
    parachuteGroup.visible = true;
    parachuteGroup.position.copy(yawObject.position);
    parachuteGroup.rotation.y = yaw;
    // Leve oscilação suave do velame com o vento
    parachuteGroup.rotation.z = Math.sin(performance.now() * 0.003) * 0.05;
  } else {
    parachuteGroup.visible = false;
  }

  // Atualização do HUD de Altímetro
  updateAltimeterHud(currentAltitude, currentDropSpeedY, isParachuteDeployed);

  // Aterrissagem no Solo
  if (yawObject.position.y <= floorY) {
    yawObject.position.y = floorY;
    player.velocity.set(0, 0, 0);
    player.onGround = true;
    dropActive = false;
    isParachuteDeployed = false;
    parachuteGroup.visible = false;

    if (altimeterHudElement) altimeterHudElement.style.display = 'none';

    // Baforada de poeira e impacto de pouso
    const dustColors = {
      desert: 0xd4a853,
      arctic: 0xddeeff,
      jungle_temple: 0x446622,
      void_core: 0x8833cc,
      neon_rust: 0x778899
    };
    const dustCol = (typeof selectedMap !== 'undefined' && dustColors[selectedMap]) ? dustColors[selectedMap] : 0x888888;
    if (typeof spawnHitBurst === 'function') {
      spawnHitBurst(yawObject.position.clone().add(new THREE.Vector3(0, -0.6, 0)), dustCol);
    }

    playSound('jump', { pitch: 0.75, volume: 1.4 });
    showStatus('🪂 POUSO TÁTICO CONCLUÍDO! INICIE A MISSÃO', 2500);
  }
}

// Inicializa a geometria e materiais do avião
buildDetailedCargoPlane();
