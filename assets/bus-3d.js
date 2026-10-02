// 3D VIP bus simulation — big-head (chibi) passengers per bus, Three.js r160
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const host = document.getElementById('bus3d');
const canvasWrap = document.getElementById('bus3d-canvas');
const tip = document.getElementById('bus3d-tip');
const tabs = document.getElementById('bus3d-tabs');
const caption = document.getElementById('bus3d-caption');
const CFG = window.BUS_CONFIG;
const CHIBI = 1.3;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- helpers ----------
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const SKIN = [0xffe0c2, 0xf5cfa8, 0xeab98f, 0xd9a273, 0xc68b5e];
const HAIR = [0x2b2118, 0x3b2a20, 0x5a3b28, 0x1c1c22, 0x8a5a3b, 0xc94f7c, 0x4a6fd1];
const SHIRT_TINT = [0xffffff, 0xfff4d6, 0xe8f6ff, 0xffe3ee];

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
canvasWrap.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1024);
scene.fog = new THREE.Fog(0x6a3a5a, 40, 140);

const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 200);
camera.position.set(9.5, 7.2, 10.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.6, -1.5);
controls.enableDamping = true;
controls.minDistance = 6; controls.maxDistance = 38;
controls.maxPolarAngle = Math.PI * 0.48;
controls.autoRotate = !reduceMotion; controls.autoRotateSpeed = 0.6;

scene.add(new THREE.HemisphereLight(0xb9ccff, 0x2a2030, 1.1));
const moon = new THREE.DirectionalLight(0xcfd8ff, 0.9);
moon.position.set(6, 14, 8); moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
Object.assign(moon.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6, near: 1, far: 40 });
scene.add(moon);

// stars
{
  const g = new THREE.BufferGeometry(); const n = 500; const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - .5) * 160; p[i * 3 + 1] = 12 + Math.random() * 40; p[i * 3 + 2] = -30 - Math.random() * 60; }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: .18, transparent: true, opacity: .8 })));
}

// ---------- road & moving scenery ----------
const world = new THREE.Group(); scene.add(world);
const road = new THREE.Mesh(new THREE.PlaneGeometry(220, 12), new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: .85 }));
road.rotation.x = -Math.PI / 2; road.receiveShadow = true; world.add(road);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 120), new THREE.MeshStandardMaterial({ color: 0x0f1a14, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; world.add(ground);

const dashGeo = new THREE.BoxGeometry(2.2, 0.02, 0.18);
const dashes = new THREE.InstancedMesh(dashGeo, new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x6b5200 }), 40);
const m4 = new THREE.Matrix4(); const dashX = [];
for (let i = 0; i < 40; i++) { dashX.push(-80 + i * 4.4); }
world.add(dashes);
const edgeL = new THREE.Mesh(new THREE.BoxGeometry(220, .02, .12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x333333 }));
edgeL.position.set(0, .01, 5.6); world.add(edgeL);
const edgeR = edgeL.clone(); edgeR.position.z = -5.6; world.add(edgeR);

// street lamps (moving)
const lamps = [];
{
  const poleGeo = new THREE.CylinderGeometry(.06, .08, 4.2, 8);
  const armGeo = new THREE.BoxGeometry(.9, .08, .08);
  const bulbGeo = new THREE.SphereGeometry(.16, 12, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x5b6472, metalness: .6, roughness: .4 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff2c4, emissive: 0xffd27a, emissiveIntensity: 2 });
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = 2.1; g.add(pole);
    const arm = new THREE.Mesh(armGeo, poleMat); arm.position.set(0, 4.15, i % 2 ? .45 : -.45); arm.rotation.y = Math.PI / 2; g.add(arm);
    const bulb = new THREE.Mesh(bulbGeo, bulbMat); bulb.position.set(0, 4.05, i % 2 ? .85 : -.85); g.add(bulb);
    g.position.set(-60 + i * 12, 0, i % 2 ? -6.6 : 6.6);
    world.add(g); lamps.push(g);
  }
}
// ---------- seaside: sky dome, sun, ocean, beach, palms ----------
const skyUniforms = { top: { value: new THREE.Color(0x24154a) }, mid: { value: new THREE.Color(0xd2566b) }, bottom: { value: new THREE.Color(0xffb36b) } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.6, h)) : mix(bottom, mid, smoothstep(-0.05, 0.08, h)); gl_FragColor = vec4(c, 1.0); }'
}));
scene.add(sky);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(6, 40), new THREE.MeshBasicMaterial({ color: 0xffd08a, fog: false }));
sunDisc.position.set(-18, 4.5, -120); scene.add(sunDisc);
const sunGlow = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshBasicMaterial({ color: 0xff9a6b, transparent: true, opacity: .28, fog: false, depthWrite: false }));
sunGlow.position.set(-18, 4.5, -120.5); scene.add(sunGlow);
const sunLight = new THREE.DirectionalLight(0xffb27a, .9); sunLight.position.set(-18, 6, -60); scene.add(sunLight);

