import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export interface SceneState {
  users: number;
  servers: number;
  bandwidth: number;
  dbNodes: number;
  util: { cpu: number; bw: number; db: number };
  rps: number;
  latency: number;
  cacheHit: number;
  cdn: number;
  down: boolean;
  bugs: number;
  outageHours: number;
  teams: { product: number; sre: number; rnd: number; refactor: number };
  regions: string[];
  flags: { cache: boolean; cdn: boolean; edge: boolean; autoscale: boolean };
  running: boolean;
  speed: number;
}

export type Zone = 'users' | 'bw' | 'cpu' | 'db' | 'office';
export type PickKind = 'bug' | 'fire' | 'golden';

const ZONES: Record<Zone, THREE.Vector3> = {
  users: new THREE.Vector3(-13, 6.4, 0),
  bw: new THREE.Vector3(-5.5, 7.2, 0),
  cpu: new THREE.Vector3(3, 4.4, 0),
  db: new THREE.Vector3(12, 4.6, 0),
  office: new THREE.Vector3(0, 2, 8),
};

const RACK_COLS = 8;
const RACK_ROWS = 5;
const MAX_RACKS = RACK_COLS * RACK_ROWS;
const MAX_PACKETS = 700;
const MAX_BOTS = 48;
const MAX_DB = 9;
const TEAM_COLORS = { product: 0xf472b6, sre: 0xfbbf24, rnd: 0xa78bfa, refactor: 0x34d399 } as const;
const REGION_PINS: Record<string, [number, number]> = {
  latam: [-15, -60], eu: [50, 10], apac: [25, 120], africa: [5, 20], orbit: [80, 0], mars: [-80, 0],
};

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpC = new THREE.Color();
const ONE = new THREE.Vector3(1, 1, 1);
const RED = new THREE.Color(0xff2244);

function loadColor(u: number, out: THREE.Color): THREE.Color {
  if (u > 1) return out.set(0xff3355);
  if (u > 0.85) return out.set(0xffaa22);
  if (u > 0.6) return out.set(0xc6ff3a);
  return out.set(0x22ffaa);
}

function gridTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(256, 256, 40, 256, 256, 256);
  grad.addColorStop(0, '#13213f');
  grad.addColorStop(1, '#070b16');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(56,189,248,0.22)';
  g.lineWidth = 1.5;
  for (let i = 0; i <= 512; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke();
  }
  g.fillStyle = 'rgba(167,139,250,0.5)';
  for (let x = 0; x <= 512; x += 128) for (let y = 0; y <= 512; y += 128) g.fillRect(x - 2, y - 2, 4, 4);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

interface Packet { t: number; state: 0 | 1 | 2 | 3 | 4; pos: THREE.Vector3; vel: THREE.Vector3; life: number; stage: number }
interface Bot { pos: THREE.Vector3; target: THREE.Vector3; team: keyof typeof TEAM_COLORS; phase: number }
interface Bug { mesh: THREE.Group; dir: number; speed: number; alive: boolean; squash: number }
interface Burst { pts: THREE.Points; vel: Float32Array; life: number }

/** Isometric, bloom-lit diorama of your startup's infrastructure. */
export class DataCenter {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private composer: EffectComposer;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private raf = 0;
  private state: SceneState | null = null;
  private ro: ResizeObserver;

  private curve: THREE.CatmullRomCurve3;
  private packets: Packet[] = [];
  private packetMesh: THREE.InstancedMesh;
  private spawnAcc = 0;

  private racks: THREE.InstancedMesh;
  private rackLeds: THREE.InstancedMesh;
  private rackTops: THREE.InstancedMesh;
  private rackBorn = new Float32Array(MAX_RACKS).fill(-10);
  private rackShown = 0;

  private tower = new THREE.Group();
  private towerRings: THREE.Mesh[] = [];
  private satellites = new THREE.Group();
  private dbStacks: THREE.Group[] = [];
  private dbBorn = new Float32Array(MAX_DB).fill(-10);
  private dbShown = 0;
  private globe = new THREE.Group();
  private userDots: THREE.Points;
  private pins = new Map<string, THREE.Mesh>();
  private crystal: THREE.Mesh;

  private bots: Bot[] = [];
  private botMesh: THREE.InstancedMesh;
  private botHeads: THREE.InstancedMesh;

