// =====================================================================
// TEXTURES.JS — Biblioteca Procedural Determinística PBR de Próxima Geração
// Ruídos FBM, Voronoi/Worley, Simplex, Normal Maps Tangenciais via Sobel,
// Texturas PBR Hi-Res em Canvas Otimizado (Uint32) & FX/Decals Cinematográficos.
// =====================================================================

// ---------------------------------------------------------------------
// 1. UTILIDADES MATEMÁTICAS, PRNG & GERADORES DE RUÍDO PROCEDURAL
// ---------------------------------------------------------------------

// Gerador Pseudo-Aleatório Determinístico Mulberry32
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, a = 0, b = 1) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }

function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// Interpolação de 5º grau de Ken Perlin (C2-contínua, derivadas 1ª e 2ª nulas nas bordas)
function smootherstep(a, b, x) {
  const t = clamp((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Hash 2D baseado em inteiros (alta entropia e zero alocações)
function hash2i(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Hash 3D para variações volumétricas
function hash3i(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 314159265);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Ruído 2D Value Noise bilinear suave (100% compatível com terrain.js)
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2i(xi, yi), b = hash2i(xi + 1, yi);
  const c = hash2i(xi, yi + 1), d = hash2i(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Ruído Pseudo-3D (ideal para deformação de rochas, folhagens e estacas)
function vnoise3(x, y, z) {
  return (vnoise(x + y * 0.37, z - y * 0.61) + vnoise(z * 0.73 + 11.3, x - y * 0.29 + 5.7)) * 0.5;
}

// Fractal Brownian Motion clássico (mantém equivalência para o relevo de terrain.js)
function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x, y); n += a;
    x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5;
  }
  return s / n;
}

// Ruído periódico tileável (repete a cada período p sem emendas visíveis)
function tnoise(x, y, p) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (q) => ((q % p) + p) % p;
  const a = hash2i(m(xi), m(yi)), b = hash2i(m(xi + 1), m(yi));
  const c = hash2i(m(xi), m(yi + 1)), d = hash2i(m(xi + 1), m(yi + 1));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// FBM Periódico tileável
function tfbm(x, y, p, oct = 4) {
  let s = 0, a = 0.5, n = 0, per = p;
  for (let i = 0; i < oct; i++) {
    s += a * tnoise(x, y, per); n += a;
    x *= 2; y *= 2; per *= 2; a *= 0.5;
  }
  return s / n;
}

// Ruído Celular / Voronoi / Worley periódico (perfeito para pedregulhos, rachaduras e agregados)
function tworley(x, y, p = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const wrap = p > 0 ? (v) => ((v % p) + p) % p : (v) => v;
  let d1 = 999.0, d2 = 999.0;
  let minId = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i, cy = yi + j;
      const wx = wrap(cx), wy = wrap(cy);
      const h1 = hash2i(wx, wy);
      const h2 = hash2i(wx + 49, wy + 97);
      const px = i + h1 - xf;
      const py = j + h2 - yf;
      const dist = Math.sqrt(px * px + py * py);
      if (dist < d1) {
        d2 = d1;
        d1 = dist;
        minId = h1;
      } else if (dist < d2) {
        d2 = dist;
      }
    }
  }
  return { d1, d2, diff: d2 - d1, id: minId };
}

// Ruído Perlin Simplex 2D rápido e isotrópico (sem artefatos de eixos cartesianos)
const _SIMP_G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
const _SIMP_F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const _SIMP_GRADS = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1]
];

function simplex2D(x, y) {
  const s = (x + y) * _SIMP_F2;
  const i = Math.floor(x + s), j = Math.floor(y + s);
  const t = (i + j) * _SIMP_G2;
  const X0 = i - t, Y0 = j - t;
  const x0 = x - X0, y0 = y - Y0;

  let i1 = 0, j1 = 0;
  if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }

  const x1 = x0 - i1 + _SIMP_G2, y1 = y0 - j1 + _SIMP_G2;
  const x2 = x0 - 1.0 + 2.0 * _SIMP_G2, y2 = y0 - 1.0 + 2.0 * _SIMP_G2;

  const h0 = (hash2i(i, j) * 8) | 0;
  const h1 = (hash2i(i + i1, j + j1) * 8) | 0;
  const h2 = (hash2i(i + 1, j + 1) * 8) | 0;

  const g0 = _SIMP_GRADS[h0 % 8], g1 = _SIMP_GRADS[h1 % 8], g2 = _SIMP_GRADS[h2 % 8];

  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * (g0[0] * x0 + g0[1] * y0); }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * (g1[0] * x1 + g1[1] * y1); }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * (g2[0] * x2 + g2[1] * y2); }

  return 70.0 * (n0 + n1 + n2);
}

// ---------------------------------------------------------------------
// 2. FÁBRICA DE TEXTURAS, PIPELINE UINT32 & GERADOR DE NORMAL MAPS
// ---------------------------------------------------------------------

// Helper seguro para obter anisotropia máxima sem causar exceções
function getSafeAnisotropy() {
  if (typeof renderer !== 'undefined' && renderer && renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function') {
    return Math.min(8, renderer.capabilities.getMaxAnisotropy() || 4);
  }
  return 4;
}

// Cria textura Three.js encapsulando canvas com suporte a Normal/Bump, Mipmaps e sRGB
function makeCanvasTexture(size, paint, opts = {}) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = opts.height || size;
  const ctx = c.getContext('2d');
  paint(ctx, c.width, c.height, c);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = getSafeAnisotropy();
  if (opts.srgb !== false) t.encoding = THREE.sRGBEncoding;

  if (opts.minFilter) t.minFilter = opts.minFilter;
  if (opts.magFilter) t.magFilter = opts.magFilter;
  t.needsUpdate = true;
  t.sourceCanvas = c; // Referência mantida para derivações subsequentes (ex: Normal Map)

  // Geração automática de Normal Map complementar se solicitado
  if (opts.generateNormal) {
    t.normalMap = createNormalMap(c, opts.normalStrength || 1.8, { clamp: opts.clamp });
  }

  return t;
}

