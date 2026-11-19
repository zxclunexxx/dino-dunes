import * as THREE from './vendor/three.module.js';

const geometryCache = new Map();
const palette = {
  skin: new THREE.MeshStandardMaterial({ color: 0x75bc70, roughness: 0.88, flatShading: true }),
  light: new THREE.MeshStandardMaterial({ color: 0x8bcd7c, roughness: 0.88, flatShading: true }),
  dark: new THREE.MeshStandardMaterial({ color: 0x4b925e, roughness: 0.92, flatShading: true }),
  belly: new THREE.MeshStandardMaterial({ color: 0xd9e8a4, roughness: 0.92 }),
  ivory: new THREE.MeshStandardMaterial({ color: 0xfff8dc, roughness: 0.7 }),
  ink: new THREE.MeshStandardMaterial({ color: 0x203b36, roughness: 0.85 }),
  cactus: new THREE.MeshStandardMaterial({ color: 0x418778, roughness: 1, flatShading: true }),
  cactusLight: new THREE.MeshStandardMaterial({ color: 0x61a08b, roughness: 1, flatShading: true }),
  cactusDark: new THREE.MeshStandardMaterial({ color: 0x326d63, roughness: 1, flatShading: true }),
};

// Small, flat bevels preserve the toy-block silhouette and catch the desert light.
function boxGeometry(width, height, depth, bevel = 0.035) {
  const b = Math.min(bevel, width * 0.2, height * 0.2, depth * 0.2);
  const key = `${width}:${height}:${depth}:${b}`;
  if (geometryCache.has(key)) return geometryCache.get(key);
  const x = width / 2 - b;
  const y = height / 2 - b;
  const shape = new THREE.Shape();
  shape.moveTo(-x, -y);
  shape.lineTo(x, -y);
  shape.lineTo(x, y);
  shape.lineTo(-x, y);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - b * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -(depth - b * 2) / 2);
  geometryCache.set(key, geometry);
  return geometry;
}

