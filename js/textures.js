// =====================================================================
// TEXTURES.JS — Ruído procedural determinístico + Biblioteca de texturas PBR
// (concreto, metal, madeira, pedra, janelas, partículas, decals) geradas em canvas
// =====================================================================

// ---------------------------------------------------------------------
// Utilidades matemáticas / ruído
// ---------------------------------------------------------------------
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

function hash2i(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2i(xi, yi), b = hash2i(xi + 1, yi), c = hash2i(xi, yi + 1), d = hash2i(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Pseudo-3D (suficiente para deformar rochas e copas)
function vnoise3(x, y, z) {
  return (vnoise(x + y * 0.37, z - y * 0.61) + vnoise(z * 0.73 + 11.3, x - y * 0.29 + 5.7)) * 0.5;
}

function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x, y); n += a;
    x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5;
  }
  return s / n;
}

// Ruído periódico (para texturas que precisam repetir sem emendas)
function tnoise(x, y, p) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (q) => ((q % p) + p) % p;
  const a = hash2i(m(xi), m(yi)), b = hash2i(m(xi + 1), m(yi));
  const c = hash2i(m(xi), m(yi + 1)), d = hash2i(m(xi + 1), m(yi + 1));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function tfbm(x, y, p, oct = 4) {
  let s = 0, a = 0.5, n = 0, per = p;
  for (let i = 0; i < oct; i++) {
    s += a * tnoise(x, y, per); n += a;
    x *= 2; y *= 2; per *= 2; a *= 0.5;
  }
  return s / n;
}

// ---------------------------------------------------------------------
// Fábrica de texturas
// ---------------------------------------------------------------------
function makeCanvasTexture(size, paint, opts = {}) {
  const c = document.createElement('canvas');
  c.width = size; c.height = opts.height || size;
  const ctx = c.getContext('2d');
  paint(ctx, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (opts.srgb !== false) t.encoding = THREE.sRGBEncoding;
  return t;
}

// Pinta pixel a pixel: fn(x, y) -> [r, g, b, (a)]
function paintPixels(ctx, w, h, fn) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  let i = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = fn(x, y);
      d[i++] = clamp(c[0], 0, 255); d[i++] = clamp(c[1], 0, 255); d[i++] = clamp(c[2], 0, 255);
      d[i++] = c[3] === undefined ? 255 : clamp(c[3], 0, 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}

const TEX = {};

// --- Solo: detalhe cinza tileável (cor vem dos vertex colors) ---
TEX.groundDetail = makeCanvasTexture(512, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    const macro = tfbm(u * 6, v * 6, 6, 4);
    const mid = tfbm(u * 24, v * 24, 24, 3);
    const fine = hash2i(x, y);
    let g = 0.62 + (macro - 0.5) * 0.55 + (mid - 0.5) * 0.35 + (fine - 0.5) * 0.22;
    // Pedrinhas / folhas secas pontuais
    const peb = tnoise(u * 64, v * 64, 64);
    if (peb > 0.86) g += 0.18;
    if (peb < 0.08) g -= 0.18;
    g = clamp(g, 0.15, 1);
    const k = g * 255;
    return [k, k, k];
  });
});

// --- Concreto com painéis, manchas e fissuras ---
TEX.concrete = makeCanvasTexture(256, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    const n = tfbm(u * 5, v * 5, 5, 4);
    const fine = hash2i(x, y);
    let g = 0.55 + (n - 0.5) * 0.45 + (fine - 0.5) * 0.14;
    const stain = tfbm(u * 3 + 2, v * 8, 3, 3);
    if (stain > 0.62) g -= (stain - 0.62) * 0.9;
    return [g * 190, g * 192, g * 196];
  });
  ctx.strokeStyle = 'rgba(20,24,30,0.55)'; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.strokeStyle = 'rgba(20,24,30,0.22)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  ctx.fillStyle = 'rgba(15,18,24,0.5)';
  [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]].forEach(([px, py]) => { ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 6.3); ctx.fill(); });
});

