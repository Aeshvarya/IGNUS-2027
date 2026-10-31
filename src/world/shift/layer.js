import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HEX, V, rrect, fitFont, sparkle } from '../core/util.js';
import { CENTER, PLINTH_TOP, PORTAL, TREE_S, WALLS, ZF, ZP } from '../core/context.js';

/** Eight graffiti / sticker cells painted into one canvas atlas. */
function graffitiAtlas(rnd) {
  const S = 512; const c = document.createElement('canvas'); c.width = S * 4; c.height = S * 2; const g = c.getContext('2d');
  const cells = [
    { kind: 'tag', text: 'IGNUS', font: '"Dela Gothic One", Impact, sans-serif', a: HEX.rani, b: HEX.saffron, rot: -0.08 },
    { kind: 'tag', text: 'SHIFT', font: '"Rubik Wet Paint", Impact, sans-serif', a: HEX.cyan, b: HEX.blue, rot: 0.06 },
    { kind: 'sticker', text: 'BOSS\nFIGHT', bg: HEX.acid, fg: HEX.ink, rot: -0.12 },
    { kind: 'tag', text: 'भावांतर', font: '"Tiro Devanagari Hindi", serif', a: HEX.acid, b: HEX.cyan, rot: -0.04 },
    { kind: 'burst', text: 'LVL\n27', bg: HEX.saffron, fg: HEX.ink, rot: 0.1 },
    { kind: 'tag', text: 'NO\nGRAVITY', font: '"Dela Gothic One", Impact, sans-serif', a: HEX.paper, b: HEX.rani, rot: 0.05 },
    { kind: 'sticker', text: 'SIDE\nQUEST →', bg: HEX.rani, fg: HEX.paper, rot: 0.09 },
    { kind: 'burst', text: '+100\nXP', bg: HEX.cyan, fg: HEX.ink, rot: -0.1 },
  ];
  cells.forEach((cell, i) => {
    g.save(); g.translate((i % 4) * S + S / 2, Math.floor(i / 4) * S + S / 2); g.rotate(cell.rot);
    for (let k = 0; k < 380; k++) {
      const a = rnd() * Math.PI * 2, d = Math.pow(rnd(), 0.6) * S * 0.46;
      g.globalAlpha = 0.06 + rnd() * 0.16; g.fillStyle = k % 3 ? (cell.a || cell.bg) : HEX.ink;
      g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d * 0.7, rnd() * 3 + 0.6, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    const lines = cell.text.split('\n');
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineCap = 'round';
    if (cell.kind === 'tag') {
      const size = fitFont(g, lines, cell.font, S * 0.84, S * 0.6); g.font = `${size}px ${cell.font}`;
      const lh = size * 0.98, y0 = -(lines.length - 1) * lh / 2; const tw = Math.max(...lines.map((l) => g.measureText(l).width));
      g.strokeStyle = cell.a; g.fillStyle = cell.a;
      for (let k = 0; k < 7; k++) {
        const x = (rnd() - 0.5) * tw * 0.9, yb = y0 + (lines.length - 1) * lh + size * 0.32, len = 20 + rnd() * 90;
        g.lineWidth = 5 + rnd() * 7; g.beginPath(); g.moveTo(x, yb - 10); g.lineTo(x, yb + len); g.stroke();
        g.beginPath(); g.arc(x, yb + len, g.lineWidth * 0.75, 0, Math.PI * 2); g.fill();
      }
      lines.forEach((l, i2) => {
        const y = y0 + i2 * lh;
        g.lineWidth = size * 0.16; g.strokeStyle = HEX.ink; g.fillStyle = HEX.ink;
        g.strokeText(l, size * 0.06, y + size * 0.06); g.fillText(l, size * 0.06, y + size * 0.06);
        const grd = g.createLinearGradient(0, y - size / 2, 0, y + size / 2); grd.addColorStop(0, cell.a); grd.addColorStop(1, cell.b);
        g.strokeText(l, 0, y); g.fillStyle = grd; g.fillText(l, 0, y);
        g.lineWidth = Math.max(2, size * 0.022); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.strokeText(l, -size * 0.02, y - size * 0.02);
      });
      sparkle(g, tw * 0.48, y0 - size * 0.5, size * 0.22, HEX.paper);
    } else if (cell.kind === 'sticker') {
      const fam = '"Dela Gothic One", Impact, sans-serif'; const size = fitFont(g, lines, fam, S * 0.62, S * 0.44); g.font = `${size}px ${fam}`;
      const w = Math.max(...lines.map((l) => g.measureText(l).width)) + size * 0.9, h = lines.length * size * 1.05 + size * 0.8;
      g.fillStyle = HEX.ink; rrect(g, -w / 2 + 14, -h / 2 + 14, w, h, 22); g.fill();
      g.fillStyle = HEX.paper; rrect(g, -w / 2 - 9, -h / 2 - 9, w + 18, h + 18, 28); g.fill();
      g.fillStyle = cell.bg; rrect(g, -w / 2, -h / 2, w, h, 20); g.fill(); g.lineWidth = 7; g.strokeStyle = HEX.ink; g.stroke();
      g.fillStyle = cell.fg; lines.forEach((l, i2) => g.fillText(l, 0, -((lines.length - 1) * size * 1.05) / 2 + i2 * size * 1.05 + size * 0.06));
    } else {
      const star = (ox, oy) => { g.beginPath(); for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; const r = k % 2 ? S * 0.31 : S * 0.42; const x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r; if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); };
      star(14, 14); g.fillStyle = HEX.ink; g.fill();
      star(0, 0); g.fillStyle = cell.bg; g.fill(); g.lineWidth = 8; g.strokeStyle = HEX.ink; g.stroke();
      const fam = '"Dela Gothic One", Impact, sans-serif'; const size = fitFont(g, lines, fam, S * 0.42, S * 0.4); g.font = `${size}px ${fam}`;
      g.fillStyle = cell.fg; lines.forEach((l, i2) => g.fillText(l, 0, -((lines.length - 1) * size) / 2 + i2 * size + size * 0.05));
    }
    g.restore();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

function labelTexture(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = HEX.ink; rrect(g, 8, 14, 496, 100, 18); g.fill(); g.lineWidth = 6; g.strokeStyle = HEX.acid; g.stroke();
  g.fillStyle = HEX.paper; g.textAlign = 'center'; g.textBaseline = 'middle';
  const fam = '"Dela Gothic One", Impact, sans-serif'; let size = 44; g.font = `${size}px ${fam}`;
  while (g.measureText(text).width > 450 && size > 20) { size -= 2; g.font = `${size}px ${fam}`; }
  g.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Everything that only exists after the Shift. */
export function buildShiftLayer(ctx, mats) {
  const { U, scene, shiftOnly, R, rnd, PAL, small, gradientMap } = ctx;

  // graffiti on the stone faces and on the low plaza walls (the atlas is reused by the floating gallery)
  let graffitiTex;
  {
    const decals = []; let cellI = 0;
    const decal = (x, y, z, size, rotY) => {
      const cellN = cellI++ % 8; const g = new THREE.PlaneGeometry(size, size);
      const uv = g.attributes.uv; const u0 = (cellN % 4) / 4, row = Math.floor(cellN / 4), v0 = 1 - (row + 1) / 2;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * 0.25, v0 + uv.getY(k) * 0.5);
      g.rotateY(rotY); g.translate(x, y, z); decals.push(g);
    };
    const faceZ = ZP + TREE_S * 0.125;
    for (const s of [-1, 1]) {
      decal(s * 4.55, PLINTH_TOP + 4.3, faceZ, 2.0, 0);
      decal(s * 4.6, PLINTH_TOP + 1.6, faceZ, 1.3, 0);
    }
    WALLS.forEach(([x, z]) => { const s = Math.sign(x); for (const dz of [-12, -6, 0, 6, 12]) decal(x - s * 0.37, 0.6, z + dz, 1.1, -s * Math.PI / 2); });
    graffitiTex = graffitiAtlas(rnd);
    shiftOnly.add(new THREE.Mesh(mergeGeometries(decals), new THREE.MeshBasicMaterial({ map: graffitiTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, color: new THREE.Color(1.5, 1.5, 1.5) })));
  }

  // the berm: the glowing boundary of the magic circle
  {
    const GATE = 3.5 / 42;
    class ArcCurve extends THREE.Curve {
      constructor(r, y) { super(); this.r = r; this.y = y; }
      getPoint(t, target = new THREE.Vector3()) { const a = GATE + t * (Math.PI * 2 - 2 * GATE); return target.set(this.r * Math.sin(a), this.y, -20 + this.r * Math.cos(a)); }
    }
    const g = new THREE.TubeGeometry(new ArcCurve(42, 0), 200, 2.6, 10, false); g.scale(1, 0.5, 1);
    shiftOnly.add(new THREE.Mesh(g, mats.toonDark));
    shiftOnly.add(new THREE.Mesh(new THREE.TubeGeometry(new ArcCurve(42, 1.32), 260, 0.08, 6, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(HEX.rani).multiplyScalar(3) })));
  }

  // orbiting Devanagari runes (the atlas is also reused by the crossing tunnel)
  let runeTex;
  const runeMat = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const glyphs = ['अ', 'इ', 'ग', 'न', 'स', 'भ', 'व', 'त', 'र', 'ई', 'ज', 'क', 'प', 'ल', 'य', 'ह'];
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(255,255,255,0.6)';
    glyphs.forEach((ch, i) => {
      const x = (i % 4) * 128 + 64, y = Math.floor(i / 4) * 128 + 66;
      g.shadowColor = '#ffffff'; g.shadowBlur = 14; g.font = '80px "Tiro Devanagari Hindi", serif'; g.fillText(ch, x, y + 6);
      g.shadowBlur = 0; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 56, 0, Math.PI * 2); g.stroke();
    });
    return new THREE.ShaderMaterial({
      uniforms: { uTime: U.time, uPix: U.pix, uAccent: U.accent, uAtlas: { value: (runeTex = new THREE.CanvasTexture(c)) } },
      vertexShader: /* glsl */`
attribute float aGlyph; attribute float aSize; attribute float aSeed; attribute vec3 aColor;
uniform float uTime; uniform float uPix; varying float vG; varying vec3 vC; varying float vA;
void main(){ vec3 p = position; p.y += sin(uTime * 0.6 + aSeed * 10.0) * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPix * (40.0 / max(0.5, -mv.z)); vG = aGlyph; vC = aColor; vA = 0.6 + 0.4 * sin(uTime * 1.5 + aSeed * 17.0); }`,
      fragmentShader: /* glsl */`
uniform sampler2D uAtlas; uniform vec3 uAccent; varying float vG; varying vec3 vC; varying float vA;
void main(){ vec2 pc = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
  vec2 uv = (pc + vec2(mod(vG, 4.0), 3.0 - floor(vG / 4.0))) / 4.0;
  float m = texture2D(uAtlas, uv).a; if (m < 0.03) discard;
  gl_FragColor = vec4(mix(vC, uAccent, 0.5) * 2.2, m * vA); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
  })();
  const runes = (() => {
    const N = small ? 36 : 64; const pos = [], gl = [], sz = [], sd = [], co = [];
    for (let i = 0; i < N; i++) { const a = R(0, Math.PI * 2), r = R(33, 38); pos.push(Math.sin(a) * r, R(2.5, 13), Math.cos(a) * r); gl.push(Math.floor(rnd() * 16)); sz.push(R(1.3, 2.4)); sd.push(rnd()); const c = PAL[i % PAL.length]; co.push(c.r, c.g, c.b); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aGlyph', new THREE.Float32BufferAttribute(gl, 1));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(sz, 1)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(sd, 1)); g.setAttribute('aColor', new THREE.Float32BufferAttribute(co, 3));
    const p = new THREE.Points(g, runeMat); p.position.copy(CENTER); p.frustumCulled = false; shiftOnly.add(p); return p;
  })();

  // quest markers
  const markers = [];
  ['BOSS ENCOUNTER', 'SIDE QUEST', 'LEVEL ARENA', 'RARE DISCOVERY'].forEach((label, i) => {
    const a = [50, -50, 140, -140][i] * Math.PI / 180; const grp = new THREE.Group(); grp.position.set(Math.sin(a) * 31, 0, -20 + Math.cos(a) * 31);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.6, 0.5) })); gem.scale.set(1, 1.7, 1); gem.position.y = 9;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 9, 6, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.5, 0.3), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.y = 4.5;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(label), transparent: true, depthWrite: false, fog: false })); spr.scale.set(6.4, 1.6, 1); spr.position.y = 11.6;
    grp.add(gem, beam, spr); shiftOnly.add(grp); markers.push({ grp, gem, spr, hl: 0 });
  });

  // ringed planet
  const planet = new THREE.Group(); planet.position.set(-80, 70, -170);
  planet.add(new THREE.Mesh(new THREE.SphereGeometry(16, 32, 16), new THREE.MeshToonMaterial({ color: HEX.saffron, gradientMap, fog: false })));
  { const ring = new THREE.Mesh(new THREE.RingGeometry(21, 30, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(HEX.cyan).multiplyScalar(1.4), side: THREE.DoubleSide, transparent: true, opacity: 0.55, fog: false })); ring.rotation.set(-1.2, 0.3, 0); planet.add(ring); }
  { const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 12), new THREE.MeshToonMaterial({ color: HEX.rani, gradientMap, fog: false })); moon.position.set(170, -20, 30); planet.add(moon); }
  shiftOnly.add(planet);

  // paint burst at the crossing
  const burstMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 99 }, uPix: U.pix },
    vertexShader: /* glsl */`
uniform float uT; uniform float uPix; attribute vec3 aVel; attribute vec3 aColor; attribute float aSeed; varying vec3 vC; varying float vA; varying float vS;
void main(){ float t = uT; vec3 p = position + aVel * t + vec3(0.0, -5.0, 0.0) * t * t * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  float life = 1.0 - smoothstep(0.0, 2.6, t);
  gl_PointSize = (t < 0.0 || t > 2.6) ? 0.0 : (4.0 + aSeed * 9.0) * uPix * (16.0 / max(0.6, -mv.z)) * (0.4 + 0.6 * life);
  vC = aColor; vA = life; vS = aSeed; }`,
    fragmentShader: /* glsl */`
varying vec3 vC; varying float vA; varying float vS;
void main(){ vec2 c = gl_PointCoord * 2.0 - 1.0; float a = atan(c.y, c.x);
  float r = length(c) * (1.0 + 0.18 * sin(a * 5.0 + vS * 30.0));
  float m = smoothstep(1.0, 0.8, r); if (m < 0.01) discard;
  gl_FragColor = vec4(vC, m * vA); }`,
    transparent: true, depthWrite: false,
  });
  {
    const N = small ? 260 : 520; const pos = [], vel = [], col = [], sd = [];
    for (let i = 0; i < N; i++) {
      pos.push(0, PORTAL.y, ZF + 0.6);
      const d = V(R(-1, 1), R(-0.4, 1), R(0.2, 1.4)).normalize().multiplyScalar(R(6, 22)); vel.push(d.x, d.y, d.z);
      const c = PAL[i % PAL.length]; col.push(c.r * 1.4, c.g * 1.4, c.b * 1.4); sd.push(rnd());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aVel', new THREE.Float32BufferAttribute(vel, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(sd, 1));
    const p = new THREE.Points(g, burstMat); p.frustumCulled = false; scene.add(p);
  }

  return { runes, markers, planet, burstMat, runeTex, graffitiTex };
}
