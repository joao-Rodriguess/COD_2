// =====================================================================
// PLANE.JS — Avião de Transporte
// =====================================================================

const transportPlane = new THREE.Group();
const planeMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, metalness: .72, roughness: .42, envMap: cubeRenderTarget.texture, envMapIntensity: 0.92 });
const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1f232d, roughness: 0.86, metalness: 0.08 });
const planeGlassMat = new THREE.MeshStandardMaterial({ color: 0x7fb3db, transparent: true, opacity: 0.18, roughness: 0.08, metalness: 0.92, side: THREE.DoubleSide });

const body = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.4, 10.6), planeMat);
body.position.set(0, 1.0, 0); transportPlane.add(body);
const planeFloor = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.16, 10.6), cabinMat);
planeFloor.position.set(0, 0.08, 0); transportPlane.add(planeFloor);
const planeLeftWall = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 10.6), cabinMat);
planeLeftWall.position.set(-2.9, 0.95, 0); transportPlane.add(planeLeftWall);
const planeRightWall = planeLeftWall.clone();
planeRightWall.position.x = 2.9; transportPlane.add(planeRightWall);
const planeBackWall = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.5, 0.16), cabinMat);
planeBackWall.position.set(0, 0.95, -5.1); transportPlane.add(planeBackWall);
const planeRoof = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.18, 10.6), cabinMat);
planeRoof.position.set(0, 1.75, 0); transportPlane.add(planeRoof);
const nose = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.4, 16), planeMat);
nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.0, 6.3); transportPlane.add(nose);
const wing = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.2, 13.6), planeMat);
wing.rotation.x = -Math.PI / 2; wing.position.set(0, 0.0, -0.8); transportPlane.add(wing);
const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.6, 1.7), planeMat);
tailFin.position.set(0, 1.0, -5.8); transportPlane.add(tailFin);
const tailStab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.4), planeMat);
tailStab.rotation.x = -Math.PI / 2; tailStab.position.set(0, 0.4, -5.8); transportPlane.add(tailStab);
const cockpit = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 2.4), cabinMat);
cockpit.position.set(0, 1.3, 2.2); transportPlane.add(cockpit);
const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 2.8), planeGlassMat);
canopy.position.set(0, 1.55, 1.4); transportPlane.add(canopy);
for (let i = 0; i < 2; i++) {
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), planeGlassMat);
  win.position.set(-2.95, 1.25, 1.05 - i * 2.4); win.rotation.y = Math.PI / 2; transportPlane.add(win);
  const win2 = win.clone(); win2.position.x = 2.95; win2.rotation.y = -Math.PI / 2; transportPlane.add(win2);
}
const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.9), new THREE.MeshStandardMaterial({ color: 0x191f25, roughness: 0.75 }));
seat.position.set(0, 0.5, 1.2); transportPlane.add(seat);
const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 10), new THREE.MeshStandardMaterial({ color: 0x292929, roughness: 0.65 }));
stick.position.set(0, 1.0, 1.0); transportPlane.add(stick);
const cabinLight = new THREE.PointLight(0x92d3ff, 1.2, 7);
cabinLight.position.set(0, 1.6, 1.0); transportPlane.add(cabinLight);
transportPlane.visible = false;
scene.add(transportPlane);

function updatePlane(dt) {
  if (!inPlane) return;
  planeFlightAngle += planeSpeed * dt;
  planeFlightAngle %= Math.PI * 2;
  planePosition.set(Math.cos(planeFlightAngle) * planeFlightRadius, planePathHeight, Math.sin(planeFlightAngle) * planeFlightRadius);
  yaw = Math.PI - planeFlightAngle;
  yawObject.rotation.y = yaw;

  const planeRotation = yaw;
  transportPlane.position.copy(planePosition);
  transportPlane.rotation.y = planeRotation;

  const cameraAnchor = planeLocalPosition.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), planeRotation);
  const corridorOffset = planeCorridorOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), planeRotation);
  yawObject.position.copy(planePosition).add(cameraAnchor).add(corridorOffset);
  camera.position.set(0, 0, 0);
}

function jumpFromPlane() {
  inPlane = false;
  dropActive = true;
  player.onGround = false;
  player.velocity.y = -2;
  transportPlane.visible = false;
  showStatus('Pule do avião e prepare-se para a queda', 2400);
}

function updateDrop(dt) {
  if (!dropActive) return;
  player.velocity.y += GRAVITY * dt;
  yawObject.position.y += player.velocity.y * dt;
  transportPlane.position.copy(yawObject.position).add(new THREE.Vector3(0, 4, 7));
  transportPlane.rotation.y = yaw;
  if (yawObject.position.y <= 2) {
    yawObject.position.y = 2;
    player.velocity.y = 0;
    player.onGround = true;
    dropActive = false;
    transportPlane.visible = false;
    setWind(false);
    showStatus('ATERRISSAGEM CONCLUÍDA — ENCONTRE COBERTURA', 2400);
    playSound('jump');
  }
}