  private bugs: Bug[] = [];
  private bugGroup = new THREE.Group();
  private fires: THREE.Group[] = [];
  private fireGroup = new THREE.Group();
  private golden: THREE.Mesh | null = null;
  private goldenBorn = 0;
  private bursts: Burst[] = [];
  private alarm: THREE.PointLight;
  private ambient: THREE.HemisphereLight;
  private shake = 0;
  private time = 0;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  onAnchors?: (pos: Record<Zone, { x: number; y: number }>) => void;
  onPick?: (kind: PickKind, screen: { x: number; y: number }) => void;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color(0x060912);
    this.scene.fog = new THREE.Fog(0x060912, 55, 95);

    this.camera = new THREE.OrthographicCamera(-20, 20, 12, -12, 0.1, 200);
    this.camera.position.set(26, 24, 30);
    this.camera.lookAt(0, 1, 0);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 2, 0);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.minPolarAngle = 0.5;
    this.controls.maxPolarAngle = 1.25;
    this.controls.minZoom = 0.7;
    this.controls.maxZoom = 2.2;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.25;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.7, 0.45, 0.42));
    this.composer.addPass(new OutputPass());

    // Lights
    this.ambient = new THREE.HemisphereLight(0x8ab4ff, 0x0b0f1a, 0.9);
    this.scene.add(this.ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(12, 26, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 18; sc.bottom = -18;
    this.scene.add(sun);
    const rim = new THREE.PointLight(0x7c3aed, 60, 40);
    rim.position.set(-10, 10, -10);
    this.scene.add(rim);
    this.alarm = new THREE.PointLight(0xff2244, 0, 40);
    this.alarm.position.set(3, 8, 2);
    this.scene.add(this.alarm);

    // Floor
    const floor = new THREE.Mesh(new THREE.CircleGeometry(36, 72), new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: 0.85, metalness: 0.1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const rimRing = new THREE.Mesh(new THREE.RingGeometry(35.6, 36, 96), new THREE.MeshBasicMaterial({ color: 0x22d3ee, toneMapped: false }));
    rimRing.rotation.x = -Math.PI / 2;
    rimRing.position.y = 0.02;
    this.scene.add(rimRing);
    this.addPlatform(-13, 3.4, 0x38bdf8);
    this.addPlatform(-5.5, 2.4, 0x38bdf8);
    this.addPlatform(3, 7.4, 0x22d3ee, 5.4);
    this.addPlatform(12, 3.2, 0x34d399);
    this.addPlatform(0, 9, 0xf472b6, 2.6, 8);

    // Packet path
    this.curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-13, 3.2, 0), new THREE.Vector3(-9.5, 4.2, 0.4), new THREE.Vector3(-5.5, 5.6, 0),
      new THREE.Vector3(-2.5, 3.4, -0.4), new THREE.Vector3(1, 2.7, 0), new THREE.Vector3(5, 2.7, 0),
      new THREE.Vector3(8.6, 2.9, 0.3), new THREE.Vector3(12, 2.6, 0),
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(this.curve, 160, 0.05, 6), new THREE.MeshBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.6 }));
    this.scene.add(tube);
    this.packetMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), MAX_PACKETS);
    this.packetMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.packetMesh.count = 0;
    this.scene.add(this.packetMesh);

    // Globe of users
    const core = new THREE.Mesh(new THREE.SphereGeometry(2.1, 40, 28), new THREE.MeshStandardMaterial({ color: 0x0b2a4a, emissive: 0x0a3a6a, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.3 }));
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3, 2), new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.35, toneMapped: false }));
    this.globe.add(core, wire);
    const dotGeo = new THREE.BufferGeometry();
    const dots = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = 2.15;
      dots.set([r * Math.sqrt(1 - u * u) * Math.cos(th), r * u, r * Math.sqrt(1 - u * u) * Math.sin(th)], i * 3);
    }
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dots, 3));
    dotGeo.setDrawRange(0, 0);
    this.userDots = new THREE.Points(dotGeo, new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.11, toneMapped: false }));
    this.globe.add(this.userDots);
    this.globe.position.set(-13, 3.4, 0);
    this.scene.add(this.globe);

    // Bandwidth tower
    const metal = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.55, 6, 12), metal);
    pole.position.y = 3;
    pole.castShadow = true;
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.4), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.6, roughness: 0.25, side: THREE.DoubleSide }));
    dish.position.set(0, 6.1, 0.2);
    dish.rotation.x = -0.9;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3366, toneMapped: false }));
    tip.position.y = 6.4;
    this.tower.add(pole, dish, tip);
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9 + i * 0.12, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: 0x22ffaa, toneMapped: false, transparent: true }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.8 + i * 0.85;
      ring.visible = false;
      this.towerRings.push(ring);
      this.tower.add(ring);
    }
    for (let i = 0; i < 3; i++) {
      const sat = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.25), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.3 }));
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.35), new THREE.MeshBasicMaterial({ color: 0xa78bfa, toneMapped: false }));
      sat.add(body, panel);
      sat.userData.phase = (i / 3) * Math.PI * 2;
      this.satellites.add(sat);
    }
    this.satellites.visible = false;
    this.tower.add(this.satellites);
    this.tower.position.set(-5.5, 0, 0);
    this.scene.add(this.tower);

    // Server racks
    const rackGeo = new THREE.BoxGeometry(0.95, 2, 0.75);
    rackGeo.translate(0, 1, 0);
    this.racks = new THREE.InstancedMesh(rackGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.35 }), MAX_RACKS);
    this.racks.castShadow = true;
    this.racks.count = 0;
    const ledGeo = new THREE.BoxGeometry(0.75, 0.06, 0.02);
    this.rackLeds = new THREE.InstancedMesh(ledGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), MAX_RACKS * 4);
    this.rackLeds.count = 0;
    const topGeo = new THREE.BoxGeometry(0.97, 0.06, 0.77);
    this.rackTops = new THREE.InstancedMesh(topGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), MAX_RACKS);
    this.rackTops.count = 0;
    this.scene.add(this.racks, this.rackLeds, this.rackTops);

    // DB stacks
    for (let i = 0; i < MAX_DB; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.42, 28), new THREE.MeshStandardMaterial({ color: 0x0f3b2e, metalness: 0.6, roughness: 0.3 }));
        disk.position.y = 0.25 + k * 0.5;
        disk.castShadow = true;
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.035, 6, 32), new THREE.MeshBasicMaterial({ color: 0x34d399, toneMapped: false }));
        band.rotation.x = Math.PI / 2;
        band.position.y = 0.46 + k * 0.5;
        band.userData.band = true;
        g.add(disk, band);
      }
      const col = i % 3;
      const row = Math.floor(i / 3);
      g.position.set(10.6 + col * 1.45, 0, -1.45 + row * 1.45);
      g.visible = false;
      this.dbStacks.push(g);
      this.scene.add(g);
    }

    // Cache crystal
    this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.9 }));
    this.crystal.position.set(8.6, 4.4, 0.3);
    this.crystal.visible = false;
    this.scene.add(this.crystal);

    // Engineer bots
    const botGeo = new THREE.CapsuleGeometry(0.22, 0.45, 4, 10);
    botGeo.translate(0, 0.45, 0);
    this.botMesh = new THREE.InstancedMesh(botGeo, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 }), MAX_BOTS);
    this.botMesh.castShadow = true;
    this.botMesh.count = 0;
    this.botHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), MAX_BOTS);
    this.botHeads.count = 0;
    this.scene.add(this.botMesh, this.botHeads);
    this.addDesks();

    // Instanced meshes start empty; their cached bounding spheres would cull them forever.
    for (const im of [this.packetMesh, this.racks, this.rackLeds, this.rackTops, this.botMesh, this.botHeads]) im.frustumCulled = false;
    this.scene.add(this.bugGroup, this.fireGroup);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    canvas.addEventListener('pointerdown', this.handlePointer);
    canvas.addEventListener('pointermove', this.handleHover);
    this.raf = requestAnimationFrame(this.frame);
  }

  private addPlatform(x: number, r: number, color: number, w?: number, z = 0) {
    const geo = w ? new THREE.BoxGeometry(w * 2.3, 0.12, r * 0.95) : new THREE.CylinderGeometry(r, r + 0.15, 0.12, 48);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x111a2e, metalness: 0.5, roughness: 0.5 }));
    m.position.set(x, 0.06, z);
    m.receiveShadow = true;
    this.scene.add(m);
    const edgeGeo = w ? new THREE.EdgesGeometry(geo) : new THREE.TorusGeometry(r + 0.08, 0.04, 6, 64);
    const edge = w ? new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color })) : new THREE.Mesh(edgeGeo, new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    if (!w) edge.rotation.x = Math.PI / 2;
    edge.position.set(x, 0.13, z);
    this.scene.add(edge);
  }

  private addDesks() {
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x1f2a44, metalness: 0.3, roughness: 0.6 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false });
    for (let i = 0; i < 8; i++) {
      const x = -7 + (i % 4) * 4.6;
      const z = 6.6 + Math.floor(i / 4) * 2.6;
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.8), deskMat);
      desk.position.set(x, 0.35, z);
      desk.castShadow = true;
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.05), screenMat);
      screen.position.set(x, 0.98, z - 0.2);
      this.scene.add(desk, screen);
    }
  }

  setState(s: SceneState) {
    this.state = s;
  }

  setPaused(paused: boolean) {
    this.controls.autoRotate = !paused;
  }

  bump(strength = 0.6) {
    this.shake = Math.max(this.shake, strength);
  }

  spawnGolden() {
    if (this.golden) return;
    const g = new THREE.Mesh(new THREE.TorusKnotGeometry(0.35, 0.12, 64, 8), new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb300, emissiveIntensity: 1.8, metalness: 1, roughness: 0.2 }));
    const t = 0.15 + Math.random() * 0.7;
    g.position.copy(this.curve.getPointAt(t)).add(new THREE.Vector3(0, 2.2, 1.5));
    g.userData.pick = 'golden';
    this.golden = g;
    this.goldenBorn = this.time;
    this.scene.add(g);
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    const aspect = w / h;
    const viewH = aspect < 1 ? 27 / aspect : 24;
    this.camera.left = (-viewH * aspect) / 2;
    this.camera.right = (viewH * aspect) / 2;
    this.camera.top = viewH / 2;
    this.camera.bottom = -viewH / 2;
    this.camera.updateProjectionMatrix();
  }

  private toScreen(v: THREE.Vector3) {
    const rect = this.canvas.getBoundingClientRect();
    tmpV.copy(v).project(this.camera);
    return { x: ((tmpV.x + 1) / 2) * rect.width, y: ((1 - tmpV.y) / 2) * rect.height };
  }

  private pickables(): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    for (const b of this.bugs) if (b.alive) out.push(b.mesh);
    out.push(...this.fires);
    if (this.golden) out.push(this.golden);
    return out;
  }

  private hitTest(e: PointerEvent): THREE.Intersection | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables(), true);
    return hits[0] ?? null;
  }

  private handleHover = (e: PointerEvent) => {
    this.canvas.style.cursor = this.hitTest(e) ? 'pointer' : 'grab';
  };

  private handlePointer = (e: PointerEvent) => {
    const hit = this.hitTest(e);
    if (!hit) return;
    let o: THREE.Object3D | null = hit.object;
    while (o && !o.userData.pick) o = o.parent;
    if (!o) return;
    const kind = o.userData.pick as PickKind;
    const screen = this.toScreen(o.getWorldPosition(new THREE.Vector3()));
    if (kind === 'bug') {
      const bug = this.bugs.find((b) => b.mesh === o);
      if (bug) { bug.alive = false; bug.squash = 1; }
      this.burst(o.position, 0x84cc16, 24);
    } else if (kind === 'fire') {
      this.burst(o.position, 0x7dd3fc, 30);
      this.fireGroup.remove(o);
      this.fires = this.fires.filter((f) => f !== o);
    } else if (kind === 'golden' && this.golden) {
      this.burst(this.golden.position, 0xffd34d, 50);
      this.scene.remove(this.golden);
      this.golden = null;
    }
    e.stopPropagation();
    this.onPick?.(kind, screen);
  };

  private burst(at: THREE.Vector3, color: number, n: number) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos.set([at.x, at.y + 0.3, at.z], i * 3);
      vel.set([(Math.random() - 0.5) * 6, Math.random() * 6 + 2, (Math.random() - 0.5) * 6], i * 3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.22, toneMapped: false, transparent: true }));
    this.scene.add(pts);
    this.bursts.push({ pts, vel, life: 1 });
  }

  private rackPos(i: number, out: THREE.Vector3) {
    const col = i % RACK_COLS;
    const row = Math.floor(i / RACK_COLS);
    return out.set(3 - ((RACK_COLS - 1) * 1.25) / 2 + col * 1.25, 0.12, -2.6 + row * 1.3);
  }

  private updateRacks(s: SceneState, dt: number) {
    const want = Math.min(MAX_RACKS, Math.max(1, Math.ceil(s.servers <= MAX_RACKS ? s.servers : MAX_RACKS)));
    if (want > this.rackShown) for (let i = this.rackShown; i < want; i++) this.rackBorn[i] = this.time;
    this.rackShown = want;
    this.racks.count = want;
    this.rackTops.count = want;
    this.rackLeds.count = want * 4;
    const heat = loadColor(s.util.cpu, tmpC).clone();
    for (let i = 0; i < want; i++) {
      const age = this.time - this.rackBorn[i];
      const pop = age < 0.5 ? THREE.MathUtils.smoothstep(age, 0, 0.5) * (1 + Math.sin(age * 12) * 0.15 * (1 - age * 2)) : 1;
      this.rackPos(i, tmpV);
      tmpS.set(1, Math.max(0.01, pop), 1);
      tmpM.compose(tmpV, tmpQ.identity(), tmpS);
      this.racks.setMatrixAt(i, tmpM);
      tmpM.compose(tmpS.set(tmpV.x, 0.12 + 2.03 * pop, tmpV.z), tmpQ, ONE);
      this.rackTops.setMatrixAt(i, tmpM);
      const flicker = s.down ? (Math.sin(this.time * 14 + i) > 0 ? 1 : 0.15) : 0.7 + 0.3 * Math.sin(this.time * 3 + i * 1.7);
      this.rackTops.setColorAt(i, tmpC.copy(s.down ? RED : heat).multiplyScalar(flicker));
      this.rackPos(i, tmpV);
      for (let k = 0; k < 4; k++) {
        tmpM.compose(tmpS.set(tmpV.x, (0.12 + 0.4 + k * 0.42) * pop, tmpV.z + 0.39), tmpQ, ONE);
        this.rackLeds.setMatrixAt(i * 4 + k, tmpM);
        const blink = Math.sin(this.time * (4 + s.util.cpu * 10) + i * 3.1 + k * 1.3) > 0.2 - s.util.cpu * 0.6;
        this.rackLeds.setColorAt(i * 4 + k, blink ? (s.down ? tmpC.set(0xff2244) : loadColor(s.util.cpu, tmpC)) : tmpC.set(0x0b1220));
      }
    }
    this.racks.instanceMatrix.needsUpdate = true;
    this.rackTops.instanceMatrix.needsUpdate = true;
    this.rackLeds.instanceMatrix.needsUpdate = true;
    if (this.rackTops.instanceColor) this.rackTops.instanceColor.needsUpdate = true;
    if (this.rackLeds.instanceColor) this.rackLeds.instanceColor.needsUpdate = true;
    void dt;
  }

  private updatePackets(s: SceneState, dt: number) {
    const rate = s.running ? Math.min(90, 4 + Math.log10(s.rps + 1) * 14) * (0.6 + s.speed * 0.25) : 2;
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1 && this.packets.length < MAX_PACKETS) {
      this.spawnAcc -= 1;
      this.packets.push({ t: 0, state: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 1, stage: 0 });
    }
    this.spawnAcc = Math.min(this.spawnAcc, 5);
    const speed = THREE.MathUtils.clamp(260 / Math.max(80, s.latency), 0.12, 0.4) * (0.7 + s.speed * 0.2);
    const drop = (u: number) => (u > 1 ? 1 - 1 / u : 0);
    const marks = [0.3, 0.58, 0.86, 1];
    let n = 0;
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];
      if (p.state === 0) {
        p.t += speed * dt;
        if (p.stage === 0 && p.t >= marks[0]) {
          p.stage = 1;
          if (s.down || Math.random() < drop(s.util.bw)) this.kill(p, 1);
          else if (Math.random() < s.cdn) { p.state = 3; p.vel.set((Math.random() - 0.5) * 2, 4, (Math.random() - 0.5) * 2); }
        } else if (p.stage === 1 && p.t >= marks[1]) {
          p.stage = 2;
          if (s.down || Math.random() < drop(s.util.cpu) || Math.random() < Math.min(0.4, s.bugs * 0.0004)) this.kill(p, 1);
        } else if (p.stage === 2 && p.t >= marks[2]) {
          p.stage = 3;
          if (Math.random() < s.cacheHit) { p.state = 4; p.vel.set(0, 3, 0); }
          else if (Math.random() < drop(s.util.db)) this.kill(p, 1);
        }
        if (p.state === 0) {
          if (p.t >= 1) { p.life -= dt * 4; p.t = 1; }
          this.curve.getPointAt(Math.min(1, p.t), p.pos);
          p.pos.y += Math.sin(p.t * 40 + i) * 0.05;
        }
      } else {
        p.vel.y -= (p.state === 1 ? 14 : 2) * dt;
        p.pos.addScaledVector(p.vel, dt);
        if (p.state === 1 && p.pos.y < 0.15) { p.pos.y = 0.15; p.vel.multiplyScalar(0.3); p.vel.y = Math.abs(p.vel.y) * 0.4; }
        p.life -= dt * (p.state === 1 ? 0.7 : 1.4);
      }
      if (p.life <= 0) { this.packets.splice(i, 1); continue; }
      const scale = p.state === 1 ? 1.2 : 1;
      tmpM.compose(p.pos, tmpQ.identity(), tmpS.setScalar(scale * Math.min(1, p.life * 2)));
      this.packetMesh.setMatrixAt(n, tmpM);
      const col = p.state === 1 ? 0xff2d55 : p.state === 3 ? 0xc084fc : p.state === 4 ? 0x22d3ee : 0x5eead4;
      this.packetMesh.setColorAt(n, tmpC.set(col));
      n++;
    }
    this.packetMesh.count = n;
    this.packetMesh.instanceMatrix.needsUpdate = true;
    if (this.packetMesh.instanceColor) this.packetMesh.instanceColor.needsUpdate = true;
  }

  private kill(p: Packet, state: 1) {
    p.state = state;
    p.vel.set((Math.random() - 0.5) * 3, 2 + Math.random() * 2, 1.5 + Math.random() * 2.5);
  }

  private updateTowerDbGlobe(s: SceneState, dt: number) {
    const rings = Math.min(6, Math.max(1, Math.ceil(Math.log2(s.bandwidth + 1))));
    const bwColor = loadColor(s.util.bw, tmpC).clone();
    this.towerRings.forEach((r, i) => {
      r.visible = i < rings;
      const m = r.material as THREE.MeshBasicMaterial;
      m.color.copy(s.down ? RED : bwColor);
      const pulse = (this.time * (1 + s.util.bw * 3) - i * 0.3) % 1;
      m.opacity = 0.35 + 0.65 * (1 - pulse);
      r.scale.setScalar(1 + pulse * 0.25);
    });
    this.satellites.visible = s.flags.cdn;
    this.satellites.children.forEach((sat) => {
      const a = this.time * 0.6 + sat.userData.phase;
      sat.position.set(Math.cos(a) * 2.6, 6.6 + Math.sin(a * 2) * 0.3, Math.sin(a) * 2.6);
      sat.rotation.y = -a;
    });

    const want = Math.min(MAX_DB, Math.max(1, s.dbNodes));
    if (want > this.dbShown) for (let i = this.dbShown; i < want; i++) this.dbBorn[i] = this.time;
    this.dbShown = want;
    const dbColor = loadColor(s.util.db, tmpC).clone();
    this.dbStacks.forEach((g, i) => {
      g.visible = i < want;
      if (!g.visible) return;
      const age = this.time - this.dbBorn[i];
      g.scale.setScalar(age < 0.5 ? Math.max(0.01, THREE.MathUtils.smoothstep(age, 0, 0.5)) : 1);
      g.children.forEach((c, k) => {
        if (!c.userData.band) return;
        const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
        const on = Math.sin(this.time * (3 + s.util.db * 8) + i + k) > -0.3;
        m.color.copy(s.down ? RED : dbColor).multiplyScalar(on ? 1 : 0.25);
      });
    });

    this.crystal.visible = s.flags.cache;
    this.crystal.rotation.y += dt * 1.5;
    this.crystal.position.y = 4.4 + Math.sin(this.time * 2) * 0.25;
    (this.crystal.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + s.cacheHit * 1.5;

    this.globe.rotation.y += dt * 0.25;
    const dots = Math.min(900, Math.round(Math.log10(Math.max(10, s.users)) * 130));
    this.userDots.geometry.setDrawRange(0, dots);
    for (const [id, [lat, lon]] of Object.entries(REGION_PINS)) {
      const owned = s.regions.includes(id);
      let pin = this.pins.get(id);
      if (owned && !pin) {
        pin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 8), new THREE.MeshBasicMaterial({ color: id === 'mars' ? 0xff6b3d : 0xfbbf24, toneMapped: false }));
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const th = THREE.MathUtils.degToRad(lon);
        const r = id === 'orbit' || id === 'mars' ? 3.2 : 2.35;
        pin.position.setFromSphericalCoords(r, phi, th);
        pin.lookAt(0, 0, 0);
        pin.rotateX(-Math.PI / 2);
        this.globe.add(pin);
        this.pins.set(id, pin);
      }
    }
  }

  private updateBots(s: SceneState, dt: number) {
    const teams = (Object.keys(TEAM_COLORS) as (keyof typeof TEAM_COLORS)[]).flatMap((t) => Array.from({ length: Math.min(12, s.teams[t]) }, () => t));
    while (this.bots.length < Math.min(MAX_BOTS, teams.length)) {
      this.bots.push({ pos: new THREE.Vector3(-6 + Math.random() * 14, 0.12, 6 + Math.random() * 4), target: new THREE.Vector3(), team: 'product', phase: Math.random() * 10 });
      this.retarget(this.bots[this.bots.length - 1]);
    }
    this.bots.length = Math.min(this.bots.length, teams.length);
    this.botMesh.count = this.bots.length;
    this.botHeads.count = this.bots.length;
    this.bots.forEach((b, i) => {
      b.team = teams[i];
      const d = tmpV.subVectors(b.target, b.pos);
      const dist = d.length();
      if (dist < 0.2) this.retarget(b);
      else b.pos.addScaledVector(d.normalize(), Math.min(dist, dt * 1.6 * (s.running ? 1 : 0.3)));
      const bob = Math.abs(Math.sin(this.time * 8 + b.phase)) * 0.08;
      tmpM.compose(tmpS.set(b.pos.x, b.pos.y + bob, b.pos.z), tmpQ.identity(), ONE);
      this.botMesh.setMatrixAt(i, tmpM);
      this.botMesh.setColorAt(i, tmpC.set(TEAM_COLORS[b.team]));
      tmpM.compose(tmpS.set(b.pos.x, b.pos.y + 1.05 + bob, b.pos.z + 0.12), tmpQ, ONE);
      this.botHeads.setMatrixAt(i, tmpM);
      this.botHeads.setColorAt(i, tmpC.set(0xffffff));
    });
    this.botMesh.instanceMatrix.needsUpdate = true;
    this.botHeads.instanceMatrix.needsUpdate = true;
    if (this.botMesh.instanceColor) this.botMesh.instanceColor.needsUpdate = true;
    if (this.botHeads.instanceColor) this.botHeads.instanceColor.needsUpdate = true;
  }

  private retarget(b: Bot) {
    // SRE wander toward the racks, everyone else around the office.
    if (b.team === 'sre' && Math.random() < 0.6) this.rackPos(Math.floor(Math.random() * Math.max(1, this.rackShown)), b.target).add(new THREE.Vector3(0, 0, 0.9));
    else b.target.set(-7 + Math.random() * 15, 0.12, 5.4 + Math.random() * 5);
  }

  private makeBug(): THREE.Group {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshStandardMaterial({ color: 0x84cc16, emissive: 0x4d7c0f, emissiveIntensity: 1.4, roughness: 0.25, metalness: 0.5 }));
    shell.scale.set(1, 0.6, 1.3);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1a2e05 }));
    head.position.set(0, 0.02, 0.38);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3355, toneMapped: false });
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
    e1.position.set(0.07, 0.08, 0.48);
    const e2 = e1.clone();
    e2.position.x = -0.07;
    g.add(shell, head, e1, e2);
    const legMat = new THREE.LineBasicMaterial({ color: 0x1a2e05 });
    for (let k = 0; k < 3; k++) for (const side of [-1, 1]) {
      const pts = [new THREE.Vector3(side * 0.18, 0, -0.15 + k * 0.17), new THREE.Vector3(side * 0.42, -0.14, -0.2 + k * 0.2)];
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), legMat));
    }
    // generous invisible hit box so bugs are easy to click
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    g.add(hit);
    g.userData.pick = 'bug';
    return g;
  }

  private updateBugs(s: SceneState, dt: number) {
    const want = Math.min(14, Math.ceil(s.bugs / 4));
    const alive = this.bugs.filter((b) => b.alive).length;
    if (alive < want && Math.random() < dt * 3) {
      const mesh = this.makeBug();
      this.rackPos(Math.floor(Math.random() * Math.max(1, this.rackShown)), mesh.position).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.18, 0.75));
      mesh.scale.setScalar(0.01);
      mesh.userData.size = 1.9;
      this.bugGroup.add(mesh);
      this.bugs.push({ mesh, dir: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.8, alive: true, squash: 0 });
    } else if (alive > want + 1) {
      const b = this.bugs.find((x) => x.alive);
      if (b) { b.alive = false; b.squash = 1; }
    }
    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const b = this.bugs[i];
      if (!b.alive) {
        b.squash -= dt * 3;
        b.mesh.scale.set(2.6, Math.max(0.01, b.squash * 0.5), 2.6);
        if (b.squash <= 0) { this.bugGroup.remove(b.mesh); this.bugs.splice(i, 1); }
        continue;
      }
      const size = b.mesh.userData.size ?? 1;
      if (b.mesh.scale.x < size) b.mesh.scale.setScalar(Math.min(size, b.mesh.scale.x + dt * 5));
      b.dir += (Math.random() - 0.5) * dt * 4;
      const p = b.mesh.position;
      p.x += Math.sin(b.dir) * b.speed * dt;
      p.z += Math.cos(b.dir) * b.speed * dt;
      if (p.x < -2.5 || p.x > 8.5) b.dir = Math.PI - b.dir + Math.PI;
      if (p.z < -3.6 || p.z > 4) b.dir = Math.PI - b.dir;
      p.x = THREE.MathUtils.clamp(p.x, -2.5, 8.5);
      p.z = THREE.MathUtils.clamp(p.z, -3.6, 4);
      b.mesh.rotation.y = b.dir;
      b.mesh.position.y = 0.2 + Math.abs(Math.sin(this.time * 18 + i)) * 0.04;
    }
  }

  private makeFire(): THREE.Group {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff5a1f, toneMapped: false, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    outer.position.y = 0.7;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe066, toneMapped: false, side: THREE.DoubleSide }));
    inner.position.y = 0.45;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.6;
    g.add(outer, inner, hit);
    g.userData.pick = 'fire';
    return g;
  }

  private updateFires(s: SceneState) {
    const want = s.down ? Math.min(5, Math.max(1, Math.ceil(s.outageHours / 3))) : 0;
    while (this.fires.length < want) {
      const f = this.makeFire();
      this.rackPos(Math.floor(Math.random() * Math.max(1, this.rackShown)), f.position);
      f.position.y = 2.2;
      this.fireGroup.add(f);
      this.fires.push(f);
    }
    while (this.fires.length > want) this.fireGroup.remove(this.fires.pop()!);
    this.fires.forEach((f, i) => {
      const fl = 1 + Math.sin(this.time * 20 + i * 2) * 0.12 + Math.sin(this.time * 33 + i) * 0.08;
      f.scale.set(fl, 1 + Math.sin(this.time * 15 + i) * 0.2, fl);
    });
    this.alarm.intensity = s.down ? 40 + Math.sin(this.time * 10) * 35 : 0;
    this.ambient.color.setHex(s.down ? 0xff8a8a : 0x8ab4ff);
  }

  private updateBursts(dt: number) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      const pos = b.pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) {
        b.vel[k * 3 + 1] -= 12 * dt;
        pos.setXYZ(k, pos.getX(k) + b.vel[k * 3] * dt, Math.max(0.1, pos.getY(k) + b.vel[k * 3 + 1] * dt), pos.getZ(k) + b.vel[k * 3 + 2] * dt);
      }
      pos.needsUpdate = true;
      b.life -= dt * 1.2;
      (b.pts.material as THREE.PointsMaterial).opacity = Math.max(0, b.life);
      if (b.life <= 0) { this.scene.remove(b.pts); b.pts.geometry.dispose(); this.bursts.splice(i, 1); }
    }
  }

  private frame = () => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    const s = this.state;
    if (s) {
      this.updateRacks(s, dt);
      this.updatePackets(s, dt);
      this.updateTowerDbGlobe(s, dt);
      this.updateBots(s, dt);
      this.updateBugs(s, dt);
      this.updateFires(s);
    }
    this.updateBursts(dt);
    if (this.golden) {
      this.golden.rotation.y += dt * 3;
      this.golden.rotation.x += dt * 1.3;
      this.golden.position.y += Math.sin(this.time * 3) * dt * 0.4;
      const age = this.time - this.goldenBorn;
      if (age > 9) { this.scene.remove(this.golden); this.golden = null; }
      else if (age > 6) this.golden.visible = Math.sin(age * 20) > 0;
    }
    this.controls.update();
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2);
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.6;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.6;
    }
    this.composer.render();
    if (this.onAnchors) {
      const out = {} as Record<Zone, { x: number; y: number }>;
      for (const z of Object.keys(ZONES) as Zone[]) out[z] = this.toScreen(ZONES[z]);
      this.onAnchors(out);
    }
  };

  /** Screen position of a world-zone, used to spawn floating text. */
  zoneScreen(z: Zone) {
    return this.toScreen(ZONES[z]);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener('pointerdown', this.handlePointer);
    this.canvas.removeEventListener('pointermove', this.handleHover);
    this.controls.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose?.();
    });
  }
}