// Pintura acelerada por buffer Uint32 direto (5x a 10x mais rápida que iteração pixel a pixel comum)
function paintPixels(ctx, w, h, fn) {
  const img = ctx.createImageData(w, h);
  const buf32 = new Uint32Array(img.data.buffer);
  let idx = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = fn(x, y);
      const r = (c[0] < 0 ? 0 : (c[0] > 255 ? 255 : c[0])) | 0;
      const g = (c[1] < 0 ? 0 : (c[1] > 255 ? 255 : c[1])) | 0;
      const b = (c[2] < 0 ? 0 : (c[2] > 255 ? 255 : c[2])) | 0;
      const a = c[3] === undefined ? 255 : (c[3] < 0 ? 0 : (c[3] > 255 ? 255 : c[3])) | 0;
      buf32[idx++] = (a << 24) | (b << 16) | (g << 8) | r;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Filtro Sobel 3x3 Periódico que converte alturas/luminâncias em Normal Map Tangencial Físico
function createNormalMap(sourceCanvas, strength = 1.8, opts = {}) {
  const w = sourceCanvas.width, h = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext('2d');
  const srcData = sCtx.getImageData(0, 0, w, h).data;

  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const outImg = ctx.createImageData(w, h);
  const out32 = new Uint32Array(outImg.data.buffer);

  // Amostragem de luminância com wrap toroidal (tileable perfeito)
  const getLum = (x, y) => {
    const px = ((x % w) + w) % w;
    const py = ((y % h) + h) % h;
    const idx = (py * w + px) * 4;
    return (srcData[idx] * 0.299 + srcData[idx + 1] * 0.587 + srcData[idx + 2] * 0.114) / 255;
  };

  let ptr = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = getLum(x - 1, y - 1), t = getLum(x, y - 1), tr = getLum(x + 1, y - 1);
      const l  = getLum(x - 1, y),                            r  = getLum(x + 1, y);
      const bl = getLum(x - 1, y + 1), b = getLum(x, y + 1), br = getLum(x + 1, y + 1);

      // Convolução de Sobel
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
      nx /= len; ny /= len; nz /= len;

      const cr = clamp((nx * 0.5 + 0.5) * 255, 0, 255) | 0;
      const cg = clamp((ny * 0.5 + 0.5) * 255, 0, 255) | 0;
      const cb = clamp((nz * 0.5 + 0.5) * 255, 0, 255) | 0;

      out32[ptr++] = (255 << 24) | (cb << 16) | (cg << 8) | cr;
    }
  }
  ctx.putImageData(outImg, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = getSafeAnisotropy();
  t.encoding = THREE.LinearEncoding; // Normal Maps PRECISAM de codificação linear
  t.needsUpdate = true;
  return t;
}

// Gera mapa de rugosidade ajustado por contraste e inversão
function createRoughnessMap(sourceCanvas, minRough = 0.25, maxRough = 0.95, invert = false) {
  const w = sourceCanvas.width, h = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext('2d');
  const src = sCtx.getImageData(0, 0, w, h).data;

  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const outImg = ctx.createImageData(w, h);
  const out32 = new Uint32Array(outImg.data.buffer);

  let ptr = 0;
  for (let i = 0; i < src.length; i += 4) {
    let lum = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) / 255;
    if (invert) lum = 1 - lum;
    const rough = lerp(minRough, maxRough, lum) * 255 | 0;
    out32[ptr++] = (255 << 24) | (rough << 16) | (rough << 8) | rough;
  }
  ctx.putImageData(outImg, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = getSafeAnisotropy();
  t.encoding = THREE.LinearEncoding;
  t.needsUpdate = true;
  return t;
}

// Dicionário Central de Texturas PBR
const TEX = {};

// ---------------------------------------------------------------------
// 3. TEXTURAS DE AMBIENTE & SUPERFÍCIE (SOLO, CONCRETO, METAIS, ROCHAS)
// ---------------------------------------------------------------------

// --- Solo: Hi-Res 512x512 tileável (pedregulhos Voronoi 3D, microfissuras e grãos) ---
TEX.groundDetail = makeCanvasTexture(512, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    const macro = tfbm(u * 6, v * 6, 6, 4);
    const mid   = tfbm(u * 28, v * 28, 28, 4);
    const fine  = hash2i(x, y);

    let g = 0.60 + (macro - 0.5) * 0.42 + (mid - 0.5) * 0.28 + (fine - 0.5) * 0.16;

    // Pedregulhos orgânicos via Voronoi com iluminação direcional simulada
    const peb = tworley(u * 48, v * 48, 48);
    if (peb.d1 < 0.24) {
      const ph = Math.sqrt(Math.max(0, 1 - (peb.d1 / 0.24) * (peb.d1 / 0.24)));
      // Tom de pedra com relevo direcional
      g += ph * 0.35 * (0.8 + peb.id * 0.4);
    } else if (peb.diff < 0.04) {
      // Fissuras e rachaduras de terra seca
      g -= (0.04 - peb.diff) * 4.2;
    }

    g = clamp(g, 0.10, 1.0);
    const k = g * 255;
    return [k, k, k];
  });
});
TEX.groundDetailNormal = createNormalMap(TEX.groundDetail.sourceCanvas, 2.2);
TEX.groundDetail.normalMap = TEX.groundDetailNormal;

