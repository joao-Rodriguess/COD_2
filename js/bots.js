// ============================================================================
// BOTS.JS — OPERADORES TÁTICOS HUMANÓIDES AAA + IA DE COMBATE + ANIMATOR 3D
// (Skins Militares Detalhadas, Armas por Classe, Walk Cycle & Zero-GC)
// ============================================================================

// Cache global de geometrias e materiais táticos (Evita vazamento de VRAM e lag no spawn)
let _botSharedAssets = null;

function getBotSharedAssets() {
  if (_botSharedAssets) return _botSharedAssets;

  _botSharedAssets = {
    // Geometrias anatômicas e de equipamento reutilizáveis
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
    taperCyl: new THREE.CylinderGeometry(1, 0.78, 1, 10),
    sphere: new THREE.SphereGeometry(1, 12, 10),
    dome: new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
    cone: new THREE.ConeGeometry(1, 1, 8),

    // Materiais comuns de equipamento militar
    matSkin: new THREE.MeshStandardMaterial({ color: 0xc68e65, roughness: 0.65, metalness: 0.05 }),
    matBalaclava: new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.85, metalness: 0.05 }),
    matDarkGear: new THREE.MeshStandardMaterial({ color: 0x16181a, roughness: 0.55, metalness: 0.35 }),
    matGunMetal: new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.32, metalness: 0.85 }),
    matGunSteel: new THREE.MeshStandardMaterial({ color: 0x383e44, roughness: 0.28, metalness: 0.9 }),
    matBoots: new THREE.MeshStandardMaterial({ color: 0x121110, roughness: 0.75, metalness: 0.15 }),
    matGoldBrass: new THREE.MeshStandardMaterial({ color: 0xc59b27, roughness: 0.3, metalness: 0.85 }),
    matMuzzleFlash: new THREE.MeshBasicMaterial({ color: 0xffbb33, transparent: true, opacity: 0.9 }),
    matBarBg: new THREE.SpriteMaterial({ color: 0x000000, transparent: true, opacity: 0.65, depthTest: false })
  };

  return _botSharedAssets;
}

