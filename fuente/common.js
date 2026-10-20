'use strict';
/* ===================== Datos del problema (pizarrón) =====================
   Viga simplemente apoyada, L = 4 m, w = 10 kN/m, sección 0.30 × 0.60 m.
   Corte 1 en x = 1.2 m; punto A 0.20 m arriba del eje neutro, al centro del ancho.
   x = eje de la viga, y = vertical (arriba +), z = ancho (hacia el frente +). */
const P = (() => {
  const L = 4, w = 10, b = 0.30, h = 0.60, xc = 1.2, yA = 0.20, zA = 0, xB = 2.4, yB = -0.20;
  const R = w * L / 2;                                  // 20 kN
  const Vx = x => R - w * x;                            // kN
  const Mx = x => R * x - w * x * x / 2;                // kN·m
  const V = Vx(xc), M = Mx(xc);                         // 8 kN, 16.8 kN·m
  const I = b * Math.pow(h, 3) / 12;                    // 5.4e-3 m⁴
  const sigma = y => -M * 1e3 * y / I;                  // Pa (negativo = compresión)
  const tau = y => (V * 1e3 / (2 * I)) * (h * h / 4 - y * y); // Pa
  const Q = y => (b / 2) * (h * h / 4 - y * y);         // m³ (área sobre y por su brazo)
  return { L, w, b, h, xc, yA, zA, xB, yB, R, Vx, Mx, V, M, I, sigma, tau, Q,
    sigmaA: sigma(yA), tauA: tau(yA), sigmaMax: Math.abs(sigma(h / 2)), tauMax: tau(0), QA: Q(yA) };
})();

/* ===================== Escena ===================== */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const vista = document.getElementById('vista');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
vista.insertBefore(renderer.domElement, vista.firstChild);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.02, 200);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.autoRotateSpeed = 0.8;
controls.minDistance = 0.3; controls.maxDistance = 40;
scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 0.9));
const luz1 = new THREE.DirectionalLight(0xffffff, 0.7); luz1.position.set(4, 8, 6); scene.add(luz1);
const luz2 = new THREE.DirectionalLight(0xffffff, 0.3); luz2.position.set(-6, 3, -5); scene.add(luz2);

/* ===================== Colores que siguen el tema claro/oscuro ===================== */
const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const temados = [];
function col(token, mat, prop) { prop = prop || 'color'; temados.push({ mat, prop, token }); mat[prop].set(tok(token)); return mat; }
scene.background = new THREE.Color(tok('--bg'));
function refrescarTema() { for (const t of temados) t.mat[t.prop].set(tok(t.token)); scene.background.set(tok('--bg')); }
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refrescarTema); } catch (e) { /* navegadores viejos */ }
new MutationObserver(refrescarTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

function matStd(token, extra) { const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.65, metalness: 0 }, extra || {})); return col(token, m); }
function matBrillo(token, extra) { const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.5, metalness: 0, emissiveIntensity: 0.35 }, extra || {})); col(token, m, 'color'); col(token, m, 'emissive'); return m; }
function matLinea(token, extra) { return col(token, new THREE.LineBasicMaterial(extra || {})); }
function matGuion(token, extra) { return col(token, new THREE.LineDashedMaterial(Object.assign({ dashSize: 0.08, gapSize: 0.04 }, extra || {}))); }