// --- Concreto Arquitetônico com furos de ancoragem, microfissuras e manchas de chuva ---
TEX.concrete = makeCanvasTexture(512, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    const n = tfbm(u * 6, v * 6, 6, 4);
    const fine = hash2i(x, y);
    const vor = tworley(u * 32, v * 32, 32);

    // Massa base do concreto com agregados minerais finos
    let g = 0.54 + (n - 0.5) * 0.38 + (fine - 0.5) * 0.14;

    // Pockmarks (pequenas bolhas de ar aprisionadas na cura do concreto)
    if (vor.d1 < 0.07) g -= (0.07 - vor.d1) * 2.5;

    // Manchas verticais de intempéries / escorrimento de chuva
    const rainStreak = tfbm(u * 4 + 1.2, v * 16, 4, 3);
    if (rainStreak > 0.60) g -= (rainStreak - 0.60) * 0.45;

    // Microfissuras estruturais
    const crackNoise = tfbm(u * 20, v * 20, 20, 3);
    if (Math.abs(crackNoise - 0.5) < 0.012) g -= 0.22;

    const k = clamp(g, 0.15, 0.95);
    return [k * 188, k * 192, k * 196];
  });

  // Juntas de dilatação estruturais chanfradas em 4 painéis
  ctx.strokeStyle = 'rgba(10, 14, 20, 0.75)'; ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  // Fita de sombra central e highlight chanfrado superior
  ctx.strokeStyle = 'rgba(8, 12, 18, 0.65)'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
  ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 + 2, 0); ctx.lineTo(w / 2 + 2, h);
  ctx.moveTo(0, h / 2 - 2); ctx.lineTo(w, h / 2 - 2);
  ctx.stroke();

  // Furos de barra de ancoragem (Tie-Rod Holes) com depressão e escorrimento de ferrugem
  const tieHoles = [
    [32, 32], [w / 2 - 32, 32], [w / 2 + 32, 32], [w - 32, 32],
    [32, h / 2 - 32], [w / 2 - 32, h / 2 - 32], [w / 2 + 32, h / 2 - 32], [w - 32, h / 2 - 32],
    [32, h / 2 + 32], [w / 2 - 32, h / 2 + 32], [w / 2 + 32, h / 2 + 32], [w - 32, h / 2 + 32],
    [32, h - 32], [w / 2 - 32, h - 32], [w / 2 + 32, h - 32], [w - 32, h - 32]
  ];

  tieHoles.forEach(([px, py]) => {
    // Mancha vertical de ferrugem gotejante
    const rustGrad = ctx.createLinearGradient(px, py, px, py + 45);
    rustGrad.addColorStop(0, 'rgba(95, 45, 20, 0.55)');
    rustGrad.addColorStop(0.4, 'rgba(80, 50, 30, 0.25)');
    rustGrad.addColorStop(1, 'rgba(50, 40, 30, 0)');
    ctx.fillStyle = rustGrad;
    ctx.fillRect(px - 4, py, 8, 45);

    // Cavidade cônica do orifício
    const coneGrad = ctx.createRadialGradient(px - 1, py - 1, 1, px, py, 7);
    coneGrad.addColorStop(0, 'rgba(15, 18, 22, 0.95)');
    coneGrad.addColorStop(0.7, 'rgba(40, 45, 50, 0.8)');
    coneGrad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();

    // Parafuso metálico interno central
    ctx.fillStyle = 'rgba(12, 14, 18, 0.9)';
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
  });
});
TEX.concreteNormal = createNormalMap(TEX.concrete.sourceCanvas, 1.9);
TEX.concrete.normalMap = TEX.concreteNormal;

// --- Metal Escovado Tático / Blindagem com Parafusos Allen Chanfrados ---
TEX.metalPanel = makeCanvasTexture(512, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    // Padrão anisotrópico escovado de alta densidade
    const brushed = tnoise(u * 5, v * 160, 160) * 0.65 + tnoise(u * 10, v * 80, 80) * 0.35;
    let g = 0.50 + (brushed - 0.5) * 0.32 + (hash2i(x, y) - 0.5) * 0.08;

    // Desgaste superficial e oxidação sutil
    const wear = tfbm(u * 8, v * 8, 8, 3);
    if (wear > 0.62) g += (wear - 0.62) * 0.45;

    // Arranhões finos diagonais
    const scr = Math.abs(tnoise((u + v * 0.5) * 40, (v - u * 0.5) * 40, 40) - 0.5);
    if (scr < 0.02) g += 0.15;

    const k = clamp(g, 0.1, 1.0);
    return [k * 155, k * 165, k * 178];
  });

  // Rebaixo da moldura perimetral com chanfro de luz e sombra
  ctx.strokeStyle = 'rgba(5, 7, 12, 0.92)'; ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'; ctx.lineWidth = 2;
  ctx.strokeRect(7, 7, w - 14, h - 14);

  // Parafusos Allen de cabeça cilíndrica com entalhe hexagonal
  const boltSpacing = (w - 60) / 5;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      if (i === 0 || i === 5 || j === 0 || j === 5) {
        const px = 30 + i * boltSpacing;
        const py = 30 + j * boltSpacing;

        // Sombra de rebaixo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath(); ctx.arc(px + 1.5, py + 1.5, 4.5, 0, Math.PI * 2); ctx.fill();

        // Cabeça do parafuso de aço
        const boltGrad = ctx.createRadialGradient(px - 1, py - 1, 0.5, px, py, 4);
        boltGrad.addColorStop(0, 'rgba(240, 245, 255, 0.95)');
        boltGrad.addColorStop(0.6, 'rgba(160, 175, 195, 0.85)');
        boltGrad.addColorStop(1, 'rgba(60, 70, 85, 0.9)');
        ctx.fillStyle = boltGrad;
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();

        // Encaixe Allen hexagonal escuro
        ctx.fillStyle = 'rgba(8, 10, 14, 0.95)';
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
});
TEX.metalPanelNormal = createNormalMap(TEX.metalPanel.sourceCanvas, 2.4);
TEX.metalPanel.normalMap = TEX.metalPanelNormal;