// ============================================================================
// 1. GERADOR DE SKIN HUMANÓIDE TÁTICA REALISTA (SPEC-OPS / SNIPER / RUSHER / BOSS)
// ============================================================================
function createBotMesh(color, type = 'regular') {
  const assets = getBotSharedAssets();
  const isBoss = (type === 'boss');
  const isRusher = (type === 'rusher');
  const isSniper = (type === 'sniper');

  const scale = isBoss ? 1.38 : isRusher ? 0.94 : 1.0;

  // Paleta de cores táticas por especialização
  const uniformHex = isBoss ? 0x1e2226 : isSniper ? 0x24343d : isRusher ? 0x6b1d1d : color;
  const vestHex = isBoss ? 0x2c3036 : isSniper ? 0x1c262b : isRusher ? 0x221c1c : 0x262925;
  const helmetHex = isBoss ? 0x181b1e : isSniper ? 0x1d2b24 : isRusher ? 0x18181b : 0x2b3029;
  const visorHex = isBoss ? 0xff7700 : isSniper ? 0x00f0ff : isRusher ? 0xff1e38 : 0x22ff55;

  // Materiais instanciados para permitir efeito de Hit Flash sem afetar outros bots
  const matUniform = new THREE.MeshStandardMaterial({ color: uniformHex, roughness: 0.72, metalness: 0.12 });
  const matVest = new THREE.MeshStandardMaterial({ color: vestHex, roughness: 0.55, metalness: 0.32 });
  const matHelmet = new THREE.MeshStandardMaterial({ color: helmetHex, roughness: 0.42, metalness: 0.48 });
  const matVisor = new THREE.MeshBasicMaterial({ color: visorHex });

  const g = new THREE.Group();
  const bodyRoot = new THREE.Group(); // Raiz animada (respiração, corrida, morte)
  g.add(bodyRoot);

  // --------------------------------------------------------------------------
  // A. PELVE, CINTO TÁTICO & PERNAS ARTICULADAS (COM JOELHEIRAS E COTURNOS)
  // --------------------------------------------------------------------------
  const pelvis = new THREE.Mesh(assets.box, matUniform);
  pelvis.scale.set(0.46 * scale, 0.22 * scale, 0.30 * scale);
  pelvis.position.y = 0.88 * scale;
  pelvis.castShadow = true;
  bodyRoot.add(pelvis);

  // Cinto Militar com Fivela e Coldre
  const belt = new THREE.Mesh(assets.box, assets.matDarkGear);
  belt.scale.set(0.49 * scale, 0.09 * scale, 0.33 * scale);
  belt.position.y = 0.96 * scale;
  bodyRoot.add(belt);

  const legs = [];
  for (const sx of [-1, 1]) {
    const legPivot = new THREE.Group();
    legPivot.position.set(sx * 0.15 * scale, 0.85 * scale, 0);

    // Coxa
    const thigh = new THREE.Mesh(assets.taperCyl, matUniform);
    thigh.scale.set(0.115 * scale, 0.42 * scale, 0.125 * scale);
    thigh.position.y = -0.20 * scale;
    thigh.castShadow = true;
    legPivot.add(thigh);

    // Coldre lateral na coxa direita
    if (sx === 1) {
      const holster = new THREE.Mesh(assets.box, assets.matDarkGear);
      holster.scale.set(0.06 * scale, 0.18 * scale, 0.12 * scale);
      holster.position.set(0.11 * scale, -0.18 * scale, 0.02 * scale);
      legPivot.add(holster);
    }

    // Joelheira Tática
    const kneePad = new THREE.Mesh(assets.sphere, assets.matDarkGear);
    kneePad.scale.set(0.105 * scale, 0.095 * scale, 0.08 * scale);
    kneePad.position.set(0, -0.40 * scale, 0.085 * scale);
    legPivot.add(kneePad);

    // Canela
    const calf = new THREE.Mesh(assets.taperCyl, matUniform);
    calf.scale.set(0.095 * scale, 0.38 * scale, 0.10 * scale);
    calf.position.y = -0.56 * scale;
    calf.castShadow = true;
    legPivot.add(calf);

    // Coturno Militar (Bota)
    const boot = new THREE.Mesh(assets.box, assets.matBoots);
    boot.scale.set(0.13 * scale, 0.14 * scale, 0.25 * scale);
    boot.position.set(0, -0.78 * scale, 0.04 * scale);
    boot.castShadow = true;
    legPivot.add(boot);

    bodyRoot.add(legPivot);
    legs.push({ pivot: legPivot, side: sx });
  }

  // --------------------------------------------------------------------------
  // B. TORSO ANATÔMICO, COLETE BALÍSTICO (PLATE CARRIER), POUCHES & MOCHILA
  // --------------------------------------------------------------------------
  const torso = new THREE.Mesh(assets.taperCyl, matUniform);
  torso.scale.set(0.28 * scale, 0.64 * scale, 0.20 * scale);
  torso.position.y = 1.28 * scale;
  torso.castShadow = true;
  bodyRoot.add(torso);

  // Colete Balístico (Plate Carrier)
  const armorPlate = new THREE.Mesh(assets.box, matVest);
  armorPlate.scale.set(0.48 * scale, 0.50 * scale, 0.32 * scale);
  armorPlate.position.set(0, 1.30 * scale, 0.01 * scale);
  armorPlate.castShadow = true;
  bodyRoot.add(armorPlate);

  // 3 Porta-Carregadores (Mag Pouches) no peito
  for (let i = -1; i <= 1; i++) {
    const pouch = new THREE.Mesh(assets.box, assets.matDarkGear);
    pouch.scale.set(0.11 * scale, 0.16 * scale, 0.07 * scale);
    pouch.position.set(i * 0.13 * scale, 1.18 * scale, 0.19 * scale);
    bodyRoot.add(pouch);
  }

  // Mochila Tática nas Costas (ou Caixa de Munição Pesada no Boss)
  const backpack = new THREE.Mesh(assets.box, isBoss ? assets.matGunMetal : matVest);
  backpack.scale.set(
    (isBoss ? 0.44 : 0.36) * scale,
    (isBoss ? 0.48 : 0.40) * scale,
    (isBoss ? 0.24 : 0.18) * scale
  );
  backpack.position.set(0, 1.32 * scale, -0.22 * scale);
  backpack.castShadow = true;
  bodyRoot.add(backpack);

  // Ombreiras Táticas (Pauldrons) para Boss e Rusher
  if (isBoss || isRusher) {
    for (const sx of [-1, 1]) {
      const pad = new THREE.Mesh(assets.sphere, isBoss ? matHelmet : assets.matDarkGear);
      pad.scale.set(0.17 * scale, 0.15 * scale, 0.18 * scale);
      pad.position.set(sx * 0.32 * scale, 1.50 * scale, 0);
      bodyRoot.add(pad);
    }
  }

  // Colar Cervical Blindado (Exclusivo do Boss Juggernaut)
  if (isBoss) {
    const collar = new THREE.Mesh(assets.cyl, matHelmet);
    collar.scale.set(0.26 * scale, 0.12 * scale, 0.24 * scale);
    collar.position.set(0, 1.60 * scale, 0.02 * scale);
    bodyRoot.add(collar);
  }

  // --------------------------------------------------------------------------
  // C. CABEÇA, BALACLAVA, CAPACETE E VISORES DE CLASSE (+Z = FRENTE)
  // --------------------------------------------------------------------------
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.74 * scale, 0.02 * scale);
  bodyRoot.add(headGroup);

  // Hitbox principal da cabeça (usado para detecção de Headshot)
  const head = new THREE.Mesh(assets.sphere, assets.matBalaclava);
  head.scale.set(0.21 * scale, 0.24 * scale, 0.22 * scale);
  head.castShadow = true;
  headGroup.add(head);

  // Faixa de pele dos olhos/rosto (exceto no Boss que usa capacete fechado)
  if (!isBoss) {
    const faceSkin = new THREE.Mesh(assets.box, assets.matSkin);
    faceSkin.scale.set(0.26 * scale, 0.08 * scale, 0.14 * scale);
    faceSkin.position.set(0, 0.02 * scale, 0.12 * scale);
    headGroup.add(faceSkin);
  }

  // Capacete Militar
  const helmet = new THREE.Mesh(assets.dome, matHelmet);
  helmet.scale.set(0.245 * scale, 0.25 * scale, 0.26 * scale);
  helmet.position.set(0, 0.03 * scale, -0.01 * scale);
  helmet.castShadow = true;
  headGroup.add(helmet);

  // Abafadores Táticos / Headset (Peltor) nas laterais do capacete
  for (const sx of [-1, 1]) {
    const earCup = new THREE.Mesh(assets.cyl, assets.matDarkGear);
    earCup.rotation.z = Math.PI / 2;
    earCup.scale.set(0.08 * scale, 0.04 * scale, 0.09 * scale);
    earCup.position.set(sx * 0.21 * scale, -0.01 * scale, 0);
    headGroup.add(earCup);
  }

  // Detalhes Ópticos por Classe na Frente do Rosto (+Z)
  if (isBoss) {
    // Escudo Facial Blindado Altyn com Fenda Laranja Luminosa
    const faceShield = new THREE.Mesh(assets.cyl, assets.matGunMetal);
    faceShield.scale.set(0.235 * scale, 0.22 * scale, 0.235 * scale);
    faceShield.position.set(0, -0.01 * scale, 0.03 * scale);
    headGroup.add(faceShield);

    const visorSlit = new THREE.Mesh(assets.box, matVisor);
    visorSlit.scale.set(0.26 * scale, 0.045 * scale, 0.08 * scale);
    visorSlit.position.set(0, 0.03 * scale, 0.21 * scale);
    headGroup.add(visorSlit);
  } else if (isSniper) {
    // Óculos Táticos de Reconhecimento (Visor Ciano)
    const goggles = new THREE.Mesh(assets.box, matVisor);
    goggles.scale.set(0.27 * scale, 0.075 * scale, 0.08 * scale);
    goggles.position.set(0, 0.03 * scale, 0.18 * scale);
    headGroup.add(goggles);
  } else if (isRusher) {
    // Máscara Respiradora + Visor Vermelho Agressivo
    const mask = new THREE.Mesh(assets.box, assets.matDarkGear);
    mask.scale.set(0.24 * scale, 0.13 * scale, 0.16 * scale);
    mask.position.set(0, -0.07 * scale, 0.14 * scale);
    headGroup.add(mask);

    const visor = new THREE.Mesh(assets.box, matVisor);
    visor.scale.set(0.28 * scale, 0.065 * scale, 0.07 * scale);
    visor.position.set(0, 0.03 * scale, 0.185 * scale);
    headGroup.add(visor);
  } else {
    // Operador Regular: Óculos de Visão Noturna Duplos (NVG Verde)
    const nvgMount = new THREE.Mesh(assets.box, assets.matDarkGear);
    nvgMount.scale.set(0.18 * scale, 0.07 * scale, 0.10 * scale);
    nvgMount.position.set(0, 0.06 * scale, 0.21 * scale);
    headGroup.add(nvgMount);

    for (const sx of [-1, 1]) {
      const tube = new THREE.Mesh(assets.cyl, assets.matGunMetal);
      tube.rotation.x = Math.PI / 2;
      tube.scale.set(0.045 * scale, 0.10 * scale, 0.045 * scale);
      tube.position.set(sx * 0.065 * scale, 0.04 * scale, 0.26 * scale);
      headGroup.add(tube);

      const lens = new THREE.Mesh(assets.sphere, matVisor);
      lens.scale.set(0.04 * scale, 0.04 * scale, 0.02 * scale);
      lens.position.set(sx * 0.065 * scale, 0.04 * scale, 0.31 * scale);
      headGroup.add(lens);
    }
  }

  // --------------------------------------------------------------------------
  // D. BRAÇOS ARTICULADOS & ARMAMENTO DETALHADO POR CLASSE (FRENTE = +Z)
  // --------------------------------------------------------------------------
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0, 1.44 * scale, 0);
  bodyRoot.add(weaponPivot);

  // Braço Direito (Empunhadura do Gatilho)
  const rightArm = new THREE.Mesh(assets.taperCyl, matUniform);
  rightArm.scale.set(0.095 * scale, 0.48 * scale, 0.095 * scale);
  rightArm.rotation.x = Math.PI * 0.36;
  rightArm.position.set(0.28 * scale, -0.10 * scale, 0.20 * scale);
  weaponPivot.add(rightArm);

  // Braço Esquerdo (Apoio no Guarda-Mão do Rifle)
  const leftArm = new THREE.Mesh(assets.taperCyl, matUniform);
  leftArm.scale.set(0.09 * scale, 0.52 * scale, 0.09 * scale);
  leftArm.rotation.x = Math.PI * 0.42;
  leftArm.rotation.z = -0.38;
  leftArm.position.set(-0.18 * scale, -0.12 * scale, 0.28 * scale);
  weaponPivot.add(leftArm);

  // Luvas Táticas (Mãos)
  const rightGlove = new THREE.Mesh(assets.sphere, assets.matDarkGear);
  rightGlove.scale.setScalar(0.075 * scale);
  rightGlove.position.set(0.22 * scale, -0.18 * scale, 0.36 * scale);
  weaponPivot.add(rightGlove);

  const leftGlove = new THREE.Mesh(assets.sphere, assets.matDarkGear);
  leftGlove.scale.setScalar(0.075 * scale);
  leftGlove.position.set(0.14 * scale, -0.18 * scale, 0.62 * scale);
  weaponPivot.add(leftGlove);

  // Grupo da Arma (Posicionado à frente, no lado direito do peito)
  const gunGroup = new THREE.Group();
  gunGroup.position.set(0.20 * scale, -0.16 * scale, 0.42 * scale);
  weaponPivot.add(gunGroup);

  let muzzleZ = 0.55 * scale;

  if (isBoss) {
    // --- MINIGUN ROTATIVA PESADA (M134) ---
    const receiver = new THREE.Mesh(assets.box, assets.matGunMetal);
    receiver.scale.set(0.20 * scale, 0.20 * scale, 0.45 * scale);
    gunGroup.add(receiver);

    // 4 Canos Rotativos de Aço
    const barrelOffsets = [[-0.045, 0.045], [0.045, 0.045], [-0.045, -0.045], [0.045, -0.045]];
    barrelOffsets.forEach(([bx, by]) => {
      const brl = new THREE.Mesh(assets.cyl, assets.matGunSteel);
      brl.rotation.x = Math.PI / 2;
      brl.scale.set(0.025 * scale, 0.62 * scale, 0.025 * scale);
      brl.position.set(bx * scale, by * scale, 0.45 * scale);
      gunGroup.add(brl);
    });

    const clamp = new THREE.Mesh(assets.cyl, assets.matGoldBrass);
    clamp.rotation.x = Math.PI / 2;
    clamp.scale.set(0.095 * scale, 0.05 * scale, 0.095 * scale);
    clamp.position.set(0, 0, 0.68 * scale);
    gunGroup.add(clamp);

    muzzleZ = 0.80 * scale;

  } else if (isSniper) {
    // --- RIFLE DE PRECISÃO COM LUNETA E SILENCIADOR (AWM) ---
    const body = new THREE.Mesh(assets.box, assets.matGunMetal);
    body.scale.set(0.075 * scale, 0.11 * scale, 0.62 * scale);
    gunGroup.add(body);

    const barrel = new THREE.Mesh(assets.cyl, assets.matGunSteel);
    barrel.rotation.x = Math.PI / 2;
    barrel.scale.set(0.022 * scale, 0.68 * scale, 0.022 * scale);
    barrel.position.set(0, 0.02 * scale, 0.55 * scale);
    gunGroup.add(barrel);

    // Silenciador Tático na ponta
    const suppressor = new THREE.Mesh(assets.cyl, assets.matDarkGear);
    suppressor.rotation.x = Math.PI / 2;
    suppressor.scale.set(0.036 * scale, 0.24 * scale, 0.036 * scale);
    suppressor.position.set(0, 0.02 * scale, 0.90 * scale);
    gunGroup.add(suppressor);

    // Luneta Telescópica (Scope)
    const scope = new THREE.Mesh(assets.cyl, assets.matGunMetal);
    scope.rotation.x = Math.PI / 2;
    scope.scale.set(0.035 * scale, 0.30 * scale, 0.035 * scale);
    scope.position.set(0, 0.10 * scale, 0.08 * scale);
    gunGroup.add(scope);

    muzzleZ = 1.04 * scale;

  } else if (isRusher) {
    // --- ESCOPETA TÁTICA CALIBRE 12 (SHOTGUN) ---
    const receiver = new THREE.Mesh(assets.box, assets.matGunMetal);
    receiver.scale.set(0.085 * scale, 0.12 * scale, 0.48 * scale);
    gunGroup.add(receiver);

    const barrel = new THREE.Mesh(assets.cyl, assets.matGunSteel);
    barrel.rotation.x = Math.PI / 2;
    barrel.scale.set(0.032 * scale, 0.48 * scale, 0.032 * scale);
    barrel.position.set(0, 0.03 * scale, 0.38 * scale);
    gunGroup.add(barrel);

    // Tubo de Pump inferior
    const pump = new THREE.Mesh(assets.cyl, assets.matDarkGear);
    pump.rotation.x = Math.PI / 2;
    pump.scale.set(0.038 * scale, 0.26 * scale, 0.038 * scale);
    pump.position.set(0, -0.02 * scale, 0.34 * scale);
    gunGroup.add(pump);

    muzzleZ = 0.65 * scale;

  } else {
    // --- CARABINA DE ASSALTO TÁTICA (M4A1 / HK416) ---
    const receiver = new THREE.Mesh(assets.box, assets.matGunMetal);
    receiver.scale.set(0.075 * scale, 0.115 * scale, 0.48 * scale);
    gunGroup.add(receiver);

    // Coronha (Stock)
    const stock = new THREE.Mesh(assets.box, assets.matDarkGear);
    stock.scale.set(0.065 * scale, 0.13 * scale, 0.22 * scale);
    stock.position.set(0, -0.01 * scale, -0.32 * scale);
    gunGroup.add(stock);

    // Cano + Guarda-Mão
    const handguard = new THREE.Mesh(assets.box, assets.matDarkGear);
    handguard.scale.set(0.07 * scale, 0.085 * scale, 0.28 * scale);
    handguard.position.set(0, 0.01 * scale, 0.32 * scale);
    gunGroup.add(handguard);

    const barrel = new THREE.Mesh(assets.cyl, assets.matGunSteel);
    barrel.rotation.x = Math.PI / 2;
    barrel.scale.set(0.022 * scale, 0.28 * scale, 0.022 * scale);
    barrel.position.set(0, 0.015 * scale, 0.52 * scale);
    gunGroup.add(barrel);

    // Carregador Curvo (STANAG Mag)
    const mag = new THREE.Mesh(assets.box, assets.matDarkGear);
    mag.scale.set(0.055 * scale, 0.20 * scale, 0.085 * scale);
    mag.rotation.x = 0.22;
    mag.position.set(0, -0.14 * scale, 0.08 * scale);
    gunGroup.add(mag);

    // Mira Holográfica (Red Dot)
    const holo = new THREE.Mesh(assets.box, assets.matGunMetal);
    holo.scale.set(0.06 * scale, 0.065 * scale, 0.10 * scale);
    holo.position.set(0, 0.09 * scale, 0.04 * scale);
    gunGroup.add(holo);

    muzzleZ = 0.68 * scale;
  }

  // Clarão de Disparo 3D (Muzzle Flash no bico do cano)
  const muzzleFlash = new THREE.Mesh(assets.sphere, assets.matMuzzleFlash);
  muzzleFlash.scale.set(0.16 * scale, 0.16 * scale, 0.38 * scale);
  muzzleFlash.position.set(0, 0.02 * scale, muzzleZ);
  muzzleFlash.visible = false;
  gunGroup.add(muzzleFlash);

  // Laser de Mira do Sniper (Corrigido para +Z para apontar para frente!)
  let laserLine = null;
  if (isSniper) {
    const laserMat = new THREE.LineBasicMaterial({ color: 0xff0033, transparent: true, opacity: 0.72 });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 42)
    ]);
    laserLine = new THREE.Line(laserGeo, laserMat);
    laserLine.position.set(0, 0.02 * scale, muzzleZ);
    laserLine.visible = false;
    gunGroup.add(laserLine);
  }

  // --------------------------------------------------------------------------
  // E. BARRA DE VIDA FLUTUANTE
  // --------------------------------------------------------------------------
  const barY = 2.28 * scale;
  const barBg = new THREE.Sprite(assets.matBarBg);
  barBg.scale.set(1.12, 0.14, 1);
  barBg.position.y = barY;
  g.add(barBg);

  const matBarFg = new THREE.SpriteMaterial({
    color: isBoss ? 0xff8800 : isRusher ? 0xff3838 : isSniper ? 0x00f0ff : 0xffcc44,
    transparent: true,
    depthTest: false
  });
  const barFg = new THREE.Sprite(matBarFg);
  barFg.scale.set(1.05, 0.10, 1);
  barFg.position.y = barY;
  g.add(barFg);

  return {
    group: g,
    torso: armorPlate,
    head,
    barFg,
    barBg,
    laserLine,
    muzzleFlash,
    materials: [matUniform, matVest, matHelmet],
    matBarFg,
    rig: {
      bodyRoot,
      legs,
      weaponPivot,
      gunGroup,
      headGroup,
      baseGunZ: 0.42 * scale
    }
  };
}