/* ===================== Primitivas ===================== */
const ARRIBA = new THREE.Vector3(0, 1, 0);
function caja(x0, x1, y0, y1, z0, z1, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return m;
}
function bordes(mesh, token, opacidad) {
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), matLinea(token, { transparent: true, opacity: opacidad == null ? 0.9 : opacidad }));
  l.position.copy(mesh.position); l.rotation.copy(mesh.rotation); l.scale.copy(mesh.scale); return l;
}
function linea(pts, mat) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat); if (mat.isLineDashedMaterial) l.computeLineDistances(); return l; }
function lineaCerrada(pts, mat) { return linea(pts.concat([pts[0]]), mat); }
function reponerLinea(l, pts) { l.geometry.dispose(); l.geometry = new THREE.BufferGeometry().setFromPoints(pts); if (l.material.isLineDashedMaterial) l.computeLineDistances(); }
function flecha(desde, hasta, mat, r, hl) {
  r = r || 0.008;
  const dir = new THREE.Vector3().subVectors(hasta, desde); const len = dir.length(); dir.normalize();
  const cab = hl || Math.min(0.09, 0.45 * len); const rc = r * 2.6; const sl = Math.max(len - cab, 1e-4);
  const g = new THREE.Group();
  const fuste = new THREE.Mesh(new THREE.CylinderGeometry(r, r, sl, 10), mat); fuste.position.y = sl / 2;
  const punta = new THREE.Mesh(new THREE.ConeGeometry(rc, cab, 16), mat); punta.position.y = sl + cab / 2;
  g.add(fuste, punta);
  g.quaternion.setFromUnitVectors(ARRIBA, dir); g.position.copy(desde);
  return g;
}
function flechaCurva(centro, radio, a0, a1, mat, r) {
  // arco en el plano XY alrededor de `centro`, de a0 a a1 (antihorario visto desde +z), punta en a1
  r = r || 0.009;
  const g = new THREE.Group();
  const arco = new THREE.Mesh(new THREE.TorusGeometry(radio, r, 8, 48, a1 - a0), mat); arco.rotation.z = a0; g.add(arco);
  const cab = 0.08, rc = r * 2.6;
  const punta = new THREE.Mesh(new THREE.ConeGeometry(rc, cab, 16), mat);
  const tang = new THREE.Vector3(-Math.sin(a1), Math.cos(a1), 0);
  punta.quaternion.setFromUnitVectors(ARRIBA, tang);
  punta.position.set(radio * Math.cos(a1), radio * Math.sin(a1), 0).addScaledVector(tang, cab / 2);
  g.add(punta); g.position.copy(centro); return g;
}
function esfera(pos, r, mat) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat); m.position.copy(pos); return m; }
function cilindro(desde, hasta, r, mat) {
  const dir = new THREE.Vector3().subVectors(hasta, desde); const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
  m.quaternion.setFromUnitVectors(ARRIBA, dir.clone().normalize()); m.position.copy(desde).addScaledVector(dir, 0.5); return m;
}
function prisma(pts2d, mat) {
  // polígono en el plano XY extruido a lo ancho de la sección (z de -b/2 a +b/2)
  const sh = new THREE.Shape(); sh.moveTo(pts2d[0][0], pts2d[0][1]);
  for (let i = 1; i < pts2d.length; i++) sh.lineTo(pts2d[i][0], pts2d[i][1]);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: P.b, bevelEnabled: false }); g.translate(0, 0, -P.b / 2);
  return new THREE.Mesh(g, mat);
}

/* ===================== Etiquetas HTML proyectadas =====================
   `pos` se da en coordenadas del `grupo` (si el grupo se mueve con la deformada, la etiqueta lo sigue). */
