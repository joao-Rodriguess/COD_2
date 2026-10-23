// ============================================================================
// AUDIO.JS — MOTOR DE ÁUDIO PROCEDURAL AAA (WEB AUDIO API)
// Arquitetura Multi-Camada com Compressor Master, Reverb, Saturação & LFO
// ============================================================================

let audioContext = null;
let masterGain = null;
let masterCompressor = null;
let reverbNode = null;
let reverbGain = null;
let distortionCurve = null;

let userInteracted = false;
let windState = null; // Armazena nós do vento para fade-out suave e modulação

// Buffers pré-calculados em cache
let whiteNoiseBuffer = null;
let pinkNoiseBuffer = null;

// Limitador de spam sonoro (evita sobrecarga se 20 sons iguais tocarem no mesmo ms)
const lastPlayedTime = Object.create(null);

// Fallbacks seguros caso variáveis globais externas não estejam prontas
function getMasterVolume() {
  return (typeof settings !== 'undefined' && typeof settings.volume === 'number')
    ? Math.max(0, Math.min(1, settings.volume))
    : 0.8;
}

function getTimeScale() {
  return (typeof timeScale === 'number' && timeScale > 0) ? timeScale : 1.0;
}

// ============================================================================
// 1. INICIALIZAÇÃO DO PIPELINE DE ÁUDIO & DSP MASTER BUS
// ============================================================================

function audioCtx() {
  if (!userInteracted) return null;

  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    audioContext = new AudioCtx({ latencyHint: 'interactive' });

    // 1. Master Gain (Controle de Volume do Usuário)
    masterGain = audioContext.createGain();
    masterGain.gain.value = getMasterVolume();

    // 2. Master Compressor / Limiter (Punch AAA + Proteção contra Clipping)
    masterCompressor = audioContext.createDynamicsCompressor();
    masterCompressor.threshold.setValueAtTime(-14, audioContext.currentTime);
    masterCompressor.knee.setValueAtTime(12, audioContext.currentTime);
    masterCompressor.ratio.setValueAtTime(6, audioContext.currentTime);
    masterCompressor.attack.setValueAtTime(0.002, audioContext.currentTime);
    masterCompressor.release.setValueAtTime(0.18, audioContext.currentTime);

    // 3. Reverb Espacial Procedural (Impulse Response Sintético)
    reverbNode = audioContext.createConvolver();
    reverbNode.buffer = createImpulseResponse(audioContext, 1.35, 3.8);
    reverbGain = audioContext.createGain();
    reverbGain.gain.value = 0.16; // Mix sutil de espacialidade

    // Roteamento Master: [Sinais] -> masterCompressor -> masterGain -> Destination
    masterCompressor.connect(masterGain);
    masterGain.connect(audioContext.destination);

    // Bus Auxiliar de Reverb
    reverbNode.connect(reverbGain);
    reverbGain.connect(masterCompressor);

    // Pré-aquece curvas e buffers
    distortionCurve = makeDistortionCurve(180);
    getNoiseBuffer(audioContext);
    getPinkNoiseBuffer(audioContext);
  }

  return audioContext;
}

function updateMasterVolume() {
  if (masterGain && audioContext) {
    const now = audioContext.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(getMasterVolume(), now, 0.015);
  }
}

function unlockAudio() {
  userInteracted = true;
  try {
    const ctx = audioCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => { });
    }
  } catch (_) { }
}

['click', 'keydown', 'pointerdown', 'touchstart', 'mousedown'].forEach(evt => {
  window.addEventListener(evt, unlockAudio, { passive: true, once: false });
});

// ============================================================================
// 2. GERADORES DE BUFFERS, REVERB E SATURAÇÃO HARMÔNICA
// ============================================================================

// Ruído Branco (Estalos agudos, pólvora, chiados)
function getNoiseBuffer(ctx) {
  if (!whiteNoiseBuffer) {
    const size = ctx.sampleRate * 1.5;
    whiteNoiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const output = whiteNoiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }
  return whiteNoiseBuffer;
}

