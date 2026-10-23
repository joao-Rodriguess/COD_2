// ============================================================================
// BEASTS.JS — MOTOR DE CRIATURAS, IA TÁTICA E ANIMAÇÃO PROCEDURAL AAA
// (Rigging Articulado, Balística de Ácido, Poças Tóxicas, Knockback & Zero-GC)
// ============================================================================

const beasts = [];
const beastAcidProjectiles = [];
const beastShockwaves = [];
const beastAcidPools = [];
let beastIdCounter = 0;

const BEAST_TYPES = {
  crawler: {
    name: 'Fera das Sombras',
    hp: 140,
    speed: 6.2,
    damage: 18,
    color: 0x121218,
    accentColor: 0x28152c,
    eyeColor: 0xff0044,
    scale: 0.95,
    xp: 90,
    credits: 180,
    sound: 'beast_roar',
    radius: 0.9,
    attackRange: 3.6,
    attackCooldownMs: 1150,
    knockbackRes: 0.3
  },
  juggernaut: {
    name: 'Abominação Mutante',
    hp: 680,
    speed: 2.4,
    damage: 42,
    color: 0x2b1d16,
    accentColor: 0x422a1d,
    eyeColor: 0xffaa00,
    scale: 1.85,
    xp: 350,
    credits: 600,
    sound: 'beast_stomp',
    radius: 1.9,
    attackRange: 5.0,
    attackCooldownMs: 2200,
    knockbackRes: 0.9
  },
  fiend: {
    name: 'Cuspidor Tóxico',
    hp: 185,
    speed: 3.4,
    damage: 22,
    color: 0x143016,
    accentColor: 0x225520,
    eyeColor: 0x33ff00,
    scale: 1.1,
    xp: 120,
    credits: 220,
    sound: 'acid_spit',
    radius: 1.15,
    attackRange: 22.0,
    preferredMinDist: 10.0,
    attackCooldownMs: 1750,
    knockbackRes: 0.5
  },
  stalker: {
    name: 'Horror Alado',
    hp: 135,
    speed: 7.2,
    damage: 25,
    color: 0x221035,
    accentColor: 0x3d195b,
    eyeColor: 0xbf00ff,
    scale: 1.0,
    xp: 150,
    credits: 280,
    sound: 'demon_screech',
    radius: 1.0,
    attackRange: 4.5,
    attackCooldownMs: 1350,
    knockbackRes: 0.15
  }
};

// ============================================================================
// 1. CACHE DE GEOMETRIAS E MATERIAIS GLOBAIS (EVITA VAZAMENTO DE VRAM)
// ============================================================================
let _sharedAssets = null;

function getSharedBeastAssets() {
  if (_sharedAssets) return _sharedAssets;

  const shockGeo = new THREE.RingGeometry(0.45, 1.0, 32);
  shockGeo.rotateX(-Math.PI / 2);

  const poolGeo = new THREE.CircleGeometry(1.0, 20);
  poolGeo.rotateX(-Math.PI / 2);

  _sharedAssets = {
    sphereLow: new THREE.SphereGeometry(1, 8, 8),
    sphereMed: new THREE.SphereGeometry(1, 12, 10),
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(1, 0.75, 1, 8),
    cone: new THREE.ConeGeometry(1, 1, 6),
    acidProjGeo: new THREE.SphereGeometry(0.28, 8, 8),
    acidCoreGeo: new THREE.SphereGeometry(0.16, 6, 6),
    shockGeo,
    poolGeo,
    matHorn: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.25, metalness: 0.85 }),
    matClaw: new THREE.MeshStandardMaterial({ color: 0x1a1515, roughness: 0.3, metalness: 0.7 }),
    matAcidOuter: new THREE.MeshBasicMaterial({ color: 0x33ff00, transparent: true, opacity: 0.75 }),
    matAcidCore: new THREE.MeshBasicMaterial({ color: 0xccffaa }),
    matBarBg: new THREE.SpriteMaterial({ color: 0x000000, transparent: true, opacity: 0.65, depthTest: false })
  };
  return _sharedAssets;
}