// beach strip between road and sea, grass on the near side
const sand = new THREE.Mesh(new THREE.PlaneGeometry(240, 10), new THREE.MeshStandardMaterial({ color: 0xe3c79a, roughness: 1 }));
sand.rotation.x = -Math.PI / 2; sand.position.set(0, -.01, -11); world.add(sand);
ground.material.color.set(0x2f5a3a); ground.position.z = 60;

// animated ocean (vertex waves)
const oceanGeo = new THREE.PlaneGeometry(260, 130, 130, 50); oceanGeo.rotateX(-Math.PI / 2);
const oceanBase = Float32Array.from(oceanGeo.attributes.position.array);
const ocean = new THREE.Mesh(oceanGeo, new THREE.MeshStandardMaterial({ color: 0x1b6f8a, metalness: .15, roughness: .18, flatShading: true }));
ocean.position.set(0, -.25, -81); scene.add(ocean);
// sun glitter path on the water
const glitter = new THREE.Mesh(new THREE.PlaneGeometry(9, 110), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
glitter.rotation.x = -Math.PI / 2; glitter.position.set(-16, -.1, -70); scene.add(glitter);
// surf line
const surf = new THREE.Mesh(new THREE.PlaneGeometry(260, .6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .75 }));
surf.rotation.x = -Math.PI / 2; surf.position.set(0, -.05, -16.2); scene.add(surf);
// a few boats on the horizon
const boats = [];
for (let i = 0; i < 4; i++) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, .5, .8), new THREE.MeshStandardMaterial({ color: 0xf2f2f2 }));
  const sail = new THREE.Mesh(new THREE.ConeGeometry(.9, 2.2, 3), new THREE.MeshStandardMaterial({ color: [0xff6b6b, 0xffd23f, 0xffffff, 0x4dd0e1][i] }));
  sail.position.y = 1.3; g.add(hull, sail);
  g.position.set(-60 + i * 38, 0, -55 - i * 9); scene.add(g); boats.push(g);
}
// palm trees along the beach (move with the road)
const palms = [];
{
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: .8, side: THREE.DoubleSide });
  const segGeo = new THREE.CylinderGeometry(.14, .18, .7, 7);
  const leafGeo = new THREE.SphereGeometry(1, 10, 6); leafGeo.scale(1.5, .12, .4); leafGeo.translate(1.3, 0, 0);
  const coconut = new THREE.SphereGeometry(.13, 8, 6);
  for (let i = 0; i < 12; i++) {
    const p = new THREE.Group(); const lean = (i % 2 ? .12 : -.1);
    for (let k = 0; k < 7; k++) { const seg = new THREE.Mesh(segGeo, trunkMat); seg.position.set(lean * k * k * .1, .35 + k * .66, 0); seg.rotation.z = -lean * k * .25; seg.castShadow = true; p.add(seg); }
    const top = new THREE.Group(); top.position.set(lean * 3.6, 4.7, 0); p.add(top);
    for (let k = 0; k < 7; k++) { const leaf = new THREE.Mesh(leafGeo, leafMat); leaf.rotation.set(0, k * Math.PI * 2 / 7, -.45); top.add(leaf); }
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(coconut, trunkMat); c.position.set(Math.cos(k * 2) * .2, -.15, Math.sin(k * 2) * .2); top.add(c); }
    p.userData.top = top;
    p.position.set(-66 + i * 11 + (i % 3), 0, -9 - (i % 3) * 1.6);
    p.scale.setScalar(.9 + (i % 4) * .12);
    world.add(p); palms.push(p);
  }
}
function setSky(mood) {
  const night = mood === 'sleep';
  skyUniforms.top.value.set(night ? 0x060a22 : 0x24154a);
  skyUniforms.mid.value.set(night ? 0x1b2a5c : 0xd2566b);
  skyUniforms.bottom.value.set(night ? 0x3a4f8a : 0xffb36b);
  sunDisc.material.color.set(night ? 0xf3f0d7 : 0xffd08a);
  sunDisc.scale.setScalar(night ? .55 : 1);
  sunDisc.position.y = night ? 22 : 4.5; sunGlow.position.y = sunDisc.position.y;
  sunGlow.material.color.set(night ? 0xbfd0ff : 0xff9a6b);
  glitter.material.color.set(night ? 0xbfd0ff : 0xffd9a0);
  sunLight.color.set(night ? 0x8fa4ff : 0xffb27a); sunLight.intensity = night ? .35 : .9;
  scene.fog.color.set(night ? 0x0b1430 : 0x6a3a5a);
  ocean.material.color.set(night ? 0x0f3550 : 0x1b6f8a);
}
// ---------- the VIP bus ----------
const L = 12.4, W = 2.6, FLOOR = 0.62, H = 3.1;
const bus = new THREE.Group(); scene.add(bus);
const busMats = {
  paint: new THREE.MeshPhysicalMaterial({ color: 0x6c8cff, metalness: .55, roughness: .28, clearcoat: 1, clearcoatRoughness: .12 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x111318, metalness: .3, roughness: .5 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x9fd4ff, metalness: 0, roughness: .05, transmission: .0, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false }),
  floor: new THREE.MeshStandardMaterial({ color: 0x1d1a24, roughness: .6, metalness: .2 }),
  seat: new THREE.MeshStandardMaterial({ color: 0x3a1f2b, roughness: .55 }),
  seatTrim: new THREE.MeshStandardMaterial({ color: 0xd9b56b, metalness: .8, roughness: .3 }),
  led: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x6c8cff, emissiveIntensity: 2.4 }),
  head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3c4, emissiveIntensity: 3 }),
  tail: new THREE.MeshStandardMaterial({ color: 0xff2a3d, emissive: 0xff1030, emissiveIntensity: 2.5 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: .9 }),
  rim: new THREE.MeshStandardMaterial({ color: 0xcfd6df, metalness: .9, roughness: .25 })
};
// chassis (lower body, opaque)
const lower = new THREE.Mesh(new THREE.BoxGeometry(L, 1.25, W), busMats.paint);
lower.position.y = FLOOR + 0.0; lower.castShadow = true; bus.add(lower);
const skirt = new THREE.Mesh(new THREE.BoxGeometry(L - .2, .18, W + .02), busMats.dark); skirt.position.y = FLOOR - .58; bus.add(skirt);
// floor inside
const floor = new THREE.Mesh(new THREE.BoxGeometry(L - .3, .06, W - .2), busMats.floor);
floor.position.y = FLOOR + .64; floor.receiveShadow = true; bus.add(floor);
// glass greenhouse (upper body, see-through) + slim pillars
const glassBox = new THREE.Mesh(new THREE.BoxGeometry(L - .1, H - 1.25, W - .05), busMats.glass);
glassBox.position.y = FLOOR + .62 + (H - 1.25) / 2; bus.add(glassBox);
const roofFrame = new THREE.Mesh(new THREE.BoxGeometry(L, .12, W), busMats.paint);
roofFrame.position.y = FLOOR + .62 + (H - 1.25); bus.add(roofFrame);
roofFrame.material = busMats.paint;
{
  const pillarGeo = new THREE.BoxGeometry(.05, H - 1.25, .05);
  for (let i = 0; i <= 8; i++) for (const s of [-1, 1]) {
    const p = new THREE.Mesh(pillarGeo, busMats.dark);
    p.position.set(-L / 2 + .05 + i * (L - .1) / 8, glassBox.position.y, s * (W / 2 - .02)); bus.add(p);
  }
}
// cut the roof center open (VIP sky-roof) so we can see inside from above
roofFrame.scale.set(1, 1, 1);
const roofHole = new THREE.Mesh(new THREE.BoxGeometry(L - 1.6, .14, W - .6), busMats.glass);
roofHole.position.copy(roofFrame.position); bus.add(roofHole);
roofFrame.visible = false;
const roofRails = [-1, 1].map((s) => { const r = new THREE.Mesh(new THREE.BoxGeometry(L, .14, .3), busMats.paint); r.position.set(0, roofFrame.position.y, s * (W / 2 - .15)); bus.add(r); return r; });
[-1, 1].forEach((s) => { const r = new THREE.Mesh(new THREE.BoxGeometry(.8, .14, W), busMats.paint); r.position.set(s * (L / 2 - .4), roofFrame.position.y, 0); bus.add(r); });
// LED underglow + window LED line
const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(L - .4, .05, W + .06), busMats.led); ledStrip.position.y = FLOOR - .5; bus.add(ledStrip);
const ledTop = new THREE.Mesh(new THREE.BoxGeometry(L - .2, .04, W + .04), busMats.led); ledTop.position.y = FLOOR + .64; bus.add(ledTop);
// lights
[-.85, .85].forEach((z) => {
  const hl = new THREE.Mesh(new THREE.BoxGeometry(.06, .18, .45), busMats.head); hl.position.set(L / 2 + .01, FLOOR - .15, z); bus.add(hl);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(.06, .5, .2), busMats.tail); tl.position.set(-L / 2 - .01, FLOOR + .1, z * 1.2); bus.add(tl);
});
const headBeam = new THREE.SpotLight(0xfff1c8, 40, 30, .45, .5, 1.5);
headBeam.position.set(L / 2, FLOOR, 0); headBeam.target.position.set(L / 2 + 10, 0, 0); bus.add(headBeam, headBeam.target);
// wheels
const wheels = [];
{
  const tireGeo = new THREE.CylinderGeometry(.55, .55, .42, 24); tireGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(.3, .3, .44, 12); rimGeo.rotateX(Math.PI / 2);
  for (const x of [-L / 2 + 1.8, -L / 2 + 3.1, L / 2 - 2.2]) for (const z of [-W / 2 + .12, W / 2 - .12]) {
    const g = new THREE.Group(); g.position.set(x, .55, z);
    const t = new THREE.Mesh(tireGeo, busMats.tire); t.castShadow = true; g.add(t);
    const r = new THREE.Mesh(rimGeo, busMats.rim); g.add(r);
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(.5, .06, .46), busMats.dark); g.add(spoke);
    bus.add(g); wheels.push(g);
  }
}
// side livery (canvas texture)
function liveryTexture(b) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 1024, 128);
  x.fillStyle = 'rgba(255,255,255,.95)'; x.font = '700 64px Mitr, sans-serif'; x.textBaseline = 'middle';
  x.fillText(`VIP BUS ${b.id}  ${b.name}`, 40, 66);
  x.font = '600 34px Mitr, sans-serif'; x.fillStyle = '#ffd23f'; x.fillText('HSST TRIP 2026', 760, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const liveryMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
const liveryL = new THREE.Mesh(new THREE.PlaneGeometry(L - 1.2, 1.2 * (L - 1.2) / 8), liveryMat);
liveryL.position.set(0, FLOOR + .05, W / 2 + .012); bus.add(liveryL);
const liveryR = liveryL.clone(); liveryR.rotation.y = Math.PI; liveryR.position.z = -W / 2 - .012; bus.add(liveryR);

// ---------- interior: seats ----------
const seatGeo = new THREE.BoxGeometry(.42, .12, .42);
const backGeo = new THREE.BoxGeometry(.1, .62, .42);
const armGeo2 = new THREE.BoxGeometry(.42, .05, .04);
function seatPositions(cap) {
  const pos = []; const rows = Math.floor(cap / 4), rem = cap % 4; const back5 = rem === 1 && rows > 0; const reg = back5 ? rows - 1 : rows;
  const totalRows = reg + ((back5 || rem) ? 1 : 0);
  const span = L - 2.6; const step = Math.min(.95, span / Math.max(totalRows - 1, 1));
  const xAt = (r) => L / 2 - 2.0 - r * step;
  const zs = [-.92, -.48, .48, .92];
  for (let r = 0; r < reg; r++) zs.forEach((z) => pos.push({ x: xAt(r), z }));
  if (back5) [-.92, -.46, 0, .46, .92].forEach((z) => pos.push({ x: xAt(reg), z }));
  else for (let c = 0; c < rem; c++) pos.push({ x: xAt(reg), z: zs[c] });
  return pos;
}
const seatsGroup = new THREE.Group(); bus.add(seatsGroup);
function buildSeats(cap) {
  seatsGroup.clear();
  seatPositions(cap).forEach((p) => {
    const g = new THREE.Group(); g.position.set(p.x, FLOOR + .67, p.z);
    const s = new THREE.Mesh(seatGeo, busMats.seat); s.position.y = .38; s.castShadow = true; g.add(s);
    const b = new THREE.Mesh(backGeo, busMats.seat); b.position.set(-.2, .7, 0); g.add(b);
    const t = new THREE.Mesh(armGeo2, busMats.seatTrim); t.position.set(0, .46, .21); g.add(t);
    seatsGroup.add(g);
  });
}
// karaoke screen / dj booth at the front
const screenTexCanvas = document.createElement('canvas'); screenTexCanvas.width = 512; screenTexCanvas.height = 256;
const screenTex = new THREE.CanvasTexture(screenTexCanvas); screenTex.colorSpace = THREE.SRGBColorSpace;
const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.7, .85), new THREE.MeshBasicMaterial({ map: screenTex }));
screen.position.set(L / 2 - .5, FLOOR + 2.0, 0); screen.rotation.y = -Math.PI / 2; bus.add(screen);
function drawScreen(text, color) {
  const x = screenTexCanvas.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 256); g.addColorStop(0, '#120a2a'); g.addColorStop(1, color);
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '600 54px Mitr, sans-serif'; x.fillText(text, 256, 128);
  screenTex.needsUpdate = true;
}
// disco ball + party lights
const disco = new THREE.Mesh(new THREE.IcosahedronGeometry(.32, 2), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: .12, flatShading: true }));
disco.position.set(0, FLOOR + 2.45, 0); bus.add(disco);
const partyLights = [0xff3b8d, 0x3bd5ff, 0xb45cff, 0xffd23f].map((c, i) => {
  const l = new THREE.PointLight(c, 6, 6, 1.6); l.position.set(-4 + i * 2.7, FLOOR + 2.2, 0); bus.add(l); return l;
});
const lasers = [];
{
  const geo = new THREE.CylinderGeometry(.012, .012, 3.2, 6); geo.translate(0, -1.6, 0);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x3bffb4 : 0xff3b8d, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(0, FLOOR + 2.4, 0); bus.add(m); lasers.push(m);
  }
}
const cabinLight = new THREE.PointLight(0xffe7c2, 3, 14, 1.5); cabinLight.position.set(0, FLOOR + 2.3, 0); bus.add(cabinLight);
const cabinFill = [-3.5, 3.5].map((x) => { const l = new THREE.PointLight(0xfff0dc, 2.2, 9, 1.4); l.position.set(x, FLOOR + 2.4, 0); bus.add(l); return l; });

