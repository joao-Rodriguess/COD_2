"use strict";
// =====================================================================
// GLOBALS.JS — Three.js Setup + Estado Compartilhado + Key Helper
// =====================================================================

const settings = {
  sensitivity: 0.0022,
  fov: 75,
  volume: 0.8
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('warzone_settings'));
    if (saved) {
      settings.sensitivity = saved.sensitivity ?? 0.0022;
      settings.fov = saved.fov ?? 75;
      settings.volume = saved.volume ?? 0.8;
    }
  } catch (_) {}
}

function saveSettings() {
  try {
    localStorage.setItem('warzone_settings', JSON.stringify(settings));
  } catch (_) {}
}

loadSettings();

// --- Renderer ---
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050914);
scene.fog = new THREE.Fog(0x0c142b, 60, 260);

// --- Camera Rig ---
const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 500);
const pitchObject = new THREE.Object3D();
pitchObject.add(camera);
const yawObject = new THREE.Object3D();
yawObject.add(pitchObject);
yawObject.position.set(0, 2, 30);
scene.add(yawObject);

function applyFov(fovVal) {
  settings.fov = fovVal;
  camera.fov = fovVal;
  camera.updateProjectionMatrix();
  saveSettings();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Luzes ---
const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x334422, 0.75);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0xdde8ff, 0.35);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff2d8, 1.05);
sun.position.set(120, 160, 80);
sun.castShadow = true;
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
sun.shadow.camera.far = 250;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xadc7ff, 0.42);
fill.position.set(-72, 110, -46);
scene.add(fill);

// --- Environment Map ---
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
  format: THREE.RGBAFormat,
  generateMipmaps: true,
  minFilter: THREE.LinearMipmapLinearFilter,
  encoding: THREE.sRGBEncoding
});
const cubeCamera = new THREE.CubeCamera(0.1, 1200, cubeRenderTarget);
scene.add(cubeCamera);
scene.environment = cubeRenderTarget.texture;
const reflectiveMaterials = [];

let frameCount = 0;

// CONSTANTES & TIME SCALE
const WORLD_SIZE = 320;
const MAP_LIMIT = 50000; // Mundo Aberto Infinito
const GRAVITY = -20;
const JUMP_SPEED = 7.2;
const TERRAIN_SEGMENTS = 140;
const BOT_MAX = 7;

let timeScale = 1.0;
let slowMoTimer = 0;

// CONTROLES TÁTICOS GLOBAIS
let isLeaningLeft = false;
let isLeaningRight = false;
let leanAngle = 0;
let isSilenced = false;
let isNvgActive = false;

// TECLAS UNIFICADAS
const keys = {};

function isKeyPressed(code, letter, altKey) {
  if (keys[code]) return true;
  if (letter && (keys[letter] || keys[letter.toLowerCase()] || keys[letter.toUpperCase()])) return true;
  if (altKey && keys[altKey]) return true;
  return false;
}

// ARRAYS COMPARTILHADOS
const collidables = [];
const houseEntries = [];
const lootChests = [];
const climbPoints = [];
const elevatedPlatforms = [];
const barricades = [];
const terrainHeights = [];
const bots = [];
const tracers = [];
const hitEffects = [];
const buildingSpots = [];
const centerPositions = [];
const roadSegments = [];
const airDrops = [];
const ambientParticles = [];

// SKINS DAS ARMAS
const SKINS = {
  default: { name: 'Militar Padrão', color: 0x232323, metalness: 0.6, roughness: 0.35, price: 0 },
  camo:    { name: 'Digital Camo', color: 0x3d4f36, metalness: 0.4, roughness: 0.6, price: 500 },
  gold:    { name: 'Ouro Puro', color: 0xffd700, metalness: 0.95, roughness: 0.15, price: 1200 },
  cyber:   { name: 'Cyber Neon', color: 0x0f1923, emissive: 0x00f0ff, metalness: 0.8, roughness: 0.2, price: 1800 },
  plasma:  { name: 'Plasma Carmesim', color: 0x2a0808, emissive: 0xff2200, metalness: 0.7, roughness: 0.3, price: 2500 },
  void:    { name: 'Void Purple', color: 0x14052b, emissive: 0x9d00ff, metalness: 0.9, roughness: 0.1, price: 3500 }
};

const equippedSkins = { rifle: 'default', pistol: 'default', smg: 'default', shotgun: 'default', sniper: 'default' };
const unlockedSkins = new Set(['rifle_default', 'pistol_default', 'smg_default', 'shotgun_default', 'sniper_default']);