// ============================================================================
// 2. CONSTRUTOR DE MESH 3D COM RIGGING ARTICULADO
// ============================================================================
function createBeastMesh(type) {
  const assets = getSharedBeastAssets();
  const cfg = BEAST_TYPES[type] || BEAST_TYPES.crawler;
  const s = cfg.scale;

  const g = new THREE.Group();
  const bodyRoot = new THREE.Group(); // Permite inclinar/animar o corpo sem afetar a barra de HP
  g.add(bodyRoot);

  // Material individual por monstro para permitir Hit Flash (emissive) sem afetar os outros
  const matBody = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.55,
    metalness: 0.35
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: cfg.accentColor,
    roughness: 0.45,
    metalness: 0.45
  });
  const matEye = new THREE.MeshBasicMaterial({ color: cfg.eyeColor });

  let headMesh = null;
  let torsoMesh = null;
  const rig = {
    bodyRoot,
    legs: [],
    arms: [],
    wings: [],
    tail: null,
    jaw: null,
    gland: null
  };

  if (type === 'crawler') {
    // --- FERA DAS SOMBRAS (Predador Quadrúpede Articulado) ---
    const torso = new THREE.Mesh(assets.box, matBody);
    torso.scale.set(0.68 * s, 0.46 * s, 1.45 * s);
    torso.position.y = 0.62 * s;
    bodyRoot.add(torso);
    torsoMesh = torso;

    // Espinhos Dorsais
    for (let i = 0; i < 4; i++) {
      const spine = new THREE.Mesh(assets.cone, matAccent);
      spine.scale.set(0.08 * s, 0.32 * s, 0.14 * s);
      spine.position.set(0, 0.92 * s, (0.45 - i * 0.32) * s);
      spine.rotation.x = -0.35;
      bodyRoot.add(spine);
    }

    // Cabeça + Mandíbula Articulada
    const head = new THREE.Mesh(assets.box, matBody);
    head.scale.set(0.52 * s, 0.38 * s, 0.62 * s);
    head.position.set(0, 0.76 * s, 0.85 * s);
    bodyRoot.add(head);
    headMesh = head;

    const jaw = new THREE.Mesh(assets.box, matAccent);
    jaw.scale.set(0.42 * s, 0.14 * s, 0.52 * s);
    jaw.position.set(0, 0.52 * s, 0.88 * s);
    bodyRoot.add(jaw);
    rig.jaw = jaw;

    // 4 Olhos Predadores
    for (const sx of [-1, 1]) {
      const eyeMain = new THREE.Mesh(assets.sphereLow, matEye);
      eyeMain.scale.setScalar(0.075 * s);
      eyeMain.position.set(sx * 0.19 * s, 0.82 * s, 1.14 * s);
      bodyRoot.add(eyeMain);

      const eyeSub = new THREE.Mesh(assets.sphereLow, matEye);
      eyeSub.scale.setScalar(0.045 * s);
      eyeSub.position.set(sx * 0.24 * s, 0.90 * s, 1.02 * s);
      bodyRoot.add(eyeSub);
    }

    // 4 Patas com Pivô no Ombro/Quadril para Galope Realista
    const legCoords = [
      [0.36, 0.58, 0.52, 1], [-0.36, 0.58, 0.52, -1],
      [0.36, 0.58, -0.52, -1], [-0.36, 0.58, -0.52, 1]
    ];
    legCoords.forEach(([lx, ly, lz, phase]) => {
      const pivot = new THREE.Group();
      pivot.position.set(lx * s, ly * s, lz * s);

      const leg = new THREE.Mesh(assets.cyl, matBody);
      leg.scale.set(0.11 * s, 0.65 * s, 0.11 * s);
      leg.position.y = -0.28 * s;
      leg.rotation.z = lx > 0 ? -0.18 : 0.18;
      pivot.add(leg);

      bodyRoot.add(pivot);
      rig.legs.push({ pivot, phase });
    });

    // Cauda Chicote
    const tail = new THREE.Mesh(assets.cone, matAccent);
    tail.scale.set(0.09 * s, 0.95 * s, 0.09 * s);
    tail.position.set(0, 0.68 * s, -1.05 * s);
    tail.rotation.x = -Math.PI * 0.42;
    bodyRoot.add(tail);
    rig.tail = tail;

  } else if (type === 'juggernaut') {
    // --- ABOMINAÇÃO MUTANTE (Colosso Blindado com Braços de Esmagamento) ---
    const torso = new THREE.Mesh(assets.cyl, matBody);
    torso.scale.set(0.78 * s, 1.55 * s, 0.65 * s);
    torso.position.y = 1.32 * s;
    bodyRoot.add(torso);
    torsoMesh = torso;

    // Ombreiras Ósseas
    for (const sx of [-1, 1]) {
      const pauldron = new THREE.Mesh(assets.sphereLow, matAccent);
      pauldron.scale.set(0.45 * s, 0.38 * s, 0.45 * s);
      pauldron.position.set(sx * 0.82 * s, 1.95 * s, 0.05 * s);
      bodyRoot.add(pauldron);
    }

    const head = new THREE.Mesh(assets.sphereMed, matBody);
    head.scale.setScalar(0.44 * s);
    head.position.set(0, 2.18 * s, 0.15 * s);
    bodyRoot.add(head);
    headMesh = head;

    // Chifres Curvos
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(assets.cone, assets.matHorn);
      horn.scale.set(0.13 * s, 0.68 * s, 0.13 * s);
      horn.position.set(sx * 0.34 * s, 2.52 * s, 0.22 * s);
      horn.rotation.z = -sx * 0.55;
      horn.rotation.x = 0.25;
      bodyRoot.add(horn);
    }

    // Olho Ciclópico + Núcleo Peitoral Brilhante
    const eye = new THREE.Mesh(assets.sphereLow, matEye);
    eye.scale.setScalar(0.16 * s);
    eye.position.set(0, 2.20 * s, 0.54 * s);
    bodyRoot.add(eye);

    const chestCore = new THREE.Mesh(assets.sphereLow, matEye);
    chestCore.scale.set(0.22 * s, 0.28 * s, 0.12 * s);
    chestCore.position.set(0, 1.48 * s, 0.52 * s);
    bodyRoot.add(chestCore);
    rig.gland = chestCore;

    // Braços Articulados nos Ombros
    for (const sx of [-1, 1]) {
      const armPivot = new THREE.Group();
      armPivot.position.set(sx * 0.92 * s, 1.88 * s, 0.1 * s);

      const upperArm = new THREE.Mesh(assets.box, matBody);
      upperArm.scale.set(0.42 * s, 1.25 * s, 0.44 * s);
      upperArm.position.y = -0.52 * s;
      armPivot.add(upperArm);

      const fist = new THREE.Mesh(assets.box, matAccent);
      fist.scale.set(0.52 * s, 0.48 * s, 0.52 * s);
      fist.position.set(0, -1.15 * s, 0.08 * s);
      armPivot.add(fist);

      bodyRoot.add(armPivot);
      rig.arms.push({ pivot: armPivot, side: sx });
    }

    // Pernas Tronco
    for (const sx of [-1, 1]) {
      const legPivot = new THREE.Group();
      legPivot.position.set(sx * 0.42 * s, 0.72 * s, 0);
      const leg = new THREE.Mesh(assets.cyl, matAccent);
      leg.scale.set(0.26 * s, 0.75 * s, 0.26 * s);
      leg.position.y = -0.35 * s;
      legPivot.add(leg);
      bodyRoot.add(legPivot);
      rig.legs.push({ pivot: legPivot, phase: sx });
    }

  } else if (type === 'fiend') {
    // --- CUSPIDOR TÓXICO (Aracnídeo/Insetóide Bioluminescente) ---
    const torso = new THREE.Mesh(assets.sphereMed, matBody);
    torso.scale.set(0.58 * s, 0.52 * s, 0.92 * s);
    torso.position.y = 0.82 * s;
    bodyRoot.add(torso);
    torsoMesh = torso;

    const head = new THREE.Mesh(assets.cone, matAccent);
    head.scale.set(0.36 * s, 0.75 * s, 0.36 * s);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 0.88 * s, 0.85 * s);
    bodyRoot.add(head);
    headMesh = head;

    // Olhos Compostos Verdes
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(assets.sphereLow, matEye);
      eye.scale.setScalar(0.09 * s);
      eye.position.set(sx * 0.22 * s, 0.98 * s, 0.78 * s);
      bodyRoot.add(eye);
    }

    // Abdômen / Glândula de Ácido Pulsante
    const gland = new THREE.Mesh(assets.sphereMed, matEye);
    gland.scale.set(0.42 * s, 0.38 * s, 0.52 * s);
    gland.position.set(0, 1.05 * s, -0.58 * s);
    bodyRoot.add(gland);
    rig.gland = gland;

    // 6 Patas Insetóides Articuladas
    const legZ = [0.42, 0.0, -0.42];
    legZ.forEach((lz, idx) => {
      for (const sx of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(sx * 0.45 * s, 0.72 * s, lz * s);

        const leg = new THREE.Mesh(assets.cyl, matAccent);
        leg.scale.set(0.08 * s, 0.82 * s, 0.08 * s);
        leg.position.set(sx * 0.22 * s, -0.32 * s, 0);
        leg.rotation.z = sx * 0.52;
        pivot.add(leg);

        bodyRoot.add(pivot);
        rig.legs.push({ pivot, phase: (idx % 2 === 0 ? 1 : -1) * sx });
      }
    });

  } else if (type === 'stalker') {
    // --- HORROR ALADO (Predador Aéreo com Asas Articuladas) ---
    const torso = new THREE.Mesh(assets.cone, matBody);
    torso.scale.set(0.42 * s, 1.28 * s, 0.38 * s);
    torso.rotation.x = Math.PI / 3;
    torso.position.y = 1.82 * s;
    bodyRoot.add(torso);
    torsoMesh = torso;

    const head = new THREE.Mesh(assets.sphereLow, matAccent);
    head.scale.setScalar(0.31 * s);
    head.position.set(0, 2.05 * s, 0.46 * s);
    bodyRoot.add(head);
    headMesh = head;

    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(assets.sphereLow, matEye);
      eye.scale.setScalar(0.075 * s);
      eye.position.set(sx * 0.14 * s, 2.10 * s, 0.70 * s);
      bodyRoot.add(eye);
    }

    // Asas com Pivô Central para Bater de Asas
    for (const sx of [-1, 1]) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(sx * 0.25 * s, 1.98 * s, 0.05 * s);

      const wingInner = new THREE.Mesh(assets.box, matBody);
      wingInner.scale.set(1.45 * s, 0.045 * s, 0.68 * s);
      wingInner.position.set(sx * 0.72 * s, 0, -0.05 * s);
      wingPivot.add(wingInner);

      const wingTip = new THREE.Mesh(assets.cone, matAccent);
      wingTip.scale.set(0.28 * s, 0.85 * s, 0.05 * s);
      wingTip.rotation.z = -sx * Math.PI * 0.42;
      wingTip.position.set(sx * 1.65 * s, 0.05 * s, -0.1 * s);
      wingPivot.add(wingTip);

      bodyRoot.add(wingPivot);
      rig.wings.push({ pivot: wingPivot, side: sx });
    }
  }

  // --- BARRA DE VIDA COM COMPENSAÇÃO DE ÂNCORA ---
  const barY = (type === 'juggernaut' ? 3.1 : type === 'stalker' ? 2.75 : 2.15) * s;
  const barFullWidth = 1.26 * s;

  const barBg = new THREE.Sprite(assets.matBarBg);
  barBg.scale.set(1.34 * s, 0.17 * s, 1);
  barBg.position.y = barY;
  g.add(barBg);

  const matBarFg = new THREE.SpriteMaterial({
    color: cfg.eyeColor,
    transparent: true,
    opacity: 0.95,
    depthTest: false
  });
  const barFg = new THREE.Sprite(matBarFg);
  barFg.scale.set(barFullWidth, 0.11 * s, 1);
  barFg.position.y = barY;
  g.add(barFg);

  return {
    group: g,
    torso: torsoMesh || bodyRoot,
    head: headMesh || bodyRoot,
    barFg,
    barBg,
    barFullWidth,
    materials: [matBody, matAccent],
    matBarFg,
    rig
  };
}

