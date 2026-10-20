
/* ===================== Estado de esfuerzos: elemento en A, amplificado ===================== */
const S = 0.5;                                        // lado del cubo (dibujo, no a escala)
const C = V3(P.xc + 1.0, P.yA + 0.62, 0.95);          // centro del cubo
const gCubo = new THREE.Group(); scene.add(gCubo);
etiquetas.splice(etiquetas.indexOf(etW), 1); etW.el.remove();   // aquí la viga es contexto: sin rótulo de w (está en el panel)
const cubo = caja(C.x - S / 2, C.x + S / 2, C.y - S / 2, C.y + S / 2, C.z - S / 2, C.z + S / 2, matStd('--beam'));
gCubo.add(cubo, bordes(cubo, '--beam-edge'));
const matZoom = matGuion('--accent', { dashSize: 0.05, gapSize: 0.03, transparent: true, opacity: 0.85 });
const esquinas = [V3(C.x - S / 2, C.y - S / 2, C.z - S / 2), V3(C.x - S / 2, C.y + S / 2, C.z - S / 2), V3(C.x - S / 2, C.y - S / 2, C.z + S / 2)];
const lineasZoom = esquinas.map(e => { const l = linea([posA, e], matZoom); gCubo.add(l); return { l, e }; });
alDeformar.push(() => { const a = gSec.localToWorld(posA.clone()); for (const z of lineasZoom) reponerLinea(z.l, [a, z.e]); });
etiqueta('Elemento en A (amplificado)', V3(C.x, C.y + S / 2, C.z), { ancla: 'b', dy: -12, cls: 'a big', grupo: gCubo });
etiqueta('cara libre: σ<sub>z</sub> = 0', V3(C.x, C.y - 0.17, C.z + S / 2), { ancla: 'c', cls: 'dim', grupo: gCubo });

/* σx: compresión por flexión, flechas que empujan contra las caras ±x */
const gS = capa('sigma', new THREE.Group()); scene.add(gS);
const LS = 0.34;
for (const dy of [-0.125, 0.125]) for (const dz of [-0.125, 0.125]) {
  gS.add(flecha(V3(C.x + S / 2 + LS, C.y + dy, C.z + dz), V3(C.x + S / 2, C.y + dy, C.z + dz), matComp, 0.011));
  gS.add(flecha(V3(C.x - S / 2 - LS, C.y + dy, C.z + dz), V3(C.x - S / 2, C.y + dy, C.z + dz), matComp, 0.011));
}
etiqueta('σ<sub>x</sub> = 0.62 MPa (compresión)', V3(C.x + S / 2 + LS, C.y + 0.125, C.z + 0.125), { ancla: 'l', dx: 10, cls: 'comp big', grupo: gS });
etiqueta('σ<sub>x</sub> = 0.62 MPa', V3(C.x - S / 2 - LS, C.y + 0.125, C.z + 0.125), { ancla: 'r', dx: -10, cls: 'comp', grupo: gS });

/* τ: sobre las caras ±x en dirección y, y sobre las caras ±y en dirección x (cortantes complementarios) */
const gT = capa('tau', new THREE.Group()); scene.add(gT);
const E = 0.007, LT = 0.17;
for (const dz of [-0.19, 0, 0.19]) {
  gT.add(flecha(V3(C.x + S / 2 + E, C.y + LT, C.z + dz), V3(C.x + S / 2 + E, C.y - LT, C.z + dz), matCort, 0.008));  // cara +x: hacia −y (como V)
  gT.add(flecha(V3(C.x - S / 2 - E, C.y - LT, C.z + dz), V3(C.x - S / 2 - E, C.y + LT, C.z + dz), matCort, 0.008));  // cara −x: hacia +y
  gT.add(flecha(V3(C.x + LT, C.y + S / 2 + E, C.z + dz), V3(C.x - LT, C.y + S / 2 + E, C.z + dz), matCort, 0.008));  // cara +y: hacia −x
  gT.add(flecha(V3(C.x - LT, C.y - S / 2 - E, C.z + dz), V3(C.x + LT, C.y - S / 2 - E, C.z + dz), matCort, 0.008));  // cara −y: hacia +x
}
etiqueta('τ<sub>xy</sub> = 37 kPa (por el cortante V)', V3(C.x + S / 2 + E, C.y - LT, C.z + 0.19), { ancla: 'tl', dx: 8, dy: 8, cls: 'shear big', grupo: gT });
etiqueta('τ<sub>yx</sub> = τ<sub>xy</sub> = 37 kPa', V3(C.x - LT, C.y + S / 2 + E, C.z + 0.19), { ancla: 'br', dx: -6, dy: -8, cls: 'shear', grupo: gT });
etiqueta('σ<sub>y</sub> = 0', V3(C.x, C.y + S / 2, C.z - 0.12), { ancla: 'b', dy: -4, cls: 'dim', grupo: gT });

/* ejes junto al cubo */
const gEjesCubo = capa('ejesCubo', new THREE.Group()); scene.add(gEjesCubo);
ejes(V3(C.x - S / 2 - 0.05, C.y - S / 2 - 0.32, C.z + S / 2 + 0.3), 0.24, gEjesCubo);

presets = {
  iso:      { dir: [1, 0.55, 1.2], target: [C.x - 0.4, C.y - 0.32, C.z - 0.38], dist: 3.6 },
  elemento: { dir: [1, 0.6, 1.1], target: [C.x, C.y, C.z], dist: 1.9 },
  frente:   { dir: [0, 0.05, 1], target: [C.x - 0.45, C.y - 0.3, C.z], dist: 4.4 },
  planta:   { dir: [0.0001, 1, 0.0001], target: [C.x - 0.4, 0, C.z - 0.4], dist: 4.6 },
};
iniciar('iso');