// ---------- chibi passengers ----------
const geo = {
  head: new THREE.SphereGeometry(.27, 24, 18),
  hairCap: new THREE.SphereGeometry(.285, 24, 14, 0, Math.PI * 2, 0, Math.PI * .56),
  bun: new THREE.SphereGeometry(.1, 12, 10),
  longHair: new THREE.CapsuleGeometry(.2, .26, 6, 12),
  body: new THREE.CapsuleGeometry(.13, .16, 6, 12),
  limb: new THREE.CapsuleGeometry(.045, .16, 4, 8),
  leg: new THREE.CapsuleGeometry(.05, .14, 4, 8),
  eye: new THREE.SphereGeometry(.036, 10, 8),
  shine: new THREE.SphereGeometry(.012, 6, 6),
  cheek: new THREE.SphereGeometry(.042, 10, 8),
  mouth: new THREE.TorusGeometry(.035, .011, 6, 12, Math.PI),
  closed: new THREE.TorusGeometry(.035, .009, 6, 12, Math.PI),
  hat: new THREE.ConeGeometry(.12, .3, 14),
  mic: new THREE.CylinderGeometry(.018, .022, .16, 8),
  micHead: new THREE.SphereGeometry(.035, 10, 8),
  z: new THREE.PlaneGeometry(.22, .22)
};
const matCache = new Map();
const mat = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: .55, ...opts }));
  return matCache.get(key);
};
const black = mat(0x1d1b22, { roughness: .3 });
const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
const pink = mat(0xff8fab, { transparent: true, opacity: .7 });
const zTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#cfe0ff'; x.font = '700 52px Mitr, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('z', 32, 34); return new THREE.CanvasTexture(c); })();

function nameSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.font = '600 34px Mitr, sans-serif'; const w = Math.min(240, x.measureText(text).width + 34);
  x.fillStyle = 'rgba(10,12,24,.72)'; x.beginPath(); x.roundRect((256 - w) / 2, 8, w, 48, 24); x.fill();
  x.strokeStyle = color; x.lineWidth = 3; x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 33);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(.9, .225, 1); s.renderOrder = 10; return s;
}

function makeChibi(p, b, standing) {
  const h = hash(p.emp);
  const skin = mat(SKIN[h % SKIN.length]);
  const hairM = mat(HAIR[(h >>> 3) % HAIR.length], { roughness: .7 });
  const shirtC = new THREE.Color(b.color).lerp(new THREE.Color(SHIRT_TINT[(h >>> 6) % SHIRT_TINT.length]), .25);
  const shirt = mat(shirtC.getHex());
  const pants = mat(0x2e3445);
  const g = new THREE.Group(); g.userData = { p, phase: (h % 628) / 100, standing }; g.scale.setScalar(CHIBI);
  const body = new THREE.Mesh(geo.body, shirt); body.position.y = .32; body.castShadow = true; g.add(body);
  const headG = new THREE.Group(); headG.position.y = .74; g.add(headG);
  const head = new THREE.Mesh(geo.head, skin); head.castShadow = true; head.userData.pick = g; headG.add(head);
  const cap = new THREE.Mesh(geo.hairCap, hairM); cap.rotation.z = .5; cap.position.x = -.02; headG.add(cap);
  const style = (h >>> 9) % 3;
  if (style === 1) { const bun = new THREE.Mesh(geo.bun, hairM); bun.position.set(-.12, .26, 0); headG.add(bun); }
  if (style === 2) { const lh = new THREE.Mesh(geo.longHair, hairM); lh.position.set(-.13, -.12, 0); headG.add(lh); }
  const sleepy = b.mood === 'sleep'; const happy = b.mood === 'laugh';
  for (const s of [-1, 1]) {
    if (sleepy || happy) {
      const e = new THREE.Mesh(geo.closed, black); e.position.set(.255, .03, s * .1); e.rotation.set(0, Math.PI / 2, sleepy ? Math.PI : 0); headG.add(e);
    } else {
      const e = new THREE.Mesh(geo.eye, black); e.position.set(.245, .03, s * .1); e.scale.set(.7, 1.15, 1); headG.add(e);
      const sh = new THREE.Mesh(geo.shine, white); sh.position.set(.275, .055, s * .1 + .012); headG.add(sh);
    }
    const ch = new THREE.Mesh(geo.cheek, pink); ch.position.set(.22, -.05, s * .16); ch.scale.set(.5, .6, 1); headG.add(ch);
  }
  const mouth = new THREE.Mesh(geo.mouth, mat(0xc0394f)); mouth.position.set(.262, -.07, 0); mouth.rotation.set(0, Math.PI / 2, Math.PI); headG.add(mouth);
  g.userData.mouth = mouth;
  // arms (pivot at shoulder)
  const arms = [-1, 1].map((s) => {
    const pivot = new THREE.Group(); pivot.position.set(0, .44, s * .16);
    const a = new THREE.Mesh(geo.limb, shirt); a.position.y = -.12; pivot.add(a);
    const hand = new THREE.Mesh(geo.cheek, skin); hand.position.y = -.24; hand.scale.setScalar(1.1); pivot.add(hand);
    g.add(pivot); return pivot;
  });
  g.userData.arms = arms;
  const legs = [-1, 1].map((s) => {
    const pivot = new THREE.Group(); pivot.position.set(0, .2, s * .07);
    const l = new THREE.Mesh(geo.leg, pants); l.position.y = -.11; pivot.add(l);
    if (!standing) pivot.rotation.z = -Math.PI / 2 + .1;
    g.add(pivot); return pivot;
  });
  g.userData.legs = legs;
  if (b.mood === 'sing' && (h % 3 === 0)) {
    const mic = new THREE.Group(); mic.add(new THREE.Mesh(geo.mic, black)); const mh = new THREE.Mesh(geo.micHead, mat(0x9aa3ad, { metalness: .8, roughness: .3 })); mh.position.y = .09; mic.add(mh);
    mic.position.set(.06, -.28, 0); arms[1].add(mic); g.userData.mic = true;
  }
  if (b.mood === 'party') { const hat = new THREE.Mesh(geo.hat, mat([0xff3b8d, 0xffd23f, 0x3bd5ff][h % 3])); hat.position.set(-.02, .36, 0); hat.rotation.z = .25; headG.add(hat); }
  if (sleepy) {
    const z = new THREE.Mesh(geo.z, new THREE.MeshBasicMaterial({ map: zTex, transparent: true, depthWrite: false }));
    z.position.set(.1, .5, 0); headG.add(z); g.userData.z = z;
  }
  g.userData.headG = headG;
  const tag = nameSprite(p.nick || p.emp, b.color); tag.position.y = 1.22; g.add(tag); g.userData.tag = tag;
  return g;
}