// ============================================================================
// 3. SPAWN, DANO, KNOCKBACK & MORTE ORGÂNICA
// ============================================================================

function spawnBeast(type = 'crawler', x = 0, z = 0) {
  const cfg = BEAST_TYPES[type] || BEAST_TYPES.crawler;
  const meshData = createBeastMesh(type);

  const groundY = typeof getTerrainHeight === 'function' ? getTerrainHeight(x, z) : 0;
  const startY = groundY + (type === 'stalker' ? 3.5 : 0);
  meshData.group.position.set(x, startY, z);
  scene.add(meshData.group);

  const beast = {
    id: beastIdCounter++,
    type,
    cfg,
    name: cfg.name,
    group: meshData.group,
    hitMeshes: [meshData.torso, meshData.head],
    head: meshData.head,
    barFg: meshData.barFg,
    barBg: meshData.barBg,
    barFullWidth: meshData.barFullWidth,
    materials: meshData.materials,
    matBarFg: meshData.matBarFg,
    rig: meshData.rig,
    health: cfg.hp,
    maxHealth: cfg.hp,
    speed: cfg.speed,
    damage: cfg.damage,
    alive: true,
    dying: false,
    deathTimer: 0,
    state: 'patrol',
    patrolTarget: new THREE.Vector3(x + (Math.random() - 0.5) * 32, 0, z + (Math.random() - 0.5) * 32),
    velocity: new THREE.Vector3(), // Usado para knockback e saltos (lunge)
    lastAttackTime: 0,
    attackCooldownMs: cfg.attackCooldownMs,
    attackAnimTimer: 0,
    hitFlashTimer: 0,
    animPhase: Math.random() * Math.PI * 2,
    stateTimer: 0
  };

  beasts.push(beast);
  return beast;
}