// ============================================================================
// 2. SPAWN, ELIMINAÇÃO, ONDAS E KILLSTREAKS
// ============================================================================

function spawnBot(typeOverride = null) {
  let aliveCount = 0;
  for (let i = 0; i < bots.length; i++) {
    if (bots[i].alive) aliveCount++;
  }
  if (aliveCount >= BOT_MAX) return;

  let x, z, tries = 0;
  do {
    x = (Math.random() * 2 - 1) * (WORLD_SIZE - 20);
    z = (Math.random() * 2 - 1) * (WORLD_SIZE - 20);
    tries++;
  } while (Math.hypot(x - yawObject.position.x, z - yawObject.position.z) < 30 && tries < 30);

  const botType = typeOverride || (Math.random() < 0.25 ? 'rusher' : Math.random() < 0.2 ? 'sniper' : 'regular');

  // Cores de fardas militares realistas (Oliva, Coiote, Cinza Urbano, Multicam Escuro)
  const camoColors = [0x4b5338, 0x7a684b, 0x3d464d, 0x3b4935];
  const meshData = createBotMesh(
    camoColors[Math.floor(Math.random() * camoColors.length)],
    botType
  );

  const spawnY = typeof floorHeightAt === 'function'
    ? (floorHeightAt(x, z) - 2)
    : (typeof getTerrainHeight === 'function' ? getTerrainHeight(x, z) : 0);

  meshData.group.position.set(x, spawnY, z);
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
    barBg: meshData.barBg,
    laserLine: meshData.laserLine,
    muzzleFlash: meshData.muzzleFlash,
    materials: meshData.materials,
    matBarFg: meshData.matBarFg,
    rig: meshData.rig,
    health: baseHp * waveScale,
    maxHealth: baseHp * waveScale,
    alive: true,
    dying: false,
    deathTimer: 0,
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
    stateTimer: 0,
    animPhase: Math.random() * Math.PI * 2,
    recoilTimer: 0,
    muzzleTimer: 0,
    prevX: x,
    prevZ: z
  };

  bots.push(bot);
}