// Ruído Rosa - Filtro Paul Kellet (Mais encorpado e natural para vento, fogo e explosões)
function getPinkNoiseBuffer(ctx) {
  if (!pinkNoiseBuffer) {
    const size = ctx.sampleRate * 2.0;
    pinkNoiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const output = pinkNoiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < size; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return pinkNoiseBuffer;
}

// Gera resposta ao impulso estéreo para simular acústica de ambiente
function createImpulseResponse(ctx, duration, decay) {
  const length = Math.floor(ctx.sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, decay);
      data[i] = (Math.random() * 2 - 1) * env;
    }
  }
  return impulse;
}

// Curva sigmoide para saturação analógica (WaveShaper)
function makeDistortionCurve(amount = 100) {
  const k = amount;
  const nSamples = 8192;
  const curve = new Float32Array(nSamples);
  const deg = Math.PI / 180;
  for (let i = 0; i < nSamples; ++i) {
    const x = (i * 2) / nSamples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// Utilitário de humanização (varia levemente pitch/filtro a cada execução)
function jitter(val, pct = 0.05) {
  return val * (1 + (Math.random() * 2 - 1) * pct);
}

// Cria roteamento de saída com suporte a Stereo Pan, Reverb Send e Limpeza de Memória
function createOutputChain(ctx, options = {}) {
  const dest = masterCompressor || masterGain || ctx.destination;
  const outGain = ctx.createGain();
  outGain.gain.value = options.volume ?? 1.0;

  let targetNode = dest;

  if (options.pan && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, options.pan));
    panner.connect(dest);
    targetNode = panner;
  }

  outGain.connect(targetNode);

  if (options.reverbSend && reverbNode) {
    const send = ctx.createGain();
    send.gain.value = options.reverbSend;
    outGain.connect(send);
    send.connect(reverbNode);
  }

  return outGain;
}

// ============================================================================
// 3. API PRINCIPAL DE DISPARO DE SOM
// ============================================================================

const GUN_KINDS = new Set([
  'rifle', 'rifle_heavy', 'pistol', 'magnum', 'smg',
  'shotgun', 'sniper', 'lmg', 'plasma', 'rocket'
]);

const BEAST_KINDS = new Set([
  'beast_roar', 'beast_bite', 'acid_spit', 'beast_stomp', 'demon_screech'
]);

/**
 * Toca um efeito sonoro procedural.
 * @param {string} kind - Nome do efeito sonoro.
 * @param {object} [opts] - Opções extras opcionais: { pan: -1 a 1, volume: 0 a 2, pitch: 0.5 a 2 }
 */
function playSound(kind, opts = {}) {
  if (!userInteracted) return;
  try {
    const ctx = audioCtx();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;

    // Rate-limit inteligente por tipo de som (evita phasing destrutivo no mesmo frame)
    const minCooldown = (kind === 'ui_hover' || kind === 'step') ? 0.035 : 0.012;
    if (lastPlayedTime[kind] && (now - lastPlayedTime[kind]) < minCooldown) {
      return;
    }
    lastPlayedTime[kind] = now;

    const ts = getTimeScale();
    const basePitch = (ts < 1.0 ? Math.max(0.45, ts * 0.75) : 1.0) * (opts.pitch || 1.0);

    // 1. Armas de Fogo & Energia
    if (GUN_KINDS.has(kind)) {
      playGunshotSound(ctx, now, kind, basePitch, opts);
      return;
    }

    // 2. Criaturas & Monstros
    if (BEAST_KINDS.has(kind)) {
      playBeastSound(ctx, now, kind, basePitch, opts);
      return;
    }

    // 3. Efeitos Gerais e de Gameplay Especializados
    playGeneralSound(ctx, now, kind, basePitch, opts);

  } catch (_) { }
}

