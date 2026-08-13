// =====================================================================
// BEASTS.JS — MÓDULO DE FERAS E MONSTROS DINÂMICOS
// (Fera das Sombras, Abominação Mutante, Cuspidor Tóxico e Horror Alado)
// =====================================================================

const beasts = [];
const beastAcidProjectiles = [];
const beastShockwaves = [];
let beastIdCounter = 0;

const BEAST_TYPES = {
  crawler: {
    name: 'Fera das Sombras',
    hp: 140,
    speed: 5.5,
    damage: 18,
    color: 0x111115,
    eyeColor: 0xff0044,
    scale: 0.9,
    xp: 90,
    credits: 180,
    sound: 'beast_roar'
  },
  juggernaut: {
    name: 'Abominação Mutante',
    hp: 650,
    speed: 2.2,
    damage: 42,
    color: 0x2b1d16,
    eyeColor: 0xffaa00,
    scale: 1.8,
    xp: 350,
    credits: 600,
    sound: 'beast_stomp'
  },
  fiend: {
    name: 'Cuspidor Tóxico',
    hp: 180,
    speed: 3.2,
    damage: 22,
    color: 0x163516,
    eyeColor: 0x33ff00,
    scale: 1.1,
    xp: 120,
    credits: 220,
    sound: 'acid_spit'
  },
  stalker: {
    name: 'Horror Alado',
    hp: 130,
    speed: 6.8,
    damage: 25,
    color: 0x221133,
    eyeColor: 0xbf00ff,
    scale: 1.0,
    xp: 150,
    credits: 280,
    sound: 'demon_screech'
  }
};