const capaEtiquetas = document.getElementById('etiquetas');
const etiquetas = [];
const ANCLA = { c: ['-50%', '-50%'], l: ['0%', '-50%'], r: ['-100%', '-50%'], t: ['-50%', '0%'], b: ['-50%', '-100%'], tl: ['0%', '0%'], tr: ['-100%', '0%'], bl: ['0%', '-100%'], br: ['-100%', '-100%'] };
function etiqueta(html, pos, o) {
  o = o || {};
  const el = document.createElement('div'); el.className = 'lbl ' + (o.cls || ''); el.innerHTML = html; capaEtiquetas.appendChild(el);
  const a = ANCLA[o.ancla || 'c'];
  const e = { el, pos: pos.clone(), dx: o.dx || 0, dy: o.dy || 0, ax: a[0], ay: a[1], grupo: o.grupo || null };
  etiquetas.push(e); return e;
}
function visibleEnCadena(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
const _v = new THREE.Vector3();
function actualizarEtiquetas() {
  const W = vista.clientWidth, H = vista.clientHeight;
  for (const e of etiquetas) {
    if (e.grupo && !visibleEnCadena(e.grupo)) { e.el.style.display = 'none'; continue; }
    _v.copy(e.pos); if (e.grupo) e.grupo.localToWorld(_v); _v.project(camera);
    if (_v.z > 1 || _v.z < -1) { e.el.style.display = 'none'; continue; }
    const x = (_v.x * 0.5 + 0.5) * W + e.dx, y = (-_v.y * 0.5 + 0.5) * H + e.dy;
    if (x < -400 || x > W + 400 || y < -100 || y > H + 100) { e.el.style.display = 'none'; continue; }
    e.el.style.display = '';
    e.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(' + e.ax + ',' + e.ay + ')';
  }
}

/* ===================== Materiales compartidos ===================== */
const matViga = matStd('--beam'), matVigaDer = matStd('--beam');
const matDim = matLinea('--dim', { transparent: true, opacity: 0.9 });
const matGuionDim = matGuion('--dim', { transparent: true, opacity: 0.8, dashSize: 0.05, gapSize: 0.03 });
const matSoporte = matStd('--support');
const matCarga = matStd('--load');
const matAcento = matBrillo('--accent');
const matLineaAcento = matLinea('--accent');
const matComp = matStd('--comp'), matTens = matStd('--tens'), matCort = matStd('--shear');

function cota(p0, p1, html, o) {
  // línea de cota entre p0 y p1 con tics perpendiculares `o.tic`, etiqueta al centro
  o = o || {};
  const g = new THREE.Group(); const mat = o.mat || matDim; const tic = o.tic || V3(0, 0.04, 0);
  g.add(linea([p0, p1], mat));
  g.add(linea([p0.clone().sub(tic), p0.clone().add(tic)], mat));
  g.add(linea([p1.clone().sub(tic), p1.clone().add(tic)], mat));
  const mid = p0.clone().add(p1).multiplyScalar(0.5);
  etiqueta(html, mid, { cls: o.cls || 'dim', ancla: o.ancla || 't', dx: o.dx || 0, dy: o.dy == null ? 4 : o.dy, grupo: o.grupo || g });
  return g;
}
function ejes(origen, tam, grupo) {
  const m = matStd('--dim');
  grupo.add(flecha(origen, origen.clone().add(V3(tam, 0, 0)), m, 0.005, 0.045));
  grupo.add(flecha(origen, origen.clone().add(V3(0, tam, 0)), m, 0.005, 0.045));
  grupo.add(flecha(origen, origen.clone().add(V3(0, 0, tam)), m, 0.005, 0.045));
  etiqueta('x', origen.clone().add(V3(tam, 0, 0)), { ancla: 'l', dx: 6, cls: 'dim', grupo });
  etiqueta('y', origen.clone().add(V3(0, tam, 0)), { ancla: 'b', dy: -4, cls: 'dim', grupo });
  etiqueta('z', origen.clone().add(V3(0, 0, tam)), { ancla: 'l', dx: 6, cls: 'dim', grupo });
}

/* ===================== Capas (grupos que se prenden y apagan) ===================== */
const capas = {};
function capa(n, o) { capas[n] = o; return o; }
let alCambiarCapa = null;

/* ===================== Deformada aproximada (curva elástica, exagerada) =====================
   Viga simplemente apoyada con carga uniforme: v(x) = -(w x / 24EI)(L³ - 2Lx² + x³).
   Se dibuja normalizada a una flecha máxima DELTA (metros de dibujo); la real es de milímetros. */
let DELTA = 0.10;
const vDef = x => { const k = x / P.L; return -DELTA * 3.2 * k * (1 - 2 * k * k + k * k * k); };
const vPend = x => { const k = x / P.L; return -DELTA * 3.2 * (1 - 6 * k * k + 4 * k * k * k) / P.L; };
const doblables = [];           // geometrías en coordenadas de mundo que se doblan vértice a vértice
function registrarDoblable(geom) { geom.userData.orig = geom.attributes.position.array.slice(); doblables.push(geom); return geom; }
const alDeformar = [];          // funciones que se corren después de doblar
/* La sección del corte se mueve como cuerpo rígido: baja v(xc) y gira la pendiente v'(xc).
   Todo lo que vive en la cara del corte se cuelga de gSec (coordenadas de mundo sin deformar). */
function seccionMovil(x) {
  const ext = new THREE.Group(); ext.position.x = x; scene.add(ext);
  const int = new THREE.Group(); int.position.x = -x; ext.add(int);
  alDeformar.push(() => { ext.position.set(x, vDef(x), 0); ext.rotation.z = vPend(x); ext.updateMatrixWorld(true); });
  return int;
}
const gSec = seccionMovil(P.xc);
const gSecB = seccionMovil(P.xB);
function deformar(delta) {
  DELTA = delta;
  for (const g of doblables) {
    const o = g.userData.orig, p = g.attributes.position.array;
    for (let i = 0; i < o.length; i += 3) { const X = o[i], Y = o[i + 1]; p[i] = X - Y * vPend(X); p[i + 1] = Y + vDef(X); p[i + 2] = o[i + 2]; }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  }
  for (const f of alDeformar) f();
}

/* ===================== La viga en dos tramos (para ver por dentro) ===================== */
const viga = capa('viga', new THREE.Group()); scene.add(viga);
function segmento(x0, x1, mat) {
  const geom = new THREE.BoxGeometry(x1 - x0, P.h, P.b, Math.max(8, Math.round((x1 - x0) * 16)), 1, 1);
  geom.translate((x0 + x1) / 2, 0, 0); registrarDoblable(geom);
  const m = new THREE.Mesh(geom, mat); const e = bordes(m, '--beam-edge');
  const g = new THREE.Group(); g.add(m, e); viga.add(g);
  const seg = { mesh: m, bordes: e, grupo: g };
  alDeformar.push(() => { e.geometry.dispose(); e.geometry = new THREE.EdgesGeometry(geom, 20); });
  return seg;
}
const segIzq = segmento(0, P.xc, matViga), segDer = segmento(P.xc, P.L, matVigaDer);
function modoSegmento(seg, modo) {
  const m = seg.mesh.material;
  seg.grupo.visible = modo !== 'oculto';
  m.transparent = modo === 'transparente'; m.opacity = modo === 'transparente' ? 0.13 : 1;
  m.depthWrite = modo !== 'transparente'; m.needsUpdate = true;
  seg.mesh.renderOrder = modo === 'transparente' ? 5 : 0;
  seg.bordes.material.opacity = modo === 'transparente' ? 0.45 : 0.9;
}

/* Eje neutro: línea de raya y punto sobre la cara frontal (sigue la deformada) y sobre la cara del corte */
const gEN = new THREE.Group(); scene.add(gEN);
const puntosEN = () => { const pts = []; for (let i = 0; i <= 48; i++) { const x = i * P.L / 48; pts.push(V3(x, vDef(x), P.b / 2 + 0.003)); } return pts; };
const lineaEN = linea(puntosEN(), matGuion('--dim', { dashSize: 0.12, gapSize: 0.05, transparent: true, opacity: 0.9 })); gEN.add(lineaEN);
alDeformar.push(() => reponerLinea(lineaEN, puntosEN()));
etiqueta('EN', V3(0, 0, P.b / 2), { ancla: 'r', dx: -8, cls: 'dim', grupo: gEN });
gSec.add(linea([V3(P.xc + 0.004, 0, -P.b / 2), V3(P.xc + 0.004, 0, P.b / 2)], matGuion('--dim', { dashSize: 0.04, gapSize: 0.02, transparent: true, opacity: 0.9 })));

/* Apoyos */
function apoyo(x, tipo) {
  const g = new THREE.Group(); const yb = -P.h / 2; const hT = tipo === 'pasador' ? 0.24 : 0.17;
  const sh = new THREE.Shape(); sh.moveTo(-0.14, -hT); sh.lineTo(0.14, -hT); sh.lineTo(0, 0); sh.closePath();
  const tri = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }), matSoporte);
  tri.position.set(x, yb, -0.15); g.add(tri, bordes(tri, '--beam-edge', 0.6));
  if (tipo === 'rodillo') for (const dx of [-0.07, 0.07]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 18), matSoporte);
    rod.rotation.x = Math.PI / 2; rod.position.set(x + dx, yb - hT - 0.035, 0); g.add(rod);
  }
  const base = caja(x - 0.3, x + 0.3, yb - 0.28, yb - 0.24, -0.24, 0.24, matSoporte); g.add(base, bordes(base, '--beam-edge', 0.6));
  return g;
}
viga.add(apoyo(0, 'pasador'), apoyo(P.L, 'rodillo'));