function killBot(bot, isHeadshot = false) {
  if (!bot.alive) return;
  bot.alive = false;
  bot.dying = true;
  bot.deathTimer = 0.75; // Tempo de queda dramática no chão

  if (bot.barFg) bot.barFg.visible = false;
  if (bot.barBg) bot.barBg.visible = false;
  if (bot.laserLine) bot.laserLine.visible = false;
  if (bot.muzzleFlash) bot.muzzleFlash.visible = false;

  kills++;
  player.totalKills++;
  waveEnemiesKilled++;

  const baseCredits = bot.isBoss ? 500 : (bot.type === 'sniper') ? 150 : 100;
  credits += baseCredits;

  const xpGain = isHeadshot ? XP_PER_HEADSHOT : XP_PER_KILL;
  addXp(xpGain);

  player.killStreak++;
  if (player.killStreak > player.bestStreak) player.killStreak = player.killStreak;
  checkStreak();
  updateStreakHud();

  const killEl = document.getElementById('killCount');
  if (killEl) killEl.textContent = kills;

  const hsLabel = isHeadshot ? ' [HEADSHOT]' : '';
  addKillFeed(bot.isBoss
    ? `BOSS ELIMINADO${hsLabel} (+${baseCredits})`
    : `Você eliminou um ${bot.type.toUpperCase()}${hsLabel} (+${baseCredits})`
  );

  updateWaveHud();

  // Verifica se foi a última eliminação da onda para acionar Slow-Motion Killcam
  let remainingAlive = 0;
  for (let i = 0; i < bots.length; i++) {
    if (bots[i].alive) remainingAlive++;
  }

  if (waveEnemiesKilled >= waveEnemiesTotal && remainingAlive === 0) {
    timeScale = 0.25;
    slowMoTimer = 1.5;
    addScreenShake(0.06);
    playSound('explosion');
    showStatus('💥 ÚLTIMA ELIMINAÇÃO! ONDA LIMPA!', 2000);
    startNextWave();
  }
}