// ============================================================================
// 4. SINTETIZADOR DE ARMAS EM 4 CAMADAS (AAA WEAPON DESIGN)
// ============================================================================
// Camada 1: Sub-Bass Punch (Impacto físico no peito)
// Camada 2: Blast Core c/ WaveShaper (Corpo da explosão da pólvora)
// Camada 3: Ferrolho Mecânico / High-Frequency Snap (Transient metálico)
// Camada 4: Ressonância do Cano + Cauda Acústica no Reverb

const WEAPON_PRESETS = {
  pistol: { sub: 135, blast: 3800, dur: 0.085, subV: 0.22, noiseV: 0.24, res: 680, mech: 2400, rev: 0.12 },
  smg: { sub: 120, blast: 4400, dur: 0.065, subV: 0.18, noiseV: 0.20, res: 820, mech: 2900, rev: 0.08 },
  rifle: { sub: 92, blast: 3100, dur: 0.130, subV: 0.30, noiseV: 0.32, res: 490, mech: 2100, rev: 0.18 },
  rifle_heavy: { sub: 72, blast: 2300, dur: 0.180, subV: 0.40, noiseV: 0.38, res: 360, mech: 1700, rev: 0.24 },
  lmg: { sub: 80, blast: 2600, dur: 0.150, subV: 0.35, noiseV: 0.34, res: 420, mech: 1950, rev: 0.20 },
  magnum: { sub: 64, blast: 2100, dur: 0.250, subV: 0.48, noiseV: 0.42, res: 290, mech: 1500, rev: 0.32 },
  shotgun: { sub: 52, blast: 1650, dur: 0.310, subV: 0.55, noiseV: 0.50, res: 210, mech: 1300, rev: 0.38 },
  sniper: { sub: 44, blast: 1400, dur: 0.440, subV: 0.62, noiseV: 0.54, res: 175, mech: 3200, rev: 0.48 },
  plasma: { sub: 210, blast: 6200, dur: 0.210, subV: 0.28, noiseV: 0.26, res: 1450, mech: 4200, rev: 0.28 },
  rocket: { sub: 38, blast: 1050, dur: 0.620, subV: 0.65, noiseV: 0.55, res: 135, mech: 900, rev: 0.45 }
};

