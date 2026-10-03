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
controls.target.set(0, 2.3, -1.5);
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
// ---------- the VIP bus: Thai double-decker party bus ----------
// FLOOR is the upper-deck reference: passengers ride upstairs (upper floor ≈ FLOOR + .66)
const L = 12.4, W = 2.6, FLOOR = 1.48, H = 3.1;
const UP = FLOOR + .64, ROOF = 4.05;
const bus = new THREE.Group(); scene.add(bus);
const busMats = {
  paint: new THREE.MeshPhysicalMaterial({ color: 0x8a1530, metalness: .6, roughness: .25, clearcoat: 1, clearcoatRoughness: .08 }),
  black: new THREE.MeshPhysicalMaterial({ color: 0x0c0d12, metalness: .7, roughness: .18, clearcoat: 1, clearcoatRoughness: .05 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x111318, metalness: .3, roughness: .5 }),
  tint: new THREE.MeshPhysicalMaterial({ color: 0x0b0f18, metalness: .9, roughness: .06, clearcoat: 1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x2a3b52, metalness: .2, roughness: .05, transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false }),
  floor: new THREE.MeshStandardMaterial({ color: 0x1d1a24, roughness: .6, metalness: .2 }),
  seat: new THREE.MeshStandardMaterial({ color: 0x3a1f2b, roughness: .55 }),
  seatTrim: new THREE.MeshStandardMaterial({ color: 0xd9b56b, metalness: .8, roughness: .3 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xff2d55, emissive: 0xff2d55, emissiveIntensity: .6, metalness: .5, roughness: .3 }),
  led: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x6c8cff, emissiveIntensity: 2.4 }),
  head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3c4, emissiveIntensity: 3 }),
  tail: new THREE.MeshStandardMaterial({ color: 0xff2a3d, emissive: 0xff1030, emissiveIntensity: 2.5 }),
  redLamp: new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1a1a, emissiveIntensity: 2.2, roughness: .3 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xe6ebf2, metalness: 1, roughness: .12 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xe0b44c, metalness: 1, roughness: .2 }),
  horn: new THREE.MeshStandardMaterial({ color: 0xff7a3d, metalness: .9, roughness: .2 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: .9 }),
  rim: new THREE.MeshStandardMaterial({ color: 0xcfd6df, metalness: .95, roughness: .15 })
};
// lower body (glossy paint) + black skirt
const lower = new THREE.Mesh(new THREE.BoxGeometry(L, UP - .32, W), busMats.paint);
lower.position.y = (UP + .32) / 2; lower.castShadow = true; bus.add(lower);
const skirt = new THREE.Mesh(new THREE.BoxGeometry(L - .3, .2, W + .02), busMats.black); skirt.position.y = .38; bus.add(skirt);
// lower-deck tinted windows (driver cabin + side band)
[-1, 1].forEach((sd) => {
  const band = new THREE.Mesh(new THREE.PlaneGeometry(4.2, .72), busMats.tint);
  band.position.set(L / 2 - 2.6, 1.55, sd * (W / 2 + .011)); if (sd < 0) band.rotation.y = Math.PI; bus.add(band);
});
// upper floor
const floor = new THREE.Mesh(new THREE.BoxGeometry(L - .3, .06, W - .2), busMats.floor);
floor.position.y = UP; floor.receiveShadow = true; bus.add(floor);
// upper deck: tinted see-through glass so the riders are visible
const hidden = new THREE.MeshBasicMaterial({ visible: false });
const glassBox = new THREE.Mesh(new THREE.BoxGeometry(L - .5, ROOF - UP, W - .06), [busMats.glass, busMats.glass, hidden, hidden, busMats.glass, busMats.glass]);
glassBox.position.set(-.15, (ROOF + UP) / 2, 0); bus.add(glassBox);
{
  const pillarGeo = new THREE.BoxGeometry(.06, ROOF - UP, .06);
  for (let i = 0; i <= 7; i++) for (const sd of [-1, 1]) {
    const p = new THREE.Mesh(pillarGeo, busMats.black);
    p.position.set(-L / 2 + .3 + i * (L - 1.2) / 7, glassBox.position.y, sd * (W / 2 - .03)); bus.add(p);
  }
}
// roof: black rails + glass sky-roof (VIP)
[-1, 1].forEach((sd) => { const r = new THREE.Mesh(new THREE.BoxGeometry(L - .3, .16, .32), busMats.black); r.position.set(-.1, ROOF, sd * (W / 2 - .16)); bus.add(r); });
const roofBack = new THREE.Mesh(new THREE.BoxGeometry(.7, .16, W), busMats.black); roofBack.position.set(-L / 2 + .45, ROOF, 0); bus.add(roofBack);
const roofGlass = new THREE.Mesh(new THREE.PlaneGeometry(L - 1.6, W - .64), new THREE.MeshPhysicalMaterial({ color: 0x0d1420, metalness: .4, roughness: .05, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }));
roofGlass.rotation.x = -Math.PI / 2; roofGlass.position.set(-.2, ROOF, 0); bus.add(roofGlass);
// front: sloped one-piece black windscreen + visor "eyebrow"
const wind = new THREE.Mesh(new THREE.BoxGeometry(.12, ROOF - .85, W - .08), busMats.tint);
wind.position.set(L / 2 - .2, (ROOF + .85) / 2 + .05, 0); wind.rotation.z = .16; bus.add(wind);
const visor = new THREE.Mesh(new THREE.BoxGeometry(1.0, .16, W + .04), busMats.black);
visor.position.set(L / 2 - .2, ROOF + .02, 0); visor.rotation.z = -.12; bus.add(visor);
const nose = new THREE.Mesh(new THREE.BoxGeometry(.5, .9, W), busMats.paint); nose.position.set(L / 2 + .05, .8, 0); bus.add(nose);
// bumper with a row of round red lamps + chrome bar
const bumper = new THREE.Mesh(new THREE.BoxGeometry(.32, .3, W + .06), busMats.paint); bumper.position.set(L / 2 + .36, .52, 0); bus.add(bumper);
const chromeBar = new THREE.Mesh(new THREE.BoxGeometry(.08, .06, W + .1), busMats.chrome); chromeBar.position.set(L / 2 + .52, .36, 0); bus.add(chromeBar);
{
  const lampGeo = new THREE.CylinderGeometry(.095, .095, .06, 16); lampGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 11; i++) { const l = new THREE.Mesh(lampGeo, busMats.redLamp); l.position.set(L / 2 + .53, .54, -W / 2 + .2 + i * (W - .4) / 10); bus.add(l); }
}
// headlights (slanted LED) + mirror "rabbit ears"
[-1, 1].forEach((sd) => {
  const hl = new THREE.Mesh(new THREE.BoxGeometry(.06, .12, .55), busMats.head); hl.position.set(L / 2 + .31, .98, sd * .9); hl.rotation.x = sd * .25; bus.add(hl);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, .55), busMats.paint); arm.position.set(L / 2 + .15, 3.1, sd * (W / 2 + .2)); arm.rotation.x = sd * .5; bus.add(arm);
  const mirror = new THREE.Mesh(new THREE.BoxGeometry(.32, .9, .12), busMats.paint); mirror.position.set(L / 2 + .45, 2.6, sd * (W / 2 + .38)); mirror.rotation.z = .3; bus.add(mirror);
  // trumpet horns on the front shoulders
  for (const k of [0, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(.09, .5, 14, 1, true), busMats.horn); horn.rotation.z = -Math.PI / 2;
    horn.position.set(L / 2 - .5, 3.35 + k * .18, sd * (W / 2 + .06)); bus.add(horn);
  }
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 1.1, 4), busMats.chrome); antenna.position.set(L / 2 - .9, ROOF + .55, sd * .7); antenna.rotation.z = -.25; bus.add(antenna);
});
// wave trim lines (signature Thai party-bus curves)
function waveTube(y0, amp, freq, sd, r = .045) {
  const pts = []; for (let i = 0; i <= 60; i++) { const x = -L / 2 + .2 + (L - .5) * i / 60; pts.push(new THREE.Vector3(x, y0 + Math.sin(x * freq) * amp, sd * (W / 2 + .03))); }
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, r, 8, false), busMats.trim);
}
[-1, 1].forEach((sd) => { bus.add(waveTube(UP + .05, .14, .75, sd)); bus.add(waveTube(ROOF - .18, .1, .55, sd, .035)); });
// LED underglow
const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(L - .4, .05, W + .06), busMats.led); ledStrip.position.y = .3; bus.add(ledStrip);
[-1, 1].forEach((sd) => { const e = new THREE.Mesh(new THREE.BoxGeometry(L - .6, .04, .04), busMats.led); e.position.set(-.1, ROOF + .09, sd * (W / 2 + .01)); bus.add(e); });
// rear tail lights
[-.9, .9].forEach((z) => { const tl = new THREE.Mesh(new THREE.BoxGeometry(.06, .6, .22), busMats.tail); tl.position.set(-L / 2 - .01, 1.0, z); bus.add(tl); });
const headBeam = new THREE.SpotLight(0xfff1c8, 40, 30, .45, .5, 1.5);
headBeam.position.set(L / 2 + .4, .9, 0); headBeam.target.position.set(L / 2 + 10, 0, 0); bus.add(headBeam, headBeam.target);
// speaker tower by the rear door (pulses with the beat)
const speakerRings = [];
{
  const tower = new THREE.Group(); tower.position.set(-L / 2 + 4.3, 1.15, W / 2 + .2);
  tower.add(new THREE.Mesh(new THREE.BoxGeometry(.5, 1.6, .3), busMats.black));
  const coneGeo = new THREE.CylinderGeometry(.16, .16, .05, 20); coneGeo.rotateX(Math.PI / 2);
  const ringGeo = new THREE.TorusGeometry(.17, .025, 8, 24);
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(coneGeo, busMats.dark); cone.position.set(0, -.55 + i * .37, .16); tower.add(cone);
    const ring = new THREE.Mesh(ringGeo, busMats.led); ring.position.set(0, -.55 + i * .37, .18); tower.add(ring); speakerRings.push(ring);
  }
  bus.add(tower);
}
// wheels: chrome rims with gold hubs (2 rear axles + front)
const wheels = [];
{
  const tireGeo = new THREE.CylinderGeometry(.55, .55, .42, 28); tireGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(.36, .36, .44, 20); rimGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(.14, .14, .46, 12); hubGeo.rotateX(Math.PI / 2);
  for (const x of [-L / 2 + 1.9, -L / 2 + 3.2, L / 2 - 2.4]) for (const z of [-W / 2 + .12, W / 2 - .12]) {
    const g = new THREE.Group(); g.position.set(x, .55, z);
    const t = new THREE.Mesh(tireGeo, busMats.tire); t.castShadow = true; g.add(t);
    g.add(new THREE.Mesh(rimGeo, busMats.rim));
    g.add(new THREE.Mesh(hubGeo, busMats.gold));
    for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.07, .3, .47), busMats.chrome); sp.rotation.z = k * Math.PI * 2 / 5; g.add(sp); }
    bus.add(g); wheels.push(g);
  }
}
// side livery: bright party-bus graphics (canvas texture)
function liveryTexture(b) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 300;
  const x = c.getContext('2d'); const r = (n) => (hash(b.id + ':' + n) % 1000) / 1000;
  x.clearRect(0, 0, 2048, 300);
  if (b.mood === 'luck') {
    const g = x.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, '#0b3d2a'); g.addColorStop(1, '#06231a');
    x.fillStyle = g; x.beginPath(); x.roundRect(10, 20, 2028, 260, 40); x.fill();
    x.strokeStyle = '#e0b44c'; x.lineWidth = 10; x.stroke();
    x.font = '700 70px serif'; x.textBaseline = 'middle'; x.textAlign = 'center';
    ['♠', '♥', '♦', '♣', '♠', '♥', '♦', '♣', '♠', '♥'].forEach((sym, i) => { x.fillStyle = i % 2 ? '#ff4d6d' : '#f4f1e8'; x.globalAlpha = .35; x.fillText(sym, 120 + i * 200, 70 + (i % 3) * 80); });
    x.globalAlpha = 1; x.textAlign = 'left';
    x.font = '800 120px Mitr, sans-serif'; x.lineWidth = 14; x.strokeStyle = '#2a1600'; x.strokeText('888', 420, 150);
    const gold = x.createLinearGradient(0, 90, 0, 210); gold.addColorStop(0, '#fff3b0'); gold.addColorStop(.5, '#e0b44c'); gold.addColorStop(1, '#9a6b14');
    x.fillStyle = gold; x.fillText('888', 420, 150);
    x.font = '700 60px Mitr, sans-serif'; x.lineWidth = 10; x.strokeText(`VIP BUS ${b.id}`, 60, 150); x.fillStyle = '#ffffff'; x.fillText(`VIP BUS ${b.id}`, 60, 150);
    x.font = '600 40px Mitr, sans-serif'; x.fillStyle = '#e0b44c'; x.fillText('LUCKY · FOR FUN ONLY', 1180, 236);
    for (let i = 0; i < 6; i++) { const cx = 1500 + i * 85, cy = 110; x.fillStyle = ['#e2445c', '#2b6cff', '#111', '#1aa36f', '#e0b44c', '#7a3cff'][i]; x.beginPath(); x.arc(cx, cy, 34, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 6; x.setLineDash([10, 8]); x.stroke(); x.setLineDash([]); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  const blobs = [b.color, '#ff3bd4', '#3bd5ff', '#ffd23f', '#7cff6b', '#b45cff'];
  for (let i = 0; i < 22; i++) {
    const cx = 120 + r(i) * 1800, cy = 60 + r(i + 50) * 220, rad = 60 + r(i + 90) * 130;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, blobs[i % blobs.length]); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = .75; x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
  }
  x.globalAlpha = 1;
  // swooshes
  x.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    x.strokeStyle = ['#ffffff', '#ffd23f', b.color, '#ff3bd4', '#3bd5ff'][i]; x.lineWidth = 10 - i;
    x.beginPath(); x.moveTo(0, 230 - i * 22); x.bezierCurveTo(600, 120 - i * 20, 1200, 300 - i * 25, 2048, 150 - i * 15); x.stroke();
  }
  // sparkles
  x.fillStyle = '#fff';
  for (let i = 0; i < 40; i++) { const sx = r(i + 200) * 2048, sy = r(i + 300) * 300, ss = 3 + r(i + 400) * 7; x.beginPath(); x.moveTo(sx, sy - ss * 2); x.lineTo(sx + ss / 2, sy); x.lineTo(sx, sy + ss * 2); x.lineTo(sx - ss / 2, sy); x.fill(); }
  // name
  x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.font = '800 118px Mitr, sans-serif'; x.lineWidth = 16; x.strokeStyle = '#120a2a'; x.strokeText(`${b.name}`, 360, 150);
  x.fillStyle = '#ffffff'; x.fillText(`${b.name}`, 360, 150);
  x.font = '700 64px Mitr, sans-serif'; x.lineWidth = 10; x.strokeText(`VIP BUS ${b.id}`, 60, 150); x.fillStyle = '#ffd23f'; x.fillText(`VIP BUS ${b.id}`, 60, 150);
  x.font = '600 46px Mitr, sans-serif'; x.lineWidth = 8; x.strokeText('HSST COMPANY TRIP 2026', 1420, 240); x.fillStyle = '#7cfffb'; x.fillText('HSST COMPANY TRIP 2026', 1420, 240);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const liveryMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
