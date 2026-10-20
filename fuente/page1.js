
/* ===================== Flexión: distribución de σ en el corte 1 ===================== */
const kS = 0.55 / P.sigmaMax;                       // metros de flecha por pascal
const gFlechas = capa('flechas', new THREE.Group()); scene.add(gFlechas);
const gEnv = capa('envolvente', new THREE.Group()); scene.add(gEnv);
const gM = capa('momento', new THREE.Group()); scene.add(gM);
const gSigmaA = new THREE.Group(); scene.add(gSigmaA);   // siempre visible: el resultado

const ys = []; for (let i = -6; i <= 6; i++) ys.push(Math.round(i * 5) / 100);
for (const y of ys) for (const z of [-0.1, 0, 0.1]) {
  const s = P.sigma(y); if (Math.abs(s) < 1) continue;
  const len = kS * Math.abs(s);
  const esA = Math.abs(y - P.yA) < 1e-6 && Math.abs(z - P.zA) < 1e-6;
  const mat = esA ? matAcento : (s < 0 ? matComp : matTens);
  const f = s < 0 ? flecha(V3(P.xc + len, y, z), V3(P.xc, y, z), mat, esA ? 0.013 : 0.0065)
                  : flecha(V3(P.xc, y, z), V3(P.xc + len, y, z), mat, 0.0065);
  (esA ? gSigmaA : gFlechas).add(f);
}
const xMax = P.xc + kS * P.sigmaMax;
const matCompT = matStd('--comp', { transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
const matTensT = matStd('--tens', { transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
const pC = prisma([[P.xc, 0], [P.xc, P.h / 2], [xMax, P.h / 2]], matCompT); gEnv.add(pC, bordes(pC, '--comp', 0.7));
const pT = prisma([[P.xc, 0], [xMax, -P.h / 2], [P.xc, -P.h / 2]], matTensT); gEnv.add(pT, bordes(pT, '--tens', 0.7));

etiqueta('σ<sub>máx</sub> = 0.93 MPa · compresión (fibra superior)', V3(xMax, P.h / 2, 0), { ancla: 'l', dx: 10, cls: 'comp', grupo: gFlechas });
etiqueta('σ<sub>máx</sub> = 0.93 MPa · tensión (fibra inferior)', V3(xMax, -P.h / 2, 0), { ancla: 'l', dx: 10, cls: 'tens', grupo: gFlechas });
etiqueta('σ = 0 en el eje neutro', V3(P.xc, 0, P.b / 2), { ancla: 'r', dx: -10, cls: 'dim', grupo: gFlechas });
etiqueta('σ<sub>A</sub> = 0.62 MPa (compresión)', V3(P.xc + kS * Math.abs(P.sigmaA), P.yA, P.zA), { ancla: 'l', dx: 12, cls: 'a big', grupo: gSigmaA });

const zM = P.b / 2 + 0.24;
gM.add(flechaCurva(V3(P.xc, 0, zM), 0.2, -Math.PI * 0.42, Math.PI * 0.42, matCarga, 0.009));
etiqueta('M = 16.8 kN·m (momento interno en el corte)', V3(P.xc + 0.2, 0, zM), { ancla: 'l', dx: 10, grupo: gM, cls: 'titulo' });

iniciar('iso');