/* Carga distribuida (sigue la cara superior deformada) y reacciones */
const gCarga = capa('carga', new THREE.Group()); scene.add(gCarga);
const yTop = P.h / 2, yW = yTop + 0.36;
const flechasCarga = [];
for (let i = 0; i <= 16; i++) { const x = i * 0.25; const f = flecha(V3(x, yW, 0), V3(x, yTop + 0.012, 0), matCarga, 0.005, 0.06); gCarga.add(f); flechasCarga.push({ f, x }); }
const puntosCarga = () => { const pts = []; for (let i = 0; i <= 48; i++) { const x = i * P.L / 48; pts.push(V3(x, yW + vDef(x), 0)); } return pts; };
const lineaCarga = linea(puntosCarga(), matLinea('--load')); gCarga.add(lineaCarga);
const pivW = new THREE.Object3D(); pivW.position.set(P.L / 2, yW, 0); gCarga.add(pivW);
const etW = etiqueta('w = 10 kN/m', V3(0, 0, 0), { ancla: 'b', dy: -6, grupo: pivW, cls: 'titulo' });
alDeformar.push(() => { for (const c of flechasCarga) c.f.position.y = yW + vDef(c.x); reponerLinea(lineaCarga, puntosCarga()); pivW.position.y = yW + vDef(P.L / 2); });
for (const x of [0, P.L]) {
  gCarga.add(flecha(V3(x, -P.h / 2 - 0.68, 0), V3(x, -P.h / 2 - 0.3, 0), matCarga, 0.009, 0.08));
  etiqueta('R = 20 kN', V3(x, -P.h / 2 - 0.5, 0), { ancla: 'l', dx: 12, grupo: gCarga });
}