function disposeBotInstance(bot) {
  scene.remove(bot.group);
  if (bot.materials) {
    bot.materials.forEach(m => { try { m.dispose(); } catch (_) { } });
  }
  if (bot.matBarFg) {
    try { bot.matBarFg.dispose(); } catch (_) { }
  }
  if (bot.laserLine) {
    try {
      bot.laserLine.geometry.dispose();
      bot.laserLine.material.dispose();
    } catch (_) { }
  }
}

// --- Sistema de Ondas Progressivo & Air Drop ---
function startNextWave() {
  wave++;
  const waveEl = document.getElementById('waveCount');
  if (waveEl) waveEl.textContent = wave;

  const waveBonus = XP_PER_WAVE * wave;
  addXp(waveBonus);
  credits += 50 * wave;
  addKillFeed(`ONDA ${wave - 1} COMPLETA — +${waveBonus} XP, +${50 * wave} créditos`);

  ammoState.forEach((a, i) => {
    a.reserve += Math.ceil(WEAPONS[i].magSize * 0.25);
  });
  updateAmmoHud();
  saveProgress();

  // Spawna Air Drop a cada 2 ondas
  if (wave % 2 === 0 && typeof spawnAirDrop === 'function') {
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
  streakRewards.forEach(sr => { sr.active = false; });
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

// ============================================================================
// 3. IA DOS BOTS, ANIMAÇÃO DE ESQUELETO E COMBATE (ZERO-GC)
// ============================================================================

const _botDir = new THREE.Vector3();
const _botToPlayer = new THREE.Vector3();
const _botMoveDir = new THREE.Vector3();
const _botNextPos = new THREE.Vector3();
const _botPlayerPos = new THREE.Vector3();
const _botPos = new THREE.Vector3();
const _coverCenter = new THREE.Vector3();
const _coverDirP = new THREE.Vector3();
const _coverDirB = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _muzzleWorldPos = new THREE.Vector3();

let _collidableMeshesCache = [];
let _collidableMeshesDirty = true;

function markCollidablesDirty() { _collidableMeshesDirty = true; }

function getCollidableMeshes() {
  if (_collidableMeshesDirty) {
    _collidableMeshesCache = collidables.map(c => c.mesh);
    _collidableMeshesDirty = false;
  }
  return _collidableMeshesCache;
}

function hasLineOfSight(fromPos, toPos) {
  _botDir.subVectors(toPos, fromPos);
  const dist = _botDir.length();
  _botDir.normalize();
  raycaster.set(fromPos, _botDir);
  raycaster.far = dist;
  const hits = raycaster.intersectObjects(getCollidableMeshes(), false);
  return hits.length === 0;
}

function findNearestCover(botPos, playerPos) {
  let best = null, bestScore = Infinity;
  for (const c of collidables) {
    c.box.getCenter(_coverCenter);
    const distToBot = botPos.distanceTo(_coverCenter);
    if (distToBot < 3 || distToBot > 30) continue;

    _coverDirP.subVectors(playerPos, _coverCenter).normalize();
    _coverDirB.subVectors(botPos, _coverCenter).normalize();
    const dotProduct = _coverDirP.dot(_coverDirB);

    const score = distToBot + (dotProduct > 0 ? 10 : -5);
    if (score < bestScore) {
      bestScore = score;
      if (!best) best = new THREE.Vector3();
      best.copy(_coverCenter);
    }
  }
  return best;
}

let _losThrottleFrame = 0;

function updateBots(dt) {
  const clampedDt = Math.min(dt, 0.1);
  yawObject.getWorldPosition(_botPlayerPos);
  _botPlayerPos.y = 1.2;
  _losThrottleFrame++;

  if (uavActive && performance.now() > uavEndTime) {
    uavActive = false;
    showStatus('UAV EXPIRADO', 1000);
  }

  for (let i = bots.length - 1; i >= 0; i--) {
    const bot = bots[i];

    // 1. Animação de Morte (Soldado cai para trás/lado no chão antes de sumir)
    if (bot.dying) {
      bot.deathTimer -= clampedDt;
      if (bot.rig && bot.rig.bodyRoot) {
        bot.rig.bodyRoot.rotation.x = Math.max(-Math.PI * 0.48, bot.rig.bodyRoot.rotation.x - clampedDt * 3.2);
        bot.rig.bodyRoot.position.y = Math.max(-0.65, bot.rig.bodyRoot.position.y - clampedDt * 1.1);
      }
      if (bot.deathTimer <= 0) {
        disposeBotInstance(bot);
        bots.splice(i, 1);
      }
      continue;
    }

    if (!bot.alive) continue;

    bot.prevX = bot.group.position.x;
    bot.prevZ = bot.group.position.z;

    _botPos.copy(bot.group.position);
    _botPos.y = 1.2;
    const distToPlayer = _botPos.distanceTo(_botPlayerPos);

    if (bot.dodgeTimer > 0) {
      bot.dodgeTimer -= clampedDt;
      moveBot(bot, bot.dodgeDir, bot.speed * 2.5 * clampedDt);
    }

    // Throttle raycasts: cada bot roda LOS a cada 3 frames
    let canSee = bot._lastCanSee || false;
    if (distToPlayer < 65 && !inPlane && !dropActive && (_losThrottleFrame + bot.id) % 3 === 0) {
      canSee = hasLineOfSight(_botPos, _botPlayerPos);
      bot._lastCanSee = canSee;
    }

    bot.stateTimer += clampedDt;

    if (canSee && player.alive) {
      if (bot.health < bot.maxHealth * 0.3 && bot.state !== 'retreat') {
        bot.state = 'retreat';
        bot.coverTarget = findNearestCover(_botPos, _botPlayerPos);
        bot.stateTimer = 0;
      } else if (bot.type === 'rusher') {
        bot.state = 'attack';
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

    if (bot.laserLine) {
      bot.laserLine.visible = (canSee && bot.state === 'attack');
    }

    switch (bot.state) {
      case 'attack':
        executeAttack(bot, _botPos, _botPlayerPos, distToPlayer, clampedDt);
        break;
      case 'flank':
        executeFlank(bot, _botPos, _botPlayerPos, distToPlayer, clampedDt);
        break;
      case 'retreat':
        executeRetreat(bot, _botPos, _botPlayerPos, distToPlayer, clampedDt);
        break;
      default:
        executePatrol(bot, clampedDt);
        break;
    }

    bot.group.position.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, bot.group.position.x));
    bot.group.position.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, bot.group.position.z));
    bot.group.position.y = getTerrainHeight(bot.group.position.x, bot.group.position.z);

    // 2. Animação Procedural Humanóide (Passos, Respiração, Recoil e Muzzle Flash)
    animateBotCharacter(bot, clampedDt);

    // 3. Atualizar Barra de Vida
    const hpRatio = Math.max(bot.health, 0) / bot.maxHealth;
    bot.barFg.scale.x = Math.max(0.001, 1.05 * hpRatio);
    bot.barFg.position.x = -1.05 * (1 - hpRatio) / 2;
  }
}