// --- Chapa Ondulada Industrial com Fixadores, Cristais de Zinco e Ferrugem ---
TEX.corrugated = makeCanvasTexture(512, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    // Perfil ondulado contínuo (16 ondas senoidais perfeitas)
    const wave = Math.sin(u * Math.PI * 2 * 16);
    const waveSpecular = Math.pow(Math.max(0, wave), 2.2) * 0.25;

    // Cristalização de galvanização spangle (zinco)
    const spangle = tworley(u * 32, v * 32, 32).d1;

    let g = 0.54 + wave * 0.32 + waveSpecular + (spangle - 0.5) * 0.14 + (tfbm(u * 5, v * 5, 5, 3) - 0.5) * 0.18;

    // Manchas e escorrimentos de ferrugem nas calhas da onda
    const rustNoise = tfbm(u * 6 + 4.2, v * 12, 6, 4);
    let rAmt = 0;
    if (rustNoise > 0.55 && wave < 0.2) {
      rAmt = (rustNoise - 0.55) * 2.8;
    }

    let R = g * 165 + rAmt * 110;
    let G = g * 172 + rAmt * 35;
    let B = g * 180 - rAmt * 65;

    return [clamp(R, 0, 255), clamp(G, 0, 255), clamp(B, 0, 255)];
  });

  // Linhas horizontais de perfis de apoio com parafusos autoperfurantes
  [128, 256, 384].forEach(purlinY => {
    ctx.strokeStyle = 'rgba(20, 25, 32, 0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, purlinY); ctx.lineTo(w, purlinY); ctx.stroke();

    for (let i = 0; i < 16; i++) {
      const sx = (i + 0.5) * (w / 16);
      // Parafuso galvanizado com arruela de vedação preta
      ctx.fillStyle = 'rgba(10, 10, 12, 0.7)';
      ctx.beginPath(); ctx.arc(sx, purlinY, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(215, 225, 235, 0.9)';
      ctx.beginPath(); ctx.arc(sx - 0.5, purlinY - 0.5, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  });
});
TEX.corrugatedNormal = createNormalMap(TEX.corrugated.sourceCanvas, 2.5);
TEX.corrugated.normalMap = TEX.corrugatedNormal;

// --- Tábuas de Madeira Rústica com Fibras Orgânicas, Nós e Pregos Forjados ---
TEX.wood = makeCanvasTexture(512, (ctx, w, h) => {
  const planks = 6;
  const ph = h / planks;

  paintPixels(ctx, w, h, (x, y) => {
    const pIdx = Math.floor(y / ph);
    const localY = y - pIdx * ph;
    const u = x / w, v = y / h;

    // Tom individual de cada tábua (variação realista de lote)
    const plankTint = 0.80 + hash2i(pIdx, 19) * 0.40;

    // Padrão de anéis de crescimento e nós orgânicos
    const knotX = hash2i(pIdx * 7, 3) * w;
    const knotDist = Math.hypot(x - knotX, (localY - ph / 2) * 2.2);
    const knotRings = Math.sin(knotDist * 0.12) * 0.25;

    // Fibras contínuas longitudinais com micro-ruído
    const grain1 = tnoise(u * 5, v * 140, 140);
    const grain2 = tnoise(u * 16, v * 30 + pIdx * 4, 30);
    const grain = grain1 * 0.65 + grain2 * 0.35 + knotRings;

    let k = (0.50 + (grain - 0.5) * 0.45) * plankTint;

    // Escurecimento de chanfro próximo às bordas das tábuas
    if (localY < 3 || localY > ph - 4) k *= 0.55;

    let R = k * 165;
    let G = k * 108;
    let B = k * 62;

    return [clamp(R, 0, 255), clamp(G, 0, 255), clamp(B, 0, 255)];
  });

  // Friso escuro de separação entre tábuas e pregos forjados quadrados
  for (let p = 0; p < planks; p++) {
    const py = p * ph;
    ctx.fillStyle = 'rgba(12, 7, 2, 0.88)';
    ctx.fillRect(0, py, w, 2.5);

    // Destaque de luz na borda inferior do chanfro
    ctx.fillStyle = 'rgba(255, 230, 190, 0.12)';
    ctx.fillRect(0, py + 2.5, w, 1);

    // Dois pregos quadrados de ferro batido por tábua
    [24, w - 24].forEach(nx => {
      const ny = py + ph / 2;
      // Mancha de oxidação escura ao redor do prego
      ctx.fillStyle = 'rgba(25, 15, 6, 0.6)';
      ctx.beginPath(); ctx.arc(nx, ny, 4.5, 0, Math.PI * 2); ctx.fill();

      // Cabeça quadrada do prego
      ctx.fillStyle = 'rgba(20, 22, 26, 0.95)';
      ctx.fillRect(nx - 2.5, ny - 2.5, 5, 5);

      // Ponto de brilho metálico
      ctx.fillStyle = 'rgba(180, 190, 205, 0.6)';
      ctx.fillRect(nx - 1.5, ny - 1.5, 2, 2);
    });
  }
});
TEX.woodNormal = createNormalMap(TEX.wood.sourceCanvas, 2.2);
TEX.wood.normalMap = TEX.woodNormal;

// --- Alvenaria de Pedra Antiga com Argamassa Profunda, Desgaste e Musgo ---
TEX.stone = makeCanvasTexture(512, (ctx, w, h) => {
  const rows = 6;
  const rh = h / rows;

  paintPixels(ctx, w, h, (x, y) => {
    const r = Math.floor(y / rh);
    const cols = (r % 2 === 0) ? 3 : 4;
    const cw = w / cols;
    const c = Math.floor(x / cw);

    const localX = x - c * cw;
    const localY = y - r * rh;

    // Variação mineral por bloco
    const stoneTone = 0.78 + hash2i(c + r * 13, r + 5) * 0.42;

    const u = x / w, v = y / h;
    const rockFbm = tfbm(u * 12, v * 12, 12, 4);
    const fine = hash2i(x, y);

    let k = (0.52 + (rockFbm - 0.5) * 0.48) * stoneTone + (fine - 0.5) * 0.08;

    // Distância da borda do bloco (rebaixo para a argamassa)
    const edgeDistX = Math.min(localX, cw - localX);
    const edgeDistY = Math.min(localY, rh - localY);
    const edgeDist = Math.min(edgeDistX, edgeDistY);

    if (edgeDist < 5) {
      // Argamassa rústica granular escura
      k = 0.28 + (fine - 0.5) * 0.15;
    } else if (edgeDist < 9) {
      // Chanfro arredondado na quina da pedra
      k *= 0.65;
    }

    // Vegetação de musgo e líquen subindo pelas juntas
    const mossNoise = tfbm(u * 8 + 3, v * 8, 8, 3);
    let R = k * 155, G = k * 158, B = k * 145;

    if (mossNoise > 0.54 && edgeDist < 20) {
      const mAmt = (mossNoise - 0.54) * 2.6;
      R -= mAmt * 45;
      G += mAmt * 35;
      B -= mAmt * 50;
    }

    return [clamp(R, 0, 255), clamp(G, 0, 255), clamp(B, 0, 255)];
  });
});
TEX.stoneNormal = createNormalMap(TEX.stone.sourceCanvas, 2.4);
TEX.stone.normalMap = TEX.stoneNormal;

// --- Palha / Sapê / Fibras de Folhagem com Densidade Orgânica ---
TEX.thatch = makeCanvasTexture(512, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    // Camadas sobrepostas de fibras inclinadas
    const f1 = tnoise(u * 120, v * 8, 120) * 0.6;
    const f2 = tnoise((u + v * 0.15) * 60, v * 16, 60) * 0.4;
    const streak = f1 + f2;

    const layerWave = Math.sin(v * Math.PI * 2 * 6) * 0.18;
    const k = 0.45 + streak * 0.55 + layerWave + (hash2i(x, y) - 0.5) * 0.12;

    const R = k * 195;
    const G = k * 152;
    const B = k * 76;
    return [clamp(R, 0, 255), clamp(G, 0, 255), clamp(B, 0, 255)];
  });
});