function playGunshotSound(ctx, now, type, pitchScale, opts) {
  const p = WEAPON_PRESETS[type] || WEAPON_PRESETS.rifle;
  const humanPitch = pitchScale * jitter(1.0, 0.04); // Variação orgânica de ±4%
  const dur = jitter(p.dur, 0.05);
  const subFreq = p.sub * humanPitch;

  const out = createOutputChain(ctx, {
    pan: opts.pan,
    volume: opts.volume ?? 1.0,
    reverbSend: p.rev
  });

  // --- CAMADA 1: Sub-Bass Transient (Kick Peitoral) ---
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = (type === 'plasma') ? 'sine' : 'triangle';
  subOsc.frequency.setValueAtTime(subFreq * 2.2, now);
  subOsc.frequency.exponentialRampToValueAtTime(Math.max(22, subFreq * 0.28), now + dur);

  subGain.gain.setValueAtTime(0.001, now);
  subGain.gain.linearRampToValueAtTime(p.subV, now + 0.003);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  subOsc.connect(subGain).connect(out);
  subOsc.start(now);
  subOsc.stop(now + dur + 0.02);

  // --- CAMADA 2: Explosão de Pólvora / Propulsão com Saturação ---
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = (type === 'shotgun' || type === 'rocket' || type === 'sniper')
    ? getPinkNoiseBuffer(ctx)
    : getNoiseBuffer(ctx);

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = (type === 'plasma') ? 'bandpass' : 'lowpass';
  noiseFilter.frequency.setValueAtTime(jitter(p.blast, 0.08), now);
  noiseFilter.frequency.exponentialRampToValueAtTime(Math.max(120, p.blast * 0.16), now + dur * 1.15);
  if (type === 'plasma') noiseFilter.Q.value = 3.5;

  const shaper = ctx.createWaveShaper();
  shaper.curve = distortionCurve;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(p.noiseV, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 1.15);

  noiseSrc.connect(noiseFilter).connect(shaper).connect(noiseGain).connect(out);
  noiseSrc.start(now);
  noiseSrc.stop(now + dur * 1.18);

  // --- CAMADA 3: Estalo Metálico do Ferrolho / Agulha (Transient) ---
  const snapOsc = ctx.createOscillator();
  const snapFilter = ctx.createBiquadFilter();
  const snapGain = ctx.createGain();

  snapOsc.type = (type === 'plasma') ? 'sine' : 'square';
  if (type === 'plasma') {
    // Chirp sci-fi de feixe laser/plasma
    snapOsc.frequency.setValueAtTime(2800 * humanPitch, now);
    snapOsc.frequency.exponentialRampToValueAtTime(320 * humanPitch, now + 0.14);
  } else {
    snapOsc.frequency.setValueAtTime(p.mech * humanPitch, now);
    snapOsc.frequency.exponentialRampToValueAtTime(p.mech * 0.35, now + 0.028);
  }

  snapFilter.type = 'highpass';
  snapFilter.frequency.value = 900;

  const snapDur = (type === 'plasma') ? 0.14 : 0.028;
  snapGain.gain.setValueAtTime(p.subV * 0.45, now);
  snapGain.gain.exponentialRampToValueAtTime(0.0001, now + snapDur);

  snapOsc.connect(snapFilter).connect(snapGain).connect(out);
  snapOsc.start(now);
  snapOsc.stop(now + snapDur + 0.01);

  // --- CAMADA 4: Ressonância Harmônica do Cano ---
  const resOsc = ctx.createOscillator();
  const resFilter = ctx.createBiquadFilter();
  const resGain = ctx.createGain();

  resOsc.type = 'sawtooth';
  const rFreq = p.res * humanPitch;
  resOsc.frequency.setValueAtTime(rFreq, now);
  resOsc.frequency.exponentialRampToValueAtTime(rFreq * 0.48, now + dur * 1.35);

  resFilter.type = 'bandpass';
  resFilter.frequency.value = rFreq;
  resFilter.Q.value = (type === 'sniper' || type === 'magnum') ? 4.5 : 2.8;

  resGain.gain.setValueAtTime(p.subV * 0.38, now);
  resGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 1.35);

  resOsc.connect(resFilter).connect(resGain).connect(out);
  resOsc.start(now);
  resOsc.stop(now + dur * 1.38);

  resOsc.onended = () => {
    try { out.disconnect(); } catch (_) { }
  };
}

// ============================================================================
// 5. SINTETIZADOR DE MONSTROS & CRIATURAS (FM SYNTHESIS & FORMANTES)
// ============================================================================

