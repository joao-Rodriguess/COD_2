// =====================================================================
// NATURE.JS — VEGETAÇÃO, ROCHAS, PROPS E DECORAÇÃO PROCEDURAL POR BIOMA
// Geometria mesclada por chunk (poucos draw-calls), vertex colors, vento
// por shader, grama instanciada, colisão por proxies invisíveis.
// =====================================================================

// ---------------------------------------------------------------------
// Ferramentas de cor e matrizes
// ---------------------------------------------------------------------
const _linCache = new Map();
function lin(hex) {
  let c = _linCache.get(hex);
  if (!c) { c = new THREE.Color(hex).convertSRGBToLinear(); _linCache.set(hex, c); }
  return c;
}
const _cf = new THREE.Color();
function cmix(a, b, t) { return _cf.copy(lin(a)).lerp(lin(b), clamp(t)); }

const _mq = new THREE.Quaternion(), _mq2 = new THREE.Quaternion(), _me = new THREE.Euler();
const _mp = new THREE.Vector3(), _ms = new THREE.Vector3(1, 1, 1);
const _AX_Z = new THREE.Vector3(0, 0, 1);
function mat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _me.set(rx, ry, rz); _mq.setFromEuler(_me);
  _mp.set(x, y, z); _ms.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_mp, _mq, _ms);
}
// yaw + inclinação lateral (útil para galhos, raízes e cristais)
function mat4q(x, y, z, yaw, tilt, sx = 1, sy = sx, sz = sx) {
  _me.set(0, yaw, 0); _mq.setFromEuler(_me);
  _mq2.setFromAxisAngle(_AX_Z, tilt); _mq.multiply(_mq2);
  _mp.set(x, y, z); _ms.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_mp, _mq, _ms);
}

// ---------------------------------------------------------------------
// GeoBatch — mescla geometrias com vertex colors + atributo de balanço (vento)
// ---------------------------------------------------------------------
const _gv = new THREE.Vector3(), _gn = new THREE.Vector3(), _gm3 = new THREE.Matrix3();

class GeoBatch {
  constructor() { this.p = []; this.n = []; this.c = []; this.s = []; }

  // o: { c1, c2, vary, flat, disp(x,y,z)->[dx,dy,dz], colorFn(...)->Color, sway }
  add(geo, m4, o = {}) {
    let g = geo;
    const pos0 = g.attributes.position;
    if (o.disp) {
      const a = pos0.array;
      for (let i = 0; i < pos0.count; i++) {
        const d = o.disp(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);
        a[i * 3] += d[0]; a[i * 3 + 1] += d[1]; a[i * 3 + 2] += d[2];
      }
      pos0.needsUpdate = true;
    }
    if (o.flat && g.index) g = g.toNonIndexed();
    if (o.disp || o.flat) g.computeVertexNormals();
    if (g.index) g = g.toNonIndexed();

    g.computeBoundingBox();
    const y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y, span = Math.max(1e-4, y1 - y0);
    const P = g.attributes.position.array, N = g.attributes.normal.array;
    const count = g.attributes.position.count;
    _gm3.getNormalMatrix(m4);
    const c1 = o.c1 !== undefined ? lin(o.c1) : null;
    const c2 = o.c2 !== undefined ? lin(o.c2) : c1;
    const vary = o.vary || 0;

    for (let i = 0; i < count; i++) {
      const lx = P[i * 3], ly = P[i * 3 + 1], lz = P[i * 3 + 2];
      _gv.set(lx, ly, lz).applyMatrix4(m4);
      _gn.set(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]).applyMatrix3(_gm3).normalize();
      this.p.push(_gv.x, _gv.y, _gv.z);
      this.n.push(_gn.x, _gn.y, _gn.z);

      const t = (ly - y0) / span;
      let col;
      if (o.colorFn) col = o.colorFn(_gv.x, _gv.y, _gv.z, _gn.x, _gn.y, _gn.z, ly, t);
      else { _cf.copy(c1).lerp(c2, t); col = _cf; }
      let k = 1;
      if (vary) k += (vnoise(_gv.x * 0.9 + _gv.y * 0.4, _gv.z * 0.9 - _gv.y * 0.3) - 0.5) * 2 * vary;
      this.c.push(col.r * k, col.g * k, col.b * k);
      this.s.push(o.sway ? o.sway * (0.25 + 0.75 * t) : 0);
    }
  }

  flush(mat) {
    if (!this.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.s, 1));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
}

