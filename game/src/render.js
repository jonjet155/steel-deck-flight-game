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
  // Positioned relative to the camera eye so it is always ahead of the view.
  function drawSky(mvp, eye) {
    const top = PALETTE.skyTop, mid = PALETTE.skyMid, sun = PALETTE.sunset;
    // horizon band mesh: a wide strip ahead of the camera
    const mesh = { positions: [], colors: [] };
    const z = eye[2] + 1400, y0 = -60, y1 = 320, x0 = eye[0] - 1600, x1 = eye[0] + 1600;
    const quad = (a, b, c, d, ca, cb) => {
      mesh.positions.push(...a, ...b, ...c, ...a, ...c, ...d);
      mesh.colors.push(...ca, ...ca, ...cb, ...ca, ...cb, ...cb);
    };
    quad([x0, y1, z], [x1, y1, z], [x1, y0 + 60, z], [x0, y0 + 60, z], top, mid);
    quad([x0, y0 + 60, z], [x1, y0 + 60, z], [x1, y0, z], [x0, y0, z], mid, sun);
    // sun disc glow (bright orange quad, ahead of camera)
    const sx = eye[0] + 220, sy = 40, r = 90;
    mesh.positions.push(sx - r, sy - r, z + 5, sx + r, sy - r, z + 5, sx + r, sy + r, z + 5, sx - r, sy - r, z + 5, sx + r, sy + r, z + 5, sx - r, sy + r, z + 5);
    for (let i = 0; i < 6; i++) mesh.colors.push(1.0, 0.75, 0.35);
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
    tri([-8.5, -0.3, -3.5], [-9.5, -0.3, -3], [-9.5, -0.3, -1.8], PALETTE.amber);
    tri([8.5, -0.3, -3.5], [9.5, -0.3, -1.8], [9.5, -0.3, -3], PALETTE.amber);
    // tail fins
    tri([0, 0.4, -6], [-2.6, 0.2, -8.5], [-2.6, 0.2, -6.5], c);
    tri([0, 0.4, -6], [2.6, 0.2, -6.5], [2.6, 0.2, -8.5], c);
    tri([0, 0.3, -6], [0, 2.6, -8], [0, 2.6, -6], c);
    // propeller disc (spinning, bright)
    const pa = plane.propAngle;
    const px = Math.cos(pa) * 2.6, py = Math.sin(pa) * 2.6;
    tri([0, 0.4, 7.6], [px, 0.4 + py, 7.6], [-px, 0.4 - py, 7.6], [0.95, 0.95, 0.9]);
    // nav lights: red port, green starboard
    tri([-9.4, -0.2, -2.4], [-8.6, -0.2, -2.4], [-9, 0.5, -2.4], PALETTE.red);
    tri([9.4, -0.2, -2.4], [9, 0.5, -2.4], [8.6, -0.2, -2.4], PALETTE.green);
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
    gl.clearColor(0.45 + flash * 0.3, 0.22 + flash * 0.2, 0.45 + flash * 0.2, 1);
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
    drawSky(vp, eye);
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