// Anima pernas, braços, respiração e recuo da arma em tempo real
function animateBotCharacter(bot, dt) {
  const rig = bot.rig;
  if (!rig) return;

  const movedDist = Math.hypot(bot.group.position.x - bot.prevX, bot.group.position.z - bot.prevZ);
  const actualSpeed = dt > 0.0001 ? movedDist / dt : 0;
  const isMoving = actualSpeed > 0.15;

  bot.animPhase += dt * (isMoving ? (3.5 + actualSpeed * 2.1) : 2.2);
  const p = bot.animPhase;

  // 1. Ciclo de Caminhada / Corrida das Pernas
  const legAmp = isMoving ? Math.min(0.68, actualSpeed * 0.16) : 0;
  for (let i = 0; i < rig.legs.length; i++) {
    const leg = rig.legs[i];
    const targetRot = isMoving ? Math.sin(p + (leg.side > 0 ? 0 : Math.PI)) * legAmp : 0;
    leg.pivot.rotation.x += (targetRot - leg.pivot.rotation.x) * Math.min(1, dt * 14);
  }

  // 2. Bobbing vertical do Torso ao correr + inclinação tática para frente
  rig.bodyRoot.position.y = isMoving ? Math.abs(Math.sin(p * 2)) * 0.055 : Math.sin(p) * 0.012;
  const targetLean = isMoving ? (bot.type === 'rusher' ? 0.16 : 0.08) : 0;
  rig.bodyRoot.rotation.x += (targetLean - rig.bodyRoot.rotation.x) * Math.min(1, dt * 10);

  // 3. Recoil da Arma e Muzzle Flash ao Atirar
  if (bot.muzzleTimer > 0) {
    bot.muzzleTimer -= dt;
    if (bot.muzzleTimer <= 0 && bot.muzzleFlash) {
      bot.muzzleFlash.visible = false;
    }
  }

  if (bot.recoilTimer > 0) {
    bot.recoilTimer = Math.max(0, bot.recoilTimer - dt * 8);
    rig.gunGroup.position.z = rig.baseGunZ - bot.recoilTimer * 0.12;
    rig.weaponPivot.rotation.x = -bot.recoilTimer * 0.18;
  } else {
    rig.gunGroup.position.z = rig.baseGunZ;
    rig.weaponPivot.rotation.x = Math.sin(p * 0.5) * 0.025;
  }
}