// ---------------------------------------------------------------------
// Materiais de natureza (com vento por shader)
// ---------------------------------------------------------------------
function applyWindShader(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = WIND.time;
    shader.uniforms.uWindStr = WIND.strength;
    shader.vertexShader = 'uniform float uWindTime;\nuniform float uWindStr;\nattribute float aSway;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 wip = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
        #else
          vec2 wip = vec2(position.x, position.z);
        #endif
        float wph = uWindTime * 1.8 + wip.x * 0.21 + wip.y * 0.17;
        float wgust = sin(uWindTime * 0.45 + wip.x * 0.03) * 0.5 + 0.5;
        transformed.x += (sin(wph) + sin(wph * 2.3 + 1.7) * 0.35) * aSway * uWindStr * (0.5 + wgust);
        transformed.z += cos(wph * 0.8) * aSway * 0.6 * uWindStr * (0.5 + wgust);`);
  };
}

const NAT_SOLID = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 });
const NAT_FOLIAGE = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
applyWindShader(NAT_FOLIAGE);
const NAT_CRYSTAL = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.18, metalness: 0.35,
  emissive: new THREE.Color(0x7a2cff), emissiveIntensity: 0.9
});
const NAT_GRASS = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0, metalness: 0, side: THREE.DoubleSide });
applyWindShader(NAT_GRASS);

const PROXY_MAT = new THREE.MeshBasicMaterial({ visible: false });
const PROXY_CYL = new THREE.CylinderGeometry(1, 1, 1, 8, 1); PROXY_CYL.translate(0, 0.5, 0);
const PROXY_BOX = new THREE.BoxGeometry(1, 1, 1); PROXY_BOX.translate(0, 0.5, 0);
const PROXY_ICO = new THREE.IcosahedronGeometry(1, 0);

function proxyCyl(x, y, z, rad, h) {
  const m = new THREE.Mesh(PROXY_CYL, PROXY_MAT); m.position.set(x, y, z); m.scale.set(rad, h, rad); return m;
}
function proxyBox(x, y, z, w, h, d, yaw = 0) {
  const m = new THREE.Mesh(PROXY_BOX, PROXY_MAT); m.position.set(x, y, z); m.scale.set(w, h, d); m.rotation.y = yaw; return m;
}
function proxyRock(x, y, z, rx, ry, rz) {
  const m = new THREE.Mesh(PROXY_ICO, PROXY_MAT); m.position.set(x, y + ry * 0.55, z); m.scale.set(rx, ry, rz); return m;
}

// ---------------------------------------------------------------------
// ÁRVORES
// ---------------------------------------------------------------------
function addPine(B, F, x, y, z, s, r, snowy) {
  const h = (8 + r() * 5) * s;
  B.add(new THREE.CylinderGeometry(0.14 * s, 0.3 * s, h, 7, 1), mat4(x, y + h / 2, z),
    { c1: 0x3a2a1d, c2: 0x4f3b28, vary: 0.2 });
  const tiers = 6 + ((r() * 2) | 0);
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const ty = y + h * 0.2 + t * h * 0.8;
    const rad = (2.9 - 2.3 * t) * s * (0.85 + r() * 0.25);
    const ch = (2.9 - 0.9 * t) * s;
    const seed = r() * 100;
    F.add(new THREE.ConeGeometry(rad, ch, 9, 1), mat4(x, ty, z, (r() - 0.5) * 0.08, r() * 6.28, (r() - 0.5) * 0.08), {
      flat: true,
      disp: (px, py, pz) => { const n = (vnoise(px * 1.7 + seed, pz * 1.7 + py) - 0.5) * 0.5; return [px * n, py > 0 ? 0 : -0.1 * Math.abs(n), pz * n]; },
      colorFn: (wx, wy, wz, nx, ny, nz, ly, tt) => {
        const c = cmix(0x16301c, 0x30603a, tt * 0.8 + vnoise(wx * 0.6, wz * 0.6) * 0.3);
        if (snowy) c.lerp(lin(0xeaf2f9), smoothstep(0.5, 0.82, ny) * 0.92);
        return c;
      },
      sway: 0.04 + 0.1 * t
    });
  }
  return { rad: 0.45 * s, h: h * 0.9 };
}

function addJungleTree(B, F, x, y, z, s, r) {
  const H = (11 + r() * 6) * s;
  const lean = (r() - 0.5) * 0.5, seed = r() * 50;
  const bendX = (t) => Math.sin(t * 2.2 + seed) * 0.9 * t * s + lean * t * t * H * 0.25;
  const bendZ = (t) => Math.cos(t * 1.8 + seed) * 0.6 * t * s;

  B.add(new THREE.CylinderGeometry(0.42 * s, 0.9 * s, H, 8, 6), mat4(x, y + H / 2, z), {
    disp: (px, py, pz) => { const t = (py + H / 2) / H; return [bendX(t), 0, bendZ(t)]; },
    c1: 0x35261a, c2: 0x5a4630, vary: 0.2
  });

  // Raízes tabulares
  const nr = 5;
  for (let i = 0; i < nr; i++) {
    const a = (i / nr) * Math.PI * 2 + r() * 0.5;
    B.add(new THREE.ConeGeometry(0.42 * s, 2.8 * s, 5, 1),
      mat4q(x + Math.cos(a) * 1.0 * s, y + 0.5 * s, z + Math.sin(a) * 1.0 * s, -a, 1.72, 1, 1, 0.7),
      { flat: true, c1: 0x35261a, c2: 0x4a3828, vary: 0.2 });
  }

  const tx = x + bendX(1), tz = z + bendZ(1);
  const nC = 6 + ((r() * 3) | 0);
  for (let i = 0; i < nC; i++) {
    const rad = (3.0 + r() * 2.2) * s;
    const ox = (r() - 0.5) * 6 * s, oz = (r() - 0.5) * 6 * s, oy = H - 1.2 * s + r() * 3.8 * s;
    const cs = r() * 40;
    F.add(new THREE.IcosahedronGeometry(rad, 1), mat4(tx + ox, y + oy, tz + oz, 0, r() * 6, 0, 1.15, 0.66, 1.15), {
      flat: true,
      disp: (px, py, pz) => { const n = (vnoise3(px * 0.8 + cs, py * 0.8, pz * 0.8) - 0.5) * 0.9; return [px * n * 0.35, py * n * 0.35, pz * n * 0.35]; },
      colorFn: (wx, wy, wz, nx, ny, nz, ly, t) => {
        const c = cmix(0x123010, 0x3a7a22, t * 0.9 + ny * 0.2);
        const patch = vnoise(wx * 0.35, wz * 0.35);
        if (patch > 0.62) c.lerp(lin(0x8aa82e), (patch - 0.62) * 1.6);
        return c;
      },
      sway: 0.4
    });
  }

  // Cipós pendentes
  for (let i = 0; i < 3; i++) {
    const len = (3 + r() * 4) * s;
    const a = r() * 6.28, d = (2 + r() * 2.5) * s;
    F.add(new THREE.CylinderGeometry(0.05, 0.025, len, 4, 1),
      mat4(tx + Math.cos(a) * d, y + H - 0.5 * s - len / 2, tz + Math.sin(a) * d),
      { c1: 0x2a4a1e, c2: 0x3c6a28, sway: 0.5 });
  }
  return { rad: 0.85 * s, h: H * 0.85 };
}

function addDeadTree(B, x, y, z, s, r, col1 = 0x5a5046, col2 = 0x7a6e5e) {
  const h = (4.5 + r() * 3) * s, seed = r() * 30;
  B.add(new THREE.CylinderGeometry(0.1 * s, 0.28 * s, h, 6, 4), mat4(x, y + h / 2, z), {
    disp: (px, py) => { const t = (py + h / 2) / h; return [Math.sin(t * 3 + seed) * 0.35 * t * s, 0, Math.cos(t * 2.4 + seed) * 0.25 * t * s]; },
    c1: col1, c2: col2, vary: 0.18
  });
  const nb = 4 + ((r() * 3) | 0);
  for (let i = 0; i < nb; i++) {
    const t = 0.35 + r() * 0.6, a = r() * 6.28, len = (1.2 + r() * 1.8) * s;
    const bg = new THREE.CylinderGeometry(0.02 * s, 0.07 * s, len, 5, 1);
    bg.translate(0, len / 2, 0);
    B.add(bg, mat4q(x, y + h * t, z, a, 0.8 + r() * 0.5), { c1: col2, c2: col1, vary: 0.15 });
  }
  return { rad: 0.3 * s, h: h };
}

function addCactus(B, x, y, z, s, r) {
  const h = (3 + r() * 2.5) * s;
  const g1 = 0x3f6b35, g2 = 0x5c8a45;
  B.add(new THREE.CylinderGeometry(0.34 * s, 0.4 * s, h, 9, 2), mat4(x, y + h / 2, z), { c1: g1, c2: g2, vary: 0.12 });
  B.add(new THREE.SphereGeometry(0.34 * s, 9, 6), mat4(x, y + h, z, 0, 0, 0, 1, 0.7, 1), { c1: g2, c2: g2 });
  const arms = r() < 0.75 ? 1 + ((r() * 2) | 0) : 0;
  for (let i = 0; i < arms; i++) {
    const a = r() * 6.28, ay = y + h * (0.35 + r() * 0.3), reach = (0.9 + r() * 0.4) * s, up = (1.0 + r() * 1.0) * s;
    const dx = Math.cos(a), dz = Math.sin(a);
    B.add(new THREE.CylinderGeometry(0.2 * s, 0.22 * s, reach, 7, 1),
      mat4(x + dx * reach / 2, ay, z + dz * reach / 2, 0, -a, Math.PI / 2), { c1: g1, c2: g2 });
    B.add(new THREE.CylinderGeometry(0.2 * s, 0.2 * s, up, 7, 1), mat4(x + dx * reach, ay + up / 2, z + dz * reach), { c1: g1, c2: g2 });
    B.add(new THREE.SphereGeometry(0.2 * s, 7, 5), mat4(x + dx * reach, ay + up, z + dz * reach, 0, 0, 0, 1, 0.7, 1), { c1: g2, c2: g2 });
  }
  return { rad: 0.45 * s, h };
}

function addBush(F, x, y, z, s, r, c1, c2, sway = 0.35) {
  const n = 2 + ((r() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const rad = (0.55 + r() * 0.5) * s, cs = r() * 20;
    F.add(new THREE.IcosahedronGeometry(rad, 1), mat4(x + (r() - 0.5) * s * 1.1, y + rad * 0.55, z + (r() - 0.5) * s * 1.1, 0, r() * 6, 0, 1.2, 0.8, 1.2), {
      flat: true,
      disp: (px, py, pz) => { const q = (vnoise3(px * 2 + cs, py * 2, pz * 2) - 0.5) * 0.5; return [px * q, py * q, pz * q]; },
      colorFn: (wx, wy, wz, nx, ny, nz, ly, t) => cmix(c1, c2, t * 0.8 + vnoise(wx, wz) * 0.3),
      sway
    });
  }
}

// ---------------------------------------------------------------------
// ROCHAS (deslocamento 3D + coloração por altitude/normal)
// ---------------------------------------------------------------------
const ROCK_PAL = {
  urban:  { base: 0x5a5f63, dark: 0x3c4044, top: 0x666c70, topAmt: 0.0, strata: 0 },
  jungle: { base: 0x5e5a52, dark: 0x3e3b35, top: 0x3f6b2a, topAmt: 0.85, strata: 0 },
  void:   { base: 0x24123e, dark: 0x0f0820, top: 0x3a2068, topAmt: 0.5, strata: 0 },
  desert: { base: 0xb07a4c, dark: 0x82502f, top: 0xd0a572, topAmt: 0.6, strata: 1 },
  arctic: { base: 0x6b7683, dark: 0x464f5a, top: 0xf1f7fc, topAmt: 0.95, strata: 0 }
};

function addRock(B, x, y, z, s, r, pal) {
  const sx = s * (1.0 + r() * 0.7), sy = s * (0.7 + r() * 0.7), sz = s * (1.0 + r() * 0.7);
  const seed = r() * 90, yaw = r() * 6.28;
  B.add(new THREE.IcosahedronGeometry(1, 1), mat4(x, y + sy * 0.4, z, (r() - 0.5) * 0.3, yaw, (r() - 0.5) * 0.3, sx, sy, sz), {
    flat: true,
    disp: (px, py, pz) => {
      const n = 0.78 + vnoise3(px * 1.5 + seed, py * 1.5, pz * 1.5) * 0.55;
      const nx = px * (n - 1), ny = py * (n - 1), nzz = pz * (n - 1);
      let dy = ny;
      if (py * n < -0.55) dy = -0.55 / 1 - py;
      return [nx, dy, nzz];
    },
    colorFn: (wx, wy, wz, nx, ny, nz, ly, t) => {
      const c = cmix(pal.dark, pal.base, 0.35 + vnoise(wx * 1.3 + wy * 0.8, wz * 1.3) * 0.7);
      if (pal.strata) c.lerp(lin(pal.dark), (Math.sin(wy * 5 + vnoise(wx * 0.5, wz * 0.5) * 4) * 0.5 + 0.5) * 0.45);
      c.lerp(lin(pal.top), smoothstep(0.55, 0.85, ny) * pal.topAmt);
      return c;
    }
  });
  return { rx: sx * 0.95, ry: sy * 0.95, rz: sz * 0.95 };
}

// Pilar rochoso alto (mesa/torre natural) para deserto e void
function addRockPillar(B, x, y, z, s, r, pal) {
  const h = (5 + r() * 6) * s, w = (1.6 + r() * 1.4) * s, seed = r() * 40;
  B.add(new THREE.CylinderGeometry(w * 0.75, w, h, 7, 6), mat4(x, y + h / 2 - 0.4, z, 0, r() * 6, 0), {
    flat: true,
    disp: (px, py, pz) => { const n = (vnoise3(px * 0.9 + seed, py * 0.5, pz * 0.9) - 0.5) * 0.8; return [px * n * 0.5, 0, pz * n * 0.5]; },
    colorFn: (wx, wy, wz, nx, ny, nz) => {
      const c = cmix(pal.dark, pal.base, 0.4 + vnoise(wx * 0.7, wz * 0.7) * 0.4);
      c.lerp(lin(pal.dark), (Math.sin(wy * 3.2 + vnoise(wx * 0.4, wz * 0.4) * 5) * 0.5 + 0.5) * (pal.strata ? 0.5 : 0.2));
      c.lerp(lin(pal.top), smoothstep(0.6, 0.9, ny) * pal.topAmt);
      return c;
    }
  });
  return { rad: w * 0.9, h };
}

// Aglomerado de cristais (void)
function addCrystalCluster(C, x, y, z, s, r) {
  const n = 4 + ((r() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const h = (1.6 + r() * 3.4) * s, rad = (0.22 + r() * 0.3) * s;
    const a = r() * 6.28, d = r() * 0.9 * s, tilt = (r() - 0.5) * 0.9;
    const hue = r() < 0.6 ? [0x2a0f5a, 0xb865ff] : [0x0c2a5a, 0x4be0ff];
    C.add(new THREE.ConeGeometry(rad, h, 6, 1), mat4q(x + Math.cos(a) * d, y + h * 0.45, z + Math.sin(a) * d, r() * 6, tilt), {
      flat: true,
      colorFn: (wx, wy, wz, nx, ny, nz, ly, t) => cmix(hue[0], hue[1], t * 1.1)
    });
  }
  return { rad: 0.9 * s, h: 3 * s };
}

// ---------------------------------------------------------------------
// PROPS INDUSTRIAIS / RESTOS
// ---------------------------------------------------------------------
function addRubble(B, x, y, z, s, r) {
  const n = 3 + ((r() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const w = (0.7 + r() * 1.5) * s, h = (0.3 + r() * 0.6) * s, d = (0.7 + r() * 1.3) * s;
    B.add(new THREE.BoxGeometry(w, h, d), mat4(x + (r() - 0.5) * 2.4 * s, y + h * 0.4, z + (r() - 0.5) * 2.4 * s, (r() - 0.5) * 0.5, r() * 6.28, (r() - 0.5) * 0.5), {
      flat: true, c1: 0x4b4f54, c2: 0x6a6f74, vary: 0.25
    });
  }
  for (let i = 0; i < 2; i++) { // vergalhões expostos
    const len = (1.2 + r() * 1.2) * s;
    B.add(new THREE.CylinderGeometry(0.03, 0.03, len, 5, 1), mat4(x + (r() - 0.5) * 1.6, y + len * 0.4, z + (r() - 0.5) * 1.6, (r() - 0.5) * 0.7, 0, (r() - 0.5) * 0.7), { c1: 0x6a3a22, c2: 0x8a4a2a });
  }
  return { w: 3 * s, h: 0.9 * s, d: 3 * s };
}

function addConcretePillar(B, x, y, z, s, r) {
  const h = (3 + r() * 3.5) * s, w = 1.1 * s;
  B.add(new THREE.BoxGeometry(w, h, w, 1, 3, 1), mat4(x, y + h / 2, z, 0, r() * 0.4, 0), {
    flat: true,
    disp: (px, py, pz) => py > h * 0.3 ? [0, -Math.abs(vnoise(px * 4 + x, pz * 4)) * 0.5, 0] : [0, 0, 0],
    c1: 0x4a4e52, c2: 0x70767a, vary: 0.2
  });
  for (let i = 0; i < 4; i++) {
    const len = 0.9 + r() * 0.8;
    B.add(new THREE.CylinderGeometry(0.025, 0.025, len, 5, 1),
      mat4(x + (r() - 0.5) * w * 0.7, y + h + len * 0.3, z + (r() - 0.5) * w * 0.7, (r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4), { c1: 0x6a3a22, c2: 0x9a5a30 });
  }
  return { rad: w * 0.75, h };
}

function addBarrels(B, x, y, z, s, r) {
  const cols = [0x8a2a1c, 0x2a4a7a, 0x9a7a1c, 0x3a5a2a];
  const n = 2 + ((r() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const col = cols[(r() * cols.length) | 0];
    const bx = x + (r() - 0.5) * 1.8 * s, bz = z + (r() - 0.5) * 1.8 * s;
    const fallen = r() < 0.25;
    const m = fallen ? mat4(bx, y + 0.36 * s, bz, 0, r() * 6.28, Math.PI / 2) : mat4(bx, y + 0.55 * s, bz, 0, r() * 6.28, 0);
    B.add(new THREE.CylinderGeometry(0.36 * s, 0.36 * s, 1.1 * s, 12, 1), m, { c1: col, c2: col, vary: 0.2 });
    // aros
    for (const ry of [-0.3, 0.3]) {
      const ring = new THREE.CylinderGeometry(0.375 * s, 0.375 * s, 0.07 * s, 12, 1);
      B.add(ring, fallen ? mat4(bx, y + 0.36 * s, bz, 0, 0, Math.PI / 2).multiply(new THREE.Matrix4().makeTranslation(0, ry * s, 0)) : mat4(bx, y + (0.55 + ry) * s, bz), { c1: 0x25282b, c2: 0x25282b });
    }
  }
  return { rad: 1.1 * s, h: 1.1 * s };
}

function addWreckCar(B, x, y, z, s, r) {
  const yaw = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.2;
  const palette = [0x6b3a24, 0x3a4a52, 0x7a6a3a, 0x4a2a2a];
  const body = palette[(r() * palette.length) | 0];
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  const place = (lx, ly, lz) => [x + lx * c + lz * sn, y + ly, z - lx * sn + lz * c];
  const M = (lx, ly, lz, rx = 0, ry = 0, rz = 0) => { const p = place(lx, ly, lz); return mat4(p[0], p[1], p[2], rx, yaw + ry, rz); };
  B.add(new THREE.BoxGeometry(4.2 * s, 0.75 * s, 1.9 * s), M(0, 0.62 * s, 0, 0, 0, 0.03), { flat: true, c1: body, c2: body, vary: 0.25 });
  B.add(new THREE.BoxGeometry(2.1 * s, 0.7 * s, 1.75 * s), M(-0.2 * s, 1.3 * s, 0), { flat: true, c1: body, c2: body, vary: 0.25 });
  B.add(new THREE.BoxGeometry(1.9 * s, 0.5 * s, 1.78 * s), M(-0.2 * s, 1.32 * s, 0), { c1: 0x0e141a, c2: 0x1a2530 });
  for (const wx of [-1.35, 1.35]) for (const wz of [-0.95, 0.95]) {
    if (r() < 0.2) continue;
    B.add(new THREE.CylinderGeometry(0.4 * s, 0.4 * s, 0.3 * s, 12, 1), M(wx * s, 0.4 * s, wz * s, Math.PI / 2, 0, 0), { c1: 0x17191b, c2: 0x17191b });
  }
  return { w: 4.4 * s, h: 1.7 * s, d: 2.1 * s, yaw };
}

function addFallenLog(B, F, x, y, z, s, r) {
  const len = (4 + r() * 3) * s, rad = (0.35 + r() * 0.25) * s, yaw = r() * 6.28;
  B.add(new THREE.CylinderGeometry(rad, rad * 1.1, len, 8, 3), mat4(x, y + rad * 0.9, z, 0, yaw, Math.PI / 2), {
    c1: 0x4a3626, c2: 0x5e4630, vary: 0.25
  });
  F.add(new THREE.IcosahedronGeometry(rad * 1.1, 1), mat4(x, y + rad * 1.6, z, 0, yaw, 0, len * 0.18, 0.35, 0.8), {
    flat: true, colorFn: (wx, wy, wz, nx, ny) => cmix(0x1f4a18, 0x4a8a2a, ny * 0.7 + vnoise(wx, wz) * 0.3), sway: 0.1
  });
  return { len, rad, yaw };
}

function addIceSpikes(C, x, y, z, s, r) {
  const n = 3 + ((r() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const h = (1.2 + r() * 2.8) * s, rad = (0.2 + r() * 0.25) * s, a = r() * 6.28, d = r() * 0.8 * s;
    C.add(new THREE.ConeGeometry(rad, h, 5, 1), mat4q(x + Math.cos(a) * d, y + h * 0.42, z + Math.sin(a) * d, r() * 6, (r() - 0.5) * 0.6), {
      flat: true, colorFn: (wx, wy, wz, nx, ny, nz, ly, t) => cmix(0x86b6d6, 0xe8f6ff, t)
    });
  }
  return { rad: 0.9 * s, h: 2.5 * s };
}

// ---------------------------------------------------------------------
// GRAMA INSTANCIADA (vento por shader)
// ---------------------------------------------------------------------
const GRASS_GEO = (() => {
  const pos = [], nor = [], col = [], sway = [];
  const base = new THREE.Color(), tip = new THREE.Color();
  for (let b = 0; b < 3; b++) {
    const ang = b * (Math.PI / 3);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const hgt = 0.75 + b * 0.12, w = 0.075;
    const pts = [[-w, 0], [w, 0], [-w * 0.55, hgt * 0.5], [w * 0.55, hgt * 0.5], [0, hgt]];
    const bend = [0, 0, 0.05, 0.05, 0.22];
    const v = pts.map((p, i) => [p[0] * ca + bend[i] * sa, p[1], -p[0] * sa + bend[i] * ca]);
    const tri = [[0, 1, 3], [0, 3, 2], [2, 3, 4]];
    tri.forEach(t => t.forEach(i => {
      pos.push(v[i][0], v[i][1], v[i][2]);
      nor.push(0, 1, 0);
      const k = v[i][1] / 0.9;
      base.setRGB(0.45, 0.5, 0.4); tip.setRGB(1.1, 1.15, 0.9);
      const c = base.clone().lerp(tip, k);
      col.push(c.r, c.g, c.b);
      sway.push(k * k * 0.22);
    }));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aSway', new THREE.Float32BufferAttribute(sway, 1));
  return g;
})();

function buildGrass(group, decor, worldX, worldZ, cfg, rng) {
  if (!cfg || !cfg.n) return;
  const mesh = new THREE.InstancedMesh(GRASS_GEO, NAT_GRASS, cfg.n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const pp = new THREE.Vector3(), ss = new THREE.Vector3();
  const col = new THREE.Color();
  let count = 0;
  for (let i = 0; i < cfg.n; i++) {
    const x = worldX + (rng() - 0.5) * CHUNK_SIZE, z = worldZ + (rng() - 0.5) * CHUNK_SIZE;
    if (isNearStructure(x, z, 0.5)) continue;
    const y = getTerrainHeight(x, z);
    if (cfg.maxSlope) { getTerrainNormal(x, z, _nrm); if (_nrm.y < cfg.maxSlope) continue; }
    const sc = (0.7 + rng() * 0.9) * (cfg.h || 1);
    e.set(0, rng() * 6.28, 0); q.setFromEuler(e);
    pp.set(x, y - 0.02, z); ss.set(sc * (0.8 + rng() * 0.6), sc, sc * (0.8 + rng() * 0.6));
    m.compose(pp, q, ss);
    mesh.setMatrixAt(count, m);
    col.setHex(cfg.c1).convertSRGBToLinear().lerp(_cg.setHex(cfg.c2).convertSRGBToLinear(), rng());
    mesh.setColorAt(count, col);
    count++;
  }
  if (!count) { mesh.dispose(); return; }
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  group.add(mesh);
  decor.instanced.push(mesh);
}
const _cg = new THREE.Color();

// ---------------------------------------------------------------------
// Utilidades de colocação
// ---------------------------------------------------------------------
function isNearStructure(x, z, margin = 3) {
  for (let i = 0; i < buildingSpots.length; i++) {
    const s = buildingSpots[i];
    if (Math.abs(x - s.x) < s.w / 2 + margin && Math.abs(z - s.z) < s.d / 2 + margin) return true;
  }
  return false;
}

function registerChunkCollidable(decor, mesh) {
  decor.group.add(mesh);
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  const entry = { mesh, box };
  collidables.push(entry);
  decor.collidables.push(entry);
  if (typeof markCollidablesDirty === 'function') markCollidablesDirty();
}

function releaseChunkDecor(decor) {
  if (!decor) return;
  decor.collidables.forEach(entry => {
    const i = collidables.indexOf(entry);
    if (i >= 0) collidables.splice(i, 1);
  });
  decor.chests.forEach(ch => {
    const i = lootChests.indexOf(ch);
    if (i >= 0) lootChests.splice(i, 1);
  });
  if (typeof beasts !== 'undefined') {
    decor.beasts.forEach(b => {
      if (!b.alive) return;
      scene.remove(b.group);
      const i = beasts.indexOf(b);
      if (i >= 0) beasts.splice(i, 1);
    });
  }
  scene.remove(decor.group);
  decor.meshes.forEach(m => {
    if (m.geometry) m.geometry.dispose();
    if (m.material && m.material !== NAT_SOLID && m.material !== NAT_FOLIAGE) m.material.dispose();
  });
  decor.instanced.forEach(m => m.dispose && m.dispose());
  if (typeof markCollidablesDirty === 'function') markCollidablesDirty();
}

// ---------------------------------------------------------------------
// Configuração de decoração por mapa
// ---------------------------------------------------------------------
const BIOME_DECOR = {
  neon_rust: {
    seed: 11, rockPal: 'urban',
    trees: [['dead', 1]], treeN: [1, 3],
    rocks: [1, 3], bushes: [2, 4], bushCols: [0x2a3a2c, 0x4a5c3c],
    props: [['rubble', 3], ['barrels', 2], ['car', 1], ['pillar', 2]], propN: [3, 6],
    grass: { n: 90, c1: 0x2e3f33, c2: 0x55664a, h: 0.7, maxSlope: 0.75 }
  },
  jungle_temple: {
    seed: 23, rockPal: 'jungle',
    trees: [['jungle', 1]], treeN: [11, 17],
    rocks: [1, 3], bushes: [8, 14], bushCols: [0x153a14, 0x3c7a24],
    props: [['log', 2], ['rubble', 1]], propN: [1, 3],
    grass: { n: 650, c1: 0x1f4a1a, c2: 0x6aa22c, h: 1.1, maxSlope: 0.7 }
  },
  void_core: {
    seed: 37, rockPal: 'void',
    trees: [['crystal', 1]], treeN: [3, 6],
    rocks: [1, 3], pillars: [0, 2], bushes: [0, 0], bushCols: [0x1a1040, 0x4a2a90],
    props: [], propN: [0, 0],
    grass: { n: 140, c1: 0x2a1860, c2: 0x35d0ff, h: 0.9, maxSlope: 0.7 }
  },
  desert: {
    seed: 41, rockPal: 'desert',
    trees: [['cactus', 4], ['dead', 1]], treeN: [3, 6],
    rocks: [2, 4], pillars: [0, 2], bushes: [3, 6], bushCols: [0x6a6030, 0xa09050],
    props: [['car', 1], ['rubble', 1], ['barrels', 1]], propN: [0, 2],
    grass: { n: 90, c1: 0x8a7a3a, c2: 0xb4a45a, h: 0.8, maxSlope: 0.8 }
  },
  arctic: {
    seed: 53, rockPal: 'arctic',
    trees: [['snowpine', 1]], treeN: [7, 12],
    rocks: [1, 3], bushes: [0, 0], bushCols: [0xdde8f0, 0xffffff],
    props: [['ice', 2], ['log', 1]], propN: [1, 3],
    grass: { n: 0 }
  }
};

function randRange(r, rg) { return rg[0] + Math.floor(r() * (rg[1] - rg[0] + 1)); }
function pickWeighted(r, list) {
  let tot = 0; list.forEach(l => tot += l[1]);
  let v = r() * tot;
  for (const l of list) { v -= l[1]; if (v <= 0) return l[0]; }
  return list[0][0];
}

// ---------------------------------------------------------------------
// POPULAÇÃO PROCEDURAL DO CHUNK
// ---------------------------------------------------------------------
function decorateChunk(cx, cz, worldX, worldZ) {
  const mapKey = BIOME_DECOR[currentMapKey] ? currentMapKey : 'neon_rust';
  const cfg = BIOME_DECOR[mapKey];
  const rng = mulberry32(((hash2i(cx, cz) * 4294967295) >>> 0) ^ (cfg.seed * 7919));
  const pal = ROCK_PAL[cfg.rockPal];

  const group = new THREE.Group();
  scene.add(group);
  const decor = { group, collidables: [], chests: [], beasts: [], meshes: [], instanced: [] };

  const solid = new GeoBatch(), foliage = new GeoBatch(), crystal = new GeoBatch();
  const placed = [];

  function pickSpot(radius, minGap, maxSteep) {
    for (let t = 0; t < 10; t++) {
      const x = worldX + (rng() - 0.5) * (CHUNK_SIZE - 2), z = worldZ + (rng() - 0.5) * (CHUNK_SIZE - 2);
      if (isNearStructure(x, z, radius + 1.5)) continue;
      let ok = true;
      for (let i = 0; i < placed.length; i++) {
        const p = placed[i];
        if (Math.hypot(p.x - x, p.z - z) < p.r + radius + minGap) { ok = false; break; }
      }
      if (!ok) continue;
      if (maxSteep) { getTerrainNormal(x, z, _nrm); if (_nrm.y < maxSteep) continue; }
      placed.push({ x, z, r: radius });
      return { x, z, y: getTerrainHeight(x, z) };
    }
    return null;
  }

  // ÁRVORES / VEGETAÇÃO ALTA
  const nTrees = randRange(rng, cfg.treeN);
  for (let i = 0; i < nTrees; i++) {
    const kind = pickWeighted(rng, cfg.trees);
    const s = 0.85 + rng() * 0.6;
    const spot = pickSpot(kind === 'jungle' ? 2.6 : 1.6, 1.5, 0.78);
    if (!spot) continue;
    let res;
    if (kind === 'jungle') res = addJungleTree(solid, foliage, spot.x, spot.y - 0.2, spot.z, s, rng);
    else if (kind === 'pine') res = addPine(solid, foliage, spot.x, spot.y - 0.2, spot.z, s, rng, false);
    else if (kind === 'snowpine') res = addPine(solid, foliage, spot.x, spot.y - 0.2, spot.z, s, rng, true);
    else if (kind === 'cactus') res = addCactus(solid, spot.x, spot.y - 0.1, spot.z, s, rng);
    else if (kind === 'crystal') {
      res = addCrystalCluster(crystal, spot.x, spot.y - 0.1, spot.z, s * 1.3, rng);
      registerChunkCollidable(decor, proxyCyl(spot.x, spot.y - 0.5, spot.z, res.rad, res.h));
      continue;
    } else res = addDeadTree(solid, spot.x, spot.y - 0.2, spot.z, s, rng);
    registerChunkCollidable(decor, proxyCyl(spot.x, spot.y - 0.5, spot.z, res.rad, res.h));
  }

  // ROCHAS
  const nRocks = randRange(rng, cfg.rocks);
  for (let i = 0; i < nRocks; i++) {
    const big = rng() < 0.3;
    const s = (big ? 2.4 : 1.1) * (0.8 + rng() * 0.7);
    const spot = pickSpot(s * 1.3, 1, 0);
    if (!spot) continue;
    const rr = addRock(solid, spot.x, spot.y, spot.z, s, rng, pal);
    registerChunkCollidable(decor, proxyRock(spot.x, spot.y - 0.3, spot.z, rr.rx, rr.ry, rr.rz));
    if (rng() < 0.6) { // pedras menores ao redor
      const px = spot.x + (rng() - 0.5) * s * 4, pz = spot.z + (rng() - 0.5) * s * 4;
      if (!isNearStructure(px, pz, 1)) addRock(solid, px, getTerrainHeight(px, pz), pz, s * 0.35, rng, pal);
    }
  }
  if (cfg.pillars) {
    const nP = randRange(rng, cfg.pillars);
    for (let i = 0; i < nP; i++) {
      const s = 0.9 + rng() * 0.9;
      const spot = pickSpot(3 * s, 4, 0.8);
      if (!spot) continue;
      const pr = addRockPillar(solid, spot.x, spot.y, spot.z, s, rng, pal);
      registerChunkCollidable(decor, proxyCyl(spot.x, spot.y - 0.5, spot.z, pr.rad, pr.h));
    }
  }

  // ARBUSTOS
  if (cfg.bushes && cfg.bushes[1] > 0) {
    const nB = randRange(rng, cfg.bushes);
    for (let i = 0; i < nB; i++) {
      const spot = pickSpot(0.8, 0.4, 0.7);
      if (!spot) continue;
      addBush(foliage, spot.x, spot.y - 0.1, spot.z, 0.9 + rng() * 0.9, rng, cfg.bushCols[0], cfg.bushCols[1]);
    }
  }

  // PROPS
  if (cfg.props.length) {
    const nProps = randRange(rng, cfg.propN);
    for (let i = 0; i < nProps; i++) {
      const kind = pickWeighted(rng, cfg.props);
      const s = 0.9 + rng() * 0.4;
      const spot = pickSpot(2.2, 1.5, 0.75);
      if (!spot) continue;
      if (kind === 'rubble') {
        const pr = addRubble(solid, spot.x, spot.y, spot.z, s, rng);
        registerChunkCollidable(decor, proxyBox(spot.x, spot.y - 0.3, spot.z, pr.w * 0.8, pr.h, pr.d * 0.8));
      } else if (kind === 'barrels') {
        const pr = addBarrels(solid, spot.x, spot.y - 0.1, spot.z, s, rng);
        registerChunkCollidable(decor, proxyCyl(spot.x, spot.y - 0.2, spot.z, pr.rad, pr.h));
      } else if (kind === 'car') {
        const pr = addWreckCar(solid, spot.x, spot.y - 0.1, spot.z, s, rng);
        registerChunkCollidable(decor, proxyBox(spot.x, spot.y - 0.2, spot.z, pr.w, pr.h, pr.d, pr.yaw));
      } else if (kind === 'pillar') {
        const pr = addConcretePillar(solid, spot.x, spot.y - 0.2, spot.z, s, rng);
        registerChunkCollidable(decor, proxyCyl(spot.x, spot.y - 0.3, spot.z, pr.rad, pr.h));
      } else if (kind === 'log') {
        const pr = addFallenLog(solid, foliage, spot.x, spot.y - 0.1, spot.z, s, rng);
        registerChunkCollidable(decor, proxyBox(spot.x, spot.y - 0.1, spot.z, pr.len, pr.rad * 1.8, pr.rad * 2, -pr.yaw));
      } else if (kind === 'ice') {
        const pr = addIceSpikes(crystal, spot.x, spot.y - 0.1, spot.z, s * 1.2, rng);
        registerChunkCollidable(decor, proxyCyl(spot.x, spot.y - 0.3, spot.z, pr.rad, pr.h));
      }
    }
  }

  // Flush das batches (1 draw-call por tipo de material)
  const mS = solid.flush(NAT_SOLID), mF = foliage.flush(NAT_FOLIAGE);
  let mC = null;
  if (crystal.p.length) {
    const cm = NAT_CRYSTAL.clone();
    cm.emissive.setHex(mapKey === 'arctic' ? 0x2a8ac0 : 0x7a2cff);
    cm.emissiveIntensity = mapKey === 'arctic' ? 0.25 : 0.9;
    cm.roughness = mapKey === 'arctic' ? 0.12 : 0.18;
    mC = crystal.flush(cm);
  }
  [mS, mF, mC].forEach(m => { if (m) { group.add(m); decor.meshes.push(m); } });

  buildGrass(group, decor, worldX, worldZ, cfg.grass, rng);

  // BAÚS DE SAQUE
  if (rng() < 0.35) {
    const spot = pickSpot(1.5, 1, 0.8);
    if (spot) {
      const chest = addLootChest(spot.x, spot.z, { parent: group });
      if (chest) decor.chests.push(chest);
    }
  }

  // FERAS (longe da área inicial e limitadas em quantidade)
  if (typeof spawnBeast === 'function' && rng() < 0.45 && Math.hypot(worldX, worldZ) > 70) {
    const alive = beasts.reduce((n, b) => n + (b.alive ? 1 : 0), 0);
    if (alive < 14) {
      const bx = worldX + (rng() - 0.5) * (CHUNK_SIZE - 12), bz = worldZ + (rng() - 0.5) * (CHUNK_SIZE - 12);
      const types = mapKey === 'arctic' ? ['crawler', 'crawler', 'stalker', 'juggernaut']
        : mapKey === 'desert' ? ['crawler', 'fiend', 'fiend', 'stalker']
        : ['crawler', 'crawler', 'fiend', 'juggernaut', 'stalker'];
      const beast = spawnBeast(types[Math.floor(rng() * types.length)], bx, bz);
      if (beast) decor.beasts.push(beast);
    }
  }

  return decor;
}

// ---------------------------------------------------------------------
// API pública para layouts de mapa (estruturas individuais)
// ---------------------------------------------------------------------
function buildJungleGiantTree(x, z) {
  const y = getTerrainHeight(x, z);
  const r = mulberry32((hash2i(Math.round(x), Math.round(z)) * 4294967295) >>> 0);
  const S = new GeoBatch(), F = new GeoBatch();
  const res = addJungleTree(S, F, x, y - 0.2, z, 0.9 + r() * 0.5, r);
  [S.flush(NAT_SOLID), F.flush(NAT_FOLIAGE)].forEach(m => { if (m) mapStructuresGroup.add(m); });
  const proxy = proxyCyl(x, y - 0.5, z, res.rad, res.h);
  mapStructuresGroup.add(proxy);
  registerCollidable(proxy);
}

function buildRockFormation(x, z, scale = 1.0) {
  const y = getTerrainHeight(x, z);
  const r = mulberry32((hash2i(Math.round(x * 3), Math.round(z * 3)) * 4294967295) >>> 0);
  const S = new GeoBatch();
  const pal = ROCK_PAL[(BIOME_DECOR[currentMapKey] || BIOME_DECOR.neon_rust).rockPal];
  const rr = addRock(S, x, y, z, 1.4 * scale, r, pal);
  addRock(S, x + 2.1 * scale, getTerrainHeight(x + 2.1 * scale, z + 0.6 * scale), z + 0.6 * scale, 0.6 * scale, r, pal);
  const m = S.flush(NAT_SOLID);
  if (m) mapStructuresGroup.add(m);
  const proxy = proxyRock(x, y - 0.3, z, rr.rx, rr.ry, rr.rz);
  mapStructuresGroup.add(proxy);
  registerCollidable(proxy);
}