// --- Metal escovado com painéis e rebites ---
TEX.metalPanel = makeCanvasTexture(256, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    const brushed = tnoise(u * 3, v * 96, 96) * 0.5 + tnoise(u * 3, v * 40, 40) * 0.5;
    let g = 0.5 + (brushed - 0.5) * 0.28 + (hash2i(x, y) - 0.5) * 0.06;
    const wear = tfbm(u * 6, v * 6, 6, 3);
    if (wear > 0.64) g += 0.14;
    return [g * 150, g * 158, g * 168];
  });
  ctx.strokeStyle = 'rgba(8,10,14,0.85)'; ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const px = 18 + i * ((w - 36) / 3), py = 18 + j * ((h - 36) / 3);
    if ((i === 0 || i === 3) || (j === 0 || j === 3)) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(px + 1, py + 1, 2.4, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(190,200,215,0.7)'; ctx.beginPath(); ctx.arc(px, py, 2, 0, 6.3); ctx.fill();
    }
  }
});

// --- Chapa ondulada (hangares / contêineres) ---
TEX.corrugated = makeCanvasTexture(256, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    const wave = Math.sin(u * Math.PI * 2 * 16);
    let g = 0.55 + wave * 0.28 + (tfbm(u * 4, v * 4, 4, 3) - 0.5) * 0.3 + (hash2i(x, y) - 0.5) * 0.08;
    const rust = tfbm(u * 5 + 3, v * 9, 5, 4);
    const r = rust > 0.6 ? (rust - 0.6) * 2.4 : 0;
    return [g * 170 + r * 90, g * 172 - r * 20, g * 178 - r * 70];
  });
});

// --- Tábuas de madeira ---
TEX.wood = makeCanvasTexture(256, (ctx, w, h) => {
  const planks = 6, ph = h / planks;
  for (let p = 0; p < planks; p++) {
    const tint = 0.78 + hash2i(p, 7) * 0.4;
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < w; x++) {
        const gx = x / w, gy = (p * ph + y) / h;
        const grain = tnoise(gx * 4, gy * 90, 90) * 0.6 + tnoise(gx * 12 + p * 3, gy * 14, 14) * 0.4;
        const k = (0.55 + (grain - 0.5) * 0.5) * tint;
        ctx.fillStyle = `rgb(${k * 150 | 0},${k * 100 | 0},${k * 58 | 0})`;
        ctx.fillRect(x, p * ph + y, 1, 1);
      }
    }
    ctx.fillStyle = 'rgba(15,8,2,0.75)'; ctx.fillRect(0, p * ph, w, 2);
    ctx.fillStyle = 'rgba(20,12,4,0.8)';
    [14, w - 14].forEach(nx => { ctx.beginPath(); ctx.arc(nx, p * ph + ph / 2, 1.6, 0, 6.3); ctx.fill(); });
  }
});

// --- Pedra / tijolos antigos com musgo ---
TEX.stone = makeCanvasTexture(256, (ctx, w, h) => {
  const rows = 6, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const cols = (r % 2 === 0) ? 3 : 4;
    const cw = w / cols, off = (r % 2 === 0) ? 0 : 0;
    for (let c = 0; c < cols; c++) {
      const tone = 0.75 + hash2i(c + r * 9, r) * 0.4;
      const x0 = c * cw + off, y0 = r * rh;
      for (let y = 0; y < rh; y++) for (let x = 0; x < cw; x++) {
        const gx = (x0 + x) / w, gy = (y0 + y) / h;
        const n = tfbm(gx * 8, gy * 8, 8, 4);
        const moss = tfbm(gx * 5 + 4, gy * 5, 5, 3);
        let k = (0.5 + (n - 0.5) * 0.55) * tone + (hash2i(x0 + x, y0 + y) - 0.5) * 0.08;
        let R = k * 150, G = k * 150, B = k * 138;
        if (moss > 0.58) { const m = (moss - 0.58) * 2.2; R -= m * 35; G += m * 22; B -= m * 40; }
        ctx.fillStyle = `rgb(${clamp(R, 0, 255) | 0},${clamp(G, 0, 255) | 0},${clamp(B, 0, 255) | 0})`;
        ctx.fillRect(x0 + x, y0 + y, 1, 1);
      }
      ctx.strokeStyle = 'rgba(22,24,20,0.85)'; ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 1, y0 + 1, cw - 2, rh - 2);
    }
  }
});

// --- Palha / sapê ---
TEX.thatch = makeCanvasTexture(256, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const u = x / w, v = y / h;
    const streak = tnoise(u * 80, v * 6, 80) * 0.6 + tnoise(u * 30, v * 3, 30) * 0.4;
    const k = 0.45 + streak * 0.6 + (hash2i(x, y) - 0.5) * 0.12;
    return [k * 190, k * 150, k * 78];
  });
});