function block(parent, size, position, material = palette.skin, bevel = 0.035) {
  const mesh = new THREE.Mesh(boxGeometry(...size, bevel), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createDinosaur() {
  const group = new THREE.Group();
  group.name = 'Dinosaur';
  const rig = new THREE.Group();
  group.add(rig);

  const torso = new THREE.Group();
  rig.add(torso);
  block(torso, [0.86, 0.93, 0.86], [0, 1.02, 0.13]);
  block(torso, [0.66, 0.69, 0.58], [0, 1.48, -0.16], palette.light);
  block(torso, [0.59, 0.69, 0.075], [0, 1.02, -0.315], palette.belly, 0.018);
  block(torso, [0.44, 0.47, 0.065], [0, 1.47, -0.463], palette.belly, 0.015);

  const head = new THREE.Group();
  head.position.set(0, 1.78, -0.35);
  torso.add(head);
  block(head, [0.86, 0.58, 0.79], [0, 0.15, -0.17], palette.light, 0.06);
  block(head, [0.85, 0.35, 0.59], [0, -0.02, -0.57], palette.light, 0.045);
  block(head, [0.70, 0.13, 0.61], [0, -0.218, -0.51], palette.belly, 0.025);

  for (const side of [-1, 1]) {
    // Side-mounted eyes remain readable from the three-quarter chase camera.
    block(head, [0.055, 0.205, 0.225], [side * 0.434, 0.22, -0.29], palette.ivory, 0.018);
    block(head, [0.027, 0.122, 0.108], [side * 0.47, 0.212, -0.335], palette.ink, 0.012);
    block(head, [0.015, 0.037, 0.035], [side * 0.487, 0.25, -0.354], palette.ivory, 0.005);
    block(head, [0.074, 0.06, 0.24], [side * 0.433, 0.348, -0.285], palette.skin, 0.012);
    block(head, [0.075, 0.017, 0.075], [side * 0.245, 0.161, -0.69], palette.dark, 0.006);
    block(head, [0.018, 0.022, 0.38], [side * 0.426, -0.12, -0.586], palette.dark, 0.004);
    block(head, [0.06, 0.06, 0.04], [side * 0.26, -0.16, -0.865], palette.ivory, 0.008);
  }

  const tail = new THREE.Group();
  tail.position.set(0, 0.94, 0.49);
  torso.add(tail);
  const tailBase = block(tail, [0.56, 0.49, 0.57], [0, 0.025, 0.21]);
  tailBase.rotation.x = -0.19;
  const tailMiddle = block(tail, [0.37, 0.32, 0.54], [0, 0.11, 0.64]);
  tailMiddle.rotation.x = -0.22;
  const tailTip = block(tail, [0.20, 0.20, 0.44], [0, 0.21, 1.02], palette.light);
  tailTip.rotation.x = -0.25;

  // A few large back plates give the silhouette personality without visual noise.
  block(torso, [0.14, 0.22, 0.20], [0, 1.52, 0.44], palette.dark, 0.02);
  block(torso, [0.14, 0.19, 0.20], [0, 1.30, 0.61], palette.dark, 0.02);
  block(tail, [0.11, 0.16, 0.18], [0, 0.29, 0.41], palette.dark, 0.015);
  block(tail, [0.09, 0.13, 0.15], [0, 0.32, 0.73], palette.dark, 0.012);

  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.43, 1.30, -0.19);
    torso.add(arm);
    block(arm, [0.18, 0.32, 0.20], [0, -0.10, -0.035]);
    block(arm, [0.18, 0.15, 0.29], [0, -0.23, -0.14], palette.light);
    for (const finger of [-1, 1]) {
      block(arm, [0.045, 0.07, 0.08], [finger * 0.047, -0.245, -0.31], palette.ivory, 0.008);
    }
    arms.push(arm);

    const leg = new THREE.Group();
    leg.position.set(side * 0.32, 0.65, 0.13);
    rig.add(leg);
    block(leg, [0.32, 0.47, 0.41], [0, -0.13, 0.015]);
    block(leg, [0.22, 0.31, 0.23], [0, -0.40, -0.035], palette.light);
    block(leg, [0.32, 0.16, 0.49], [0, -0.57, -0.16], palette.light);
    for (const toe of [-1, 0, 1]) {
      block(leg, [0.067, 0.075, 0.085], [toe * 0.092, -0.59, -0.4], palette.ivory, 0.012);
    }
    legs.push(leg);
  }

  return {
    group,
    animate(time, speed = 1, airborne = false, dead = false) {
      const movement = Math.min(1, Math.max(0, speed) / 6);
      const phase = time * (8 + Math.min(Math.max(speed, 0), 30) * 0.48);
      const stride = Math.sin(phase) * 0.62 * movement;
      rig.position.y = dead ? 0 : (airborne ? 0 : Math.abs(Math.cos(phase)) * 0.045 * movement);
      torso.rotation.x = dead ? -0.12 : (airborne ? -0.075 : Math.sin(phase * 2) * 0.014 * movement);
      torso.rotation.z = dead ? 0 : Math.sin(phase) * 0.018 * movement;
      head.rotation.x = dead ? 0.12 : Math.sin(time * 2.2) * 0.025;
      tail.rotation.y = dead ? 0 : Math.sin(phase * 0.5) * 0.09 * movement;
      tail.rotation.x = airborne ? -0.14 : 0;
      legs[0].rotation.x = dead ? 0.12 : (airborne ? -0.48 : stride);
      legs[1].rotation.x = dead ? -0.12 : (airborne ? 0.30 : -stride);
      arms[0].rotation.x = dead ? -0.25 : (airborne ? -0.45 : -stride * 0.32);
      arms[1].rotation.x = dead ? -0.25 : (airborne ? -0.45 : stride * 0.32);
    },
  };
}

export function createCactus(height = 1.4) {
  const group = new THREE.Group();
  group.name = 'Cactus';
  const h = Math.max(0.6, height);
  block(group, [0.37, h, 0.36], [0, h / 2, 0], palette.cactus, 0.06);
  block(group, [0.07, h * 0.87, 0.018], [0.09, h * 0.48, 0.183], palette.cactusLight, 0.005);
  block(group, [0.035, h * 0.87, 0.018], [-0.095, h * 0.48, 0.183], palette.cactusDark, 0.005);
  for (const side of [-1, 1]) {
    const shoulder = h * (side < 0 ? 0.40 : 0.58);
    const rise = h * (side < 0 ? 0.36 : 0.25);
    block(group, [0.33, 0.22, 0.27], [side * 0.295, shoulder, 0], palette.cactus, 0.035);
    block(group, [0.23, rise, 0.27], [side * 0.44, shoulder + rise / 2 - 0.07, 0], palette.cactus, 0.045);
    block(group, [0.045, rise * 0.62, 0.018], [side * 0.44, shoulder + rise * 0.47, 0.139], palette.cactusLight, 0.005);
  }
  // Sparse tiny needles read as cactus texture even at runner speed.
  for (let row = 0; row < 4; row += 1) {
    const y = h * (0.18 + row * 0.19);
    block(group, [0.043, 0.018, 0.025], [row % 2 ? 0.04 : -0.045, y, 0.193], palette.belly, 0.003);
  }
  return group;
}
