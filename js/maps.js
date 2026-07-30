// =====================================================================
// MAPS.JS — Temas de Mapa e Decorações
// =====================================================================

const MAPS = {
  verdant: { name: 'Vale Verdante', subtitle: 'Floresta temperada e vilas abandonadas', sky: 0x8fc7ff, fog: 0x8fc7ff, ground: 0x4a7a3c, sun: 0xfff2d8 },
  desert:  { name: 'Ponto de Ruptura', subtitle: 'Deserto árido, visibilidade longa e calor intenso', sky: 0xe6b978, fog: 0xe6b978, ground: 0xa77d43, sun: 0xffd39c },
  night:   { name: 'Porto da Meia-Noite', subtitle: 'Combate noturno sob névoa e luzes industriais', sky: 0x071426, fog: 0x10253a, ground: 0x273a35, sun: 0x8eb8ff }
};

const mapDecor = new THREE.Group();
scene.add(mapDecor);

function buildMapDecor() {
  while (mapDecor.children.length) mapDecor.remove(mapDecor.children[0]);
  const map = selectedMap;
  for (let i = 0; i < 42; i++) {
    const x = (Math.random() * 2 - 1) * (WORLD_SIZE - 12);
    const z = (Math.random() * 2 - 1) * (WORLD_SIZE - 12);
    const baseY = getTerrainHeight(x, z);
    let mesh;
    if (map === 'desert') {
      mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(.5 + Math.random() * 1.4, 0),
        new THREE.MeshStandardMaterial({ color: 0x87643c, roughness: 1 })
      );
      mesh.position.set(x, baseY + .45, z);
      mesh.scale.y = .6 + Math.random() * .7;
    } else if (map === 'night') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 1.3, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x29343a, metalness: .25, roughness: .7 })
      );
      mesh.position.set(x, baseY + .65, z);
      if (i < 10) {
        const lamp = new THREE.PointLight(0x76cfff, 1.1, 22);
        lamp.position.set(x, baseY + 4, z);
        mapDecor.add(lamp);
      }
    } else {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(.35 + Math.random() * .55, 7, 6),
        new THREE.MeshStandardMaterial({ color: 0x315d2d, roughness: 1 })
      );
      mesh.position.set(x, baseY + .35, z);
      mesh.scale.y = .65;
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mapDecor.add(mesh);
  }
}

function applyMapTheme() {
  const map = MAPS[selectedMap];
  scene.background.setHex(map.sky);
  scene.fog.color.setHex(map.fog);
  groundMat.color.setHex(map.ground);
  roadMat.color.setHex(selectedMap === 'night' ? 0x20262d : 0x3a3a3e);
  sun.color.setHex(map.sun);
  hemi.intensity = selectedMap === 'night' ? .32 : .75;
  document.getElementById('mapLabel').textContent = 'ZONA: ' + map.name.toUpperCase();
  buildMapDecor();
}