// Utilitário para tocar som com Pan Estéreo 3D baseado na posição do monstro
function playBeastSpatialSound(soundName, worldPos, extraPitch = 1.0) {
  if (typeof playSound !== 'function') return;
  let pan = 0;
  let vol = 1.0;

  try {
    if (typeof yawObject !== 'undefined' && yawObject) {
      const pPos = _beastPlayerPos;
      const dx = worldPos.x - pPos.x;
      const dz = worldPos.z - pPos.z;
      const dist = Math.hypot(dx, dz);

      // Atenuação suave por distância (até 85m)
      vol = Math.max(0.15, Math.min(1.15, 1.0 - dist / 90));

      // Calcula vetor direita da câmera do jogador para Pan Estéreo (-1 a +1)
      const camYaw = yawObject.rotation ? yawObject.rotation.y : 0;
      const rightX = Math.cos(camYaw);
      const rightZ = -Math.sin(camYaw);
      if (dist > 0.5) {
        pan = Math.max(-0.9, Math.min(0.9, (dx * rightX + dz * rightZ) / dist));
      }
    }
  } catch (_) { }

  playSound(soundName, { pan, volume: vol, pitch: extraPitch });
}

function damageBeast(beast, damage, hitPos, isHeadshot = false) {
  if (!beast || !beast.alive) return;

  const actualDmg = isHeadshot ? damage * 1.85 : damage;
  beast.health = Math.max(0, beast.health - actualDmg);

  // Acorda a fera imediatamente se for baleada de longe
  if (beast.state === 'patrol') {
    beast.state = 'chase';
  }

  // Hit Flash Visual (Brilho Emissivo de Impacto)
  beast.hitFlashTimer = 0.11;
  const flashHex = isHeadshot ? 0xff2244 : 0xffeebb;
  for (let i = 0; i < beast.materials.length; i++) {
    const m = beast.materials[i];
    if (m.emissive) {
      m.emissive.setHex(flashHex);
      m.emissiveIntensity = isHeadshot ? 0.9 : 0.55;
    }
  }

  // Knockback Físico proporcional à resistência da criatura
  if (typeof yawObject !== 'undefined' && yawObject) {
    yawObject.getWorldPosition(_beastPlayerPos);
    _knockDir.subVectors(beast.group.position, _beastPlayerPos);
    _knockDir.y = 0;
    if (_knockDir.lengthSq() > 0.01) {
      _knockDir.normalize();
      const kbForce = (1.0 - (beast.cfg.knockbackRes || 0.5)) * (isHeadshot ? 8.5 : 5.0);
      beast.velocity.x += _knockDir.x * kbForce;
      beast.velocity.z += _knockDir.z * kbForce;
    }
  }

  playBeastSpatialSound(isHeadshot ? 'hit' : 'beast_hit', beast.group.position, isHeadshot ? 1.15 : 1.0);

  if (typeof spawnHitBurst === 'function') {
    const burstPos = hitPos || beast.group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
    spawnHitBurst(burstPos, isHeadshot ? 0xff0044 : beast.cfg.eyeColor);
  }

  if (beast.health <= 0) {
    killBeast(beast, isHeadshot);
  }
}

