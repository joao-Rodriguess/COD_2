// =====================================================================
// AUDIO.JS — Sistema de Som Procedural + Master Volume
// =====================================================================

let audioContext = null;
let masterGain = null;

function audioCtx() {
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
  try {
    const ctx = audioCtx();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch (_) {}
}

function playSound(kind) {
  try {
    const ctx = audioCtx();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const cfg = {
      rifle:    [95, .085, 'sawtooth'],
      pistol:   [145, .07, 'square'],
      smg:      [120, .045, 'square'],
      shotgun:  [62, .16, 'sawtooth'],
      reload:   [360, .055, 'triangle'],
      hit:      [720, .04, 'sine'],
      jump:     [180, .07, 'triangle'],
      step:     [95, .025, 'triangle'],
      enemy:    [105, .06, 'square'],
      explosion:[42, .35, 'sawtooth'],
      dash:     [280, .04, 'triangle'],
      streak:   [440, .12, 'sine'],
      armor:    [520, .06, 'triangle'],
      levelup:  [660, .18, 'sine'],
      ui_hover: [480, .02, 'sine'],
      ui_click: [750, .035, 'square']
    }[kind] || [220, .06, 'sine'];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = cfg[2];
    osc.frequency.setValueAtTime(cfg[0] * 1.7, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(35, cfg[0] * .45), now + cfg[1]);

    filter.type = 'lowpass';
    filter.frequency.value = kind === 'shotgun' ? 900 : kind === 'explosion' ? 400 : 1800;

    const baseVol = (kind === 'ui_hover' ? 0.04 : kind === 'ui_click' ? 0.08 : kind === 'explosion' ? 0.18 : 0.12);
    gain.gain.setValueAtTime(baseVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + cfg[1]);

    osc.connect(filter).connect(gain).connect(masterGain || ctx.destination);
    osc.start(now);
    osc.stop(now + cfg[1]);

    // Efeito duplo para explosão (mais graves)
    if (kind === 'explosion') {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(28, now);
      osc2.frequency.exponentialRampToValueAtTime(18, now + 0.4);
      gain2.gain.setValueAtTime(0.15, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.connect(gain2).connect(masterGain || ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.4);
    }

    // Level up: acorde ascendente
    if (kind === 'levelup') {
      [880, 1100].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.08, now + 0.08 * (i + 1));
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.08 * (i + 1) + 0.15);
        o.connect(g).connect(masterGain || ctx.destination);
        o.start(now + 0.08 * (i + 1));
        o.stop(now + 0.08 * (i + 1) + 0.15);
      });
    }
  } catch (_) { /* navegadores podem bloquear áudio até a primeira interação */ }
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