// --- Telhado de cerâmica ---
TEX.roofTile = makeCanvasTexture(256, (ctx, w, h) => {
  const rows = 8, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const cols = 8, cw = w / cols;
    for (let c = 0; c < cols; c++) {
      const off = (r % 2) * cw / 2;
      const tone = 0.8 + hash2i(c, r + 20) * 0.35;
      const x0 = c * cw + off, y0 = r * rh;
      const g = ctx.createLinearGradient(0, y0, 0, y0 + rh);
      g.addColorStop(0, `rgb(${120 * tone | 0},${52 * tone | 0},${38 * tone | 0})`);
      g.addColorStop(1, `rgb(${170 * tone | 0},${82 * tone | 0},${56 * tone | 0})`);
      ctx.fillStyle = g;
      ctx.fillRect(x0, y0, cw, rh);
      if (x0 + cw > w) ctx.fillRect(x0 - w, y0, cw, rh);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x0, y0 + rh - 2, cw, 2);
      if (x0 + cw > w) ctx.fillRect(x0 - w, y0 + rh - 2, cw, 2);
    }
  }
});

// --- Janelas de edifícios: mapa difuso + mapa emissivo ---
function makeWindowTextures(litColors, litChance = 0.45) {
  const size = 256, cols = 4, rows = 4;
  const diffuse = makeCanvasTexture(size, (ctx, w, h) => {
    ctx.fillStyle = '#10151d'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1b222e'; ctx.fillRect(0, 0, w, h);
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const gx = c * cw + cw * 0.12, gy = r * rh + rh * 0.14, gw = cw * 0.76, gh = rh * 0.7;
      const g = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
      g.addColorStop(0, '#223347'); g.addColorStop(1, '#0a1119');
      ctx.fillStyle = g; ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#05080c'; ctx.lineWidth = 3; ctx.strokeRect(gx, gy, gw, gh);
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(gx, gy, gw * 0.4, gh * 0.12);
    }
  });
  const emissive = makeCanvasTexture(size, (ctx, w, h) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (hash2i(c + 5, r + 11) < litChance) {
        const col = litColors[Math.floor(hash2i(c, r + 40) * litColors.length)];
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.55 + hash2i(c + 3, r + 3) * 0.45;
        ctx.fillRect(c * cw + cw * 0.14, r * rh + rh * 0.16, cw * 0.72, rh * 0.66);
        ctx.globalAlpha = 1;
      }
    }
  });
  return { diffuse, emissive };
}

// --- Sprites e partículas ---
TEX.softDot = makeCanvasTexture(64, (ctx, w, h) => {
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}, { clamp: true });

TEX.smoke = makeCanvasTexture(128, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const dx = (x - 64) / 64, dy = (y - 64) / 64;
    const r = Math.hypot(dx, dy);
    const n = fbm(x * 0.07, y * 0.07, 4);
    const a = clamp(1 - r, 0, 1) * (0.5 + n * 0.9);
    return [255, 255, 255, clamp(a * a * 1.6, 0, 1) * 255];
  });
}, { clamp: true });

TEX.sparkStar = makeCanvasTexture(64, (ctx, w, h) => {
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,220,150,0.8)'); g.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,240,200,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(32, 2); ctx.lineTo(32, 62); ctx.moveTo(2, 32); ctx.lineTo(62, 32); ctx.stroke();
}, { clamp: true });

// Clarão de boca de cano (estrela de 6 pontas com núcleo quente)
TEX.muzzle = makeCanvasTexture(128, (ctx, w, h) => {
  ctx.translate(64, 64);
  for (let i = 0; i < 7; i++) {
    ctx.save(); ctx.rotate(i * (Math.PI / 3.5) + 0.3);
    const len = 38 + (i % 3) * 20;
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, 'rgba(255,255,230,0.95)'); g.addColorStop(0.5, 'rgba(255,170,60,0.7)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(len, 0); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
  core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(0.5, 'rgba(255,200,90,0.8)'); core.addColorStop(1, 'rgba(255,90,0,0)');
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 6.3); ctx.fill();
}, { clamp: true });