function killBeast(beast, isHeadshot = false) {
  if (!beast.alive) return;
  beast.alive = false;
  beast.dying = true;
  beast.deathTimer = 0.65; // Tempo da animação de queda antes de remover da cena

  // Oculta barras de vida imediatamente
  beast.barFg.visible = false;
  beast.barBg.visible = false;

  const cfg = beast.cfg;
  if (typeof credits !== 'undefined') credits += cfg.credits;
  if (typeof addXp === 'function') addXp(cfg.xp * (isHeadshot ? 1.25 : 1.0));

  playBeastSpatialSound('explosion', beast.group.position, beast.type === 'juggernaut' ? 0.75 : 1.05);

  const hsTag = isHeadshot ? ' [CRÍTICO]' : '';
  if (typeof addKillFeed === 'function') {
    addKillFeed(`FERA ELIMINADA: ${cfg.name.toUpperCase()}${hsTag} (+${cfg.credits} C$)`);
  }
  if (typeof showStatus === 'function') {
    showStatus(`${cfg.name.toUpperCase()} ABATIDO — +${cfg.credits} C$`, 1800);
  }

  // Espólio Especial Dropado no Chão
  if (typeof spawnAirDropChestAt === 'function') {
    spawnAirDropChestAt(beast.group.position.x, beast.group.position.z);
  }
}

// Limpa materiais exclusivos da instância para evitar vazamento de memória
function disposeBeastInstance(beast) {
  scene.remove(beast.group);
  if (beast.materials) {
    beast.materials.forEach(m => { try { m.dispose(); } catch (_) { } });
  }
  if (beast.matBarFg) {
    try { beast.matBarFg.dispose(); } catch (_) { }
  }
}

// ============================================================================
// 4. LOOP PRINCIPAL DE ATUALIZAÇÃO, FÍSICA E ANIMAÇÃO (ZERO-GC)
// ============================================================================

const _beastPlayerPos = new THREE.Vector3();
const _beastPos = new THREE.Vector3();
const _lookDir = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _sepVec = new THREE.Vector3();
const _knockDir = new THREE.Vector3();

