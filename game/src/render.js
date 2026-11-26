// render.js — hand-rolled WebGL scene: own shaders, meshes, camera, BRIGHT lighting.
import { mat4Perspective, mat4LookAt, mat4Mul, mat4Translate, mat4RotateY, mat4RotateX, mat4RotateZ, deg2rad, v3add, v3sub } from './math3d.js';
import { PALETTE } from './config.js';

const VS = `
attribute vec3 aPos; attribute vec3 aCol;
uniform mat4 uMVP; uniform float uBright;
varying vec3 vCol;
void main(){ gl_Position = uMVP * vec4(aPos,1.0); vCol = aCol * uBright; }`;
const FS = `
precision mediump float; varying vec3 vCol;
void main(){ gl_FragColor = vec4(vCol, 1.0); }`;

export function makeRenderer(canvas) {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: true });
  if (!gl) return null;
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  const aCol = gl.getAttribLocation(prog, 'aCol');
  const uMVP = gl.getUniformLocation(prog, 'uMVP');
  const uBright = gl.getUniformLocation(prog, 'uBright');
  const posBuf = gl.createBuffer();
  const colBuf = gl.createBuffer();
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.45, 0.22, 0.45, 1); // dusk violet, never black

  function drawMesh(mesh, mvp, bright) {
    if (!mesh.positions.length) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STREAM_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.colors), gl.STREAM_DRAW);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(uMVP, false, new Float32Array(mvp));
    gl.uniform1f(uBright, bright);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.positions.length / 3);
  }

  // sky gradient quad drawn first (as a big background mesh, depth off)
  // Positioned ahead of the camera ALONG ITS HEADING, so the wall always
  // covers the whole frustum whatever way the plane points — a fixed +z wall
  // leaves a bare strip at the frame edge on a diagonal heading.
  function drawSky(mvp, eye, heading, tint) {
    const top = (tint && tint.top) || PALETTE.skyTop;
    const mid = (tint && tint.mid) || PALETTE.skyMid;
    const sun = (tint && tint.sun) || PALETTE.sunset;
    // horizon band mesh: a wide strip ahead of the camera
    const mesh = { positions: [], colors: [] };
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const cx = eye[0] + fx * 1400, cz = eye[2] + fz * 1400;
    const rx = fz, rz = -fx; // right vector, perpendicular to forward
    const y0 = -60, y1 = 320;
    const x0 = cx - rx * 1600, z0 = cz - rz * 1600;
    const x1 = cx + rx * 1600, z1 = cz + rz * 1600;
    const quad = (a, b, c, d, ca, cb) => {
      mesh.positions.push(...a, ...b, ...c, ...a, ...c, ...d);
      mesh.colors.push(...ca, ...ca, ...cb, ...ca, ...cb, ...cb);
    };
    quad([x0, y1, z0], [x1, y1, z1], [x1, y0 + 60, z1], [x0, y0 + 60, z0], top, mid);
    quad([x0, y0 + 60, z0], [x1, y0 + 60, z1], [x1, y0, z1], [x0, y0, z0], mid, sun);
    // low ember sun: a 16-gon fan riding the horizon band, offset right of
    // centre so it never sits behind the plane or the HUD. A fan (not a
    // quad) reads as a round disc; it is the light source that silhouettes
    // the whole scene and anchors the ember-dusk identity.
    const sunCx = cx + rx * 420, sunCy = y0 + 52, sunCz = cz + rz * 420;
    const sunR = 88, sunCol = [1.0, 0.52, 0.12];
    let prev = null;
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const p = [sunCx + rx * Math.cos(a) * sunR, sunCy + Math.sin(a) * sunR, sunCz + rz * Math.cos(a) * sunR];
      if (prev) {
        mesh.positions.push(sunCx, sunCy, sunCz, ...prev, ...p);
        for (let k = 0; k < 3; k++) mesh.colors.push(...sunCol);
      }
      prev = p;
    }
    // (no square sun disc — the orange horizon band carries the sunset; a quad sun reads as a box)
    gl.disable(gl.DEPTH_TEST);
    drawMesh(mesh, mvp, 1.15);
    gl.enable(gl.DEPTH_TEST);
  }

  function planeMesh(plane, t) {
    const mesh = { positions: [], colors: [] };
    const tri = (a, b, c, col) => {
      mesh.positions.push(...a, ...b, ...c);
      for (let i = 0; i < 3; i++) mesh.colors.push(...col);
    };
    const quad = (a, b, c, d, col) => { tri(a, b, c, col); tri(a, c, d, col); };
    const boxAt = (x0, y0, z0, x1, y1, z1, col) => {
      const A = [x0, y0, z0], B = [x1, y0, z0], C = [x1, y1, z0], D = [x0, y1, z0];
      const E = [x0, y0, z1], F = [x1, y0, z1], G = [x1, y1, z1], H = [x0, y1, z1];
      quad(A, B, C, D, col); quad(F, E, H, G, col); quad(E, A, D, H, col);
      quad(B, F, G, C, col); quad(D, C, G, H, col);
    };
    const c = plane.def.color;
    const top = [0.60, 0.63, 0.68];   // fuselage top, sunlit grey — never blown-out white
    const belly = [0.22, 0.25, 0.30];  // fuselage belly, shadowed
    const canopyCol = [0.05, 0.08, 0.15]; // dark canopy glass
    // Fuselage: a faceted BODY with real volume — 5 stations, nose at +z.
    // Top faces light, side faces squadron grey, belly dark: from the chase
    // view the tail reads as a rounded body, never a flat paper dart.
    // stations: [z, halfW, topY, botY]
    const st = [
      [7.2, 0.12, 0.42, 0.38],
      [4.5, 0.95, 1.00, -0.55],
      [0.0, 1.35, 1.10, -0.95],
      [-5.0, 0.95, 0.80, -0.75],
      [-6.5, 0.55, 0.50, -0.50],
    ];
    const ring = (s) => {
      const [z, w, ty, by] = s;
      const span = ty - by;
      return {
        T: [0, ty, z],
        UL: [-w, ty - span * 0.28, z],
        LL: [-w, by + span * 0.28, z],
        B: [0, by, z],
        LR: [w, by + span * 0.28, z],
        UR: [w, ty - span * 0.28, z],
      };
    };
    for (let i = 0; i < st.length - 1; i++) {
      const A = ring(st[i]), B = ring(st[i + 1]);
      const topCol = i === 0 ? PALETTE.ember : top; // ember nose cone
      quad(A.T, B.T, B.UR, A.UR, topCol);
      quad(A.T, A.UL, B.UL, B.T, topCol);
      quad(A.UL, A.LL, B.LL, B.UL, c);
      quad(A.UR, B.UR, B.LR, A.LR, c);
      quad(A.LL, A.B, B.B, B.LL, belly);
      quad(A.B, A.LR, B.LR, B.B, belly);
    }
    // dark canopy: a raised dark bump ahead of the wings, with one thin cyan
    // glint — it reads as glass, not a painted triangle
    tri([0, 1.78, 2.9], [-0.85, 0.95, 4.6], [0.85, 0.95, 4.6], canopyCol);
    tri([0, 1.78, 2.9], [0.85, 0.95, 1.2], [-0.85, 0.95, 1.2], canopyCol);
    tri([0, 1.78, 2.9], [-0.85, 0.95, 1.2], [-0.85, 0.95, 4.6], canopyCol);
    tri([0, 1.78, 2.9], [0.85, 0.95, 4.6], [0.85, 0.95, 1.2], canopyCol);
    tri([0, 1.80, 3.7], [-0.20, 1.38, 4.3], [0.20, 1.38, 4.3], PALETTE.cyan);
    // intakes: dark mouths flanking the fuselage just behind the nose
    boxAt(1.02, -0.35, 2.2, 1.55, 0.45, 3.8, [0.10, 0.11, 0.14]);
    boxAt(-1.55, -0.35, 2.2, -1.02, 0.45, 3.8, [0.10, 0.11, 0.14]);
    // main wings — wide, with real thickness (dark underside) + amber tips
    quad([-1, 0, 1], [-8.5, -0.3, -3.5], [-8.5, -0.3, -1.5], [-1, 0, -1.5], c);
    quad([1, 0, 1], [8.5, -0.3, -1.5], [8.5, -0.3, -3.5], [1, 0, -1.5], c);
    quad([-1, -0.32, 1], [-1, -0.32, -1.5], [-8.5, -0.62, -1.5], [-8.5, -0.62, -3.5], [0.38, 0.40, 0.44]);
    quad([1, -0.32, 1], [8.5, -0.62, -3.5], [8.5, -0.62, -1.5], [1, -0.32, -1.5], [0.38, 0.40, 0.44]);
    tri([-8.5, -0.3, -3.5], [-9.5, -0.3, -3], [-9.5, -0.3, -1.8], PALETTE.ember);
    tri([8.5, -0.3, -3.5], [9.5, -0.3, -1.8], [9.5, -0.3, -3], PALETTE.ember);
    // ember wingtip bands: full-chord amber on the outer wing, so the
    // wingtips read as orange flashes from the chase view
    quad([-7.5, -0.3, -3.4], [-8.5, -0.3, -3.5], [-8.5, -0.3, -1.6], [-7.5, -0.3, -1.6], PALETTE.amber);
    quad([7.5, -0.3, -3.4], [8.5, -0.3, -1.6], [8.5, -0.3, -3.5], [7.5, -0.3, -1.6], PALETTE.amber);
    // red-white roundels on both wings: concentric discs lying on the wing
    // top surface (y follows the wing slope), visible from the chase view
    const wingY = (x) => -0.3 * (Math.abs(x) - 1) / 7.5 + 0.05;
    const roundel = (cx, cz, r) => {
      const fan = (rr, col, yOff) => {
        const segs = 10;
        let prev = null;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          const px = cx + Math.cos(a) * rr;
          const p = [px, wingY(px) + yOff, cz + Math.sin(a) * rr];
          if (prev) tri([cx, wingY(cx) + yOff, cz], prev, p, col);
          prev = p;
        }
      };
      fan(r, [0.85, 0.12, 0.12], 0.0);
      fan(r * 0.62, [0.95, 0.95, 0.92], 0.015);
      fan(r * 0.28, [0.85, 0.12, 0.12], 0.03);
    };
    roundel(-5.2, -2.2, 1.15);
    roundel(5.2, -2.2, 1.15);
    // tail fins
    quad([0, 0.4, -6], [-2.6, 0.2, -8.5], [-2.6, 0.2, -6.5], [0, 0.4, -6.5], c);
    quad([0, 0.4, -6], [2.6, 0.2, -6.5], [2.6, 0.2, -8.5], [0, 0.4, -6.5], c);
    tri([0, 0.3, -6], [0, 2.6, -8], [0, 2.6, -6], c);
    // roundel on both faces of the vertical fin
    const finRoundel = (sx) => {
      const fan = (rr, col, xOff) => {
        const segs = 10;
        let prev = null;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          const p = [sx * xOff, 1.5 + Math.sin(a) * rr, -7.0 + Math.cos(a) * rr];
          if (prev) tri([sx * xOff, 1.5, -7.0], prev, p, col);
          prev = p;
        }
      };
      fan(0.85, [0.85, 0.12, 0.12], 0.10);
      fan(0.55, [0.95, 0.95, 0.92], 0.12);
      fan(0.25, [0.85, 0.12, 0.12], 0.14);
    };
    finRoundel(1);
    finRoundel(-1);
    // Elang Badai livery, readable from directly behind: amber spine stripe
    // down the fuselage top, following the top surface station by station
    for (let i = 1; i < st.length - 1; i++) {
      const zA = st[i][0], yA = st[i][2] + 0.04;
      const zB = st[i + 1][0], yB = st[i + 1][2] + 0.04;
      quad([-0.5, yA, zA], [0.5, yA, zA], [0.5, yB, zB], [-0.5, yB, zB], PALETTE.amber);
    }
    // deep-teal fuselage band across the spine just behind the canopy —
    // the teal half of the ember-dusk identity, worn by every squadron plane
    quad([-0.62, 1.13, 1.2], [0.62, 1.13, 1.2], [0.62, 1.13, 2.6], [-0.62, 1.13, 2.6], PALETTE.teal);
    // tail-fin chevron on both faces of the vertical fin
    tri([0.07, 0.9, -6.3], [0.07, 2.1, -7.7], [0.07, 2.1, -6.5], PALETTE.amber);
    tri([-0.07, 0.9, -6.3], [-0.07, 2.1, -6.5], [-0.07, 2.1, -7.7], PALETTE.amber);
    // small white tail strobe at the fin base
    tri([-0.35, 0.3, -8.7], [0.35, 0.3, -8.7], [0, 0.9, -8.7], [1, 1, 1]);
    // propeller disc: a SMALL 16-segment spinning fan in dark greys — a
    // subtle disc at the nose, never a mushroom cap swallowing the canopy.
    // Radius 1.8 barely clears the nose; the dark canopy stays the visual
    // focus ahead of the wings.
    {
      const segs = 16;
      let prev = null;
      for (let i = 0; i <= segs; i++) {
        const a = plane.propAngle + (i / segs) * Math.PI * 2;
        const p = [Math.cos(a) * 1.8, 0.4 + Math.sin(a) * 1.8, 7.9];
        if (prev) {
          const shade = i % 2 ? [0.20, 0.22, 0.26] : [0.36, 0.38, 0.42];
          tri([0, 0.4, 7.9], prev, p, shade);
        }
        prev = p;
      }
      tri([0, 0.4, 8.6], [-0.5, 0.1, 7.9], [0.5, 0.1, 7.9], PALETTE.ember);
    }
    // nav lights: small glowing POINTS at the wingtips, never big triangles
    const navDot = (x, col) => {
      const y = -0.3, z = -2.4, s = 0.55;
      tri([x, y + s, z], [x - s * 0.7, y, z], [x, y - s * 0.6, z], col);
      tri([x, y + s, z], [x, y - s * 0.6, z], [x + s * 0.7, y, z], col);
    };
    navDot(-9.6, [1, 0.2, 0.2]);
    navDot(9.6, [0.2, 1, 0.35]);
    // afterburner flame: LAYERED and SHORT — outer ember cone, mid flame,
    // hot white-yellow core. Never reaches the FUEL HUD box.
    if (plane.afterburner) {
      tri([0, 0.4, -6.5], [-0.9, 0.4, -9.6], [0.9, 0.4, -9.6], [1.0, 0.45, 0.08]);
      tri([0, 1.1, -6.5], [-0.55, 1.1, -8.8], [0.55, 1.1, -8.8], [1.0, 0.45, 0.08]);
      tri([0, 0.4, -6.5], [-0.6, 0.4, -8.8], [0.6, 0.4, -8.8], [1.0, 0.75, 0.25]);
      tri([0, 0.4, -6.5], [-0.32, 0.4, -8.0], [0.32, 0.4, -8.0], [1.0, 0.95, 0.7]);
    }
    return mesh;
  }

  function render(scene) {
    const { plane, t, meshes, flash } = scene;
    gl.viewport(0, 0, canvas.width, canvas.height);
    const bright = 1.05 + flash * 0.5;
    gl.clearColor(0.04 + flash * 0.3, 0.20 + flash * 0.2, 0.30 + flash * 0.2, 1); // deep teal zenith, never black
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // camera: behind and above the plane, looking forward along heading
    const fx = Math.sin(plane.heading), fz = Math.cos(plane.heading);
    const shake = scene.shake || 0;
    const eye = [
      plane.pos[0] - fx * 26 + (Math.random() - 0.5) * shake,
      plane.pos[1] + 9 + (Math.random() - 0.5) * shake,
      plane.pos[2] - fz * 26,
    ];
    const center = [plane.pos[0] + fx * 60, plane.pos[1] - 2, plane.pos[2] + fz * 60];
    const view = mat4LookAt(eye, center, [0, 1, 0]);
    const proj = mat4Perspective(deg2rad(62), canvas.width / canvas.height, 0.5, 4000);
    const vp = mat4Mul(proj, view);
    drawSky(vp, eye, plane.heading, scene.tint);
    for (const m of meshes) drawMesh(m.mesh, vp, (m.bright || 1) * bright);
    // plane: model matrix from position + heading + bank + pitch
    let model = mat4Translate(plane.pos[0], plane.pos[1], plane.pos[2]);
    model = mat4Mul(model, mat4RotateY(plane.heading));
    model = mat4Mul(model, mat4RotateZ(-plane.bank));
    model = mat4Mul(model, mat4RotateX(-plane.pitch));
    drawMesh(planeMesh(plane, t), mat4Mul(vp, model), 1.25 * bright);
    return gl;
  }

  return { gl, render, drawMesh };
}