// =====================================================================
// MESH 3D PROCEDURAL DAS FERAS E MONSTROS
// =====================================================================
function createBeastMesh(type) {
  const g = new THREE.Group();
  const cfg = BEAST_TYPES[type] || BEAST_TYPES.crawler;
  const scale = cfg.scale;

  const matBody = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.6,
    metalness: 0.3
  });
  const matEye = new THREE.MeshBasicMaterial({ color: cfg.eyeColor });
  const matHorn = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.3, metalness: 0.8 });

  let headMesh = null;
  let torsoMesh = null;

  if (type === 'crawler') {
    // Corpo Quadrupede Predador
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7 * scale, 0.5 * scale, 1.4 * scale), matBody);
    torso.position.y = 0.6 * scale;
    g.add(torso);
    torsoMesh = torso;

    // Cabeça com Mandíbula
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.4 * scale, 0.6 * scale), matBody);
    head.position.set(0, 0.7 * scale, 0.8 * scale);
    g.add(head);
    headMesh = head;

    // Olhos Emissivos Vermelhos
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 6, 6), matEye);
    eye1.position.set(0.18 * scale, 0.75 * scale, 1.1 * scale);
    const eye2 = eye1.clone();
    eye2.position.x = -0.18 * scale;
    g.add(eye1); g.add(eye2);

    // 4 Patas Quadrupede
    const legGeo = new THREE.CylinderGeometry(0.12 * scale, 0.08 * scale, 0.7 * scale, 6);
    const legPositions = [
      [0.35, 0.35, 0.5], [-0.35, 0.35, 0.5],
      [0.35, 0.35, -0.5], [-0.35, 0.35, -0.5]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, matBody);
      leg.position.set(pos[0] * scale, pos[1] * scale, pos[2] * scale);
      leg.rotation.z = pos[0] > 0 ? -0.2 : 0.2;
      g.add(leg);
    });
  } else if (type === 'juggernaut') {
    // Abominação Humanoide Gigante
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.75 * scale, 0.6 * scale, 1.6 * scale, 8), matBody);
    torso.position.y = 1.3 * scale;
    g.add(torso);
    torsoMesh = torso;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.45 * scale, 10, 10), matBody);
    head.position.y = 2.2 * scale;
    g.add(head);
    headMesh = head;

    // Chifres Mutantes
    for (const sx of [-0.3, 0.3]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 0.6 * scale, 6), matHorn);
      horn.position.set(sx * scale, 2.5 * scale, 0.1 * scale);
      horn.rotation.z = -sx * 0.5;
      g.add(horn);
    }

    // Olho Único Gigante Amarelo
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15 * scale, 8, 8), matEye);
    eye.position.set(0, 2.2 * scale, 0.4 * scale);
    g.add(eye);

    // Braços de Esmagamento Pesados
    for (const sx of [-0.85, 0.85]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4 * scale, 1.2 * scale, 0.4 * scale), matBody);
      arm.position.set(sx * scale, 1.4 * scale, 0.2 * scale);
      g.add(arm);
    }
  } else if (type === 'fiend') {
    // Criatura Insetóide Cuspidora de Ácido
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.6 * scale, 8, 8), matBody);
    torso.position.y = 0.8 * scale; torso.scale.z = 1.5;
    g.add(torso);
    torsoMesh = torso;

    const head = new THREE.Mesh(new THREE.ConeGeometry(0.35 * scale, 0.7 * scale, 6), matBody);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 0.9 * scale, 0.8 * scale);
    g.add(head);
    headMesh = head;

    // Glândula Ácida Verde Brilhante
    const gland = new THREE.Mesh(new THREE.SphereGeometry(0.3 * scale, 8, 8), matEye);
    gland.position.set(0, 1.0 * scale, -0.4 * scale);
    g.add(gland);
  } else if (type === 'stalker') {
    // Fera Voadora com Asas Espinhosas
    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.4 * scale, 1.2 * scale, 6), matBody);
    torso.rotation.x = Math.PI / 3;
    torso.position.y = 1.8 * scale;
    g.add(torso);
    torsoMesh = torso;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3 * scale, 8, 8), matBody);
    head.position.set(0, 2.0 * scale, 0.4 * scale);
    g.add(head);
    headMesh = head;

    // Asas Demoníacas
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6 * scale, 0.05 * scale, 0.6 * scale), matBody);
      wing.position.set(sx * 0.9 * scale, 2.0 * scale, 0);
      wing.rotation.z = sx * 0.3;
      g.add(wing);
    }
  }

  // Barra de Vida do Monstro
  const barBg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthTest: false }));
  barBg.scale.set(1.3 * scale, 0.16 * scale, 1);
  barBg.position.y = (type === 'juggernaut' ? 3.0 : 2.2) * scale;
  g.add(barBg);

  const barFg = new THREE.Sprite(new THREE.SpriteMaterial({ color: cfg.eyeColor, transparent: true, depthTest: false }));
  barFg.scale.set(1.25 * scale, 0.12 * scale, 1);
  barFg.position.y = (type === 'juggernaut' ? 3.0 : 2.2) * scale;
  g.add(barFg);

  return { group: g, torso: torsoMesh || g, head: headMesh || g, barFg };
}

// Spawna uma Fera na posição indicada
function spawnBeast(type = 'crawler', x = 0, z = 0) {
  const cfg = BEAST_TYPES[type] || BEAST_TYPES.crawler;
  const meshData = createBeastMesh(type);

  const y = typeof getTerrainHeight === 'function' ? getTerrainHeight(x, z) : 0;
  meshData.group.position.set(x, y + (type === 'stalker' ? 3.0 : 0), z);
  scene.add(meshData.group);

  const beast = {
    id: beastIdCounter++,
    type,
    name: cfg.name,
    group: meshData.group,
    hitMeshes: [meshData.torso, meshData.head],
    head: meshData.head,
    barFg: meshData.barFg,
    health: cfg.hp,
    maxHealth: cfg.hp,
    speed: cfg.speed,
    damage: cfg.damage,
    alive: true,
    state: 'patrol',
    patrolTarget: new THREE.Vector3(x + (Math.random() - 0.5) * 30, 0, z + (Math.random() - 0.5) * 30),
    lastAttackTime: 0,
    attackCooldownMs: type === 'crawler' ? 1200 : type === 'juggernaut' ? 2200 : type === 'fiend' ? 1800 : 1400,
    stateTimer: 0
  };

  beasts.push(beast);
  return beast;
}