function updateBeasts(dt) {
  if (typeof player === 'undefined' || !player.alive) return;
  const clampedDt = Math.min(dt, 0.1);
  const nowMs = performance.now();

  yawObject.getWorldPosition(_beastPlayerPos);

  // --------------------------------------------------------------------------
  // A. ATUALIZAR FERAS (IA, MOVIMENTO, RIGGING & MORTE)
  // --------------------------------------------------------------------------
  for (let i = beasts.length - 1; i >= 0; i--) {
    const beast = beasts[i];

    // 1. Animação de Morte Orgânica (Tomba e afunda no solo)
    if (beast.dying) {
      beast.deathTimer -= clampedDt;
      beast.rig.bodyRoot.rotation.z += clampedDt * 2.4;
      beast.rig.bodyRoot.rotation.x += clampedDt * 1.1;
      beast.group.position.y -= clampedDt * 1.2;

      if (beast.deathTimer <= 0) {
        disposeBeastInstance(beast);
        beasts.splice(i, 1);
      }
      continue;
    }

    if (!beast.alive) continue;

    // 2. Recuperação do Hit Flash Emissivo
    if (beast.hitFlashTimer > 0) {
      beast.hitFlashTimer -= clampedDt;
      if (beast.hitFlashTimer <= 0) {
        for (let m = 0; m < beast.materials.length; m++) {
          if (beast.materials[m].emissive) {
            beast.materials[m].emissive.setHex(0x000000);
            beast.materials[m].emissiveIntensity = 0;
          }
        }
      }
    }

    _beastPos.copy(beast.group.position);
    const distToPlayer = _beastPos.distanceTo(_beastPlayerPos);
    beast.stateTimer += clampedDt;
    if (beast.attackAnimTimer > 0) beast.attackAnimTimer -= clampedDt;

    // 3. Máquina de Estados (Patrulha <-> Perseguição)
    const playerInPlane = (typeof inPlane !== 'undefined' && inPlane);
    if (distToPlayer < 80 && !playerInPlane) {
      if (beast.state !== 'chase') {
        beast.state = 'chase';
        if (beast.cfg.sound) {
          playBeastSpatialSound(beast.cfg.sound, beast.group.position);
        }
      }
    } else if ((distToPlayer > 105 || playerInPlane) && beast.state === 'chase') {
      beast.state = 'patrol';
    }

    let currentMoveSpeed = 0;

    if (beast.state === 'chase') {
      // Rotação suave em direção ao jogador (Angular Lerp)
      _lookDir.subVectors(_beastPlayerPos, beast.group.position);
      const targetYaw = Math.atan2(_lookDir.x, _lookDir.z);
      let angleDiff = targetYaw - beast.group.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      beast.group.rotation.y += angleDiff * Math.min(1, clampedDt * 9.0);

      // Vetor de Movimento Tático
      _moveDir.set(_lookDir.x, 0, _lookDir.z);
      const flatDist = _moveDir.length();
      if (flatDist > 0.001) _moveDir.divideScalar(flatDist);

      // Comportamento por Classe:
      // Fiend (Cuspidor) mantém distância tática e recua se o jogador colar nele
      let moveFactor = 0;
      if (beast.type === 'fiend') {
        if (distToPlayer > 17.0) {
          moveFactor = 1.0;
        } else if (distToPlayer < 8.5) {
          moveFactor = -0.65; // Recua atirando
        } else {
          // Strafe lateral leve para dificultar mira do jogador
          const strafeSign = (beast.id % 2 === 0) ? 1 : -1;
          const tempX = _moveDir.x;
          _moveDir.x = -_moveDir.z * strafeSign;
          _moveDir.z = tempX * strafeSign;
          moveFactor = 0.55;
        }
      } else {
        const stopDist = beast.cfg.attackRange * 0.68;
        if (distToPlayer > stopDist) moveFactor = 1.0;
      }

      // Força de Separação Boids (Evita que feras fiquem empilhadas no mesmo ponto)
      _sepVec.set(0, 0, 0);
      for (let j = 0; j < beasts.length; j++) {
        if (i === j) continue;
        const other = beasts[j];
        if (!other.alive) continue;
        const dx = beast.group.position.x - other.group.position.x;
        const dz = beast.group.position.z - other.group.position.z;
        const dSq = dx * dx + dz * dz;
        const minSep = beast.cfg.radius + other.cfg.radius + 0.6;
        if (dSq > 0.0001 && dSq < minSep * minSep) {
          const d = Math.sqrt(dSq);
          const push = (minSep - d) / minSep;
          _sepVec.x += (dx / d) * push * 3.5;
          _sepVec.z += (dz / d) * push * 3.5;
        }
      }

      const stepSpeed = beast.speed * moveFactor;
      beast.group.position.x += (_moveDir.x * stepSpeed + _sepVec.x + beast.velocity.x) * clampedDt;
      beast.group.position.z += (_moveDir.z * stepSpeed + _sepVec.z + beast.velocity.z) * clampedDt;
      currentMoveSpeed = Math.abs(stepSpeed) + Math.hypot(beast.velocity.x, beast.velocity.z);

      // Disparar Ataque Especial quando no alcance
      if (distToPlayer <= beast.cfg.attackRange && (nowMs - beast.lastAttackTime) > beast.attackCooldownMs) {
        beast.lastAttackTime = nowMs;
        beast.attackAnimTimer = 0.42;
        executeBeastAttack(beast, distToPlayer);
      }

    } else {
      // --- ESTADO DE PATRULHA ORGÂNICA ---
      _moveDir.subVectors(beast.patrolTarget, beast.group.position);
      _moveDir.y = 0;
      const distPatrol = _moveDir.length();

      if (distPatrol < 2.2) {
        beast.patrolTarget.set(
          beast.group.position.x + (Math.random() - 0.5) * 42,
          0,
          beast.group.position.z + (Math.random() - 0.5) * 42
        );
      } else {
        _moveDir.divideScalar(distPatrol);
        const patrolSpeed = beast.speed * 0.42;
        beast.group.position.x += (_moveDir.x * patrolSpeed + beast.velocity.x) * clampedDt;
        beast.group.position.z += (_moveDir.z * patrolSpeed + beast.velocity.z) * clampedDt;
        beast.group.rotation.y = Math.atan2(_moveDir.x, _moveDir.z);
        currentMoveSpeed = patrolSpeed;
      }
    }

    // Amortecimento de Velocidade Externa (Knockback / Lunge)
    const damping = Math.exp(-6.5 * clampedDt);
    beast.velocity.x *= damping;
    beast.velocity.z *= damping;
    beast.velocity.y -= 18.0 * clampedDt; // Gravidade para saltos

    // Ajuste de Altura sobre o Terreno
    const groundH = typeof getTerrainHeight === 'function'
      ? getTerrainHeight(beast.group.position.x, beast.group.position.z)
      : 0;

    if (beast.type === 'stalker') {
      // Voo dinâmico + Mergulho rasante durante ataque
      const swoopOffset = beast.attackAnimTimer > 0 ? -1.8 * Math.sin((beast.attackAnimTimer / 0.42) * Math.PI) : 0;
      const hoverY = groundH + 3.4 + Math.sin(nowMs * 0.004 + beast.id) * 0.65 + swoopOffset;
      beast.group.position.y += (hoverY - beast.group.position.y) * Math.min(1, clampedDt * 8);
    } else {
      beast.group.position.y += beast.velocity.y * clampedDt;
      if (beast.group.position.y <= groundH) {
        beast.group.position.y = groundH;
        beast.velocity.y = 0;
      }
    }

    // 4. Animação Procedural das Articulações (Rigging)
    animateBeastRig(beast, clampedDt, currentMoveSpeed);

    // 5. Atualização da Barra de Vida (Ancorada à esquerda e mudando de cor quando crítica)
    const hpRatio = Math.max(0, Math.min(1, beast.health / beast.maxHealth));
    beast.barFg.scale.x = Math.max(0.001, beast.barFullWidth * hpRatio);
    beast.barFg.position.x = -(beast.barFullWidth * (1 - hpRatio)) * 0.5;
  }

  // --------------------------------------------------------------------------
  // B. ATUALIZAR PROJÉTEIS BALÍSTICOS DE ÁCIDO
  // --------------------------------------------------------------------------
  for (let i = beastAcidProjectiles.length - 1; i >= 0; i--) {
    const proj = beastAcidProjectiles[i];
    proj.velocity.y -= 9.8 * clampedDt; // Gravidade parabólica realista
    proj.position.addScaledVector(proj.velocity, clampedDt);
    proj.mesh.position.copy(proj.position);
    proj.mesh.rotation.x += clampedDt * 8;
    proj.mesh.rotation.y += clampedDt * 6;
    proj.life -= clampedDt;

    // Colisão direta com o Jogador
    if (proj.position.distanceTo(_beastPlayerPos) < 1.65 && player.alive) {
      if (typeof damagePlayer === 'function') damagePlayer(proj.damage, proj.position.clone());
      playBeastSpatialSound('beast_bite', proj.position);
      if (typeof spawnHitBurst === 'function') spawnHitBurst(proj.position.clone(), 0x33ff00);
      scene.remove(proj.mesh);
      beastAcidProjectiles.splice(i, 1);
      continue;
    }

    // Colisão com o Chão -> Cria Poça de Ácido Temporária
    const groundY = typeof getTerrainHeight === 'function'
      ? getTerrainHeight(proj.position.x, proj.position.z)
      : 0;

    if (proj.position.y <= groundY + 0.15 || proj.life <= 0) {
      if (proj.position.y <= groundY + 0.25) {
        createAcidPool(proj.position.x, groundY + 0.06, proj.position.z, proj.damage * 0.35);
      }
      scene.remove(proj.mesh);
      beastAcidProjectiles.splice(i, 1);
    }
  }

  // --------------------------------------------------------------------------
  // C. ATUALIZAR ONDAS DE CHOQUE SÍSMICAS (JUGGERNAUT)
  // --------------------------------------------------------------------------
  for (let i = beastShockwaves.length - 1; i >= 0; i--) {
    const sw = beastShockwaves[i];
    sw.radius += clampedDt * 15.5;
    sw.mesh.scale.set(sw.radius, sw.radius, 1);
    sw.life -= clampedDt;
    sw.mat.opacity = Math.max(0, (sw.life / sw.maxLife) * 0.8);

    // Verifica colisão anelar (permite ao jogador pular sobre a onda de choque!)
    if (!sw.hitDone && player.alive) {
      const dx = _beastPlayerPos.x - sw.position.x;
      const dz = _beastPlayerPos.z - sw.position.z;
      const dist2D = Math.hypot(dx, dz);
      const heightDiff = Math.abs(_beastPlayerPos.y - sw.position.y);

      if (Math.abs(dist2D - sw.radius * 0.72) < 1.4 && heightDiff < 1.35) {
        if (typeof damagePlayer === 'function') damagePlayer(sw.damage, sw.position.clone());
        if (typeof addScreenShake === 'function') addScreenShake(0.11);
        sw.hitDone = true;
      }
    }

    if (sw.life <= 0) {
      scene.remove(sw.mesh);
      sw.mat.dispose();
      beastShockwaves.splice(i, 1);
    }
  }

  // --------------------------------------------------------------------------
  // D. ATUALIZAR POÇAS TÓXICAS NO CHÃO
  // --------------------------------------------------------------------------
  for (let i = beastAcidPools.length - 1; i >= 0; i--) {
    const pool = beastAcidPools[i];
    pool.life -= clampedDt;
    pool.tickTimer -= clampedDt;

    const pulse = 1.0 + Math.sin(nowMs * 0.012 + i) * 0.08;
    pool.mesh.scale.set(pool.radius * pulse, pool.radius * pulse, 1);
    pool.mat.opacity = Math.min(0.65, (pool.life / pool.maxLife) * 0.75);

    if (pool.tickTimer <= 0 && player.alive) {
      const dx = _beastPlayerPos.x - pool.position.x;
      const dz = _beastPlayerPos.z - pool.position.z;
      if (dx * dx + dz * dz < pool.radius * pool.radius && Math.abs(_beastPlayerPos.y - pool.position.y) < 1.6) {
        if (typeof damagePlayer === 'function') damagePlayer(pool.dpsTick, pool.position.clone());
        pool.tickTimer = 0.55; // Dano a cada 0.55s se ficar pisando no ácido
      }
    }

    if (pool.life <= 0) {
      scene.remove(pool.mesh);
      pool.mat.dispose();
      beastAcidPools.splice(i, 1);
    }
  }
}

