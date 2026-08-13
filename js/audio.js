// =====================================================================
// AUDIO.JS — SINTETIZADOR DE SOM PROCEDURAL AAA EM CAMADAS MULTI-FREQUÊNCIA
// (Tiros de Alta Fidelidade, Plasma, RPG, Rugidos de Feras & Efeitos Ambientais)
// =====================================================================

let audioContext = null;
let masterGain = null;

let userInteracted = false;

function audioCtx() {
  if (!userInteracted) return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = settings.volume;
    masterGain.connect(audioContext.destination);
  }
  return audioContext;
}

function updateMasterVolume() {
  if (masterGain && audioContext) {
    masterGain.gain.setValueAtTime(settings.volume, audioContext.currentTime);
  }
}

function unlockAudio() {
  userInteracted = true;
  try {
    const ctx = audioCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch (_) {}
}

['click', 'keydown', 'pointerdown', 'touchstart', 'mousedown'].forEach(evt => {
  window.addEventListener(evt, () => {
    unlockAudio();
  }, { passive: true });
});

// Gera buffer de ruído branco pré-calculado
let noiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (!noiseBuffer) {
    const size = ctx.sampleRate * 1.0;
    noiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
}

function playSound(kind) {
  if (!userInteracted) return;
  try {
    const ctx = audioCtx();
    if (!ctx || ctx.state === 'suspended') return;
    const now = ctx.currentTime;
    const pitchScale = (timeScale < 1.0) ? 0.6 : 1.0;

    // --- SONS DE TIRO PROCEDURAIS AAA MULTI-CAMADA ---
    if (['rifle', 'rifle_heavy', 'pistol', 'magnum', 'smg', 'shotgun', 'sniper', 'lmg', 'plasma', 'rocket'].includes(kind)) {
      playGunshotSound(ctx, now, kind, pitchScale);
      return;
    }

    // --- SONS DE MONSTROS & FERAS ---
    if (['beast_roar', 'beast_bite', 'acid_spit', 'beast_stomp', 'demon_screech'].includes(kind)) {
      playBeastSound(ctx, now, kind, pitchScale);
      return;
    }

    // --- OUTROS EFEITOS GERAIS ---
    const cfg = {
      reload:    [380, .06, 'triangle'],
      hit:       [850, .035, 'sine'],
      beast_hit: [160, .08, 'sawtooth'],
      jump:      [180, .07, 'triangle'],
      step:      [95,  .025, 'triangle'],
      enemy:     [105 * pitchScale, .06, 'square'],
      explosion: [40 * pitchScale,  .45, 'sawtooth'],
      dash:      [280, .04, 'triangle'],
      slide:     [220, .08, 'sawtooth'],
      airdrop:   [320, .25, 'triangle'],
      streak:    [440, .12, 'sine'],
      armor:     [520, .06, 'triangle'],
      levelup:   [660, .18, 'sine'],
      ui_hover:  [480, .02, 'sine'],
      ui_click:  [750, .035, 'square']
    }[kind] || [220, .06, 'sine'];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = cfg[2];
    osc.frequency.setValueAtTime(cfg[0] * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, cfg[0] * .4), now + cfg[1]);

    filter.type = 'lowpass';
    filter.frequency.value = kind === 'beast_hit' ? 600 : kind === 'explosion' ? 350 : 1800;

    const baseVol = (kind === 'ui_hover' ? 0.04 : kind === 'ui_click' ? 0.08 : kind === 'explosion' ? 0.22 : 0.14);
    gain.gain.setValueAtTime(baseVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + cfg[1]);

    osc.connect(filter).connect(gain).connect(masterGain || ctx.destination);
    osc.start(now);
    osc.stop(now + cfg[1]);

    if (kind === 'explosion') {
      const oscSub = ctx.createOscillator();
      const gainSub = ctx.createGain();
      oscSub.type = 'sawtooth';
      oscSub.frequency.setValueAtTime(32 * pitchScale, now);
      oscSub.frequency.exponentialRampToValueAtTime(14 * pitchScale, now + 0.5);
      gainSub.gain.setValueAtTime(0.25, now);
      gainSub.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      oscSub.connect(gainSub).connect(masterGain || ctx.destination);
      oscSub.start(now);
      oscSub.stop(now + 0.5);
    }

    if (kind === 'levelup') {
      [880, 1100, 1320].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.09, now + 0.07 * (i + 1));
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.07 * (i + 1) + 0.18);
        o.connect(g).connect(masterGain || ctx.destination);
        o.start(now + 0.07 * (i + 1));
        o.stop(now + 0.07 * (i + 1) + 0.18);
      });
    }
  } catch (_) {}
}

