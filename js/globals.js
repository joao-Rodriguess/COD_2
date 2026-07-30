"use strict";
// =====================================================================
// GLOBALS.JS — Three.js Setup + Estado Compartilhado
// =====================================================================

// --- Settings do Usuário ---
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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc7ff);
scene.fog = new THREE.Fog(0x8fc7ff, 60, 260);

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
sun.shadow.camera.left = -160;
sun.shadow.camera.right = 160;
sun.shadow.camera.top = 160;
sun.shadow.camera.bottom = -160;
sun.shadow.camera.far = 400;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xadc7ff, 0.42);
fill.position.set(-72, 110, -46);
scene.add(fill);

// --- Environment Map ---
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
  format: THREE.RGBAFormat,
  generateMipmaps: true,
  minFilter: THREE.LinearMipmapLinearFilter,
  encoding: THREE.sRGBEncoding
});
const cubeCamera = new THREE.CubeCamera(0.1, 1200, cubeRenderTarget);
scene.add(cubeCamera);
scene.environment = cubeRenderTarget.texture;
const reflectiveMaterials = [];

// =====================================================================
// CONSTANTES
// =====================================================================
const WORLD_SIZE = 320;
const MAP_LIMIT = WORLD_SIZE - 4;
const GRAVITY = -20;
const JUMP_SPEED = 7.2;
const TERRAIN_SEGMENTS = 140;
const BOT_MAX = 7;

// =====================================================================
// ARRAYS COMPARTILHADOS
// =====================================================================
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

// =====================================================================
// ESTADO MUTÁVEL
// =====================================================================
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
let selectedMap = 'verdant';

// Câmera de menu 3D
let menuCameraAngle = 0;

// Avião
let dropActive = false;
let inPlane = false;
let planeJumpReady = false;
let planeWalkDistance = 0;
let planeFlightAngle = 0;
const planeFlightRadius = WORLD_SIZE * 0.7;
const planePathHeight = 92;
const planeSpeed = 0.65;
const planePosition = new THREE.Vector3();
const planeLocalPosition = new THREE.Vector3(0, 1.0, 2.1);
let planeCorridorOffset = new THREE.Vector3(0, 0, 0);

// Controles
const keys = {};

// Raycaster
const raycaster = new THREE.Raycaster();

// =====================================================================
// INVENTÁRIO & DESBLOQUEIOS
// =====================================================================
const inventory = { medkits: 1, barricades: 2, supplies: 0, grenades: 3 };
const unlockedWeapons = new Set(['rifle', 'pistol']);

// =====================================================================
// JOGADOR
// =====================================================================
const player = {
  health: 100,
  maxHealth: 100,
  armor: 0,
  maxArmor: 100,
  velocity: new THREE.Vector3(),
  onGround: true,
  speed: 6.2,
  sprintMult: 1.6,
  radius: 0.5,
  height: 2,
  alive: true,
  // Stamina
  stamina: 100,
  maxStamina: 100,
  staminaExhausted: false,
  // Agachamento
  crouching: false,
  crouchLerp: 0,
  // Kill Streak
  killStreak: 0,
  bestStreak: 0,
  // XP & Progresso
  xp: 0,
  level: 1,
  totalKills: 0,
  headshots: 0,
  accuracy: { shots: 0, hits: 0 }
};

// =====================================================================
// KILL STREAKS
// =====================================================================
const streakRewards = [
  { kills: 3, name: 'UAV', desc: 'Inimigos revelados no mapa', active: false, timer: 0, duration: 15000 },
  { kills: 5, name: 'ATAQUE AÉREO', desc: 'Dano em área nos inimigos', active: false },
  { kills: 7, name: 'ARMOR DROP', desc: '+50 Armadura', active: false },
  { kills: 10, name: 'NUKE', desc: 'Elimina todos os inimigos', active: false }
];
let nextStreakIdx = 0;
let uavActive = false;
let uavEndTime = 0;

// =====================================================================
// SISTEMA DE ONDAS
// =====================================================================
let waveEnemiesTotal = 5;
let waveEnemiesKilled = 0;
let waveCountdown = 0;
let waveTransition = false;
let waveBonusGiven = false;
let waveCountdownInterval = null;

// =====================================================================
// GRANADAS & DASH & OUTROS
// =====================================================================
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

// =====================================================================
// PERSISTÊNCIA
// =====================================================================
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
      weapons: [...unlockedWeapons]
    }));
  } catch (_) {}
}

loadProgress();