function executeAttack(bot, botPos, playerPos, dist, dt) {
  _botToPlayer.subVectors(playerPos, bot.group.position);
  bot.group.rotation.y = Math.atan2(_botToPlayer.x, _botToPlayer.z);

  const idealMinDist = (bot.type === 'rusher') ? 2 : (bot.type === 'sniper') ? 25 : 10;

  if (dist > idealMinDist + 5) {
    _botMoveDir.subVectors(playerPos, bot.group.position).normalize();
    moveBot(bot, _botMoveDir, bot.speed * dt);
  } else if (dist < idealMinDist - 2) {
    _botMoveDir.subVectors(bot.group.position, playerPos).normalize();
    moveBot(bot, _botMoveDir, bot.speed * dt * 0.7);
  }

  const now = performance.now();
  if (now - bot.lastShotTime > bot.fireRateMs) {
    bot.lastShotTime = now;
    botShoot(bot, botPos, playerPos, dist);
  }
}

function executeFlank(bot, botPos, playerPos, dist, dt) {
  _botToPlayer.subVectors(playerPos, bot.group.position).normalize();
  _botMoveDir.copy(_botToPlayer).applyAxisAngle(_upAxis, bot.flankAngle);
  bot.group.rotation.y = Math.atan2(_botToPlayer.x, _botToPlayer.z);

  moveBot(bot, _botMoveDir, bot.speed * 1.2 * dt);

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
    _botMoveDir.subVectors(bot.coverTarget, bot.group.position);
    _botMoveDir.y = 0;
    if (_botMoveDir.length() < 2) {
      _botToPlayer.subVectors(playerPos, bot.group.position);
      bot.group.rotation.y = Math.atan2(_botToPlayer.x, _botToPlayer.z);
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
      _botMoveDir.normalize();
      moveBot(bot, _botMoveDir, bot.speed * 1.4 * dt);
      bot.group.rotation.y = Math.atan2(_botMoveDir.x, _botMoveDir.z);
    }
  } else {
    _botMoveDir.subVectors(bot.group.position, playerPos).normalize();
    moveBot(bot, _botMoveDir, bot.speed * 1.2 * dt);
    bot.group.rotation.y = Math.atan2(_botMoveDir.x, _botMoveDir.z);
    if (bot.stateTimer > 3) {
      bot.state = 'attack';
      bot.stateTimer = 0;
    }
  }
}