/* Acotaciones generales */
const gCotas = capa('cotas', new THREE.Group()); scene.add(gCotas);
(function () {
  const y1 = -P.h / 2 - 0.84, y2 = -P.h / 2 - 1.02;
  for (const x of [0, P.xc, P.xB, P.L]) gCotas.add(linea([V3(x, (x === 0 || x === P.L) ? -P.h / 2 - 0.3 : -P.h / 2 - 0.01, 0), V3(x, y2 - 0.05, 0)], matGuionDim));
  gCotas.add(cota(V3(0, y1, 0), V3(P.xc, y1, 0), '1.2 m'));
  gCotas.add(cota(V3(P.xc, y1, 0), V3(P.xB, y1, 0), '1.2 m'));
  gCotas.add(cota(V3(0, y2, 0), V3(P.L, y2, 0), 'L = 4 m'));
  const xr = P.L + 0.14;
  gCotas.add(cota(V3(xr, -P.h / 2, P.b / 2), V3(xr, P.h / 2, P.b / 2), 'h = 0.60 m', { tic: V3(0.03, 0, 0), ancla: 'l', dx: 8, dy: 0 }));
  gCotas.add(cota(V3(P.L + 0.02, P.h / 2 + 0.14, -P.b / 2), V3(P.L + 0.02, P.h / 2 + 0.14, P.b / 2), 'b = 0.30 m', { tic: V3(0, 0.03, 0), ancla: 'b', dy: -6 }));
})();

/* Marco del corte 1 (se mueve con la sección) */
const gCorte = new THREE.Group(); gSec.add(gCorte);
const MG = P.b / 2 + 0.08, MH = P.h / 2 + 0.08;
gCorte.add(lineaCerrada([V3(P.xc, -MH, -MG), V3(P.xc, MH, -MG), V3(P.xc, MH, MG), V3(P.xc, -MH, MG)], matGuion('--accent', { dashSize: 0.06, gapSize: 0.035 })));
etiqueta('Corte 1 · x = 1.2 m', V3(P.xc, MH, 0), { ancla: 'b', dy: -6, cls: 'a', grupo: gCorte });

/* Punto A: esfera al centro del ancho, 0.20 m arriba del EN */
const posA = V3(P.xc + 0.006, P.yA, P.zA);
const gA = new THREE.Group(); gSec.add(gA);
gA.add(esfera(posA, 0.024, matAcento));
etiqueta('Punto A', posA, { ancla: 'r', dx: -14, dy: 12, cls: 'a big', grupo: gA });

/* Acotaciones del punto A sobre la cara del corte */
const gCotasA = capa('cotasA', new THREE.Group()); gSec.add(gCotasA);
(function () {
  const xf = P.xc + 0.004;
  gCotasA.add(cota(V3(xf, 0, 0.055), V3(xf, P.yA, 0.055), '0.20 m sobre el EN', { mat: matLineaAcento, tic: V3(0, 0, 0.025), ancla: 'l', dx: 10, dy: 0, cls: 'dim a' }));
  gCotasA.add(cota(V3(xf, P.yA, -P.b / 2), V3(xf, P.yA, P.zA), 'b/2 = 0.15 m', { mat: matLineaAcento, tic: V3(0, 0.025, 0), ancla: 'b', dy: -8, cls: 'dim a' }));
})();

