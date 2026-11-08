/**
 * The course scene's 3D (three.js), drawn imperatively into a 1920x1080 canvas:
 *
 * 1. the globe: a white wireframe (graticule, coastlines, borders) turns in, swings round to the venue and the
 *    camera dives down to it;
 * 2. the course: every track edge of the venue as thin lines, the track as a ribbon, the race's path in the
 *    second colour drawn from the start to the post, then the camera swings from straight down into a slow orbit.
 *
 * Options change while it runs (path, hill in 3D, start/finish, chevrons, focus on straights/corners) and fade
 * in or out. Heights are real metres in a group whose y scale is the exaggeration, so turning the hill on just
 * grows that scale.
 */
import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { Focus } from "../../lib/introSchema";
import { focused, heightAt, racePieces, sectionPieces, SECTION_LABEL, startOf, wrap, type Track, type Venue } from "../../lib/venues";

/**
 * A stretch of the race's path: [from, to] in metres on the loop (from the post), or with "chute", on the chute in
 * metres from where it joins the loop, negative (-100 = 100 m up the chute).
 */
type Span = [number, number, "chute"?];

export const W = 1920, H = 1080;
export interface World { coast: [number, number][][]; border: [number, number][][] }
export interface CourseOptions {
  path: boolean;
  elevation: boolean;
  elevationScale: number;
  startFinish: boolean;
  chevrons: boolean;
  focus: Focus;
}

/** Timeline (seconds) of the globe part; the course part starts at COURSE_AT (or at 0 without the globe). */
const SPIN_END = 2.8, DIVE_END = 4.9, COURSE_AT = 4.5, GLOBE_GONE = 5.6;
/** The course part: camera from straight down into the orbit; the path draws itself from the start. */
const ZOOM_S = 2.2, TILT_AT = 1.3, ENTRY_S = 4.2, DRAW_AT = 1.4, DRAW_S = 2.2;
/** One orbit every this many seconds. */
const ORBIT_S = 150;

const YELLOW = new THREE.Color("#FFED0D");
const FOCUS = new THREE.Color("#38D4FF");
const WHITE = new THREE.Color("#FFFFFF");

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** Move `cur` toward `to` by a frame-rate independent step. */
const approach = (cur: number, to: number, dt: number, rate = 4) => cur + (to - cur) * (1 - Math.exp(-rate * dt));

function lonLat(lon: number, lat: number, r = 1): THREE.Vector3 {
  const a = THREE.MathUtils.degToRad(lat), b = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(Math.cos(a) * Math.sin(b) * r, Math.sin(a) * r, Math.cos(a) * Math.cos(b) * r);
}

/** Positions of line segments (pairs) for a polyline list. */
function segmentsOf(lines: [number, number][][], r: number, out: number[] = []) {
  for (const l of lines) for (let i = 1; i < l.length; i++) {
    const a = lonLat(l[i - 1][0], l[i - 1][1], r), b = lonLat(l[i][0], l[i][1], r);
    out.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  return out;
}

function graticule(step = 15): [number, number][][] {
  const out: [number, number][][] = [];
  for (let lon = -180; lon < 180; lon += step) out.push(Array.from({ length: 37 }, (_, i) => [lon, -90 + i * 5] as [number, number]));
  for (let lat = -75; lat <= 75; lat += step) out.push(Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat] as [number, number]));
  return out;
}

function fatLines(positions: number[], color: THREE.Color, width: number, opacity: number) {
  const g = new LineSegmentsGeometry();
  g.setPositions(positions);
  const m = new LineMaterial({ color: color.getHex(), linewidth: width, transparent: true, opacity, depthWrite: false });
  m.resolution.set(W, H);
  return new LineSegments2(g, m);
}

function label(html: string, cls: string) {
  const el = document.createElement("div");
  el.className = cls;
  el.innerHTML = html;
  const o = new CSS2DObject(el);
  return { el, o };
}