// Causa Dano na Fera
function damageBeast(beast, damage, hitPos, isHeadshot = false) {
  if (!beast || !beast.alive) return;

  const actualDmg = isHeadshot ? damage * 1.8 : damage;
  beast.health -= actualDmg;

  playSound(isHeadshot ? 'hit' : 'beast_hit');
  spawnHitBurst(hitPos || beast.group.position.clone().add(new THREE.Vector3(0, 1, 0)), isHeadshot ? 0xff0044 : 0x88ff00);

  if (beast.health <= 0) {
    killBeast(beast, isHeadshot);
  }
}

// Eliminação da Fera & Drops
function killBeast(beast, isHeadshot = false) {
  beast.alive = false;
  beast.group.visible = false;

  const cfg = BEAST_TYPES[beast.type] || BEAST_TYPES.crawler;
  credits += cfg.credits;
  addXp(cfg.xp);

  playSound('explosion');
  addKillFeed(`FERA ELIMINADA: ${cfg.name.toUpperCase()} (+${cfg.credits} créditos)`);
  showStatus(`MONSTRO DERROTADO — +${cfg.credits} C$`, 1800);

  // Espólio Especial Dropado no Chão
  if (typeof spawnAirDropChestAt === 'function') {
    spawnAirDropChestAt(beast.group.position.x, beast.group.position.z);
  }

  setTimeout(() => {
    const idx = beasts.indexOf(beast);
    if (idx >= 0) {
      scene.remove(beast.group);
      beasts.splice(idx, 1);
    }
  }, 1000);
}

// Atualização Principal de Feras & Ataques Especiais
const _beastPlayerPos = new THREE.Vector3();
const _beastPos = new THREE.Vector3();

function updateBeasts(dt) {
  if (!player.alive) return;
  yawObject.getWorldPosition(_beastPlayerPos);

  // 1. Atualizar Feras
  beasts.forEach(beast => {
    if (!beast.alive) return;

    _beastPos.copy(beast.group.position);
    const distToPlayer = _beastPos.distanceTo(_beastPlayerPos);
    beast.stateTimer += dt;

    // Troca de Estado (Perseguição / Patrulha)
    if (distToPlayer < 75 && !inPlane) {
      if (beast.state !== 'chase') {
        beast.state = 'chase';
        const cfg = BEAST_TYPES[beast.type];
        if (cfg && cfg.sound) playSound(cfg.sound);
      }
    } else if (distToPlayer > 100 && beast.state === 'chase') {
      beast.state = 'patrol';
    }

    if (beast.state === 'chase') {
      // Olhar para o jogador
      const lookDir = new THREE.Vector3().subVectors(_beastPlayerPos, beast.group.position);
      beast.group.rotation.y = Math.atan2(lookDir.x, lookDir.z);

      // Movimentação em direção ao jogador
      const moveDir = lookDir.clone();
      moveDir.y = 0;
      moveDir.normalize();

      const minAttackDist = beast.type === 'fiend' ? 18 : beast.type === 'juggernaut' ? 4 : 2.5;

      if (distToPlayer > minAttackDist) {
        const moveDist = beast.speed * dt;
        beast.group.position.addScaledVector(moveDir, moveDist);
      }

      // Ajustar Altura do Terreno (Stalker voa alto)
      const groundH = typeof getTerrainHeight === 'function' ? getTerrainHeight(beast.group.position.x, beast.group.position.z) : 0;
      if (beast.type === 'stalker') {
        beast.group.position.y = groundH + 3.5 + Math.sin(performance.now() * 0.003) * 0.8;
      } else {
        beast.group.position.y = groundH;
      }

      // Realizar Ataques Especiais
      const now = performance.now();
      if (distToPlayer <= minAttackDist + 4 && now - beast.lastAttackTime > beast.attackCooldownMs) {
        beast.lastAttackTime = now;
        executeBeastAttack(beast, distToPlayer);
      }
    } else {
      // Patrulha Tranquila
      const toPatrol = new THREE.Vector3().subVectors(beast.patrolTarget, beast.group.position);
      toPatrol.y = 0;
      if (toPatrol.length() < 2.0) {
        beast.patrolTarget.set(
          beast.group.position.x + (Math.random() - 0.5) * 40, 0,
          beast.group.position.z + (Math.random() - 0.5) * 40
        );
      } else {
        toPatrol.normalize();
        beast.group.position.addScaledVector(toPatrol, beast.speed * 0.4 * dt);
        beast.group.rotation.y = Math.atan2(toPatrol.x, toPatrol.z);
        const groundH = typeof getTerrainHeight === 'function' ? getTerrainHeight(beast.group.position.x, beast.group.position.z) : 0;
        beast.group.position.y = groundH;
      }
    }

    // Atualizar Barra de Vida
    beast.barFg.scale.x = 1.25 * (BEAST_TYPES[beast.type] ? BEAST_TYPES[beast.type].scale : 1) * Math.max(beast.health, 0) / beast.maxHealth;
  });

  // 2. Atualizar Projéteis Ácidos de Monstros
  for (let i = beastAcidProjectiles.length - 1; i >= 0; i--) {
    const proj = beastAcidProjectiles[i];
    proj.position.addScaledVector(proj.velocity, dt);
    proj.mesh.position.copy(proj.position);
    proj.life -= dt;

    if (proj.position.distanceTo(_beastPlayerPos) < 1.8 && player.alive) {
      damagePlayer(proj.damage, proj.position.clone());
      playSound('beast_bite');
      scene.remove(proj.mesh);
      beastAcidProjectiles.splice(i, 1);
      continue;
    }

    if (proj.life <= 0) {
      scene.remove(proj.mesh);
      beastAcidProjectiles.splice(i, 1);
    }
  }

  // 3. Atualizar Ondas de Choque no Chão
  for (let i = beastShockwaves.length - 1; i >= 0; i--) {
    const sw = beastShockwaves[i];
    sw.mesh.scale.x += dt * 14;
    sw.mesh.scale.z += dt * 14;
    sw.life -= dt;
    sw.mesh.material.opacity = Math.max(0, sw.life / sw.maxLife * 0.7);

    if (sw.position.distanceTo(_beastPlayerPos) < sw.mesh.scale.x * 0.5 && Math.abs(_beastPlayerPos.y - sw.position.y) < 1.5 && player.alive && !sw.hitDone) {
      damagePlayer(sw.damage, sw.position.clone());
      addScreenShake(0.08);
      sw.hitDone = true;
    }

    if (sw.life <= 0) {
      scene.remove(sw.mesh);
      beastShockwaves.splice(i, 1);
    }
  }
}