// --- Telhado de Cerâmica Colonial / Telhas Espanholas 3D ---
TEX.roofTile = makeCanvasTexture(512, (ctx, w, h) => {
  const rows = 8, rh = h / rows;
  const cols = 8, cw = w / cols;

  paintPixels(ctx, w, h, (x, y) => {
    const r = Math.floor(y / rh);
    const rowOffset = (r % 2) * (cw / 2);
    const adjustedX = ((x - rowOffset) % w + w) % w;
    const c = Math.floor(adjustedX / cw);
    const localX = adjustedX - c * cw;
    const localY = y - r * rh;

    // Perfil cilíndrico curvo de telha colonial (convexo)
    const arch = Math.sin((localX / cw) * Math.PI);
    const tileTone = 0.82 + hash2i(c + 12, r + 30) * 0.35;

    // Gradiente vertical de sobreposição de telha
    const overlap = localY / rh;
    let k = (0.50 + arch * 0.45 + overlap * 0.25) * tileTone;

    // Sombra do beiral da telha superior
    if (localY < 4) k *= 0.45;
    // Borda inferior chanfrada da telha
    if (localY > rh - 3) k *= 0.70;

    const R = k * 175;
    const G = k * 80;
    const B = k * 52;
    return [clamp(R, 0, 255), clamp(G, 0, 255), clamp(B, 0, 255)];
  });
});
TEX.roofTileNormal = createNormalMap(TEX.roofTile.sourceCanvas, 2.3);
TEX.roofTile.normalMap = TEX.roofTileNormal;

// --- Janelas de Edifícios Táticas (Fachada Cortina com Iluminação e Emissive Map) ---
function makeWindowTextures(litColors, litChance = 0.45) {
  const size = 512, cols = 4, rows = 4;
  const cw = size / cols, rh = size / rows;

  const diffuse = makeCanvasTexture(size, (ctx, w, h) => {
    // Base de alumínio anodizado escuro para o caixilho
    ctx.fillStyle = '#0f141c'; ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gx = c * cw + cw * 0.08;
        const gy = r * rh + rh * 0.10;
        const gw = cw * 0.84;
        const gh = rh * 0.80;

        // Vidro reflexivo com gradiente de céu / Fresnel
        const g = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
        g.addColorStop(0, '#22384e');
        g.addColorStop(0.5, '#132130');
        g.addColorStop(1, '#080d14');
        ctx.fillStyle = g;
        ctx.fillRect(gx, gy, gw, gh);

        // Caixilho de metal chanfrado ao redor do vidro
        ctx.strokeStyle = '#070a0e'; ctx.lineWidth = 3;
        ctx.strokeRect(gx, gy, gw, gh);

        // Reflexo de luz diagonal no vidro
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + gw * 0.4, gy);
        ctx.lineTo(gx, gy + gh * 0.5);
        ctx.closePath();
        ctx.fill();

        // Persianas horizontais sutis no interior
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        for (let by = gy + 6; by < gy + gh - 4; by += 7) {
          ctx.fillRect(gx + 2, by, gw - 4, 1.5);
        }
      }
    }
  });

  const emissive = makeCanvasTexture(size, (ctx, w, h) => {
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (hash2i(c + 7, r + 13) < litChance) {
          const col = litColors[Math.floor(hash2i(c, r + 42) * litColors.length)];
          const gx = c * cw + cw * 0.10;
          const gy = r * rh + rh * 0.12;
          const gw = cw * 0.80;
          const gh = rh * 0.76;

          // Brilho interno suave com queda de intensidade (luz no forro)
          const grad = ctx.createRadialGradient(gx + gw / 2, gy + gh * 0.35, 2, gx + gw / 2, gy + gh / 2, gw * 0.6);
          grad.addColorStop(0, col);
          grad.addColorStop(1, 'rgba(0,0,0,0.85)');

          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.75 + hash2i(c + 2, r + 8) * 0.25;
          ctx.fillRect(gx, gy, gw, gh);

          // Silhueta de persiana bloqueando parcialmente a luz emitida
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          for (let by = gy + 8; by < gy + gh - 4; by += 8) {
            ctx.fillRect(gx, by, gw, 2);
          }
          ctx.globalAlpha = 1.0;
        }
      }
    }
  });

  return { diffuse, emissive };
}

// ---------------------------------------------------------------------
// 4. SPRITES, PARTÍCULAS CINEMATOGRÁFICAS & DECALS TÁTICOS
// ---------------------------------------------------------------------

// Partícula de luz suave (Glow / Chamas / Beacons)
TEX.softDot = makeCanvasTexture(128, (ctx, w, h) => {
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
  g.addColorStop(0.55, 'rgba(255, 255, 255, 0.35)');
  g.addColorStop(0.85, 'rgba(255, 255, 255, 0.08)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}, { clamp: true });

// Fumaça volumétrica com turbulência fractal FBM
TEX.smoke = makeCanvasTexture(256, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const dx = (x - 128) / 128, dy = (y - 128) / 128;
    const r = Math.hypot(dx, dy);
    const n = fbm(x * 0.035, y * 0.035, 4);
    const vor = tworley(x * 0.05, y * 0.05).d1;

    // Combina FBM e Voronoi para aglomerados de fumaça fofos
    const a = clamp(1.0 - r, 0, 1) * (0.35 + n * 0.75 + vor * 0.25);
    const alpha = clamp(a * a * 1.8, 0, 1) * 255;
    return [255, 255, 255, alpha];
  });
}, { clamp: true });