// ============================================================================
// 5. MOTOR DE ANIMAÇÃO PROCEDURAL DAS ARTICULAÇÕES
// ============================================================================

function animateBeastRig(beast, dt, moveSpeed) {
  const rig = beast.rig;
  if (!rig) return;

  beast.animPhase += dt * (2.5 + moveSpeed * 1.85);
  const p = beast.animPhase;
  const isMoving = moveSpeed > 0.25;
  const strideAmp = isMoving ? Math.min(0.65, moveSpeed * 0.09) : 0.04;

  // 1. Animação de Patas/Pernas
  for (let i = 0; i < rig.legs.length; i++) {
    const leg = rig.legs[i];
    leg.pivot.rotation.x = Math.sin(p + (leg.phase > 0 ? 0 : Math.PI)) * strideAmp;
  }

  // 2. Animação de Braços do Juggernaut (Balanço de marcha + Smash de Ataque)
  for (let i = 0; i < rig.arms.length; i++) {
    const arm = rig.arms[i];
    if (beast.attackAnimTimer > 0) {
      // Ergue os dois braços e esmaga o chão
      const smashWave = Math.sin((beast.attackAnimTimer / 0.42) * Math.PI);
      arm.pivot.rotation.x = -1.6 * smashWave;
    } else {
      arm.pivot.rotation.x = Math.sin(p + (arm.side > 0 ? 0 : Math.PI)) * (strideAmp * 0.8);
    }
  }

  // 3. Bater de Asas do Stalker
  for (let i = 0; i < rig.wings.length; i++) {
    const w = rig.wings[i];
    const flapSpeed = beast.attackAnimTimer > 0 ? 22.0 : 12.0;
    const flapAngle = Math.sin(performance.now() * 0.001 * flapSpeed + beast.id) * 0.58;
    w.pivot.rotation.z = w.side * (0.22 + flapAngle);
  }

  // 4. Mandíbula e Cauda do Crawler
  if (rig.jaw) {
    const biteOpen = beast.attackAnimTimer > 0 ? 0.45 : 0.06 + Math.abs(Math.sin(p * 0.5)) * 0.08;
    rig.jaw.rotation.x = biteOpen;
  }
  if (rig.tail) {
    rig.tail.rotation.y = Math.sin(p * 0.8) * 0.35;
  }

  // 5. Pulsação Bioluminescente da Glândula (Fiend / Juggernaut)
  if (rig.gland) {
    const pulse = 1.0 + Math.sin(p * 1.5) * 0.14 + (beast.attackAnimTimer > 0 ? 0.25 : 0);
    rig.gland.scale.setScalar(pulse * (beast.type === 'fiend' ? 0.45 * beast.cfg.scale : 0.22 * beast.cfg.scale));
  }

  // 6. Inclinação Corporal Dinâmica ao Correr
  rig.bodyRoot.position.y = isMoving ? Math.abs(Math.sin(p * 2)) * 0.08 : 0;
}

