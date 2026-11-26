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
  function drawSky(mvp, eye, heading) {
    const top = PALETTE.skyTop, mid = PALETTE.skyMid, sun = PALETTE.sunset;
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
    const c = plane.def.color, dark = [0.25, 0.28, 0.33];
    // fuselage: nose at +z (forward), tail at -z — long dart
    tri([0, 0.4, 7], [-1.1, 0, -6], [1.1, 0, -6], c);
    tri([0, 0.4, 7], [1.1, 0, -6], [0, -0.9, -5], dark);
    tri([0, 0.4, 7], [0, -0.9, -5], [-1.1, 0, -6], dark);
    // canopy — bright cyan
    tri([0, 1.5, 3.4], [-0.8, 0.4, 4.6], [0.8, 0.4, 4.6], PALETTE.cyan);
    tri([0, 1.5, 3.4], [0.8, 0.4, 1.2], [-0.8, 0.4, 1.2], PALETTE.cyan);
    // main wings — wide, amber tips
    tri([-1, 0, 1], [-8.5, -0.3, -3.5], [-8.5, -0.3, -1.5], c);
    tri([-1, 0, 1], [-8.5, -0.3, -1.5], [-1, 0, -1.5], c);
    tri([1, 0, 1], [8.5, -0.3, -1.5], [8.5, -0.3, -3.5], c);
    tri([1, 0, 1], [1, 0, -1.5], [8.5, -0.3, -1.5], c);
    tri([-8.5, -0.3, -3.5], [-9.5, -0.3, -3], [-9.5, -0.3, -1.8], PALETTE.ember);
    tri([8.5, -0.3, -3.5], [9.5, -0.3, -1.8], [9.5, -0.3, -3], PALETTE.ember);
    // ember wingtip bands: full-chord amber on the outer wing, so the
    // wingtips read as orange flashes from the chase view
    tri([-7.5, -0.3, -3.4], [-8.5, -0.3, -3.5], [-8.5, -0.3, -1.6], PALETTE.amber);
    tri([-7.5, -0.3, -3.4], [-8.5, -0.3, -1.6], [-7.5, -0.3, -1.6], PALETTE.amber);
    tri([7.5, -0.3, -3.4], [8.5, -0.3, -1.6], [8.5, -0.3, -3.5], PALETTE.amber);
    tri([7.5, -0.3, -3.4], [7.5, -0.3, -1.6], [8.5, -0.3, -1.6], PALETTE.amber);
    // tail fins
    tri([0, 0.4, -6], [-2.6, 0.2, -8.5], [-2.6, 0.2, -6.5], c);
    tri([0, 0.4, -6], [2.6, 0.2, -6.5], [2.6, 0.2, -8.5], c);
    tri([0, 0.3, -6], [0, 2.6, -8], [0, 2.6, -6], c);
    // Elang Badai livery, readable from directly behind: amber spine stripe
    // down the fuselage top (wide at the tail, nearest the chase camera)
    tri([0, 0.48, 6.5], [-0.55, 0.1, -5.8], [0.55, 0.1, -5.8], PALETTE.amber);
    // ember nose tip: the nose cone reads orange from every angle
    tri([0, 0.42, 7.0], [-0.9, 0.05, 5.6], [0.9, 0.05, 5.6], PALETTE.ember);
    // deep-teal fuselage band across the spine just behind the canopy —
    // the teal half of the ember-dusk identity, worn by every squadron plane
    tri([-0.62, 0.30, 1.2], [0.62, 0.30, 1.2], [0.62, 0.30, 2.6], PALETTE.teal);
    tri([-0.62, 0.30, 1.2], [0.62, 0.30, 2.6], [-0.62, 0.30, 2.6], PALETTE.teal);
    // tail-fin chevron on both faces of the vertical fin
    tri([0.07, 0.9, -6.3], [0.07, 2.1, -7.7], [0.07, 2.1, -6.5], PALETTE.amber);
    tri([-0.07, 0.9, -6.3], [-0.07, 2.1, -6.5], [-0.07, 2.1, -7.7], PALETTE.amber);
    // white tail strobe at the fin base
    tri([-0.5, 0.3, -8.7], [0.5, 0.3, -8.7], [0, 1.3, -8.7], [1, 1, 1]);
    // propeller disc: a thin dim RING around the nose (the old solid fan
    // rendered as a giant white balloon swallowing the canopy). A ring reads
    // as a spinning prop from the chase view while the fuselage and canopy
    // stay visible through its open centre. Radius 2.3 clears the nose.
    const segs = 8, rIn = 1.5, rOut = 2.3;
    for (let i = 0; i < segs; i++) {
      const a0 = plane.propAngle + (i / segs) * Math.PI * 2;
      const a1 = plane.propAngle + ((i + 1) / segs) * Math.PI * 2;
      const q0 = [Math.cos(a0) * rIn, 0.4 + Math.sin(a0) * rIn, 7.6];
      const q1 = [Math.cos(a1) * rIn, 0.4 + Math.sin(a1) * rIn, 7.6];
      const p0 = [Math.cos(a0) * rOut, 0.4 + Math.sin(a0) * rOut, 7.6];
      const p1 = [Math.cos(a1) * rOut, 0.4 + Math.sin(a1) * rOut, 7.6];
      const shade = i % 2 ? [0.28, 0.28, 0.32] : [0.38, 0.38, 0.42];
      tri(q0, p0, p1, shade);
      tri(q0, p1, q1, shade);
    }
    // nav lights: red port, green starboard — near twice the old size so
    // they read at thumbnail size from the chase view
    tri([-9.8, -0.3, -2.4], [-8.2, -0.3, -2.4], [-9, 1.1, -2.4], [1, 0.25, 0.25]);
    tri([9.8, -0.3, -2.4], [9, 1.1, -2.4], [8.2, -0.3, -2.4], [0.25, 1, 0.4]);
    // afterburner flame
    if (plane.afterburner) {
      tri([0, 0.4, -6.5], [-1.2, 0.4, -12], [1.2, 0.4, -12], [1.0, 0.55, 0.1]);
      tri([0, 1.2, -6.5], [-0.7, 1.2, -10], [0.7, 1.2, -10], [1.0, 0.85, 0.3]);
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
    drawSky(vp, eye, plane.heading);
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