function playBeastSound(ctx, now, kind, pitchScale, opts) {
  const pScale = pitchScale * jitter(1.0, 0.06);
  const out = createOutputChain(ctx, {
    pan: opts.pan,
    volume: opts.volume ?? 1.0,
    reverbSend: 0.32
  });

  if (kind === 'beast_roar') {
    const dur = 0.95;

    // Oscilador Principal (Corda Vocal da Fera)
    const carrier = ctx.createOscillator();
    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(58 * pScale, now);
    carrier.frequency.linearRampToValueAtTime(118 * pScale, now + 0.25);
    carrier.frequency.exponentialRampToValueAtTime(32 * pScale, now + dur);

    // Modulador FM Gutural (Vibração de Garganta)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(28, now);
    lfo.frequency.linearRampToValueAtTime(16, now + dur);
    lfoGain.gain.setValueAtTime(35 * pScale, now);
    lfo.connect(lfoGain).connect(carrier.frequency);

    // Filtro Formante de Boca Abrindo (Wah gutural)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 3.2;
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(980, now + 0.28);
    filter.frequency.exponentialRampToValueAtTime(240, now + dur);

    const shaper = ctx.createWaveShaper();
    shaper.curve = distortionCurve;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    carrier.connect(filter).connect(shaper).connect(gain).connect(out);

    // Sopro de Ruído Rosa Agressivo
    const breath = ctx.createBufferSource();
    breath.buffer = getPinkNoiseBuffer(ctx);
    const bFilter = ctx.createBiquadFilter();
    const bGain = ctx.createGain();
    bFilter.type = 'bandpass';
    bFilter.frequency.setValueAtTime(500, now);
    bFilter.Q.value = 1.8;
    bGain.gain.setValueAtTime(0.28, now);
    bGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.9);

    breath.connect(bFilter).connect(bGain).connect(out);

    carrier.start(now);
    lfo.start(now);
    breath.start(now);
    carrier.stop(now + dur);
    lfo.stop(now + dur);
    breath.stop(now + dur);

    carrier.onended = () => { try { out.disconnect(); } catch (_) { } };

  } else if (kind === 'beast_bite') {
    // 1. Impacto da Mandíbula
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(165 * pScale, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.13);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    osc.connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + 0.14);

    // 2. Rasgo de Presas / Carne (Crunch de Ruído)
    const tear = ctx.createBufferSource();
    tear.buffer = getNoiseBuffer(ctx);
    const tFilter = ctx.createBiquadFilter();
    const tGain = ctx.createGain();
    tFilter.type = 'bandpass';
    tFilter.frequency.setValueAtTime(2200, now);
    tFilter.frequency.exponentialRampToValueAtTime(650, now + 0.11);
    tFilter.Q.value = 2.5;
    tGain.gain.setValueAtTime(0.26, now);
    tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    tear.connect(tFilter).connect(tGain).connect(out);
    tear.start(now);
    tear.stop(now + 0.12);

    osc.onended = () => { try { out.disconnect(); } catch (_) { } };

  } else if (kind === 'acid_spit') {
    const dur = 0.28;
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400 * pScale, now);
    filter.frequency.exponentialRampToValueAtTime(420 * pScale, now + dur);
    filter.Q.value = 6.5; // Q alto cria efeito líquido borbulhante

    // Modulador para efeito viscoso ("gluglu")
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 45;
    lfoG.gain.value = 350;
    lfo.connect(lfoG).connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter).connect(gain).connect(out);
    noise.start(now);
    lfo.start(now);
    noise.stop(now + dur);
    lfo.stop(now + dur);

    noise.onended = () => { try { out.disconnect(); } catch (_) { } };

  } else if (kind === 'beast_stomp') {
    const dur = 0.45;
    // Sub-bass Sísmico
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(65 * pScale, now);
    osc.frequency.exponentialRampToValueAtTime(16, now + dur);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(out);

    // Detritos e Pedras (Pink Noise Grave)
    const rumble = ctx.createBufferSource();
    rumble.buffer = getPinkNoiseBuffer(ctx);
    const rFilter = ctx.createBiquadFilter();
    const rGain = ctx.createGain();
    rFilter.type = 'lowpass';
    rFilter.frequency.setValueAtTime(280, now);
    rFilter.frequency.exponentialRampToValueAtTime(60, now + dur);
    rGain.gain.setValueAtTime(0.38, now);
    rGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    rumble.connect(rFilter).connect(rGain).connect(out);

    osc.start(now);
    rumble.start(now);
    osc.stop(now + dur);
    rumble.stop(now + dur);

    osc.onended = () => { try { out.disconnect(); } catch (_) { } };

  } else if (kind === 'demon_screech') {
    const dur = 0.42;
    // Dupla de osciladores em desafinação dissonante (Horror)
    [1, 1.07].forEach((detuneMult, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(780 * pScale * detuneMult, now);
      osc.frequency.exponentialRampToValueAtTime(1150 * pScale * detuneMult, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(260 * pScale * detuneMult, now + dur);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain).connect(out);
      osc.start(now);
      osc.stop(now + dur);
      if (idx === 1) {
        osc.onended = () => { try { out.disconnect(); } catch (_) { } };
      }
    });
  }
}

