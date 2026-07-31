// =====================================================================
// TERRAIN.JS — TERRENO ORGÂNICO AAA COM NOISE PROCEDURAL & RELEVO
// =====================================================================

let terrainMesh = null;
let groundMat = null;
let roadMat = null;

// Função de Ruído Fractal Harmônico (Simulação de Perlin/fBm)
function noise2D(x, z) {
  const s1 = Math.sin(x * 0.035 + z * 0.025) * 4.5;
  const s2 = Math.cos(x * 0.07 - z * 0.05) * 2.2;
  const s3 = Math.sin(x * 0.15 + z * 0.12) * 0.8;
  const ridge = Math.abs(Math.sin(x * 0.015 + z * 0.015)) * 6.0;
  return s1 + s2 + s3 + ridge;
}

function getTerrainHeight(x, z) {
  // Centro plano para combate fácil
  const distFromCenter = Math.hypot(x, z);
  const centerFlatFactor = Math.smoothstep ? THREE.MathUtils.smoothstep(distFromCenter, 15, 90) : Math.min(1, Math.max(0, (distFromCenter - 15) / 75));

  const baseH = noise2D(x, z) * centerFlatFactor;

  // Bordas com montanhas de contenção
  const edgeDist = Math.max(Math.abs(x), Math.abs(z));
  let borderH = 0;
  if (edgeDist > WORLD_SIZE * 0.65) {
    const factor = (edgeDist - WORLD_SIZE * 0.65) / (WORLD_SIZE * 0.35);
    borderH = factor * factor * 28;
  }

  return baseH + borderH;
}

function makeOrganicGroundTexture(themeColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Gradiente Base Orgânico
  ctx.fillStyle = themeColor;
  ctx.fillRect(0, 0, 512, 512);

  // Textura Procedural de Raciocínio Vegetal/Rocha/Grama
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 35;
    data[i]     = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 1.1));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.9));
  }
  ctx.putImageData(imgData, 0, 0);

  // Desenhar manchas orgânicas de musgo/terra
  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const rad = 20 + Math.random() * 60;
    const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rad);
    grad.addColorStop(0, 'rgba(0,0,0,0.18)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  return texture;
}

function generateTerrainGeometry() {
  const size = WORLD_SIZE * 2;
  const segs = TERRAIN_SEGMENTS;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const posAttr = geo.attributes.position;
  terrainHeights.length = 0;

  for (let iz = 0; iz <= segs; iz++) {
    terrainHeights[iz] = [];
    for (let ix = 0; ix <= segs; ix++) {
      const idx = iz * (segs + 1) + ix;
      const vx = posAttr.getX(idx);
      const vz = posAttr.getZ(idx);
      const vy = getTerrainHeight(vx, vz);
      posAttr.setY(idx, vy);
      terrainHeights[iz][ix] = vy;
    }
  }

  geo.computeVertexNormals();

  const groundTex = makeOrganicGroundTexture('#1a241b');
  groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.88,
    metalness: 0.12,
    bumpScale: 0.15,
    envMapIntensity: 0.4
  });

  terrainMesh = new THREE.Mesh(geo, groundMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = false;
  scene.add(terrainMesh);

  // Estradas / Caminhos Táticos
  roadMat = new THREE.MeshStandardMaterial({ color: 0x111622, roughness: 0.7, metalness: 0.2 });
  createTacticalRoads();

  return geo;
}

function createTacticalRoads() {
  const roadGeo = new THREE.PlaneGeometry(8, WORLD_SIZE * 1.6, 1, 60);
  roadGeo.rotateX(-Math.PI / 2);

  const pos = roadGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    pos.setY(i, getTerrainHeight(vx, vz) + 0.05);
  }
  roadGeo.computeVertexNormals();

  const r1 = new THREE.Mesh(roadGeo, roadMat);
  r1.receiveShadow = true;
  scene.add(r1);

  const r2 = new THREE.Mesh(roadGeo, roadMat);
  r2.rotation.y = Math.PI / 2;
  r2.receiveShadow = true;
  scene.add(r2);
}

generateTerrainGeometry();