/* Punto B (corte 2), apagado por omisión */
const gB = capa('B', new THREE.Group()); gSecB.add(gB); gB.visible = false;
(function () {
  const posB = V3(P.xB + 0.006, P.yB, 0);
  gB.add(esfera(posB, 0.02, matBrillo('--dim')));
  gB.add(lineaCerrada([V3(P.xB, -MH, -MG), V3(P.xB, MH, -MG), V3(P.xB, MH, MG), V3(P.xB, -MH, MG)], matGuion('--dim', { dashSize: 0.06, gapSize: 0.035 })));
  etiqueta('Corte 2 · x = 2.4 m', V3(P.xB, MH, 0), { ancla: 'b', dy: -6, grupo: gB });
  etiqueta('Punto B (0.20 m bajo el EN)', posB, { ancla: 'l', dx: 12, grupo: gB });
})();

/* Ejes de referencia */
const gEjes = capa('ejes', new THREE.Group()); scene.add(gEjes); gEjes.visible = false;
ejes(V3(-0.55, -0.95, 0.55), 0.28, gEjes);

/* ===================== Cámara: vistas preestablecidas ===================== */
let presets = {
  iso:     { dir: [1, 0.55, 1.05], target: [1.65, -0.12, 0.05], dist: 3.5 },
  lateral: { dir: [0, 0.03, 1], target: [2, -0.25, 0], dist: 6.4 },
  seccion: { dir: [1, 0.02, 0.0001], target: [P.xc, 0, 0], dist: 2.4 },
  planta:  { dir: [0.0001, 1, 0.0001], target: [2, 0, 0], dist: 6.2 },
};
let tween = null;
const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
function irAVista(nombre, instantaneo) {
  const p = presets[nombre]; if (!p) return;
  let dir = V3(p.dir[0], p.dir[1], p.dir[2]).normalize();
  let target = V3(p.target[0], p.target[1], p.target[2]);
  if (nombre === 'seccion') { // mirar de frente la sección ya deformada (bajada y girada)
    const th = vPend(P.xc); target = V3(P.xc, vDef(P.xc), 0); dir = V3(Math.cos(th), Math.sin(th), 0.0001);
  }
  const pos = target.clone().addScaledVector(dir, p.dist);
  if (instantaneo || reducirMovimiento) { camera.position.copy(pos); controls.target.copy(target); controls.update(); tween = null; return; }
  tween = { t0: performance.now(), dur: 750, p0: camera.position.clone(), p1: pos, c0: controls.target.clone(), c1: target };
}
function ajustar() {
  const W = vista.clientWidth || 800, H = vista.clientHeight || 600;
  renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
}
new ResizeObserver(ajustar).observe(vista);
function animar(t) {
  requestAnimationFrame(animar);
  if (tween) {
    const k = Math.min(1, (t - tween.t0) / tween.dur); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.c0, tween.c1, e);
    if (k >= 1) tween = null;
  }
  controls.update(); renderer.render(scene, camera); actualizarEtiquetas();
}
function iniciar(vistaInicial) {
  document.querySelectorAll('input[data-capa]').forEach(ch => {
    const o = capas[ch.dataset.capa]; if (!o) return; o.visible = ch.checked;
    ch.addEventListener('change', () => { o.visible = ch.checked; if (alCambiarCapa) alCambiarCapa(ch.dataset.capa, ch.checked); });
  });
  document.querySelectorAll('select[data-seg]').forEach(s => {
    const seg = s.dataset.seg === 'izq' ? segIzq : segDer; modoSegmento(seg, s.value);
    s.addEventListener('change', () => modoSegmento(seg, s.value));
  });
  document.querySelectorAll('[data-vista]').forEach(b => b.addEventListener('click', () => irAVista(b.dataset.vista)));
  const g = document.getElementById('girar'); if (g) g.addEventListener('change', () => { controls.autoRotate = g.checked; });
  const r = document.getElementById('deformada'), rv = document.getElementById('deformadaVal');
  const aplicarDeformada = () => { const d = parseFloat(r.value); deformar(d); if (rv) rv.textContent = d === 0 ? 'recta' : d.toFixed(2) + ' m'; };
  if (r) { r.addEventListener('input', aplicarDeformada); aplicarDeformada(); } else deformar(DELTA);
  ajustar(); irAVista(vistaInicial, true); requestAnimationFrame(animar);
}