const crowd = new THREE.Group(); bus.add(crowd);
let currentBus = CFG.buses[0];
let pickables = [];
let showNames = true;
let sample = false;

function sampleCrowd(b, n = 26) {
  const nicks = ['บอล', 'มิ้นท์', 'ฝน', 'ต้น', 'แบงค์', 'ปุ้ย', 'เบียร์', 'น้ำ', 'ฟ้า', 'กอล์ฟ', 'เอ็ม', 'ออย', 'แนน', 'ตาล', 'พลอย', 'โอ๊ต', 'บอส', 'นุ่น', 'ปาล์ม', 'เจ', 'ป๊อป', 'มด', 'หนิง', 'จอย', 'กิ๊ฟ', 'อาร์ม'];
  return Array.from({ length: n }, (_, i) => ({ emp: String(2000 + b.id * 97 + i * 13), nick: nicks[i % nicks.length], rank: 1 }));
}

function applyTheme(b) {
  const c = new THREE.Color(b.color);
  busMats.paint.color.copy(c);
  busMats.led.emissive.copy(c);
  liveryMat.map?.dispose(); liveryMat.map = liveryTexture(b); liveryMat.needsUpdate = true;
  const party = b.mood === 'dance' || b.mood === 'party';
  disco.visible = party; lasers.forEach((l) => (l.visible = party));
  partyLights.forEach((l) => (l.visible = party || b.mood === 'sing'));
  cabinLight.color.set(b.mood === 'sleep' ? 0x5d74c9 : b.mood === 'laugh' ? 0xffd9a0 : 0xffe7c2);
  cabinLight.intensity = b.mood === 'sleep' ? 1.6 : party ? 1.2 : 3;
  cabinFill.forEach((l) => { l.intensity = b.mood === 'sleep' ? .8 : party ? 1 : 2.2; l.color.set(b.mood === 'sleep' ? 0x7d8fe0 : 0xfff0dc); });
  setSky(b.mood);
  const screenText = { sleep: '😴 Good Night', sing: '🎤 ♪ ร้องเลย ♪', dance: '🪩 VIP DANCE', laugh: '😂 888888', party: '🎉 PARTY BUS' }[b.mood];
  drawScreen(screenText, b.color);
}