const liveryL = new THREE.Mesh(new THREE.PlaneGeometry(L - .8, (L - .8) * 300 / 2048), liveryMat);
liveryL.position.set(-.3, .98, W / 2 + .013); bus.add(liveryL);
const liveryR = liveryL.clone(); liveryR.rotation.y = Math.PI; liveryR.position.z = -W / 2 - .013; bus.add(liveryR);

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
function cardTexture(face) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 90; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.beginPath(); x.roundRect(1, 1, 62, 88, 8); x.fill(); x.strokeStyle = '#333'; x.lineWidth = 2; x.stroke();
  if (face) { x.fillStyle = face === '♠' || face === '♣' ? '#222' : '#e2445c'; x.font = '700 44px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(face, 32, 48); }
  else { x.fillStyle = '#b3203a'; x.fillRect(7, 7, 50, 76); x.strokeStyle = '#ffd23f'; x.strokeRect(12, 12, 40, 66); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const cardMats = ['♥', '♠', '♦', '♣'].map((f) => new THREE.MeshBasicMaterial({ map: cardTexture(f), side: THREE.DoubleSide }));
const cardGeo = new THREE.PlaneGeometry(.11, .155);
function diceTexture(n) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64); x.fillStyle = n === 1 ? '#e2445c' : '#222';
  const P = { 1: [[32, 32]], 2: [[18, 18], [46, 46]], 3: [[16, 16], [32, 32], [48, 48]], 4: [[18, 18], [46, 18], [18, 46], [46, 46]], 5: [[18, 18], [46, 18], [32, 32], [18, 46], [46, 46]], 6: [[18, 16], [46, 16], [18, 32], [46, 32], [18, 48], [46, 48]] }[n];
  P.forEach(([a, b]) => { x.beginPath(); x.arc(a, b, n === 1 ? 9 : 6, 0, Math.PI * 2); x.fill(); });
  return new THREE.CanvasTexture(c);
}
const diceMats = [1, 6, 2, 5, 3, 4].map((n) => new THREE.MeshStandardMaterial({ map: diceTexture(n), roughness: .35 }));
const dice = [];
for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(.24, .24, .24), diceMats); d.position.set(-4 + i * 2, FLOOR + 1.9, 0); d.castShadow = true; bus.add(d); dice.push(d); }
// ---------- casino props (Bus 888) ----------
const casino = new THREE.Group(); bus.add(casino);
function rouletteTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); const n = 37, r = 250;
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
    x.fillStyle = i === 0 ? '#1aa36f' : i % 2 ? '#c8102e' : '#141414';
    x.beginPath(); x.moveTo(256, 256); x.arc(256, 256, r, a0, a1); x.closePath(); x.fill();
  }
  x.fillStyle = '#5a3a12'; x.beginPath(); x.arc(256, 256, 150, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#e0b44c'; x.beginPath(); x.arc(256, 256, 40, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#e0b44c'; x.lineWidth = 6; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(256, 256); x.lineTo(256 + Math.cos(k * Math.PI / 2) * 140, 256 + Math.sin(k * Math.PI / 2) * 140); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const roulette = new THREE.Group(); roulette.position.set(L / 2 - 1.45, UP + .02, 0); casino.add(roulette);
{
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(.08, .16, .55, 12), busMats.gold); stand.position.y = .28; roulette.add(stand);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.42, .36, .1, 40), new THREE.MeshStandardMaterial({ color: 0x4a2a0c, roughness: .4 })); bowl.position.y = .6; roulette.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.42, .03, 8, 48), busMats.gold); rim.rotation.x = Math.PI / 2; rim.position.y = .66; roulette.add(rim);
  const wheel = new THREE.Mesh(new THREE.CircleGeometry(.37, 48), new THREE.MeshStandardMaterial({ map: rouletteTexture(), roughness: .35, metalness: .1 }));
  wheel.rotation.x = -Math.PI / 2; wheel.position.y = .656; roulette.add(wheel); roulette.userData.wheel = wheel;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .1, metalness: .3 }));
  ball.position.y = .69; roulette.add(ball); roulette.userData.ball = ball;
}
// chip stacks on the armrests
{
  const chipGeo = new THREE.CylinderGeometry(.06, .06, .018, 20);
  const chipCols = [0xe2445c, 0x2b6cff, 0x111111, 0x1aa36f, 0xe0b44c];
  for (let k = 0; k < 10; k++) {
    const stack = new THREE.Group(); const h = 3 + (k * 7) % 6;
    for (let j = 0; j < h; j++) { const ch = new THREE.Mesh(chipGeo, new THREE.MeshStandardMaterial({ color: chipCols[(k + j) % 5], roughness: .4 })); ch.position.y = j * .02; stack.add(ch); }
    stack.position.set(L / 2 - 2.4 - k * .9, UP + .5, k % 2 ? .21 : -.21); casino.add(stack);
  }
}
// rooftop neon sign
function neonTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#120a06'; x.beginPath(); x.roundRect(8, 8, 1008, 240, 40); x.fill();
  x.strokeStyle = '#e0b44c'; x.lineWidth = 10; x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 150px Mitr, sans-serif';
  x.shadowColor = '#ff2d55'; x.shadowBlur = 40; x.fillStyle = '#ffd23f'; x.fillText('888', 512, 132);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const neon = new THREE.Mesh(new THREE.PlaneGeometry(3.6, .9), new THREE.MeshBasicMaterial({ map: neonTexture(), transparent: true, side: THREE.DoubleSide }));