// Centelha em estrela anamórfica de 8 pontas
TEX.sparkStar = makeCanvasTexture(128, (ctx, w, h) => {
  ctx.translate(64, 64);

  // Halo esférico central
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.2, 'rgba(255, 230, 160, 0.9)');
  g.addColorStop(0.5, 'rgba(255, 120, 30, 0.35)');
  g.addColorStop(1, 'rgba(255, 60, 0, 0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();

  // Feixes de difração ótica principais
  ctx.strokeStyle = 'rgba(255, 255, 240, 0.95)'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -60); ctx.lineTo(0, 60);
  ctx.moveTo(-60, 0); ctx.lineTo(60, 0);
  ctx.stroke();

  // Feixes secundários diagonais menores
  ctx.strokeStyle = 'rgba(255, 200, 100, 0.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-35, -35); ctx.lineTo(35, 35);
  ctx.moveTo(35, -35); ctx.lineTo(-35, 35);
  ctx.stroke();
}, { clamp: true });

// Clarão de Boca de Cano (Muzzle Flash) AAA com Mach Diamonds e Incandescência
TEX.muzzle = makeCanvasTexture(256, (ctx, w, h) => {
  ctx.translate(128, 128);

  // 8 pontas pontiagudas de plasma em expansão
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate(i * (Math.PI / 4) + 0.2);
    const len = 70 + (i % 2) * 45;
    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.3, 'rgba(255, 210, 80, 0.85)');
    grad.addColorStop(0.7, 'rgba(255, 80, 10, 0.4)');
    grad.addColorStop(1, 'rgba(220, 20, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Núcleo esférico branco-incandescente
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 48);
  core.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  core.addColorStop(0.35, 'rgba(255, 245, 180, 0.9)');
  core.addColorStop(0.7, 'rgba(255, 150, 40, 0.55)');
  core.addColorStop(1, 'rgba(255, 50, 0, 0)');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.fill();
}, { clamp: true });

// Marca de Impacto Balístico com cratera, metal pulverizado e rachaduras radiais
TEX.bulletHole = makeCanvasTexture(128, (ctx, w, h) => {
  ctx.translate(64, 64);

  // Halo externo de pólvora e fuligem
  const soot = ctx.createRadialGradient(0, 0, 0, 0, 0, 58);
  soot.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
  soot.addColorStop(0.35, 'rgba(25, 20, 18, 0.8)');
  soot.addColorStop(0.65, 'rgba(45, 40, 35, 0.35)');
  soot.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = soot;
  ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.fill();

  // Núcleo de chumbo penetrante esmagado
  const core = ctx.createRadialGradient(-3, -3, 1, 0, 0, 16);
  core.addColorStop(0, 'rgba(10, 10, 10, 1)');
  core.addColorStop(0.7, 'rgba(4, 4, 4, 0.95)');
  core.addColorStop(1, 'rgba(180, 190, 205, 0.4)');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();

  // Rachaduras quebradiças irradiando da perfuração
  ctx.strokeStyle = 'rgba(5, 5, 5, 0.85)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 11; i++) {
    const a = i * (Math.PI * 2 / 11) + (hash2i(i, 2) - 0.5) * 0.4;
    const len = 22 + hash2i(i, 7) * 32;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
    // Ramificação em zigzag
    const midX = Math.cos(a + 0.1) * (len * 0.5);
    const midY = Math.sin(a + 0.1) * (len * 0.5);
    ctx.lineTo(midX, midY);
    ctx.lineTo(Math.cos(a - 0.05) * len, Math.sin(a - 0.05) * len);
    ctx.stroke();
  }
}, { clamp: true });

// Marca de Explosão / Queimadura Térmica
TEX.scorch = makeCanvasTexture(256, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const dx = (x - 128) / 128, dy = (y - 128) / 128;
    const r = Math.hypot(dx, dy);
    const n = fbm(x * 0.045, y * 0.045, 4);

    // Queda radial com bordas turbulentas de respingo
    const a = clamp((1.0 - r) * (0.5 + n * 0.9), 0, 1);
    const alpha = a * a * 240;
    return [12, 10, 8, alpha];
  });
}, { clamp: true });