function buildCrowd() {
  const data = window.__busData;
  const cap = data?.capacity || CFG.capacity;
  const b = currentBus;
  let people = (data?.data?.seats?.[b.id] || []).slice(0, cap);
  sample = !people.length;
  if (sample) people = sampleCrowd(b);
  crowd.clear(); pickables = [];
  buildSeats(cap);
  const pos = seatPositions(cap);
  const standing = b.mood === 'dance' || b.mood === 'party';
  people.forEach((p, i) => {
    const s = pos[i]; if (!s) return;
    const ch = makeChibi(p, b, standing);
    ch.position.set(s.x + (standing ? .15 : -.02), FLOOR + .67 + (standing ? .02 : .3), s.z);
    ch.rotation.y = standing ? (s.z > 0 ? -.5 : .5) : 0;
    ch.userData.base = ch.position.clone(); ch.userData.baseRot = ch.rotation.y;
    ch.userData.tag.visible = showNames;
    crowd.add(ch);
    pickables.push(ch.userData.headG.children[0]);
  });
  caption.innerHTML = `${b.emoji} <b>VIP Bus ${b.id} · ${b.name}</b> — ${people.length}/${cap} ที่นั่ง${sample ? ' <span class="b3-sample">ตัวอย่าง (ยังไม่มีคนจอง)</span>' : ''}`;
  highlight(lastFind);
}