function executePatrol(bot, dt) {
  _botMoveDir.subVectors(bot.patrolTarget, bot.group.position);
  _botMoveDir.y = 0;
  if (_botMoveDir.length() < 1.5) {
    bot.patrolTarget.set(
      bot.group.position.x + (Math.random() - 0.5) * 30, 0,
      bot.group.position.z + (Math.random() - 0.5) * 30
    );
  } else {
    _botMoveDir.normalize();
    moveBot(bot, _botMoveDir, bot.speed * 0.5 * dt);
    bot.group.rotation.y = Math.atan2(_botMoveDir.x, _botMoveDir.z);
  }
}

function moveBot(bot, direction, distance) {
  _botNextPos.copy(bot.group.position).addScaledVector(direction, distance);
  const radius = 0.48;
  const rSq = radius * radius;
  for (let i = 0, len = collidables.length; i < len; i++) {
    const box = collidables[i].box;
    const cx = Math.max(box.min.x, Math.min(_botNextPos.x, box.max.x));
    const cz = Math.max(box.min.z, Math.min(_botNextPos.z, box.max.z));
    if ((_botNextPos.x - cx) ** 2 + (_botNextPos.z - cz) ** 2 < rSq) return;
  }
  const groundY = typeof floorHeightAt === 'function'
    ? (floorHeightAt(_botNextPos.x, _botNextPos.z) - 2)
    : (typeof getTerrainHeight === 'function' ? getTerrainHeight(_botNextPos.x, _botNextPos.z) : 0);
  _botNextPos.y = groundY;
  bot.group.position.copy(_botNextPos);
}

function botShoot(bot, botPos, playerPos, dist) {
  const accuracy = Math.max(0.06, bot.accuracy - dist / 140);

  // Aciona Recoil visual e Muzzle Flash no bico da arma
  bot.recoilTimer = 1.0;
  if (bot.muzzleFlash) {
    bot.muzzleFlash.visible = true;
    bot.muzzleTimer = 0.055;
    bot.muzzleFlash.getWorldPosition(_muzzleWorldPos);
  } else {
    _muzzleWorldPos.copy(bot.group.position);
    _muzzleWorldPos.y += 1.45;
  }

  const dir = new THREE.Vector3().subVectors(playerPos, _muzzleWorldPos).normalize();
  spawnTracer(_muzzleWorldPos.clone(), dir, dist);
  playSound('enemy');

  if (Math.random() < accuracy && player.alive) {
    const dmg = bot.damage || (8 + Math.random() * 10);
    damagePlayer(dmg, bot.group.position.clone());
  }
}