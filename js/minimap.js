// =====================================================================
// MINIMAP.JS — Minimapa
// =====================================================================

const miniCanvas = document.getElementById('minimap');
const miniCtx = miniCanvas.getContext('2d');

function drawMinimap() {
  miniCtx.clearRect(0, 0, 150, 150);
  miniCtx.fillStyle = 'rgba(20,40,20,0.9)';
  miniCtx.fillRect(0, 0, 150, 150);
  const scale = 150 / (WORLD_SIZE * 2);

  // Edifícios
  miniCtx.fillStyle = 'rgba(180,180,180,0.5)';
  buildingSpots.forEach(b => {
    const mx = 75 + b.x * scale;
    const mz = 75 + b.z * scale;
    miniCtx.fillRect(mx - 2, mz - 2, 4, 4);
  });

  // Bots
  bots.forEach(bot => {
    if (!bot.alive) return;
    // UAV: sempre mostrar. Normal: só mostrar se em ataque
    if (!uavActive && bot.state !== 'attack') return;
    const mx = 75 + bot.group.position.x * scale;
    const mz = 75 + bot.group.position.z * scale;
    miniCtx.fillStyle = bot.isBoss ? '#ff8800' : bot.state === 'attack' ? '#ff3838' : '#ffb03a';
    miniCtx.beginPath();
    miniCtx.arc(mx, mz, bot.isBoss ? 4 : 3, 0, Math.PI * 2);
    miniCtx.fill();
  });

  // Jogador
  const px = 75 + yawObject.position.x * scale;
  const pz = 75 + yawObject.position.z * scale;
  miniCtx.fillStyle = '#4fd8ff';
  miniCtx.beginPath();
  miniCtx.arc(px, pz, 4, 0, Math.PI * 2);
  miniCtx.fill();
  miniCtx.strokeStyle = '#4fd8ff';
  miniCtx.beginPath();
  miniCtx.moveTo(px, pz);
  miniCtx.lineTo(px + Math.sin(yaw) * -8, pz + Math.cos(yaw) * -8);
  miniCtx.stroke();

  // UAV indicator
  if (uavActive) {
    miniCtx.strokeStyle = 'rgba(79,216,255,0.4)';
    miniCtx.lineWidth = 1;
    miniCtx.strokeRect(1, 1, 148, 148);
    miniCtx.fillStyle = 'rgba(79,216,255,0.6)';
    miniCtx.font = '8px Segoe UI';
    miniCtx.fillText('UAV', 4, 10);
  }
}
