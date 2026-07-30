// =====================================================================
// MAPS.JS — CÉUS DINÂMICOS 3D E HORIZONTES ATMOSFÉRICOS ÚNICOS
// (Aurora Boreal, Nebulosa Quântica, Skyline Cyberpunk, Tempestade de Selva)
// =====================================================================

const MAPS = {
  neon_rust: {
    name: 'Operação Neon Rust',
    subtitle: 'Distrito industrial cyberpunk sob chuva tática, skyline de néon e arranha-céus distantes',
    sky: 0x050914, fog: 0x0c142b, ground: 0x161e2b, sun: 0x00f0ff, particleColor: 0x00f0ff,
    mode: 'Plantar / Desarmar Bomba (Search & Destroy)', size: 'Médio (3-Lanes Tático)'
  },
  void_core: {
    name: 'Núcleo do Abismo (Void Core)',
    subtitle: 'Dimensão alternativa com nebulosa púrpura, estrelas quânticas e anéis celestes',
    sky: 0x080214, fog: 0x140728, ground: 0x180930, sun: 0x9d00ff, particleColor: 0x9d00ff,
    mode: 'Domínio de Pontos & Extração Quântica', size: 'Grande (Verticalidade & Portais)'
  },
  jungle_temple: {
    name: 'Santuário da Selva',
    subtitle: 'Selva tropical profunda com horizonte de montanhas enevoadas e raio solar',
    sky: 0x3d5433, fog: 0x2e4226, ground: 0x1e3316, sun: 0xfff0b3, particleColor: 0x33bb44,
    mode: 'Caça de Recompensas & Extração', size: 'Grande (Vegetação Densa)'
  },
  desert: {
    name: 'Ponto de Ruptura',
    subtitle: 'Deserto árido sob sol escaldante, desfiladeiros de cânions e tempestade de areia',
    sky: 0xd49b56, fog: 0xd49b56, ground: 0xa77d43, sun: 0xffd39c, particleColor: 0xd4a853,
    mode: 'Mata-Mata em Equipe', size: 'Médio'
  },
  arctic: {
    name: 'Estação Ártica',
    subtitle: 'Noite polar sob a Aurora Boreal verde-ciano e tempestade de neve',
    sky: 0x071524, fog: 0x0c2238, ground: 0xd8e4f2, sun: 0x50ffc8, particleColor: 0xffffff,
    mode: 'Sobrevivência Tática', size: 'Médio'
  }
};

const mapDecor = new THREE.Group();
scene.add(mapDecor);

let currentSkyDome = null;
let currentHorizonMesh = null;

// =====================================================================
// GERADOR DE CÉUS DINÂMICOS PROCEDURAIS (CANVAS TEXTURE 3D DOME)
// =====================================================================
function createSkyTexture(mapKey) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (mapKey === 'arctic') {
    // Céu Noturno Polar com Aurora Boreal Verde/Ciano
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#020b14');
    grad.addColorStop(0.35, '#071f2c');
    grad.addColorStop(0.7, '#004438');
    grad.addColorStop(1.0, '#0c2238');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Ondas da Aurora Boreal
    for (let wave = 0; wave < 3; wave++) {
      ctx.beginPath();
      ctx.moveTo(0, 180 + wave * 40);
      for (let x = 0; x <= 1024; x += 30) {
        const y = 180 + wave * 40 + Math.sin(x * 0.01 + wave) * 45 + Math.cos(x * 0.02) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(1024, 512); ctx.lineTo(0, 512);
      const aurGrad = ctx.createLinearGradient(0, 140, 0, 360);
      aurGrad.addColorStop(0, 'rgba(0, 255, 180, 0.45)');
      aurGrad.addColorStop(0.5, 'rgba(0, 200, 255, 0.25)');
      aurGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aurGrad;
      ctx.fill();
    }

    // Estrelas piscantes
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 250; s++) {
      const sx = Math.random() * 1024;
      const sy = Math.random() * 260;
      const sr = Math.random() * 1.5;
      ctx.fillRect(sx, sy, sr, sr);
    }
  } else if (mapKey === 'void_core') {
    // Nebulosa Quântica do Abismo (Void Celestial)
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#04010a');
    grad.addColorStop(0.4, '#140528');
    grad.addColorStop(0.8, '#2a0845');
    grad.addColorStop(1.0, '#140728');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Manchas de Nebulosa Púrpura/Ciano
    for (let i = 0; i < 8; i++) {
      const cx = Math.random() * 1024;
      const cy = Math.random() * 300;
      const rad = 100 + Math.random() * 180;
      const nebGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      nebGrad.addColorStop(0, i % 2 === 0 ? 'rgba(157, 0, 255, 0.5)' : 'rgba(0, 240, 255, 0.35)');
      nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nebGrad;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    }
  } else if (mapKey === 'neon_rust') {
    // Skyline Cyberpunk com Prédios Distantes Ilustrados
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#02050e');
    grad.addColorStop(0.5, '#0a1224');
    grad.addColorStop(1.0, '#0c142b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Silhuetas de Arranha-céus no horizonte com luzes neon
    ctx.fillStyle = '#060a14';
    for (let x = 0; x < 1024; x += 40) {
      const bh = 100 + Math.sin(x * 0.05) * 60 + Math.random() * 80;
      const bw = 25 + Math.random() * 20;
      ctx.fillRect(x, 512 - bh, bw, bh);

      // Janelinhas acesas
      ctx.fillStyle = Math.random() > 0.5 ? '#00f0ff' : '#9d00ff';
      for (let wy = 512 - bh + 10; wy < 510; wy += 20) {
        if (Math.random() > 0.4) ctx.fillRect(x + 5, wy, 4, 6);
      }
      ctx.fillStyle = '#060a14';
    }
  } else if (mapKey === 'jungle_temple') {
    // Tempestade Tropical com Montanhas Envoadas
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1c2e19');
    grad.addColorStop(0.5, '#3d5433');
    grad.addColorStop(1.0, '#2e4226');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);
  } else {
    // Deserto Árido com Sol Incandescente
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#75461b');
    grad.addColorStop(0.5, '#d49b56');
    grad.addColorStop(1.0, '#e6b978');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function buildDynamicSkyDome(mapKey) {
  if (currentSkyDome) scene.remove(currentSkyDome);

  const skyGeo = new THREE.SphereGeometry(380, 32, 24);
  const skyTex = createSkyTexture(mapKey);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });

  currentSkyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(currentSkyDome);
}