// tabs
tabs.innerHTML = CFG.buses.map((b, i) => `<button role="tab" aria-selected="${i === 0}" data-id="${b.id}" style="--c:${b.color}">${b.emoji} ${b.name}</button>`).join('');
tabs.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-id]'); if (!btn) return;
  tabs.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', x === btn));
  currentBus = CFG.buses.find((b) => b.id === Number(btn.dataset.id));
  applyTheme(currentBus); buildCrowd();
});
document.getElementById('bus3d-names').addEventListener('change', (e) => {
  showNames = e.target.checked; crowd.children.forEach((c) => (c.userData.tag.visible = showNames));
});
document.getElementById('bus3d-spin').addEventListener('change', (e) => { controls.autoRotate = e.target.checked; });

// external data
let rebuildTimer;
window.addEventListener('busdata', () => { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(buildCrowd, 350); });
let lastFind = '';
function highlight(q) {
  lastFind = q;
  crowd.children.forEach((c) => {
    const hit = q && (c.userData.p.emp === q || (c.userData.p.nick || '').toLowerCase() === q);
    c.scale.setScalar(hit ? CHIBI * 1.4 : CHIBI);
    c.userData.hit = !!hit;
  });
}
window.addEventListener('busfind', (e) => {
  const { q, busId } = e.detail || {};
  if (busId && busId !== currentBus.id) tabs.querySelector(`button[data-id="${busId}"]`)?.click();
  highlight(q || '');
});

// hover tooltip
const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('pointermove', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(pickables, false)[0];
  if (hit) {
    const p = hit.object.userData.pick.userData.p;
    tip.hidden = false; tip.style.left = (e.clientX - r.left + 12) + 'px'; tip.style.top = (e.clientY - r.top - 10) + 'px';
    tip.textContent = `${p.nick} · ${p.emp}${p.rank === 2 ? ' · อันดับ 2' : ''}`;
    renderer.domElement.style.cursor = 'pointer';
  } else { tip.hidden = true; renderer.domElement.style.cursor = ''; }
});
renderer.domElement.addEventListener('pointerleave', () => (tip.hidden = true));