// Splatter de Sangue Arterial Viscoso com Gotículas Periféricas
TEX.bloodSplat = makeCanvasTexture(128, (ctx, w, h) => {
  ctx.translate(64, 64);
  ctx.fillStyle = 'rgba(125, 6, 6, 0.92)';

  // Poça central orgânica
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += 0.3) {
    const rad = 14 + (hash2i(Math.floor(a * 10), 5) - 0.5) * 10;
    const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
    if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Gotas de alta velocidade espalhadas radialmente
  for (let i = 0; i < 16; i++) {
    const a = i * 0.42 + hash2i(i, 3);
    const d = 16 + hash2i(i, 9) * 40;
    const r = 2.0 + hash2i(i, 11) * 3.5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brilho especular central (aspecto líquido e brilhante)
  ctx.fillStyle = 'rgba(255, 120, 120, 0.35)';
  ctx.beginPath();
  ctx.ellipse(-3, -3, 6, 3, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
}, { clamp: true });

// Feixe de Luz Tática / Coluna de Energia Vertical (Air Drops, Beacons)
TEX.beam = makeCanvasTexture(128, (ctx, w, h) => {
  // Gradiente vertical de desvanecimento
  const g = ctx.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  g.addColorStop(0.3, 'rgba(255, 255, 255, 0.65)');
  g.addColorStop(0.8, 'rgba(255, 255, 255, 0.15)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Decaimento Gaussiano horizontal nas bordas da coluna
  const side = ctx.createLinearGradient(0, 0, w, 0);
  side.addColorStop(0, 'rgba(0, 0, 0, 1)');
  side.addColorStop(0.2, 'rgba(0, 0, 0, 0.6)');
  side.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  side.addColorStop(0.8, 'rgba(0, 0, 0, 0.6)');
  side.addColorStop(1, 'rgba(0, 0, 0, 1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, w, h);
}, { height: 256, clamp: true });

// Skyline Cyberpunk Panorâmico Hi-Res (2048x512) com 5 Camadas de Profundidade e Neons
TEX.skyline = makeCanvasTexture(2048, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);

  const layers = [
    { color: '#03050c', hMul: 1.15, minW: 70, maxW: 140, lit: 0.15, beacon: 0.45 },
    { color: '#050916', hMul: 0.90, minW: 55, maxW: 105, lit: 0.28, beacon: 0.35 },
    { color: '#091024', hMul: 0.70, minW: 40, maxW: 80,  lit: 0.45, beacon: 0.25 },
    { color: '#0f1c3d', hMul: 0.45, minW: 30, maxW: 65,  lit: 0.60, beacon: 0.15 }
  ];

  const rng = mulberry32(8888);

  layers.forEach((L, li) => {
    let x = -20;
    while (x < w) {
      const bw = L.minW + rng() * (L.maxW - L.minW);
      const bh = (90 + rng() * 220) * L.hMul;
      const top = h - bh;

      // Corpo principal do arranha-céu
      ctx.fillStyle = L.color;
      ctx.fillRect(x, top, bw, bh);

      // Torre escalonada / coroamento arquitetônico
      if (rng() < 0.35) {
        ctx.fillRect(x + bw * 0.2, top - 24, bw * 0.6, 26);
      }

      // Antena de comunicação com luz de navegação aérea piscante
      if (rng() < L.beacon) {
        ctx.fillRect(x + bw / 2 - 1.5, top - 45, 3, 45);
        ctx.fillStyle = '#ff2222';
        ctx.beginPath();
        ctx.arc(x + bw / 2, top - 47, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = L.color;
      }

      // Janelas acesas proceduralmente em grade modular
      const winW = 3.5, winH = 6, winGapX = 8, winGapY = 12;
      for (let wy = top + 14; wy < h - 10; wy += winGapY) {
        for (let wx = x + 6; wx < x + bw - 6; wx += winGapX) {
          if (rng() < L.lit) {
            const r = rng();
            ctx.fillStyle = r < 0.40 ? 'rgba(0, 240, 255, 0.85)' :
                            r < 0.75 ? 'rgba(255, 45, 190, 0.80)' :
                            r < 0.90 ? 'rgba(255, 200, 80, 0.85)' :
                                       'rgba(255, 255, 255, 0.90)';
            ctx.fillRect(wx, wy, winW, winH);
          }
        }
      }

      // Painéis e letreiros holográficos em neon (camadas mais próximas)
      if (li >= 2 && rng() < 0.30) {
        const neonCol = rng() < 0.5 ? '#00f0ff' : '#ff2da0';
        ctx.fillStyle = neonCol;
        ctx.fillRect(x + 4, top + 20 + rng() * 40, bw - 8, 5);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(x + 6, top + 21 + rng() * 40, bw - 12, 2);
      }

      x += bw + 2 + rng() * 6;
    }
  });

  // Névoa volumétrica e dispersão de luz de neon na linha do horizonte inferior
  const fog = ctx.createLinearGradient(0, h * 0.45, 0, h);
  fog.addColorStop(0, 'rgba(8, 14, 30, 0)');
  fog.addColorStop(0.65, 'rgba(12, 24, 52, 0.65)');
  fog.addColorStop(1, 'rgba(15, 30, 65, 0.95)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, h * 0.45, w, h * 0.55);
}, { height: 512, srgb: true });

// ---------------------------------------------------------------------
// 5. NOVAS TEXTURAS TÁTICAS & MILITARES DE ALTA QUALIDADE
// ---------------------------------------------------------------------

// --- Faixas de Alerta Industrial / Segurança (Amarelo e Preto 45°) ---
TEX.hazardStripes = makeCanvasTexture(256, (ctx, w, h) => {
  const stripeWidth = 32;
  ctx.fillStyle = '#e5a500'; // Amarelo industrial
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#141416'; // Preto carvão desgastado
  for (let i = -w; i < w * 2; i += stripeWidth * 2) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + stripeWidth, 0);
    ctx.lineTo(i + stripeWidth + h, h);
    ctx.lineTo(i + h, h);
    ctx.closePath();
    ctx.fill();
  }

  // Desgaste, poeira e arranhões industriais
  paintPixels(ctx, w, h, (x, y) => {
    const sCtx = ctx.getImageData(x, y, 1, 1).data;
    const grime = tfbm(x * 0.05, y * 0.05, 12, 3);
    const noise = hash2i(x, y);
    const factor = 0.85 + (grime - 0.5) * 0.35 + (noise - 0.5) * 0.10;
    return [sCtx[0] * factor, sCtx[1] * factor, sCtx[2] * factor];
  });
});

// --- Fibra de Carbono 2x2 Twill Weave ---
TEX.carbonFiber = makeCanvasTexture(256, (ctx, w, h) => {
  const cellSize = 16;
  paintPixels(ctx, w, h, (x, y) => {
    const cx = Math.floor(x / cellSize) % 2;
    const cy = Math.floor(y / cellSize) % 2;
    const isPrimary = (cx ^ cy) === 0;

    const lx = (x % cellSize) / cellSize;
    const ly = (y % cellSize) / cellSize;

    // Fibras microscópicas paralelas com reflexão cruzada
    const fiber = isPrimary ? Math.sin(lx * Math.PI * 4) : Math.sin(ly * Math.PI * 4);
    let g = 0.16 + fiber * 0.08 + (hash2i(x, y) - 0.5) * 0.03;

    return [g * 255, g * 255, g * 265];
  });
});

// --- Camuflagem Militar Digital Tática ---
TEX.camo = makeCanvasTexture(512, (ctx, w, h) => {
  const blockSize = 16;
  const colors = [
    [48, 56, 42],   // Verde oliva escuro
    [84, 96, 68],   // Verde floresta
    [125, 115, 88], // Cáqui / Areia
    [32, 34, 30]    // Cinza carvão
  ];

  paintPixels(ctx, w, h, (x, y) => {
    const bx = Math.floor(x / blockSize);
    const by = Math.floor(y / blockSize);
    const n = tfbm(bx * 0.2, by * 0.2, 16, 3);
    const colIdx = Math.floor(clamp(n, 0, 0.999) * colors.length);
    const c = colors[colIdx];
    const fine = (hash2i(x, y) - 0.5) * 12;
    return [c[0] + fine, c[1] + fine, c[2] + fine];
  });
});

// --- Piso em Grelha Metálica / Diamond Plate antiderrapante ---
TEX.metalGrate = makeCanvasTexture(256, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    const cell = tworley(u * 16, v * 16, 16);
    let g = 0.45 + (1 - cell.d1) * 0.40;
    if (cell.diff < 0.1) g = 0.15; // Ranhuras de escoamento
    const k = clamp(g, 0.1, 1.0) * 255;
    return [k * 0.85, k * 0.90, k * 0.95];
  });
});