// =====================================================================
// CONSTRUÇÃO DE HORIZONTES ORGÂNICOS 3D (MONTANHAS & SILHUETAS)
// =====================================================================
function buildOrganicHorizon(mapKey) {
  if (currentHorizonMesh) mapDecor.remove(currentHorizonMesh);

  const mountainGroup = new THREE.Group();
  const map = MAPS[mapKey] || MAPS.neon_rust;

  const mountainMat = new THREE.MeshStandardMaterial({
    color: mapKey === 'arctic' ? 0x102538 : mapKey === 'jungle_temple' ? 0x1e331b : mapKey === 'void_core' ? 0x0c0418 : 0x141c2b,
    roughness: 0.95
  });

  // Montanhas Orgânicas no Horizonte 360 Graus
  const count = 28;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const rad = 260 + Math.random() * 40;
    const mw = 45 + Math.random() * 35;
    const mh = 50 + Math.random() * 60;

    const mGeo = new THREE.ConeGeometry(mw, mh, 7);
    const mMesh = new THREE.Mesh(mGeo, mountainMat);
    mMesh.position.set(Math.cos(angle) * rad, mh / 2 - 10, Math.sin(angle) * rad);
    mMesh.rotation.y = Math.random() * Math.PI;
    mountainGroup.add(mMesh);
  }

  currentHorizonMesh = mountainGroup;
  mapDecor.add(mountainGroup);
}

// =====================================================================
// PARTÍCULAS AMBIENTAIS DINÂMICAS
// =====================================================================
function buildMapDecor() {
  while (mapDecor.children.length) mapDecor.remove(mapDecor.children[0]);
  ambientParticles.length = 0;

  const mapKey = selectedMap;
  const map = MAPS[mapKey] || MAPS.neon_rust;

  buildDynamicSkyDome(mapKey);
  buildOrganicHorizon(mapKey);

  const particleCount = 160;
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * 90;
    positions[i * 3 + 1] = Math.random() * 32;
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * 90;

    velocities.push({
      x: (Math.random() - 0.5) * (mapKey === 'desert' ? 3.5 : 0.8),
      y: mapKey === 'neon_rust' || mapKey === 'jungle_temple' ? -8.5 - Math.random() * 4.5 :
         mapKey === 'arctic' ? -1.8 - Math.random() * 1.5 :
         mapKey === 'void_core' ? 0.8 + Math.random() * 1.4 : (Math.random() - 0.5) * 0.5,
      z: (Math.random() - 0.5) * (mapKey === 'desert' ? 3.5 : 0.8)
    });
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({
    color: map.particleColor,
    size: mapKey === 'void_core' ? 0.4 : mapKey === 'neon_rust' ? 0.18 : 0.3,
    transparent: true,
    opacity: 0.85
  });

  const particleSystem = new THREE.Points(pGeo, pMat);
  mapDecor.add(particleSystem);
  ambientParticles.push({ system: particleSystem, velocities, count: particleCount });
}

function updateAmbientParticles(dt) {
  if (ambientParticles.length === 0) return;
  const playerPos = yawObject.position;

  ambientParticles.forEach(ap => {
    ap.system.position.x = playerPos.x;
    ap.system.position.z = playerPos.z;

    const pos = ap.system.geometry.attributes.position;
    for (let i = 0; i < ap.count; i++) {
      pos.array[i * 3] += ap.velocities[i].x * dt;
      pos.array[i * 3 + 1] += ap.velocities[i].y * dt;
      pos.array[i * 3 + 2] += ap.velocities[i].z * dt;

      if (pos.array[i * 3 + 1] < 0) pos.array[i * 3 + 1] = 32;
      if (pos.array[i * 3 + 1] > 34) pos.array[i * 3 + 1] = 0;
      if (Math.abs(pos.array[i * 3]) > 45) pos.array[i * 3] = (Math.random() - 0.5) * 90;
      if (Math.abs(pos.array[i * 3 + 2]) > 45) pos.array[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    pos.needsUpdate = true;
  });
}

function applyMapTheme() {
  const map = MAPS[selectedMap] || MAPS.neon_rust;
  scene.background.setHex(map.sky);
  scene.fog.color.setHex(map.fog);
  groundMat.color.setHex(map.ground);
  roadMat.color.setHex(selectedMap === 'neon_rust' ? 0x111622 : selectedMap === 'void_core' ? 0x150826 : selectedMap === 'jungle_temple' ? 0x273b1e : 0x3a3a3e);
  sun.color.setHex(map.sun);
  hemi.intensity = (selectedMap === 'neon_rust' || selectedMap === 'void_core' || selectedMap === 'arctic') ? .35 : .75;
  document.getElementById('mapLabel').textContent = 'ZONA: ' + map.name.toUpperCase();

  buildMapDecor();
  generateMapStructures(selectedMap);
}
