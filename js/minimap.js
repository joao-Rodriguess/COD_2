// =====================================================================
// MINIMAP.JS — MINIMAPA DE MUNDO ABERTO INFINITO E RADAR DE AMEAÇAS
// =====================================================================

const miniCanvas = document.getElementById('minimap');
const miniCtx = miniCanvas.getContext('2d');

function drawMinimap() {
  if (!miniCtx || !yawObject) return;
  const pX = yawObject.position.x;
  const pZ = yawObject.position.z;

  const width = 150;
  const height = 150;
  const cx = width / 2;
  const cy = height / 2;
  const mapRadius = 120; // Raio em metros exibido no minimapa
  const scale = width / (mapRadius * 2);

  miniCtx.clearRect(0, 0, width, height);

  // Fundo com Grade Tática
  miniCtx.fillStyle = 'rgba(12, 20, 30, 0.88)';
  miniCtx.fillRect(0, 0, width, height);

  // Grade de Chunks
  miniCtx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
  miniCtx.lineWidth = 1;
  const gridSize = CHUNK_SIZE * scale;
  const offsetX = (pX * scale) % gridSize;
  const offsetZ = (pZ * scale) % gridSize;

  for (let gx = -offsetX; gx <= width; gx += gridSize) {
    miniCtx.beginPath(); miniCtx.moveTo(gx, 0); miniCtx.lineTo(gx, height); miniCtx.stroke();
  }
  for (let gz = -offsetZ; gz <= height; gz += gridSize) {
    miniCtx.beginPath(); miniCtx.moveTo(0, gz); miniCtx.lineTo(width, gz); miniCtx.stroke();
  }

  // 1. Baús de Saque
  miniCtx.fillStyle = '#ffcc00';
  lootChests.forEach(c => {
    if (c.opened || !c.group.visible) return;
    const relX = cx + (c.group.position.x - pX) * scale;
    const relZ = cy + (c.group.position.z - pZ) * scale;
    if (relX >= 0 && relX <= width && relZ >= 0 && relZ <= height) {
      miniCtx.fillRect(relX - 1.5, relZ - 1.5, 3, 3);
    }
  });

  // 2. Feras e Monstros (Pontos Roxo/Rosa Emissivos)
  if (typeof beasts !== 'undefined') {
    beasts.forEach(beast => {
      if (!beast.alive) return;
      const relX = cx + (beast.group.position.x - pX) * scale;
      const relZ = cy + (beast.group.position.z - pZ) * scale;
      if (relX >= 0 && relX <= width && relZ >= 0 && relZ <= height) {
        miniCtx.fillStyle = beast.type === 'juggernaut' ? '#ff0055' : '#bf00ff';
        miniCtx.beginPath();
        miniCtx.arc(relX, relZ, beast.type === 'juggernaut' ? 4 : 2.5, 0, Math.PI * 2);
        miniCtx.fill();
      }
    });
  }

  // 3. Inimigos Bots (Pontos Vermelhos/Laranjas)
  bots.forEach(bot => {
    if (!bot.alive) return;
    if (!uavActive && bot.state !== 'attack') return;
    const relX = cx + (bot.group.position.x - pX) * scale;
    const relZ = cy + (bot.group.position.z - pZ) * scale;
    if (relX >= 0 && relX <= width && relZ >= 0 && relZ <= height) {
      miniCtx.fillStyle = bot.isBoss ? '#ff8800' : '#ff3838';
      miniCtx.beginPath();
      miniCtx.arc(relX, relZ, bot.isBoss ? 4 : 3, 0, Math.PI * 2);
      miniCtx.fill();
    }
  });

  // 4. Jogador (Centro Ciano com Indicador de Visão)
  miniCtx.fillStyle = '#00f0ff';
  miniCtx.beginPath();
  miniCtx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  miniCtx.fill();

  miniCtx.strokeStyle = '#00f0ff';
  miniCtx.lineWidth = 1.5;
  miniCtx.beginPath();
  miniCtx.moveTo(cx, cy);
  miniCtx.lineTo(cx + Math.sin(yaw) * -10, cy + Math.cos(yaw) * -10);
  miniCtx.stroke();

  // UAV Overlay
  if (uavActive) {
    miniCtx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    miniCtx.lineWidth = 1;
    miniCtx.strokeRect(1, 1, width - 2, height - 2);
    miniCtx.fillStyle = '#00f0ff';
    miniCtx.font = '9px Segoe UI';
    miniCtx.fillText('UAV ATIVO', 5, 12);
  }
}