/** A flat ">" pointing along +x, lying on the ground. */
function chevronGeometry(len = 14, half = 9, thick = 5) {
  const s = new THREE.Shape();
  s.moveTo(len / 2, 0);
  s.lineTo(-len / 2 + thick * 0.2, half);
  s.lineTo(-len / 2 - thick, half);
  s.lineTo(len / 2 - thick * 1.2, 0);
  s.lineTo(-len / 2 - thick, -half);
  s.lineTo(-len / 2 + thick * 0.2, -half);
  s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** A checkered texture for the winning post line. */
function checkerTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 16;
  const x = c.getContext("2d")!;
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) {
    x.fillStyle = (i + j) % 2 ? "#000" : "#fff";
    x.fillRect(i * 4, j * 4, 4, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  return t;
}

interface Ribbon { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; count: number; target: number; cur: number }

export class CourseView3D {
  private renderer: THREE.WebGLRenderer;
  private css: CSS2DRenderer;
  private raf = 0;
  private t0 = performance.now();
  private last = performance.now();
  private disposed = false;
  private host: HTMLElement;

  private globeScene = new THREE.Scene();
  private globeCam = new THREE.PerspectiveCamera(32, W / H, 0.01, 50);
  private globe = new THREE.Group();
  private globeSpin = new THREE.Group();
  private globeMats: LineMaterial[] = [];
  private marker?: THREE.Mesh;
  private pulse?: THREE.Mesh;

  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(30, W / H, 5, 20000);
  private ground = new THREE.Group();
  private curve: THREE.CatmullRomCurve3;
  private center = new THREE.Vector3();
  private radius = 600;
  private theta0 = 0;

  private outlineMat?: LineMaterial;
  private edgeMat?: LineMaterial;
  private loop?: Ribbon;
  private path?: Ribbon;
  private wall?: Ribbon;
  private focusRibbons: { id: string; r: Ribbon; label: CSS2DObject; el: HTMLElement }[] = [];
  private chevrons?: THREE.InstancedMesh;
  private chevronMat?: THREE.MeshBasicMaterial;
  private markers = new THREE.Group();
  private markerMats: THREE.Material[] = [];
  private startLabel?: { el: HTMLElement; o: CSS2DObject };
  private finishLabel?: { el: HTMLElement; o: CSS2DObject };
  private startPole?: THREE.Mesh;
  private finishPole?: THREE.Mesh;
  private postLine?: THREE.Mesh;

  private elev = 1;
  private show = { path: 1, startFinish: 1, chevrons: 1, wall: 0 };
  private opts: CourseOptions;
  private courseAt: number;
  private pieces: Span[];
  private pathLen: number;

  constructor(host: HTMLElement, private venue: Venue, private track: Track, private distance: number, opts: CourseOptions, private world: World | null) {
    this.host = host;
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;
    const canvas = this.renderer.domElement;
    canvas.style.cssText = "position:absolute;inset:0;width:1920px;height:1080px";
    canvas.dataset.testid = "course-canvas";
    host.appendChild(canvas);
    this.css = new CSS2DRenderer();
    this.css.setSize(W, H);
    this.css.domElement.style.cssText = "position:absolute;inset:0;pointer-events:none";
    host.appendChild(this.css.domElement);

    // the loop sits a little above the middle, clear of the boxes along the bottom
    this.cam.setViewOffset(W, H, 0, 36, W, H);
    this.courseAt = world ? COURSE_AT : 0;
    const L = track.length;
    const up = startOf(track, distance || L).chute;
    this.pieces = [...(up ? [[-up, 0, "chute"] as Span] : []), ...racePieces(track, distance || L)];
    this.pathLen = this.pieces.reduce((t, [a, b]) => t + b - a, 0);
    this.curve = new THREE.CatmullRomCurve3(track.line.map(([x, y]) => new THREE.Vector3(x, 0, -y)), true, "centripetal");

    if (world) this.buildGlobe(world);
    this.buildCourse();
    this.elev = opts.elevation ? opts.elevationScale : 1;
    this.ground.scale.y = this.elev;
    this.show = { path: opts.path ? 1 : 0, startFinish: opts.startFinish ? 1 : 0, chevrons: opts.chevrons ? 1 : 0, wall: opts.elevation ? 1 : 0 };
    host.dataset.phase = world ? "globe" : "course";
    this.frame = this.frame.bind(this);
    this.raf = requestAnimationFrame(this.frame);
  }

  setOptions(o: CourseOptions) {
    this.opts = o;
  }

  /** Point and direction on the loop at official metres `s` from the post (height not applied). */
  private at(s: number) {
    const u = wrap(s, this.track.length) / this.track.length;
    return { p: this.curve.getPointAt(u), t: this.curve.getTangentAt(u) };
  }
  private h(s: number) { return heightAt(this.track, s); }
  /** Point and direction on the chute, `s` metres from where it joins the loop (negative: up the chute). */
  private chuteAt(s: number) {
    const c = this.track.chute!, [far, near] = c.line;
    const k = -s / c.length;
    const p = new THREE.Vector3(near[0] + (far[0] - near[0]) * k, 0, -(near[1] + (far[1] - near[1]) * k));
    const t = new THREE.Vector3(near[0] - far[0], 0, -(near[1] - far[1])).normalize();
    return { p, t };
  }
  /** Point, direction and height on a span of the path. */
  private on(s: number, chute?: "chute") {
    return chute ? { ...this.chuteAt(s), y: this.h(this.track.chute!.join) } : { ...this.at(s), y: this.h(s) };
  }

  private buildGlobe(world: World) {
    const { lat, lon } = this.venue;
    const grat = fatLines(segmentsOf(graticule(), 1), WHITE, 1, 0.16);
    const coast = fatLines(segmentsOf(world.coast, 1.001), WHITE, 1.6, 0.95);
    const border = fatLines(segmentsOf(world.border, 1.001), WHITE, 1, 0.35);
    // a faint solid core so the lines on the far side are hidden
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.995, 64, 48), new THREE.MeshBasicMaterial({ color: 0x00157d, transparent: true, opacity: 0.78 }));
    core.renderOrder = -1;
    this.globeMats = [grat.material, coast.material, border.material];
    this.globeSpin.add(core, grat, border, coast);
    // the venue: a yellow dot and a pulsing ring
    const p = lonLat(lon, lat, 1.002);
    this.marker = new THREE.Mesh(new THREE.CircleGeometry(0.012, 24), new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true }));
    this.marker.position.copy(p);
    this.marker.lookAt(p.clone().multiplyScalar(2));
    this.pulse = new THREE.Mesh(new THREE.RingGeometry(0.016, 0.022, 40), new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, side: THREE.DoubleSide }));
    this.pulse.position.copy(p);
    this.pulse.lookAt(p.clone().multiplyScalar(2));
    this.globeSpin.add(this.marker, this.pulse);
    this.globe.add(this.globeSpin);
    this.globeScene.add(this.globe);
    this.globeCam.position.set(0, 0, 4.4);
  }

  private ribbon(pieces: Span[], width: number, color: THREE.Color, opacity: number, order: number, lift = 0): Ribbon {
    const pos: number[] = [], idx: number[] = [];
    let v = 0;
    for (const [a, b, chute] of pieces) {
      const n = Math.max(2, Math.ceil((b - a) / 3));
      for (let i = 0; i <= n; i++) {
        const s = a + ((b - a) * i) / n;
        const { p, t, y: ground } = this.on(s, chute);
        const nx = -t.z, nz = t.x; // across the track
        const y = ground + lift;
        pos.push(p.x + nx * width / 2, y, p.z + nz * width / 2, p.x - nx * width / 2, y, p.z - nz * width / 2);
        if (i > 0) idx.push(v - 2, v - 1, v, v - 1, v + 1, v);
        v += 2;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, mat);
    mesh.renderOrder = order;
    this.ground.add(mesh);
    return { mesh, mat, count: idx.length, target: opacity, cur: 0 };
  }

  /** The hill as a curtain: from the ground up to the track, along the outside edge. */
  private curtain(width: number): Ribbon {
    const pos: number[] = [], idx: number[] = [];
    const L = this.track.length, n = Math.ceil(L / 4);
    for (let i = 0; i <= n; i++) {
      const s = (L * i) / n;
      const { p, t } = this.at(s);
      const nx = -t.z, nz = t.x, y = this.h(s);
      for (const side of [1, -1]) pos.push(p.x + side * nx * width / 2, 0, p.z + side * nz * width / 2, p.x + side * nx * width / 2, y, p.z + side * nz * width / 2);
      const v = i * 4;
      if (i > 0) for (const o of [0, 2]) idx.push(v - 4 + o, v - 3 + o, v + o, v - 3 + o, v + 1 + o, v + o);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, mat);
    mesh.renderOrder = 1;
    this.ground.add(mesh);
    return { mesh, mat, count: idx.length, target: 0.14, cur: 0 };
  }

  private buildCourse() {
    const L = this.track.length, width = 22;
    // context: every track edge of the venue on the ground
    const outline: number[] = [];
    for (const ring of this.venue.outline) for (let i = 1; i < ring.length; i++) {
      outline.push(ring[i - 1][0], 0, -ring[i - 1][1], ring[i][0], 0, -ring[i][1]);
    }
    const o = fatLines(outline, WHITE, 1.2, 0);
    this.outlineMat = o.material;
    o.renderOrder = 0;
    this.ground.add(o);

    this.wall = this.curtain(width);
    this.loop = this.ribbon([[0, L]], width, WHITE, 0.12, 2);
    // the track's two edges
    const edges: number[] = [];
    for (const side of [1, -1]) {
      const n = Math.ceil(L / 3);
      for (let i = 0; i < n; i++) {
        const a = this.at((L * i) / n), b = this.at((L * (i + 1)) / n);
        const ya = this.h((L * i) / n), yb = this.h((L * (i + 1)) / n);
        edges.push(a.p.x - a.t.z * side * width / 2, ya, a.p.z + a.t.x * side * width / 2, b.p.x - b.t.z * side * width / 2, yb, b.p.z + b.t.x * side * width / 2);
      }
    }
    const e = fatLines(edges, WHITE, 2, 0);
    this.edgeMat = e.material;
    e.renderOrder = 3;
    this.ground.add(e);

    this.path = this.ribbon(this.pieces, width - 2, YELLOW, 0.92, 4);
    this.path.mesh.geometry.setDrawRange(0, 0);

    // focus ribbons and their labels, one per section
    for (const sec of this.track.sections) {
      const r = this.ribbon(sectionPieces(this.track, sec), width + 6, FOCUS, 0.85, 5);
      const mid = sec.from + (sec.to - sec.from) / 2;
      const len = sec.id === "home" ? this.track.homestretch : Math.round(sec.to - sec.from);
      const lab = label(`<b>${SECTION_LABEL[sec.id]}</b>${sec.kind === "straight" ? `<span>${len} M</span>` : ""}`, "course-label course-label--focus");
      const { p } = this.at(mid);
      lab.o.position.set(p.x, 0, p.z);
      lab.el.style.opacity = "0";
      this.scene.add(lab.o);
      this.focusRibbons.push({ id: sec.id, r, label: lab.o, el: lab.el });
    }

    // chevrons along the race's path
    this.chevronMat = new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    const count = Math.min(400, Math.ceil(Math.max(this.pathLen, L) / 34) + 2);
    this.chevrons = new THREE.InstancedMesh(chevronGeometry(), this.chevronMat, count);
    this.chevrons.renderOrder = 8;
    this.chevrons.frustumCulled = false;
    this.ground.add(this.chevrons);

    // start and winning post: poles, a checkered line across the track at the post, labels
    const st = startOf(this.track, this.distance || L);
    const pole = (color: THREE.Color) => {
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 });
      this.markerMats.push(m);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 70, 12), m);
      this.markers.add(mesh);
      return mesh;
    };
    this.startPole = pole(YELLOW);
    this.finishPole = pole(WHITE);
    const lineMat = new THREE.MeshBasicMaterial({ map: checkerTexture(), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.markerMats.push(lineMat);
    this.postLine = new THREE.Mesh(new THREE.PlaneGeometry(width + 4, 5), lineMat);
    this.postLine.rotation.x = -Math.PI / 2;
    this.postLine.renderOrder = 7;
    const fin = this.at(0);
    this.postLine.rotation.z = Math.atan2(-fin.t.z, fin.t.x) + Math.PI / 2;
    this.ground.add(this.postLine);
    this.postLine.position.set(fin.p.x, this.h(0), fin.p.z);
    this.scene.add(this.markers);
    this.startLabel = label(`<b>START</b><span>${this.distance || L} M</span>`, "course-label course-label--start");
    this.finishLabel = label(`<b>FINISH</b>`, "course-label course-label--finish");
    this.startLabel.el.style.opacity = this.finishLabel.el.style.opacity = "0";
    this.scene.add(this.startLabel.o, this.finishLabel.o);
    this.startPole.userData.at = st.chute ? ([-st.chute, "chute"] as const) : ([st.s] as const);
    this.finishPole.userData.at = [0] as const;

    this.scene.add(this.ground);
    // the camera: centre of the track, orbit radius from its size, starting on the home straight's side
    // (a start up the chute counts as part of the course, so the camera centres on the whole race)
    const sp = st.chute ? this.chuteAt(-st.chute).p : null;
    const box = new THREE.Box3().setFromPoints(this.track.line.map(([x, y]) => new THREE.Vector3(x, 0, -y)));
    if (sp) box.expandByPoint(sp);
    box.getCenter(this.center);
    // far enough that the whole loop fits across the screen whichever way it faces (the bounding circle's radius)
    const R = Math.max(...this.track.line.map(([x, y]) => Math.hypot(x - this.center.x, -y - this.center.z)),
      sp ? Math.hypot(sp.x - this.center.x, sp.z - this.center.z) : 0);
    // a start up a chute makes the course long and thin, and at a low angle its near end comes down over the boxes
    // along the bottom: stand far enough off that it stays between them and the title whichever way the orbit faces
    const keep = this.track.line.filter((_, i) => i % 2 === 0).map(([x, y]) => new THREE.Vector3(x, 0, -y));
    if (sp) keep.push(sp, sp.clone().setY(100));
    this.radius = Math.max(R * 2.45, sp ? this.fitDistance(keep, THREE.MathUtils.degToRad(20)) : 0);
    const home = this.track.sections.find((x) => x.id === "home");
    const hm = this.at(home ? (home.from + home.to) / 2 : 0).p.clone().sub(this.center);
    this.theta0 = Math.atan2(hm.x, hm.z);
  }

  /** The camera distance at `phi` above the ground that keeps `points` inside the band between the title and the
   * boxes along the bottom, at the worst angle round the orbit. */
  private fitDistance(points: THREE.Vector3[], phi: number) {
    const cam = this.cam.clone();
    const fits = (theta: number, dist: number) => {
      cam.position.set(this.center.x + Math.sin(theta) * Math.cos(phi) * dist, Math.sin(phi) * dist, this.center.z + Math.cos(theta) * Math.cos(phi) * dist);
      cam.up.set(0, 1, 0);
      cam.lookAt(this.center);
      cam.updateMatrixWorld();
      return points.every((p) => {
        const v = p.clone().project(cam);
        return Math.abs(v.x) < 0.93 && v.y > -0.5 && v.y < 0.58;
      });
    };
    let need = 0;
    for (let k = 0; k < 36; k++) {
      const theta = (k / 36) * Math.PI * 2;
      let lo = 100, hi = 30000;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (fits(theta, mid)) hi = mid; else lo = mid;
      }
      need = Math.max(need, hi);
    }
    return need;
  }

  private frame(now: number) {
    if (this.disposed) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const t = (now - this.t0) / 1000;
    this.renderer.clear();
    if (this.world && t < GLOBE_GONE) this.globeFrame(t);
    if (t >= this.courseAt - 0.001) this.courseFrame(t - this.courseAt, dt);
    this.raf = requestAnimationFrame(this.frame);
  }

  private globeFrame(t: number) {
    const { lat, lon } = this.venue;
    const spin = ease(clamp01(t / SPIN_END));
    // turn in from far round the globe and a tilted axis, ending with the venue facing the camera
    this.globe.rotation.x = THREE.MathUtils.degToRad(lat) * spin + (1 - spin) * 0.35;
    this.globeSpin.rotation.y = -THREE.MathUtils.degToRad(lon) - (1 - spin) * Math.PI * 2.3;
    this.globe.scale.setScalar(0.55 + 0.45 * ease(clamp01(t / 1.6)));
    const dive = ease(clamp01((t - SPIN_END + 0.2) / (DIVE_END - SPIN_END + 0.2)));
    const camZ = 4.4 - (4.4 - 1.03) * dive;
    this.globeCam.position.set(0, 0, camZ);
    this.globeCam.lookAt(0, 0, 0);
    const fade = 1 - clamp01((t - COURSE_AT) / (GLOBE_GONE - COURSE_AT));
    const appear = clamp01(t / 0.8);
    const op = [0.16, 0.95, 0.35];
    this.globeMats.forEach((m, i) => { m.opacity = op[i] * fade * appear; });
    ((this.globeSpin.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.78 * fade * appear;
    if (this.marker && this.pulse) {
      // the same size on screen however close the camera gets
      const near = Math.max(0.01, (camZ - 1) / 3.4);
      const k = (t * 1.4) % 1;
      this.marker.scale.setScalar(near);
      this.pulse.scale.setScalar((1 + k * 3) * near);
      (this.pulse.material as THREE.MeshBasicMaterial).opacity = (1 - k) * fade * clamp01((t - 1.8) / 0.6);
      (this.marker.material as THREE.MeshBasicMaterial).opacity = fade * clamp01((t - 1.8) / 0.6);
    }
    this.renderer.render(this.globeScene, this.globeCam);
  }

  private courseFrame(t: number, dt: number) {
    const o = this.opts, L = this.track.length;
    if (this.host.dataset.phase !== "course" && t > 0.6) this.host.dataset.phase = "course";
    const appear = clamp01(t / 1.0);
    // targets
    this.elev = approach(this.elev, o.elevation ? o.elevationScale : 1, dt, 2.5);
    this.ground.scale.y = this.elev;
    this.markers.scale.y = 1;
    this.show.path = approach(this.show.path, o.path ? 1 : 0, dt);
    this.show.startFinish = approach(this.show.startFinish, o.startFinish ? 1 : 0, dt);
    this.show.chevrons = approach(this.show.chevrons, o.chevrons ? 1 : 0, dt);
    this.show.wall = approach(this.show.wall, o.elevation ? 1 : 0, dt, 2.5);
    const focusIds = new Set(focused(this.track, o.focus).map((x) => x.id));
    const anyFocus = focusIds.size > 0;
    this.host.dataset.elevation = o.elevation ? "on" : "off";
    this.host.dataset.focus = o.focus;

    if (this.outlineMat) this.outlineMat.opacity = 0.3 * appear;
    if (this.edgeMat) this.edgeMat.opacity = 0.75 * appear;
    if (this.loop) this.loop.mat.opacity = 0.12 * appear;
    if (this.wall) this.wall.mat.opacity = 0.16 * this.show.wall * appear;
    if (this.path) {
      const draw = ease(clamp01((t - DRAW_AT) / DRAW_S));
      // draw whole quads (6 indices) so the growing end stays square
      this.path.mesh.geometry.setDrawRange(0, Math.floor((this.path.count * draw) / 6) * 6);
      this.path.mat.opacity = 0.92 * this.show.path * appear * (anyFocus ? 0.45 : 1);
    }
    for (const f of this.focusRibbons) {
      const on = focusIds.has(f.id as never) ? 1 : 0;
      f.r.cur = approach(f.r.cur, on, dt, 5);
      f.r.mat.opacity = 0.85 * f.r.cur * appear;
      f.el.style.opacity = String(f.r.cur * appear);
      const sec = this.track.sections.find((x) => x.id === f.id)!;
      f.label.position.y = this.h((sec.from + sec.to) / 2) * this.elev + 30;
    }

    // chevrons run along the path (or the whole loop when the path is off), from the start to the post
    if (this.chevrons && this.chevronMat) {
      const spacing = 34, speed = 46;
      const along: Span[] = o.path ? this.pieces : [[0, L]];
      const total = along.reduce((s, [a, b]) => s + b - a, 0);
      const shift = (t * speed) % spacing;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      for (let k = 0; k < this.chevrons.count; k++) {
        const d = k * spacing + shift;
        let s = 0, left = d, chute: Span[2];
        const ok = d < total;
        for (const [a, b, c] of along) { if (left <= b - a) { s = a + left; chute = c; break; } left -= b - a; }
        const fadeEnds = Math.min(1, d / 60, (total - d) / 60);
        const k2 = ok ? Math.max(0, fadeEnds) : 0;
        const { p, t: tan, y } = this.on(s, chute);
        pos.set(p.x, y + 0.05, p.z);
        q.setFromAxisAngle(up, Math.atan2(-tan.z, tan.x));
        sc.setScalar(k2);
        m.compose(pos, q, sc);
        this.chevrons.setMatrixAt(k, m);
      }
      this.chevrons.instanceMatrix.needsUpdate = true;
      this.chevronMat.opacity = 0.9 * this.show.chevrons * clamp01((t - DRAW_AT - DRAW_S * 0.6) / 0.8);
    }

    // start and post markers stand on the (stretched) track
    const sf = this.show.startFinish * clamp01((t - DRAW_AT - 0.4) / 0.8);
    for (const m of this.markerMats) (m as THREE.MeshBasicMaterial).opacity = sf;
    for (const [pole, lab] of [[this.startPole, this.startLabel], [this.finishPole, this.finishLabel]] as const) {
      if (!pole || !lab) continue;
      const [s, chute] = pole.userData.at as [number, "chute"?], { p, y: ground } = this.on(s, chute), y = ground * this.elev;
      pole.position.set(p.x, y + 35, p.z);
      lab.o.position.set(p.x, y + 82, p.z);
      lab.el.style.opacity = String(sf);
    }

    // camera: from straight down (where the globe left off) into a slow orbit, starting on the home straight's side
    // zoom straight down from high above (where the globe left off), then tilt down to a low angle (about 20 degrees,
    // which keeps the loop in the band between the title and the boxes along the bottom) and orbit
    const d = this.radius;
    const zoom = ease(clamp01(t / ZOOM_S)), tilt = ease(clamp01((t - TILT_AT) / (ENTRY_S - TILT_AT)));
    const theta = this.theta0 + (t / ORBIT_S) * Math.PI * 2 * (this.venue.direction === "right" ? -1 : 1);
    const lift = this.track.height * this.elev * 0.5;
    const target = this.center.clone().add(new THREE.Vector3(0, lift, 0));
    const phi = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(89.9, 20, tilt));
    // the closer to straight down, the more of the loop's depth faces the camera: back off so it still fits
    const dist = THREE.MathUtils.lerp(d * 14, d * Math.max(1, 2.1 * Math.sin(phi)), zoom);
    this.cam.position.set(target.x + Math.sin(theta) * Math.cos(phi) * dist, target.y + Math.sin(phi) * dist, target.z + Math.cos(theta) * Math.cos(phi) * dist);
    this.cam.up.set(0, 0, -1).lerp(new THREE.Vector3(0, 1, 0), tilt).normalize();
    this.cam.lookAt(target);
    this.renderer.clearDepth(); // the globe drawn before it must not hide it
    this.renderer.render(this.scene, this.cam);
    this.css.render(this.scene, this.cam);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    const free = (s: THREE.Object3D) => s.traverse((x) => {
      const m = x as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((y) => { (y as THREE.MeshBasicMaterial).map?.dispose(); y.dispose(); });
    });
    free(this.scene);
    free(this.globeScene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.css.domElement.remove();
  }
}

let worldPromise: Promise<World | null> | null = null;
/** The globe's lines (public/globe/world.json), loaded once; null when it can't be loaded. */
export function loadWorld(): Promise<World | null> {
  worldPromise ??= fetch("./globe/world.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return worldPromise;
}