// Executa o Ataque Específico da Fera
function executeBeastAttack(beast, distToPlayer) {
  if (beast.type === 'crawler') {
    // Salto Mortal + Mordida
    playSound('beast_bite');
    if (distToPlayer < 3.2) {
      damagePlayer(beast.damage, beast.group.position.clone());
    }
  } else if (beast.type === 'juggernaut') {
    // Pisada Pesada no Chão (Onda de Choque)
    playSound('beast_stomp');
    addScreenShake(0.06);
    createStompShockwave(beast.group.position.clone(), beast.damage);
  } else if (beast.type === 'fiend') {
    // Disparo de Projétil Tóxico Ácido
    playSound('acid_spit');
    const startPos = beast.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const dir = new THREE.Vector3().subVectors(_beastPlayerPos, startPos).normalize();

    const acidGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const acidMat = new THREE.MeshBasicMaterial({ color: 0x33ff00 });
    const acidMesh = new THREE.Mesh(acidGeo, acidMat);
    acidMesh.position.copy(startPos);
    scene.add(acidMesh);

    beastAcidProjectiles.push({
      mesh: acidMesh,
      position: startPos,
      velocity: dir.multiplyScalar(22),
      damage: beast.damage,
      life: 3.0
    });
  } else if (beast.type === 'stalker') {
    // Rasante Aéreo
    playSound('demon_screech');
    if (distToPlayer < 4.0) {
      damagePlayer(beast.damage, beast.group.position.clone());
    }
  }
}

// Criar Onda de Choque no Chão
function createStompShockwave(pos, damage) {
  const geo = new THREE.RingGeometry(0.2, 0.6, 24);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.position.y += 0.1;
  scene.add(mesh);

  beastShockwaves.push({
    mesh,
    position: pos,
    damage,
    life: 0.8,
    maxLife: 0.8,
    hitDone: false
  });
}