// ============================================================================
// 6. EFEITOS SONOROS DE GAMEPLAY, EXPLOSÕES E INTERFACE (UI)
// ============================================================================

function playGeneralSound(ctx, now, kind, pitchScale, opts) {
  const pScale = pitchScale * jitter(1.0, 0.03);
  const out = createOutputChain(ctx, {
    pan: opts.pan,
    volume: opts.volume ?? 1.0,
    reverbSend: (kind === 'explosion' || kind === 'airdrop') ? 0.45 : 0.06
  });

  // --- EXPLOSÃO CINEMATOGRÁFICA MULTI-ESTÁGIO ---
  if (kind === 'explosion') {
    const dur = 0.85;

    // 1. Onda de Choque Sub-Bass
    const sub = ctx.createOscillator();
    const subG = ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(55 * pScale, now);
    sub.frequency.exponentialRampToValueAtTime(14 * pScale, now + dur);
    subG.gain.setValueAtTime(0.55, now);
    subG.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    sub.connect(subG).connect(out);
    sub.start(now);
    sub.stop(now + dur);

    // 2. Bola de Fogo & Estilhaços (Pink Noise Saturado)
    const blast = ctx.createBufferSource();
    blast.buffer = getPinkNoiseBuffer(ctx);
    const bFilter = ctx.createBiquadFilter();
    bFilter.type = 'lowpass';
    bFilter.frequency.setValueAtTime(1800 * pScale, now);
    bFilter.frequency.exponentialRampToValueAtTime(95, now + dur * 1.1);

    const shaper = ctx.createWaveShaper();
    shaper.curve = distortionCurve;

    const bGain = ctx.createGain();
    bGain.gain.setValueAtTime(0.50, now);
    bGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 1.1);

    blast.connect(bFilter).connect(shaper).connect(bGain).connect(out);
    blast.start(now);
    blast.stop(now + dur * 1.15);

    blast.onended = () => { try { out.disconnect(); } catch (_) { } };
    return;
  }

  // --- RELOAD MECÂNICO TÁTICO (Clack de Pente + Slide Metálico) ---
  if (kind === 'reload') {
    const notes = [
      { delay: 0.00, freq: 340, endFreq: 190, dur: 0.045, vol: 0.16 }, // Mag Out
      { delay: 0.11, freq: 520, endFreq: 780, dur: 0.055, vol: 0.20 }  // Bolt Lock
    ];
    notes.forEach((n, idx) => {
      const t = now + n.delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq * pScale, t);
      osc.frequency.exponentialRampToValueAtTime(n.endFreq * pScale, t + n.dur);
      g.gain.setValueAtTime(n.vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + n.dur + 0.01);
      if (idx === 1) osc.onended = () => { try { out.disconnect(); } catch (_) { } };
    });
    return;
  }

  // --- HITMARKER AAA (Tick Crisp de Confirmação de Dano) ---
  if (kind === 'hit') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1650 * pScale, now);
    osc.frequency.exponentialRampToValueAtTime(420 * pScale, now + 0.032);
    g.gain.setValueAtTime(0.20, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.035);
    osc.onended = () => { try { out.disconnect(); } catch (_) { } };
    return;
  }

  // --- LEVEL UP / STREAK (Arpejo Harmônico Brilhante) ---
  if (kind === 'levelup' || kind === 'streak') {
    const chord = (kind === 'levelup')
      ? [523.25, 659.25, 783.99, 1046.50] // Dó Maior (C5, E5, G5, C6)
      : [440, 554.37, 659.25];            // Lá Maior (A4, C#5, E5)

    chord.forEach((freq, i) => {
      const start = now + i * 0.065;
      const dur = 0.24;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.14, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(out);
      o.start(start);
      o.stop(start + dur + 0.01);
      if (i === chord.length - 1) {
        o.onended = () => { try { out.disconnect(); } catch (_) { } };
      }
    });
    return;
  }

  // --- TABELA PADRÃO PARA DEMAIS EFEITOS ---
  const cfg = {
    beast_hit: [160, 0.085, 'sawtooth', 650, 0.18],
    jump: [185, 0.080, 'triangle', 1400, 0.15],
    step: [92, 0.035, 'triangle', 450, 0.09],
    enemy: [108, 0.065, 'square', 900, 0.14],
    dash: [320, 0.055, 'triangle', 2200, 0.16],
    slide: [210, 0.110, 'sawtooth', 950, 0.14],
    airdrop: [340, 0.280, 'triangle', 1200, 0.18],
    armor: [560, 0.070, 'triangle', 2400, 0.16],
    ui_hover: [520, 0.018, 'sine', 2800, 0.04],
    ui_click: [820, 0.032, 'triangle', 3200, 0.09]
  }[kind] || [220, 0.06, 'sine', 1800, 0.12];

  const [baseFreq, dur, waveType, cutoff, baseVol] = cfg;
  const f0 = baseFreq * pScale;

  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = waveType;
  if (kind === 'jump') {
    // Pulo sobe a frequência em vez de cair
    osc.frequency.setValueAtTime(f0 * 0.7, now);
    osc.frequency.exponentialRampToValueAtTime(f0 * 1.65, now + dur);
  } else {
    osc.frequency.setValueAtTime(f0 * 1.45, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(28, f0 * 0.38), now + dur);
  }

  filter.type = 'lowpass';
  filter.frequency.value = cutoff;

  gain.gain.setValueAtTime(baseVol, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(filter).connect(gain).connect(out);
  osc.start(now);
  osc.stop(now + dur + 0.01);

  // Para dash e slide, adiciona sopro de ar/atrito
  if (kind === 'dash' || kind === 'slide') {
    const air = ctx.createBufferSource();
    air.buffer = getPinkNoiseBuffer(ctx);
    const aFilter = ctx.createBiquadFilter();
    const aGain = ctx.createGain();
    aFilter.type = 'bandpass';
    aFilter.frequency.setValueAtTime(kind === 'dash' ? 1400 : 750, now);
    aGain.gain.setValueAtTime(baseVol * 0.7, now);
    aGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    air.connect(aFilter).connect(aGain).connect(out);
    air.start(now);
    air.stop(now + dur + 0.01);
  }

  osc.onended = () => {
    try { out.disconnect(); } catch (_) { }
  };
}

