
/* ===================== Cortante: distribución de τ en el corte 1 ===================== */
const kT = 0.55 / P.tauMax;                         // metros de gráfica por pascal
const gParab = capa('parabola', new THREE.Group()); scene.add(gParab);
const gTallos = capa('tallos', new THREE.Group()); scene.add(gTallos);
const gDir = capa('direccion', new THREE.Group()); scene.add(gDir);
const gQ = capa('areaQ', new THREE.Group()); scene.add(gQ);
const gPlano = capa('planoA', new THREE.Group()); scene.add(gPlano); gPlano.visible = false;
const gV = capa('cortante', new THREE.Group()); scene.add(gV);
const gTauA = new THREE.Group(); scene.add(gTauA);     // siempre visible: el resultado

/* parábola de magnitud, extruida a lo ancho (prisma parabólico) */
const pts = []; for (let i = 0; i <= 48; i++) { const y = -P.h / 2 + i * P.h / 48; pts.push([P.xc + kT * P.tau(y), y]); }
const matCortT = matStd('--shear', { transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
const pr = prisma(pts, matCortT); gParab.add(pr, bordes(pr, '--shear', 0.7));

/* tallos: magnitud de τ a cada altura, al centro y a ±0.10 m */
const ys = []; for (let i = -6; i <= 6; i++) ys.push(Math.round(i * 5) / 100);
for (const y of ys) { const len = kT * P.tau(y); if (len < 0.004) continue; for (const z of [-0.1, 0, 0.1]) {
  const esA = Math.abs(y - P.yA) < 1e-6 && z === 0;
  if (esA) { gTauA.add(cilindro(V3(P.xc, y, z), V3(P.xc + len, y, z), 0.012, matAcento)); gTauA.add(esfera(V3(P.xc + len, y, z), 0.022, matAcento)); }
  else gTallos.add(cilindro(V3(P.xc, y, z), V3(P.xc + len, y, z), 0.004, matCort));
} }
etiqueta('τ<sub>máx</sub> = 66.7 kPa en el EN', V3(P.xc + kT * P.tauMax, 0, 0), { ancla: 'l', dx: 10, cls: 'shear', grupo: gParab });
etiqueta('τ = 0 (fibra superior)', V3(P.xc, P.h / 2, -P.b / 2), { ancla: 'r', dx: -8, cls: 'dim', grupo: gParab });
etiqueta('τ = 0 (fibra inferior)', V3(P.xc, -P.h / 2, -P.b / 2), { ancla: 'r', dx: -8, cls: 'dim', grupo: gParab });
etiqueta('τ<sub>A</sub> = 37 kPa', V3(P.xc + kT * P.tauA, P.yA, 0), { ancla: 'l', dx: 12, cls: 'a big', grupo: gTauA });

/* dirección de τ sobre la cara del corte: vertical, en el sentido de V (hacia abajo) */
const xf2 = P.xc + 0.005;
for (const y of [-0.25, -0.15, -0.05, 0.05, 0.15, 0.25]) for (const z of [-0.09, 0.09]) {
  const len = 0.085 * P.tau(y) / P.tauMax;
  gDir.add(flecha(V3(xf2, y + len / 2, z), V3(xf2, y - len / 2, z), matCort, 0.0035, Math.min(0.022, len * 0.5)));
}
gDir.add(flecha(V3(xf2, P.yA - 0.03, P.zA), V3(xf2, P.yA - 0.14, P.zA), matAcento, 0.006, 0.03));
etiqueta('τ<sub>A</sub> apunta hacia abajo, como V', V3(xf2, P.yA - 0.14, P.zA), { ancla: 't', dy: 6, cls: 'dim a', grupo: gDir });

/* área A′ arriba de A (la que entra en Q) y su centroide */
const matQ = matStd('--accent', { transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
const plQ = new THREE.Mesh(new THREE.PlaneGeometry(P.b, P.h / 2 - P.yA), matQ);
plQ.rotation.y = Math.PI / 2; plQ.position.set(P.xc + 0.003, (P.yA + P.h / 2) / 2, 0); gQ.add(plQ);
gQ.add(lineaCerrada([V3(P.xc + 0.004, P.yA, -P.b / 2), V3(P.xc + 0.004, P.h / 2, -P.b / 2), V3(P.xc + 0.004, P.h / 2, P.b / 2), V3(P.xc + 0.004, P.yA, P.b / 2)], matLineaAcento));
const yC = (P.yA + P.h / 2) / 2;
gQ.add(esfera(V3(P.xc + 0.006, yC, 0), 0.011, matAcento));
etiqueta('A′ = 30 × 10 cm · centroide a ȳ = 25 cm del EN', V3(P.xc + 0.006, yC, 0), { ancla: 'l', dx: 10, cls: 'a', grupo: gQ });

/* plano horizontal que pasa por A: ahí actúa el cortante longitudinal (complementario) */
const plH = new THREE.Mesh(new THREE.PlaneGeometry(P.xc, P.b), matQ); plH.rotation.x = -Math.PI / 2; plH.position.set(P.xc / 2, P.yA, 0); gPlano.add(plH);
gPlano.add(lineaCerrada([V3(0, P.yA, -P.b / 2), V3(P.xc, P.yA, -P.b / 2), V3(P.xc, P.yA, P.b / 2), V3(0, P.yA, P.b / 2)], matLineaAcento));
for (const x of [0.12, 0.42, 0.72, 0.98]) for (const z of [-0.08, 0.08]) {
  const len = 0.17 * P.Vx(x) / P.R;
  gPlano.add(flecha(V3(x, P.yA + 0.005, z), V3(x + len, P.yA + 0.005, z), matCort, 0.005, 0.035));
}
etiqueta('τ longitudinal sobre la cara inferior de A′ (complementario de τ<sub>A</sub>; crece hacia el apoyo porque V crece)', V3(0.55, P.yA, P.b / 2), { ancla: 'b', dy: -8, cls: 'shear', grupo: gPlano });

/* cortante interno V en el corte */
const zV = P.b / 2 + 0.24;
gV.add(flecha(V3(P.xc, 0.3, zV), V3(P.xc, -0.3, zV), matCarga, 0.011, 0.1));
etiqueta('V = 8 kN (cortante interno en el corte)', V3(P.xc, -0.12, zV), { ancla: 'r', dx: -12, grupo: gV, cls: 'titulo' });

alCambiarCapa = (n, v) => {
  if (n === 'planoA' && v) { const s = document.querySelector('select[data-seg="izq"]'); if (s && s.value === 'solido') { s.value = 'transparente'; modoSegmento(segIzq, 'transparente'); } }
};
iniciar('iso');
