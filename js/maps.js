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
    // --- CÉU ÁRTICO REALISTA ---
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#01050f');
    grad.addColorStop(0.4, '#030f24');
    grad.addColorStop(0.7, '#071b36');
    grad.addColorStop(1.0, '#0c2238');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Estrelas realistas
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 180; s++) {
      const sx = Math.random() * 1024;
      const sy = Math.random() * 320;
      const opacity = 0.2 + Math.random() * 0.8;
      ctx.globalAlpha = opacity;
      const sr = Math.random() * 1.5;
      ctx.fillRect(sx, sy, sr, sr);
      if (Math.random() < 0.05) { // Estrela brilhante
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.moveTo(sx - 3, sy); ctx.lineTo(sx + 3, sy);
        ctx.moveTo(sx, sy - 3); ctx.lineTo(sx, sy + 3);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;

    // Lua Crescente Realista
    ctx.beginPath();
    ctx.arc(850, 90, 24, 0, Math.PI * 2);
    const moonGrad = ctx.createRadialGradient(850, 90, 0, 850, 90, 24);
    moonGrad.addColorStop(0, 'rgba(255, 255, 230, 1)');
    moonGrad.addColorStop(0.8, 'rgba(255, 255, 200, 0.9)');
    moonGrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.fillStyle = moonGrad;
    ctx.fill();

    // Sombra da lua para criar efeito crescent
    ctx.beginPath();
    ctx.arc(840, 85, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#01050f';
    ctx.fill();

    // Cortinas da Aurora Boreal Onduladas (Bezier)
    const auroraColors = ['rgba(0, 255, 140, 0.22)', 'rgba(0, 210, 255, 0.15)', 'rgba(0, 255, 200, 0.18)'];
    auroraColors.forEach((color, idx) => {
      ctx.beginPath();
      const startY = 160 + idx * 30;
      ctx.moveTo(0, startY);
      ctx.bezierCurveTo(256, startY - 60, 512, startY + 60, 768, startY - 40);
      ctx.bezierCurveTo(896, startY - 90, 960, startY, 1024, startY - 20);
      ctx.lineTo(1024, 400);
      ctx.lineTo(0, 400);
      ctx.closePath();
      const aurGrad = ctx.createLinearGradient(0, startY - 80, 0, 400);
      aurGrad.addColorStop(0, color);
      aurGrad.addColorStop(0.3, color.replace('0.22', '0.1').replace('0.15', '0.08').replace('0.18', '0.1'));
      aurGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = aurGrad;
      ctx.fill();
    });

  } else if (mapKey === 'void_core') {
    // --- CÉU CELESTIAL QUÂNTICO REALISTA ---
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#04010a');
    grad.addColorStop(0.4, '#100522');
    grad.addColorStop(0.8, '#24083d');
    grad.addColorStop(1.0, '#100522');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Estrelas do Abismo
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 250; s++) {
      const sx = Math.random() * 1024;
      const sy = Math.random() * 400;
      ctx.globalAlpha = 0.2 + Math.random() * 0.8;
      const size = Math.random() * 1.6;
      ctx.fillRect(sx, sy, size, size);
    }
    ctx.globalAlpha = 1.0;

    // Nebulosas Gigantes Coloridas
    for (let i = 0; i < 5; i++) {
      const cx = [150, 450, 800, 300, 700][i];
      const cy = [120, 240, 150, 320, 80][i];
      const rad = [150, 260, 220, 180, 130][i];
      const nebGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      const col = i % 3 === 0 ? 'rgba(157, 0, 255, 0.45)' : i % 3 === 1 ? 'rgba(0, 240, 255, 0.28)' : 'rgba(255, 0, 128, 0.22)';
      nebGrad.addColorStop(0, col);
      nebGrad.addColorStop(0.6, col.replace('0.45', '0.15').replace('0.28', '0.08').replace('0.22', '0.06'));
      nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nebGrad;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    }

    // Anéis Celestiais Gigantes
    ctx.save();
    ctx.translate(512, 256);
    ctx.rotate(-Math.PI / 8);
    for (let r = 0; r < 4; r++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 420 + r * 14, 85 + r * 4, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180, 100, 255, ${0.12 - r * 0.02})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();

  } else if (mapKey === 'neon_rust') {
    // --- CÉU CYBERPUNK REALISTA ---
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#010309');
    grad.addColorStop(0.5, '#050a16');
    grad.addColorStop(1.0, '#0c142b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Silhuetas de Arranha-céus Cyberpunk (3 Camadas para Profundidade)
    const layers = [
      { count: 18, color: '#03050c', heightMult: 1.4, spacing: 58 }, // Fundo
      { count: 24, color: '#070a14', heightMult: 1.1, spacing: 44 }, // Médio
      { count: 32, color: '#0c1222', heightMult: 0.85, spacing: 32 }  // Frente
    ];

    layers.forEach((layer) => {
      ctx.fillStyle = layer.color;
      let curX = 0;
      for (let i = 0; i < layer.count; i++) {
        const bw = layer.spacing + Math.random() * 20;
        const bh = (80 + Math.random() * 110) * layer.heightMult;
        ctx.fillRect(curX, 512 - bh, bw, bh);

        // Janelas Neon acesas nas silhuetas frontais
        if (layer.color !== '#03050c' && Math.random() > 0.3) {
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0, 240, 255, 0.65)' : 'rgba(255, 0, 180, 0.65)';
          for (let wy = 512 - bh + 12; wy < 500; wy += 18) {
            for (let wx = curX + 4; wx < curX + bw - 6; wx += 10) {
              if (Math.random() > 0.5) ctx.fillRect(wx, wy, 3, 5);
            }
          }
          ctx.fillStyle = layer.color;
        }

        // Antenas e torres de transmissão no topo
        if (Math.random() < 0.25) {
          ctx.beginPath();
          ctx.strokeStyle = '#ff2222';
          ctx.lineWidth = 1;
          ctx.moveTo(curX + bw / 2, 512 - bh);
          ctx.lineTo(curX + bw / 2, 512 - bh - 20);
          ctx.stroke();
          // Luz vermelha no topo
          ctx.fillStyle = '#ff3333';
          ctx.fillRect(curX + bw / 2 - 1.5, 512 - bh - 21.5, 3, 3);
          ctx.fillStyle = layer.color;
        }

        curX += bw + (Math.random() * 8);
      }
    });

    // Nuvens táticas enevoadas
    ctx.fillStyle = 'rgba(10, 20, 40, 0.4)';
    for (let c = 0; c < 5; c++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 1024, 180 + Math.random() * 80, 180, 35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (mapKey === 'jungle_temple') {
    // --- CÉU TROPICAL REALISTA (GOD RAYS) ---
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1a3322');
    grad.addColorStop(0.4, '#334c38');
    grad.addColorStop(0.7, '#4c6652');
    grad.addColorStop(1.0, '#3a5441');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Grandes nuvens volumosas enevoadas
    ctx.fillStyle = 'rgba(230, 240, 230, 0.08)';
    for (let i = 0; i < 15; i++) {
      const cx = Math.random() * 1024;
      const cy = 80 + Math.random() * 120;
      const rx = 100 + Math.random() * 120;
      const ry = 40 + Math.random() * 50;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Raios de sol realistas (God Rays) projetados do topo direito
    ctx.fillStyle = 'rgba(255, 245, 200, 0.065)';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(900, 20); // Origem do Sol
      ctx.lineTo(0 + i * 160, 512);
      ctx.lineTo(120 + i * 160, 512);
      ctx.closePath();
      ctx.fill();
    }

  } else {
    // --- CÉU DO DESERTO REALISTA (PÔR DO SOL COM SOL GIGANTE) ---
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#591605'); // Crimson
    grad.addColorStop(0.35, '#a63f14'); // Sunset Orange
    grad.addColorStop(0.65, '#d97d24'); // Gold
    grad.addColorStop(0.9, '#e6b978'); // Light Sand
    grad.addColorStop(1.0, '#9e7343'); // Horizon dust
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Sol Gigante e Brilhante no Horizonte
    ctx.beginPath();
    ctx.arc(512, 380, 58, 0, Math.PI * 2);
    const sunGrad = ctx.createRadialGradient(512, 380, 0, 512, 380, 58);
    sunGrad.addColorStop(0, 'rgba(255, 255, 240, 1.0)');
    sunGrad.addColorStop(0.4, 'rgba(255, 220, 100, 0.8)');
    sunGrad.addColorStop(1.0, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fill();

    // Nuvens horizontais de poeira varridas pelo vento
    ctx.fillStyle = 'rgba(200, 110, 40, 0.16)';
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 1024, 340 + Math.random() * 60, 240, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
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

function updateReflectionMap() {
  if (typeof cubeCamera === 'undefined' || typeof renderer === 'undefined' || typeof cubeRenderTarget === 'undefined') return;

  // Ocultar malhas reflexivas temporariamente para evitar loops de feedback de textura no WebGL
  const hiddenObjects = [];
  scene.traverse(child => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      let isReflective = false;
      mats.forEach(mat => {
        if (mat.envMap === cubeRenderTarget.texture) {
          isReflective = true;
        }
      });
      if (isReflective) {
        child.visible = false;
        hiddenObjects.push(child);
      }
    }
  });

  // Atualizar a câmera de reflexão uma única vez a partir do centro da cena
  cubeCamera.position.set(0, 15, 0);
  cubeCamera.update(renderer, scene);

  // Restaurar visibilidade
  hiddenObjects.forEach(obj => obj.visible = true);
  
  if (typeof reflectiveMaterials !== 'undefined') {
    reflectiveMaterials.forEach(m => m.needsUpdate = true);
  }
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
  updateReflectionMap();
}