// ============================================================================
// 6. ATAQUES ESPECIAIS & HABILIDADES DE COMBATE
// ============================================================================

function executeBeastAttack(beast, distToPlayer) {
  const pos = beast.group.position;

  if (beast.type === 'crawler') {
    // --- SALTO PREDATÓRIO (LUNGE FÍSICO + MORDIDA) ---
    playBeastSpatialSound('beast_bite', pos);

    _lookDir.subVectors(_beastPlayerPos, pos).normalize();
    beast.velocity.x = _lookDir.x * 9.5;
    beast.velocity.z = _lookDir.z * 9.5;
    beast.velocity.y = 4.2; // Pequeno salto no ar

    if (distToPlayer < 3.8 && typeof damagePlayer === 'function') {
      damagePlayer(beast.damage, pos.clone());
    }

  } else if (beast.type === 'juggernaut') {
    // --- PISADA SÍSMICA COM ONDA DE CHOQUE ANELAR ---
    playBeastSpatialSound('beast_stomp', pos);
    if (typeof addScreenShake === 'function') addScreenShake(0.08);
    createStompShockwave(pos.clone(), beast.damage);

  } else if (beast.type === 'fiend') {
    // --- DISPARO DE ÁCIDO BALÍSTICO COM COMPENSAÇÃO DE GRAVIDADE ---
    playBeastSpatialSound('acid_spit', pos);

    const startPos = pos.clone();
    startPos.y += 1.25 * beast.cfg.scale;

    const toTarget = new THREE.Vector3().subVectors(_beastPlayerPos, startPos);
    const horizDist = Math.hypot(toTarget.x, toTarget.z);
    const projSpeed = 24.0;
    const flightTime = Math.max(0.15, horizDist / projSpeed);

    // Compensa a queda da gravidade (9.8 m/s²) para acertar o jogador em arco
    const vel = new THREE.Vector3(
      toTarget.x / flightTime,
      (toTarget.y + 0.5 * 9.8 * flightTime * flightTime) / flightTime,
      toTarget.z / flightTime
    );

    const assets = getSharedBeastAssets();
    const acidGroup = new THREE.Group();
    acidGroup.add(new THREE.Mesh(assets.acidProjGeo, assets.matAcidOuter));
    acidGroup.add(new THREE.Mesh(assets.acidCoreGeo, assets.matAcidCore));
    acidGroup.position.copy(startPos);
    scene.add(acidGroup);

    beastAcidProjectiles.push({
      mesh: acidGroup,
      position: startPos,
      velocity: vel,
      damage: beast.damage,
      life: 3.2
    });

  } else if (beast.type === 'stalker') {
    // --- RASANTE AÉREO VELOZ (SWOOP) ---
    playBeastSpatialSound('demon_screech', pos);

    _lookDir.subVectors(_beastPlayerPos, pos).normalize();
    beast.velocity.x = _lookDir.x * 11.0;
    beast.velocity.z = _lookDir.z * 11.0;

    if (distToPlayer < 4.6 && typeof damagePlayer === 'function') {
      damagePlayer(beast.damage, pos.clone());
    }
  }
}

function createStompShockwave(pos, damage) {
  const assets = getSharedBeastAssets();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(assets.shockGeo, mat);
  mesh.position.set(pos.x, pos.y + 0.12, pos.z);
  scene.add(mesh);

  beastShockwaves.push({
    mesh,
    mat,
    position: pos.clone(),
    radius: 0.8,
    damage,
    life: 0.85,
    maxLife: 0.85,
    hitDone: false
  });
}

function createAcidPool(x, y, z, dpsTick) {
  const assets = getSharedBeastAssets();
  const mat = new THREE.MeshBasicMaterial({
    color: 0x33ff00,
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(assets.poolGeo, mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  beastAcidPools.push({
    mesh,
    mat,
    position: new THREE.Vector3(x, y, z),
    radius: 2.1,
    dpsTick,
    tickTimer: 0.15,
    life: 4.0,
    maxLife: 4.0
  });
}