// ---------- animation ----------
const clock = new THREE.Clock();
let running = false;
function animate() {
  if (!running) return;
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05); const t = clock.elapsedTime;
  const speed = reduceMotion ? 0 : 14;
  // scenery
  for (let i = 0; i < dashX.length; i++) {
    dashX[i] -= speed * dt; if (dashX[i] < -90) dashX[i] += 40 * 4.4;
    m4.makeTranslation(dashX[i], .012, 0); dashes.setMatrixAt(i, m4);
  }
  dashes.instanceMatrix.needsUpdate = true;
  lamps.forEach((l) => { l.position.x -= speed * dt; if (l.position.x < -60) l.position.x += 120; });
  palms.forEach((p) => { p.position.x -= speed * dt; if (p.position.x < -70) p.position.x += 132; p.userData.top.rotation.z = Math.sin(t * 1.4 + p.position.z) * .06; });
  boats.forEach((bt, i) => { bt.position.x -= speed * .05 * dt; if (bt.position.x < -90) bt.position.x += 180; bt.position.y = Math.sin(t * 1.2 + i) * .15; bt.rotation.z = Math.sin(t + i) * .05; });
  {
    const pa = oceanGeo.attributes.position; const arr = pa.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = oceanBase[i], z = oceanBase[i + 2];
      arr[i + 1] = Math.sin(x * .18 + t * 1.6) * .28 + Math.cos(z * .22 + t * 1.1) * .22 + Math.sin((x + z) * .09 + t * .7) * .18;
    }
    pa.needsUpdate = true; oceanGeo.computeVertexNormals();
  }
  surf.material.opacity = .45 + Math.sin(t * 1.6) * .3;
  glitter.material.opacity = .25 + Math.sin(t * 3) * .08;
  wheels.forEach((w) => (w.rotation.z -= speed * dt / .55));
  // bus suspension sway
  bus.position.y = Math.sin(t * 2.3) * .025 + Math.sin(t * 7.1) * .008;
  bus.rotation.x = Math.sin(t * 1.3) * .012;
  bus.rotation.z = Math.sin(t * 0.9) * .006;
  // party fx
  if (disco.visible) {
    disco.rotation.y += dt * 1.4;
    lasers.forEach((l, i) => { l.rotation.z = Math.sin(t * 1.7 + i) * .9; l.rotation.x = Math.cos(t * 1.3 + i * .7) * .7; });
  }
  partyLights.forEach((l, i) => { if (l.visible) { l.color.setHSL(((t * .15) + i * .25) % 1, 1, .55); l.intensity = 4 + Math.sin(t * 8 + i) * 2.5; } });
  busMats.led.emissiveIntensity = currentBus.mood === 'sleep' ? 1.2 : 2 + Math.sin(t * 6) * .8;
  // passengers
  const mood = currentBus.mood;
  crowd.children.forEach((c) => {
    const u = c.userData; const ph = u.phase; const [aL, aR] = u.arms; const base = u.base;
    if (!base) return;
    if (mood === 'sleep') {
      u.headG.rotation.x = Math.sin(t * .8 + ph) * .12; u.headG.rotation.z = -.25 + Math.sin(t * .6 + ph) * .05;
      aL.rotation.x = .2; aR.rotation.x = -.2;
      if (u.z) { const k = (t * .4 + ph) % 1; u.z.position.set(.1 + k * .2, .45 + k * .45, 0); u.z.material.opacity = 1 - k; u.z.lookAt(camera.position); }
    } else if (mood === 'sing') {
      c.rotation.x = Math.sin(t * 2.2 + ph) * .12;
      aR.rotation.x = u.mic ? -2.4 : -.3 + Math.sin(t * 2.2 + ph) * .4; aR.rotation.z = u.mic ? -.6 : 0;
      aL.rotation.x = .3 + Math.sin(t * 2.2 + ph) * .3;
      u.mouth.scale.set(1, 1 + Math.abs(Math.sin(t * 6 + ph)) * 1.6, 1);
    } else if (mood === 'dance') {
      const beat = t * 4.2 + ph;
      c.position.y = base.y + Math.abs(Math.sin(beat)) * .16;
      c.rotation.y = u.baseRot + Math.sin(beat * .5) * .7;
      aL.rotation.x = 2.6 + Math.sin(beat) * .5; aR.rotation.x = -2.6 + Math.sin(beat + Math.PI) * .5;
      u.legs[0].rotation.x = Math.sin(beat) * .3; u.legs[1].rotation.x = -Math.sin(beat) * .3;
      u.headG.rotation.x = Math.sin(beat * 2) * .15;
    } else if (mood === 'laugh') {
      c.position.y = base.y + Math.abs(Math.sin(t * 9 + ph)) * .04;
      u.headG.rotation.z = -.15 + Math.sin(t * 9 + ph) * .1;
      aL.rotation.x = .5 + Math.sin(t * 9 + ph) * .2; aR.rotation.x = -.5 - Math.sin(t * 9 + ph) * .2;
      u.mouth.scale.set(1.3, 1.6, 1);
    } else if (mood === 'party') {
      const beat = t * 5 + ph;
      c.position.y = base.y + Math.max(0, Math.sin(beat)) * .26;
      aL.rotation.x = 2.9 + Math.sin(beat * 2) * .35; aR.rotation.x = -2.9 - Math.sin(beat * 2) * .35;
      u.headG.rotation.z = Math.sin(beat) * .2;
      c.rotation.y = u.baseRot + Math.sin(beat * .7) * .4;
    }
    if (u.hit) c.scale.setScalar(CHIBI * (1.4 + Math.sin(t * 6) * .08));
  });
  controls.update();
  renderer.render(scene, camera);
}

let framed = false;
function resize() {
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (!framed) {
    // fit the 12 m bus to the viewport width; look down through the glass roof
    const a = camera.aspect; const dist = a < .9 ? 27 : a < 1.4 ? 19 : 15;
    camera.position.copy(new THREE.Vector3(.42, .36, .86).normalize().multiplyScalar(dist)).add(controls.target);
    framed = true;
  }
}
new ResizeObserver(resize).observe(canvasWrap);

new IntersectionObserver((en) => {
  const vis = en.some((e) => e.isIntersecting);
  if (vis && !running) { running = true; clock.getDelta(); animate(); }
  else if (!vis) running = false;
}, { threshold: .05 }).observe(host);

applyTheme(currentBus);
resize();
buildCrowd();
host.classList.add('ready');