// --- Parede de Tijolo Vermelho Envelhecido com Rejunte ---
TEX.brickWall = makeCanvasTexture(512, (ctx, w, h) => {
  const rows = 16, rh = h / rows;
  paintPixels(ctx, w, h, (x, y) => {
    const r = Math.floor(y / rh);
    const cols = 8, cw = w / cols;
    const offset = (r % 2) * (cw / 2);
    const adjX = ((x - offset) % w + w) % w;
    const c = Math.floor(adjX / cw);

    const lx = adjX - c * cw;
    const ly = y - r * rh;

    // Argamassa nas bordas do tijolo
    if (lx < 4 || ly < 4) {
      const mortarG = 0.42 + (hash2i(x, y) - 0.5) * 0.15;
      return [mortarG * 200, mortarG * 195, mortarG * 180];
    }

    const brickTone = 0.85 + hash2i(c, r * 17) * 0.30;
    const grain = tfbm(x * 0.08, y * 0.08, 16, 3);
    const k = (0.55 + (grain - 0.5) * 0.45) * brickTone;

    return [k * 180, k * 65, k * 45];
  });
});
TEX.brickWallNormal = createNormalMap(TEX.brickWall.sourceCanvas, 2.5);
TEX.brickWall.normalMap = TEX.brickWallNormal;

// --- Asfalto de Rodovia com Agregados e Piche ---
TEX.asphalt = makeCanvasTexture(512, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    const base = tfbm(u * 32, v * 32, 32, 4);
    const grain = hash2i(x, y);
    const agg = tworley(u * 64, v * 64, 64);

    let g = 0.22 + (base - 0.5) * 0.12 + (grain - 0.5) * 0.08;
    if (agg.d1 < 0.15) g += (0.15 - agg.d1) * 0.6; // Brita clara incrustada

    const k = clamp(g, 0.05, 0.8) * 255;
    return [k, k * 1.02, k * 1.05];
  });
});

// --- Placa de Circuito Eletrônico Cyberpunk ---
TEX.circuitBoard = makeCanvasTexture(512, (ctx, w, h) => {
  ctx.fillStyle = '#0a161c'; ctx.fillRect(0, 0, w, h);

  // Trilhas de barramento em ouro e ciano
  ctx.strokeStyle = '#cda250'; ctx.lineWidth = 2.5;
  for (let i = 0; i < 20; i++) {
    const sy = 25 * i;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(w * 0.3, sy);
    ctx.lineTo(w * 0.45, sy + 30);
    ctx.lineTo(w, sy + 30);
    ctx.stroke();
  }

  // Pads de solda circulares
  ctx.fillStyle = '#00f0ff';
  for (let i = 0; i < 30; i++) {
    const px = (hash2i(i, 4) * w) | 0;
    const py = (hash2i(i, 9) * h) | 0;
    ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
  }
});

// --- Cáusticas de Água / Luz Subaquática ---
TEX.waterCaustic = makeCanvasTexture(256, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    const c1 = tworley(u * 12, v * 12, 12).d1;
    const c2 = tworley((u + 0.3) * 12, (v + 0.3) * 12, 12).d1;
    const intensity = Math.pow(c1 * c2, 0.7) * 2.2;
    const k = clamp(intensity, 0, 1) * 255;
    return [k * 0.7, k * 0.9, k];
  });
});

// --- Ondulações de Dunas de Areia do Deserto ---
TEX.sandRipples = makeCanvasTexture(512, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    const wave = Math.sin(u * Math.PI * 2 * 24 + tfbm(u * 4, v * 4, 4, 2) * 4);
    const k = 0.65 + wave * 0.20 + (hash2i(x, y) - 0.5) * 0.08;
    return [k * 215, k * 175, k * 115];
  });
});

// --- Retículo / Ponto Tático HUD ---
TEX.crosshairDot = makeCanvasTexture(64, (ctx, w, h) => {
  ctx.translate(32, 32);
  ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#00f0ff';
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
}, { clamp: true });

// ---------------------------------------------------------------------
// 6. HELPERS PBR INTEGRADOS & COMPATIBILIDADE DE MATERIAIS
// ---------------------------------------------------------------------

// Helper para obter mapa de normais correspondente a uma textura
TEX.getNormal = function (key) {
  if (TEX[key] && TEX[key].normalMap) return TEX[key].normalMap;
  if (TEX[key + 'Normal']) return TEX[key + 'Normal'];
  return null;
};

// Helper: material PBR com cor sRGB convertida e vinculação automática de Normal Maps
function pbr(hex, opts = {}) {
  const { srgbColor, ...rest } = opts;
  const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, rest));
  m.color.setHex(hex);
  if (srgbColor !== false) m.color.convertSRGBToLinear();

  // Acoplamento inteligente de Normal Map se o map fornecido tiver um associado
  if (m.map && m.map.normalMap && !m.normalMap) {
    m.normalMap = m.map.normalMap;
    m.normalScale.set(1.0, 1.0);
  }

  return m;
}

// Cria material PBR de padrão ouro com todos os mapas preenchidos
function createPBRMaterial(opts = {}) {
  const {
    color = 0xffffff,
    map = null,
    normalMap = null,
    roughness = 0.85,
    metalness = 0.0,
    bumpScale = 1.0,
    ...rest
  } = opts;

  const matConfig = Object.assign({ roughness, metalness }, rest);
  if (map) matConfig.map = map;

  const resolvedNormal = normalMap || (map && map.normalMap ? map.normalMap : null);
  if (resolvedNormal) {
    matConfig.normalMap = resolvedNormal;
    matConfig.normalScale = new THREE.Vector2(1.0, 1.0);
  } else if (map) {
    matConfig.bumpMap = map;
    matConfig.bumpScale = bumpScale;
  }

  return pbr(color, matConfig);
}