// --- Decals ---
TEX.bulletHole = makeCanvasTexture(64, (ctx, w, h) => {
  ctx.translate(32, 32);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
  g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.28, 'rgba(8,8,8,0.9)'); g.addColorStop(0.5, 'rgba(20,18,16,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 6.3); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.3, l = 10 + (i * 37 % 14);
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke();
  }
}, { clamp: true });

TEX.scorch = makeCanvasTexture(128, (ctx, w, h) => {
  paintPixels(ctx, w, h, (x, y) => {
    const dx = (x - 64) / 64, dy = (y - 64) / 64;
    const r = Math.hypot(dx, dy);
    const n = fbm(x * 0.08, y * 0.08, 4);
    const a = clamp((1 - r) * (0.6 + n), 0, 1);
    return [10, 8, 6, a * a * 230];
  });
}, { clamp: true });

TEX.bloodSplat = makeCanvasTexture(64, (ctx, w, h) => {
  ctx.translate(32, 32);
  ctx.fillStyle = 'rgba(110,6,6,0.85)';
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7, d = 4 + (i * 53 % 17), r = 3 + (i * 31 % 6);
    ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, 6.3); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, 6.3); ctx.fill();
}, { clamp: true });

// Feixe de luz vertical (baús, beacons)
TEX.beam = makeCanvasTexture(64, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const side = ctx.createLinearGradient(0, 0, w, 0);
  side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = side; ctx.fillRect(0, 0, w, h);
}, { clamp: true });

// Silhueta de skyline cyberpunk com janelas acesas (transparente)
TEX.skyline = makeCanvasTexture(1024, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const layers = [
    { color: '#04060d', hMul: 1.0, minW: 40, maxW: 80, lit: 0.12, base: 0 },
    { color: '#070b16', hMul: 0.75, minW: 30, maxW: 64, lit: 0.3, base: 0 },
    { color: '#0b1120', hMul: 0.5, minW: 24, maxW: 50, lit: 0.5, base: 0 }
  ];
  const rng = mulberry32(4242);
  layers.forEach((L, li) => {
    let x = -10;
    while (x < w) {
      const bw = L.minW + rng() * (L.maxW - L.minW);
      const bh = (60 + rng() * 150) * L.hMul;
      const top = h - bh;
      ctx.fillStyle = L.color; ctx.fillRect(x, top, bw, bh);
      if (rng() < 0.25) ctx.fillRect(x + bw * 0.25, top - 14 - rng() * 14, bw * 0.5, 16);
      if (rng() < 0.35) { // antena
        ctx.fillRect(x + bw / 2 - 1, top - 30, 2, 30);
        ctx.fillStyle = '#ff2a2a'; ctx.fillRect(x + bw / 2 - 2, top - 33, 4, 4);
        ctx.fillStyle = L.color;
      }
      for (let wy = top + 8; wy < h - 6; wy += 10) {
        for (let wx = x + 4; wx < x + bw - 6; wx += 8) {
          if (rng() < L.lit) {
            const r = rng();
            ctx.fillStyle = r < 0.45 ? 'rgba(0,240,255,0.8)' : r < 0.75 ? 'rgba(255,40,190,0.75)' : 'rgba(255,196,90,0.7)';
            ctx.fillRect(wx, wy, 3, 5);
          }
        }
      }
      if (li === 2 && rng() < 0.18) { // letreiro neon
        ctx.fillStyle = rng() < 0.5 ? 'rgba(0,240,255,0.9)' : 'rgba(255,40,190,0.9)';
        ctx.fillRect(x + 3, top + 12 + rng() * 30, bw - 6, 4);
      }
      x += bw + rng() * 6;
    }
  });
  // névoa na base
  const fog = ctx.createLinearGradient(0, h * 0.55, 0, h);
  fog.addColorStop(0, 'rgba(12,22,48,0)'); fog.addColorStop(1, 'rgba(12,22,48,0.85)');
  ctx.fillStyle = fog; ctx.fillRect(0, h * 0.55, w, h * 0.45);
}, { height: 256, srgb: true });

// Textura de grama (folhas) — usada em tufos por vertex color, não por mapa
// (mantido apenas para completude)

// Helper: material PBR com cor sRGB convertida
function pbr(hex, opts = {}) {
  const { srgbColor, ...rest } = opts;
  const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, rest));
  m.color.setHex(hex);
  if (srgbColor !== false) m.color.convertSRGBToLinear();
  return m;
}