// ============================================================================
// 7. SISTEMA AMBIENTAL DE VENTO ORGÂNICO (COM LFO & FADE IN/OUT)
// ============================================================================

function setWind(active) {
  try {
    const ctx = audioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Desativar vento com Fade-Out suave (evita clique seco)
    if (!active) {
      if (windState) {
        const { source, lfo, gain } = windState;
        windState = null;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
        setTimeout(() => {
          try {
            source.stop();
            lfo.stop();
            source.disconnect();
            lfo.disconnect();
            gain.disconnect();
          } catch (_) { }
        }, 450);
      }
      return;
    }

    if (windState) return; // Já está ativo

    const dest = masterCompressor || masterGain || ctx.destination;

    const source = ctx.createBufferSource();
    source.buffer = getPinkNoiseBuffer(ctx);
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 1.2;

    // LFO Lento para simular rajadas naturais de vento uivando
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.22; // Uma rajada a cada ~4.5 segundos
    lfoGain.gain.value = 210;   // Oscila o filtro entre 210Hz e 630Hz
    lfo.connect(lfoGain).connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.038, now + 0.8); // Fade-in suave

    source.connect(filter).connect(gain).connect(dest);
    source.start(now);
    lfo.start(now);

    windState = { source, lfo, filter, gain };
  } catch (_) { }
}