// Sintetizador em 3 camadas de tiro (Impacto Sub-Bass + Ruído de Explosão Mecânica + Ressonância Espacial)
function playGunshotSound(ctx, now, type, pitchScale) {
  const dest = masterGain || ctx.destination;

  // Parâmetros por tipo de arma
  let subFreq = 85, noiseCutoff = 3200, dur = 0.12, subVol = 0.25, noiseVol = 0.28, resFreq = 420;

  if (type === 'rifle') {
    subFreq = 90; noiseCutoff = 2800; dur = 0.11; subVol = 0.22; noiseVol = 0.25; resFreq = 500;
  } else if (type === 'rifle_heavy') {
    subFreq = 75; noiseCutoff = 2200; dur = 0.16; subVol = 0.32; noiseVol = 0.30; resFreq = 380;
  } else if (type === 'pistol') {
    subFreq = 140; noiseCutoff = 3600; dur = 0.07; subVol = 0.15; noiseVol = 0.18; resFreq = 700;
  } else if (type === 'magnum') {
    subFreq = 65; noiseCutoff = 1900; dur = 0.22; subVol = 0.38; noiseVol = 0.32; resFreq = 290;
  } else if (type === 'smg') {
    subFreq = 120; noiseCutoff = 4200; dur = 0.055; subVol = 0.14; noiseVol = 0.16; resFreq = 850;
  } else if (type === 'shotgun') {
    subFreq = 50; noiseCutoff = 1400; dur = 0.26; subVol = 0.42; noiseVol = 0.38; resFreq = 220;
  } else if (type === 'sniper') {
    subFreq = 45; noiseCutoff = 1200; dur = 0.38; subVol = 0.48; noiseVol = 0.40; resFreq = 180;
  } else if (type === 'lmg') {
    subFreq = 80; noiseCutoff = 2400; dur = 0.13; subVol = 0.28; noiseVol = 0.26; resFreq = 440;
  } else if (type === 'plasma') {
    subFreq = 220; noiseCutoff = 6000; dur = 0.18; subVol = 0.20; noiseVol = 0.25; resFreq = 1400;
  } else if (type === 'rocket') {
    subFreq = 38; noiseCutoff = 900; dur = 0.55; subVol = 0.55; noiseVol = 0.45; resFreq = 140;
  }

  subFreq *= pitchScale;

  // 1. CAMADA 1: Sub-Bass Transient (Baque no peito)
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = (type === 'plasma') ? 'sine' : 'triangle';
  subOsc.frequency.setValueAtTime(subFreq * 1.8, now);
  subOsc.frequency.exponentialRampToValueAtTime(Math.max(20, subFreq * 0.3), now + dur);
  subGain.gain.setValueAtTime(subVol, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  subOsc.connect(subGain).connect(dest);
  subOsc.start(now);
  subOsc.stop(now + dur);

  // 2. CAMADA 2: Noise Crackle (Estalo de pólvora e ar comprimido)
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer(ctx);
  const noiseFilter = ctx.createBiquadFilter();
  const noiseGain = ctx.createGain();

  noiseFilter.type = (type === 'plasma') ? 'bandpass' : 'lowpass';
  noiseFilter.frequency.setValueAtTime(noiseCutoff, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(Math.max(100, noiseCutoff * 0.2), now + dur);

  noiseGain.gain.setValueAtTime(noiseVol, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

  noiseSrc.connect(noiseFilter).connect(noiseGain).connect(dest);
  noiseSrc.start(now);
  noiseSrc.stop(now + dur);

  // 3. CAMADA 3: Ressonância Mecânica / Eco Espacial
  const resOsc = ctx.createOscillator();
  const resGain = ctx.createGain();
  resOsc.type = (type === 'plasma') ? 'sawtooth' : 'sawtooth';
  resOsc.frequency.setValueAtTime(resFreq, now);
  resOsc.frequency.exponentialRampToValueAtTime(resFreq * 0.5, now + dur * 1.4);

  const resFilter = ctx.createBiquadFilter();
  resFilter.type = 'bandpass';
  resFilter.frequency.value = resFreq;
  resFilter.Q.value = 3.0;

  resGain.gain.setValueAtTime(subVol * 0.4, now);
  resGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 1.4);

  resOsc.connect(resFilter).connect(resGain).connect(dest);
  resOsc.start(now);
  resOsc.stop(now + dur * 1.4);
}

// Sons Sintetizados de Monstros & Criaturas
function playBeastSound(ctx, now, kind, pitchScale) {
  const dest = masterGain || ctx.destination;

  if (kind === 'beast_roar') {
    // Rugido Grave com Frequência Oscilante
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65 * pitchScale, now);
    osc.frequency.linearRampToValueAtTime(110 * pitchScale, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(35 * pitchScale, now + 0.8);

    filter.type = 'lowpass';
    filter.frequency.value = 750;

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(filter).connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.8);

    // Adiciona tremor de ruído no rugido
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const nFilter = ctx.createBiquadFilter();
    const nGain = ctx.createGain();
    nFilter.type = 'bandpass';
    nFilter.frequency.value = 450;
    nFilter.Q.value = 2.0;
    nGain.gain.setValueAtTime(0.2, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    noise.connect(nFilter).connect(nGain).connect(dest);
    noise.start(now);
    noise.stop(now + 0.7);
  } else if (kind === 'beast_bite') {
    // Estalo de Mordida/Garra
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140 * pitchScale, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.12);
  } else if (kind === 'acid_spit') {
    // Disparo Ácido (Gluglu/Chiado)
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.25);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter).connect(gain).connect(dest);
    noise.start(now);
    noise.stop(now + 0.25);
  } else if (kind === 'beast_stomp') {
    // Impacto no Chão de Abominação
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(50 * pitchScale, now);
    osc.frequency.exponentialRampToValueAtTime(15, now + 0.4);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.4);
  } else if (kind === 'demon_screech') {
    // Sopro Agudo de Horror Alado
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650 * pitchScale, now);
    osc.frequency.exponentialRampToValueAtTime(250 * pitchScale, now + 0.35);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}

function setWind(active) {
  try {
    if (!active) {
      if (windNode) { windNode.stop(); windNode = null; }
      return;
    }
    if (windNode) return;
    const ctx = audioCtx();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 520;
    filter.Q.value = .4;
    gain.gain.value = .025;
    source.connect(filter).connect(gain).connect(masterGain || ctx.destination);
    source.start();
    windNode = source;
  } catch (_) {}
}