neon.position.set(0, ROOF + .62, 0); casino.add(neon);
const neonPosts = [-1.5, 1.5].map((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .5, 6), busMats.gold); p.position.set(x, ROOF + .2, 0); casino.add(p); return p; });
// marquee bulbs around the roof edge (chase lights)
const bulbOn = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffc94a, emissiveIntensity: 3 });
const bulbOff = new THREE.MeshStandardMaterial({ color: 0x6b5520, emissive: 0x2a1c05, emissiveIntensity: .4 });
const bulbs = [];
{
  const g = new THREE.SphereGeometry(.045, 8, 6);
  for (const sd of [-1, 1]) for (let i = 0; i < 34; i++) {
    const m = new THREE.Mesh(g, bulbOn); m.position.set(-L / 2 + .5 + i * (L - 1.2) / 33, ROOF + .12, sd * (W / 2 + .05)); casino.add(m); bulbs.push(m);
  }
}
const casinoLights = [0xff2d55, 0xe0b44c].map((c, i) => { const l = new THREE.PointLight(c, 3, 7, 1.6); l.position.set(-2.5 + i * 5, FLOOR + 2.2, 0); casino.add(l); return l; });
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
      const e = new THREE.Mesh(geo.closed, black); e.position.set(.255, .03, s * .1); e.rotation.set(0, Math.PI / 2, sleepy ? Math.PI : 0); e.userData.face = true; headG.add(e);
    } else {
      const e = new THREE.Mesh(geo.eye, black); e.position.set(.245, .03, s * .1); e.scale.set(.7, 1.15, 1); e.userData.face = true; headG.add(e);
      const sh = new THREE.Mesh(geo.shine, white); sh.position.set(.275, .055, s * .1 + .012); sh.userData.face = true; headG.add(sh);
    }
    const ch = new THREE.Mesh(geo.cheek, pink); ch.position.set(.22, -.05, s * .16); ch.scale.set(.5, .6, 1); ch.userData.face = true; headG.add(ch);
  }
  const mouth = new THREE.Mesh(geo.mouth, mat(0xc0394f)); mouth.position.set(.262, -.07, 0); mouth.rotation.set(0, Math.PI / 2, Math.PI); mouth.userData.face = true; headG.add(mouth);
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
  if (b.mood === 'luck') {
    const fan = new THREE.Group();
    for (let k = 0; k < 3; k++) { const cd = new THREE.Mesh(cardGeo, cardMats[(h + k) % 4]); cd.position.set(0, k * .012, (k - 1) * .05); cd.rotation.set(0, Math.PI / 2, (k - 1) * .3); fan.add(cd); }
    fan.position.set(.24, .42, 0); fan.rotation.z = -.5; g.add(fan); g.userData.fan = fan;
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

const photoTex = new Map();
const faceGeo = new THREE.CircleGeometry(.215, 40);
function photoTexture(src) {
  if (photoTex.has(src)) return photoTex.get(src);
  const c = document.createElement('canvas'); c.width = c.height = 160;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    const x = c.getContext('2d'); const s = Math.min(img.width, img.height);
    x.save(); x.beginPath(); x.arc(80, 80, 78, 0, Math.PI * 2); x.clip();
    x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 160, 160); x.restore();
    x.lineWidth = 6; x.strokeStyle = '#ffffff'; x.beginPath(); x.arc(80, 80, 77, 0, Math.PI * 2); x.stroke();
    t.needsUpdate = true;
  };
  img.src = src; photoTex.set(src, t); return t;
}
function applyPhoto(ch, src) {
  if (!src || ch.userData.photo) return;
  const face = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ map: photoTexture(src), transparent: true }));
  face.position.set(.262, -.005, 0); face.rotation.y = Math.PI / 2;
  ch.userData.headG.add(face); ch.userData.photo = face;
  ch.userData.headG.children.forEach((m) => { if (m.userData.face) m.visible = false; });
}
window.addEventListener('busphoto', (e) => {
  const { emp, src } = e.detail || {};
  crowd.children.forEach((c) => { if (c.userData.p.emp === emp) applyPhoto(c, src); });
});

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
  busMats.paint.color.copy(c).lerp(new THREE.Color(0x3a0614), .35);
  busMats.trim.color.copy(c).offsetHSL(0, .1, .12); busMats.trim.emissive.copy(busMats.trim.color);
  busMats.led.emissive.copy(c);
  liveryMat.map?.dispose(); liveryMat.map = liveryTexture(b); liveryMat.needsUpdate = true;
  const party = b.mood === 'dance' || b.mood === 'party';
  disco.visible = party; lasers.forEach((l) => (l.visible = party));
  partyLights.forEach((l) => (l.visible = party || b.mood === 'sing'));
  cabinLight.color.set(b.mood === 'sleep' ? 0x5d74c9 : b.mood === 'luck' ? 0xffd38a : 0xffe7c2);
  dice.forEach((d) => (d.visible = b.mood === 'luck'));
  casino.visible = b.mood === 'luck';
  busMats.floor.color.set(b.mood === 'luck' ? 0x0f5132 : 0x1d1a24);
  busMats.seat.color.set(b.mood === 'luck' ? 0x5c0f1e : 0x3a1f2b);
  cabinLight.intensity = b.mood === 'sleep' ? 1.6 : party ? 1.2 : 3;
  cabinFill.forEach((l) => { l.intensity = b.mood === 'sleep' ? .8 : party ? 1 : 2.2; l.color.set(b.mood === 'sleep' ? 0x7d8fe0 : 0xfff0dc); });
  setSky(b.mood);
  const screenText = { sleep: '😴 Good Night', sing: '🎤 ♪ ร้องเลย ♪', dance: '🪩 VIP DANCE', laugh: '😂 888888', luck: '🎰 888 🎲', party: '🎉 PARTY BUS' }[b.mood];
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
    const ph = window.__busPhotos && window.__busPhotos.get(p.emp); if (ph) applyPhoto(ch, ph);
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
    tip.textContent = `${p.nick} · ${p.emp}${p.section ? ' · ' + p.section : ''}${p.rank === 2 ? ' · อันดับ 2' : ''}`;
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
  speakerRings.forEach((r, i) => r.scale.setScalar(currentBus.mood === 'sleep' ? 1 : 1 + Math.max(0, Math.sin(t * 8.4 + i * .5)) * .18));
  dice.forEach((d, i) => { if (d.visible) { d.rotation.x += dt * (1.2 + i * .3); d.rotation.y += dt * (1.6 + i * .2); d.position.y = FLOOR + 1.95 + Math.sin(t * 2 + i) * .12; } });
  if (casino.visible) {
    roulette.userData.wheel.rotation.z += dt * 2.4;
    const ba = -t * 3.6; roulette.userData.ball.position.set(Math.cos(ba) * .31, .69, Math.sin(ba) * .31);
    const step = Math.floor(t * 8);
    bulbs.forEach((m, i) => (m.material = (i + step) % 3 === 0 ? bulbOff : bulbOn));
    casinoLights.forEach((l, i) => (l.intensity = 2.5 + Math.sin(t * 3 + i * Math.PI) * 1.5));
    neon.material.opacity = .85 + Math.sin(t * 13) * .08 + (Math.sin(t * 2.1) > .97 ? -.4 : 0);
  }
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
    } else if (mood === 'luck') {
      const win = Math.sin(t * .55 + ph * 3.1) > .9;
      if (win) {
        c.position.y = base.y + Math.abs(Math.sin(t * 9)) * .14;
        aL.rotation.set(2.8, 0, 0); aR.rotation.set(-2.8, 0, 0); u.headG.rotation.z = .15;
        if (u.fan) u.fan.position.y = .95;
      } else {
        c.position.y = base.y;
        aL.rotation.set(0, 0, 1.15); aR.rotation.set(0, 0, 1.15);
        u.headG.rotation.z = -.22 + Math.sin(t * 1.3 + ph) * .04;
        if (u.fan) u.fan.position.y = .42;
      }
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