// ESTADO MUTÁVEL
let botIdCounter = 0;
let kills = 0, deaths = 0, wave = 1;
let lastShotTime = 0;
let reloading = false;
let reloadEndTime = 0;
let mouseDown = false;
let bobTime = 0;
let lastDamageTime = -Infinity;
let statusTimeout = null;
let stepTimer = 0;
let windNode = null;
let currentWeaponIdx = 0;
let credits = 750;
let inventoryOpen = false;
let gameRunning = false;
let isPaused = false;
let lastTime = performance.now();
let yaw = 0, pitch = 0;
let pointerLocked = false;
let recoilOffset = 0;
let hitmarkerTimeout = null;
let selectedMap = 'neon_rust';
let menuCameraAngle = 0;

function safeRequestPointerLock() {
  if (!canvas || !gameRunning || isPaused) return;
  try {
    const p = canvas.requestPointerLock();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
  } catch (_) {}
}

// AVIÃO DE CARGA
let dropActive = false;
let inPlane = false;
let planeJumpReady = false;
let planeWalkDistance = 0;
let planeFlightAngle = 0;
const planeFlightRadius = WORLD_SIZE * 0.7;
const planePathHeight = 92;
const planeSpeed = 0.65;
const planePosition = new THREE.Vector3();
const planeLocalPosition = new THREE.Vector3(0, 1.2, 3.5);
let planeCorridorOffset = new THREE.Vector3(0, 0, 0);

// RAYCASTER
const raycaster = new THREE.Raycaster();

// INVENTÁRIO
const inventory = { medkits: 1, barricades: 2, supplies: 0, grenades: 3 };
const unlockedWeapons = new Set(['rifle', 'pistol']);

// JOGADOR
const player = {
  health: 100, maxHealth: 100,
  armor: 0, maxArmor: 100,
  velocity: new THREE.Vector3(),
  onGround: true,
  speed: 6.2, sprintMult: 1.6,
  radius: 0.5, height: 2,
  alive: true,
  stamina: 100, maxStamina: 100,
  staminaExhausted: false,
  crouching: false, crouchLerp: 0,
  isSliding: false, slideTimer: 0, slideDir: new THREE.Vector3(),
  killStreak: 0, bestStreak: 0,
  xp: 0, level: 1, totalKills: 0, headshots: 0,
  accuracy: { shots: 0, hits: 0 }
};

// KILL STREAKS
const streakRewards = [
  { kills: 3, name: 'UAV', desc: 'Inimigos revelados no mapa', active: false, timer: 0, duration: 15000 },
  { kills: 5, name: 'ATAQUE AÉREO', desc: 'Dano em área nos inimigos', active: false },
  { kills: 7, name: 'ARMOR DROP', desc: '+50 Armadura', active: false },
  { kills: 10, name: 'NUKE', desc: 'Elimina todos os inimigos', active: false }
];
let nextStreakIdx = 0;
let uavActive = false;
let uavEndTime = 0;

let waveEnemiesTotal = 5;
let waveEnemiesKilled = 0;
let waveCountdown = 0;
let waveTransition = false;
let waveBonusGiven = false;
let waveCountdownInterval = null;

let lastGrenadeTime = 0;
const grenadeObjects = [];
const GRENADE_COOLDOWN = 2000;
const GRENADE_FUSE = 2.5;
const GRENADE_DAMAGE = 80;
const GRENADE_RADIUS = 8;

let lastDashTime = 0;
const DASH_COOLDOWN = 1500;
const DASH_COST = 30;
const DASH_SPEED = 22;
const DASH_DURATION = 0.15;
let dashActive = false;
let dashDirection = new THREE.Vector3();
let dashTimer = 0;

const damageIndicators = [];
let shakeIntensity = 0;
const SHAKE_DECAY = 0.88;

const XP_PER_KILL = 50;
const XP_PER_HEADSHOT = 100;
const XP_PER_WAVE = 150;
const XP_PER_LEVEL = 500;

function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem('warzone_progress'));
    if (data) {
      credits = data.credits ?? 750;
      player.level = data.level ?? 1;
      player.xp = data.xp ?? 0;
      player.totalKills = data.totalKills ?? 0;
      player.headshots = data.headshots ?? 0;
      player.bestStreak = data.bestStreak ?? 0;
      if (data.weapons) data.weapons.forEach(w => unlockedWeapons.add(w));
      if (data.equippedSkins) Object.assign(equippedSkins, data.equippedSkins);
      if (data.unlockedSkins) data.unlockedSkins.forEach(s => unlockedSkins.add(s));
    }
  } catch (_) {}
}

function saveProgress() {
  try {
    localStorage.setItem('warzone_progress', JSON.stringify({
      credits,
      level: player.level,
      xp: player.xp,
      totalKills: player.totalKills,
      headshots: player.headshots,
      bestStreak: player.bestStreak,
      weapons: [...unlockedWeapons],
      equippedSkins,
      unlockedSkins: [...unlockedSkins]
    }));
  } catch (_) {}
}

loadProgress();
