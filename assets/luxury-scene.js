import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('luxury-scene');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas && !prefersReducedMotion) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.2, 8.5);

  const group = new THREE.Group();
  scene.add(group);

  const champagne = new THREE.Color('#d9b56b');
  const emerald = new THREE.Color('#4fc1aa');
  const ivory = new THREE.Color('#fff7df');

  const ribbonMat = new THREE.LineBasicMaterial({
    color: champagne,
    transparent: true,
    opacity: 0.48
  });

  const fineMat = new THREE.LineBasicMaterial({
    color: ivory,
    transparent: true,
    opacity: 0.18
  });

  function makeCurve(offset, scale, material) {
    const points = [];
    for (let i = 0; i < 90; i += 1) {
      const t = i / 89;
      const x = -6.5 + t * 13;
      const y = Math.sin(t * Math.PI * 2.2 + offset) * 0.42 * scale + (t - 0.45) * 1.35;
      const z = Math.cos(t * Math.PI * 1.8 + offset) * 0.35 - 1.4;
      points.push(new THREE.Vector3(x, y, z));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.userData.offset = offset;
    line.userData.scale = scale;
    return line;
  }

  for (let i = 0; i < 7; i += 1) {
    const mat = i % 2 ? fineMat : ribbonMat;
    const line = makeCurve(i * 0.62, 1 + i * 0.04, mat);
    line.position.y = -1.8 + i * 0.55;
    line.position.x = i % 2 ? -0.3 : 0.2;
    group.add(line);
  }

  const sparkleGeometry = new THREE.BufferGeometry();
  const sparkleCount = 150;
  const positions = new Float32Array(sparkleCount * 3);
  const colors = new Float32Array(sparkleCount * 3);
  for (let i = 0; i < sparkleCount; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 5.2;
    positions[i * 3 + 2] = -1 - Math.random() * 3.8;
    const c = i % 5 === 0 ? emerald : (i % 3 === 0 ? ivory : champagne);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  sparkleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const sparkleMat = new THREE.PointsMaterial({
    size: 0.032,
    transparent: true,
    opacity: 0.68,
    vertexColors: true,
    depthWrite: false
  });
  const sparkles = new THREE.Points(sparkleGeometry, sparkleMat);
  group.add(sparkles);

  const planeGeometry = new THREE.PlaneGeometry(9, 4.6, 48, 20);
  const planeMat = new THREE.MeshBasicMaterial({
    color: 0xd9b56b,
    transparent: true,
    opacity: 0.055,
    wireframe: true
  });
  const plane = new THREE.Mesh(planeGeometry, planeMat);
  plane.rotation.x = -0.95;
  plane.rotation.z = -0.1;
  plane.position.set(2.3, -2.7, -2.2);
  group.add(plane);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  let pointerX = 0;
  let pointerY = 0;
  window.addEventListener('pointermove', (event) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * 0.35;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 0.2;
  }, { passive: true });

  window.addEventListener('resize', resize, { passive: true });
  resize();

  const clock = new THREE.Clock();
  function render() {
    const elapsed = clock.getElapsedTime();
    group.rotation.y += (pointerX - group.rotation.y) * 0.025;
    group.rotation.x += (-pointerY - group.rotation.x) * 0.018;
    group.children.forEach((child, index) => {
      if (child.isLine) {
        child.position.x += Math.sin(elapsed * 0.35 + child.userData.offset) * 0.0009;
        child.material.opacity = (index % 2 ? 0.12 : 0.36) + Math.sin(elapsed * 0.55 + index) * 0.05;
      }
    });
    sparkles.rotation.z = elapsed * 0.015;
    sparkles.material.opacity = 0.54 + Math.sin(elapsed * 0.7) * 0.12;
    plane.rotation.z = -0.1 + Math.sin(elapsed * 0.25) * 0.045;
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  render();
}
