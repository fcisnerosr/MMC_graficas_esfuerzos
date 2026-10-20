#!/usr/bin/env python3
"""Ensambla los tres HTML 3D (flexión, cortante, estado de esfuerzos) con Three.js incrustado."""
import math, pathlib

SRC = pathlib.Path(__file__).parent          # fuente/ dentro del repo
OUT = SRC.parent                              # los HTML se escriben junto a las fotos

# ---------- Números del problema (mismas fórmulas que common.js) ----------
L, w, b, h, xc, yA = 4.0, 10.0, 0.30, 0.60, 1.2, 0.20
R = w * L / 2
V = R - w * xc
M = R * xc - w * xc**2 / 2
I = b * h**3 / 12
c = yA
sigA = M * 1e3 * c / I                      # Pa (compresión)
sigMax = M * 1e3 * (h / 2) / I
Ap = b * (h / 2 - yA)                       # área arriba de A
ybar = (yA + h / 2) / 2
QA = Ap * ybar
tauA = V * 1e3 * QA / (I * b)
tauMax = 1.5 * V * 1e3 / (b * h)
# principales (MPa); τxy negativo porque en la cara +x apunta hacia −y
sx, sy, txy = -sigA / 1e6, 0.0, -tauA / 1e6
avg = (sx + sy) / 2
Rm = math.hypot((sx - sy) / 2, txy)
s1, s2 = avg + Rm, avg - Rm
th1 = 0.5 * math.degrees(math.atan2(2 * txy, sx - sy))     # dirección de σ1
th2 = th1 + 90 if th1 < 0 else th1 - 90                    # dirección de σ2
assert abs(sigA - 622222) < 1 and abs(tauA - 37037) < 1 and abs(QA - 7.5e-3) < 1e-9
print(f"V={V} kN  M={M} kN·m  I={I:.4e} m4  σA={sigA:.0f} Pa  τA={tauA:.0f} Pa  σmax={sigMax:.0f}  τmax={tauMax:.0f}")
print(f"σ1={s1:.4f} σ2={s2:.4f} τmax_plano={Rm:.4f} θ1={th1:.1f}° θ2={th2:.1f}°")

def frac(n, d): return f'<span class="frac"><span>{n}</span><span>{d}</span></span>'

# ---------- SVG del panel ----------
def seccion_base(parts, x0=30, x1=120, y0=20, y1=200, yen=110):
    parts.append(f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" class="ln" stroke-width="1.5"/>')
    parts.append(f'<line x1="{x0-8}" y1="{yen}" x2="{x1+8}" y2="{yen}" class="ln-m" stroke-dasharray="8 3 2 3"/>')
    parts.append(f'<text x="{x1+11}" y="{yen+4}" class="m">EN</text>')
    parts.append(f'<text x="{(x0+x1)/2}" y="{y1+14}" class="cap" text-anchor="middle">b = 0.30 m</text>')
    parts.append(f'<text x="{x0-4}" y="{y0-6}" class="cap">h = 0.60 m</text>')

def svg_seccion_sigma():
    W, H = 350, 232
    xa, ya, xf, lmax = 75, 50, 172, 70
    lA = lmax * (0.20 / 0.30)
    p = [f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Sección transversal con la distribución lineal del esfuerzo por flexión y el punto A">']
    seccion_base(p)
    # cota 0.20 m del EN a A y b/2
    p.append(f'<line x1="16" y1="110" x2="16" y2="{ya}" class="ln-a"/><line x1="12" y1="110" x2="20" y2="110" class="ln-a"/><line x1="12" y1="{ya}" x2="20" y2="{ya}" class="ln-a"/>')
    p.append(f'<text transform="translate(9 {(110+ya)/2}) rotate(-90)" text-anchor="middle" class="cap" style="fill:var(--accent)">0.20 m</text>')
    p.append(f'<line x1="30" y1="{ya}" x2="{xa}" y2="{ya}" class="ln-a" stroke-dasharray="3 2"/>')
    p.append(f'<text x="{(30+xa)/2}" y="{ya-5}" text-anchor="middle" class="cap" style="fill:var(--accent)">b/2</text>')
    p.append(f'<circle cx="{xa}" cy="{ya}" r="4.5" class="f-a"/><text x="{xa+8}" y="{ya+4}" style="fill:var(--accent);font-weight:600">A</text>')
    # distribución lineal
    p.append(f'<polygon points="{xf},20 {xf+lmax},20 {xf},110" class="f-comp"/><polygon points="{xf},110 {xf+lmax},200 {xf},200" class="f-tens"/>')
    p.append(f'<polyline points="{xf+lmax},20 {xf},110 {xf+lmax},200" class="ln" stroke-width="1.2"/><line x1="{xf}" y1="20" x2="{xf}" y2="200" class="ln" stroke-width="1.2"/>')
    for yy in (35, 65, 80, 95):  # flechas de compresión
        ln = lmax * (110 - yy) / 90
        p.append(f'<line x1="{xf+ln:.1f}" y1="{yy}" x2="{xf+3}" y2="{yy}" class="s-comp" marker-end="url(#ah-comp)"/>')
    for yy in (125, 140, 155, 185):  # flechas de tensión
        ln = lmax * (yy - 110) / 90
        p.append(f'<line x1="{xf}" y1="{yy}" x2="{xf+ln-3:.1f}" y2="{yy}" class="s-tens" marker-end="url(#ah-tens)"/>')
    p.append(f'<line x1="120" y1="{ya}" x2="{xf+lA:.1f}" y2="{ya}" class="ln-a" stroke-dasharray="3 3"/>')
    p.append(f'<circle cx="{xf+lA:.1f}" cy="{ya}" r="4" class="f-a"/>')
    p.append(f'<text x="{xf+lA+8:.1f}" y="{ya+4}" style="fill:var(--accent);font-weight:600" class="mono">σ<tspan baseline-shift="sub" font-size="8">A</tspan> = 0.62 MPa</text>')
    p.append(f'<text x="{xf+lmax+6}" y="24" class="mono" style="fill:var(--comp)">0.93 MPa compresión</text>')
    p.append(f'<text x="{xf+lmax+6}" y="203" class="mono" style="fill:var(--tens)">0.93 MPa tensión</text>')
    p.append(f'<text x="{xf}" y="{H-8}" class="cap" text-anchor="middle">σ = Mc/I, lineal en y</text>')
    p.append('<defs><marker id="ah-comp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--comp)"/></marker>'
             '<marker id="ah-tens" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--tens)"/></marker></defs>')
    p.append('</svg>'); return ''.join(p)

def svg_seccion_tau():
    W, H = 350, 232
    xa, ya, xf, lmax = 75, 50, 172, 70
    p = [f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Sección transversal con el área A′ arriba de A y la distribución parabólica del esfuerzo cortante">']
    p.append('<defs><pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--accent)" stroke-width="1"/></pattern>'
             '<marker id="ah-shear" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--shear)"/></marker></defs>')
    seccion_base(p)
    p.append(f'<rect x="30" y="20" width="90" height="30" fill="url(#hatch)"/><rect x="30" y="20" width="90" height="30" fill="var(--accent)" opacity=".18"/>')
    p.append(f'<text x="{xa}" y="14" text-anchor="middle" class="cap" style="fill:var(--accent)">A′ = 30 × 10 cm</text>')
    p.append(f'<circle cx="{xa}" cy="35" r="3" class="f-a"/><text x="{xa+6}" y="39" class="cap" style="fill:var(--accent)">centroide</text>')
    p.append(f'<line x1="16" y1="110" x2="16" y2="35" class="ln-a"/><line x1="12" y1="110" x2="20" y2="110" class="ln-a"/><line x1="12" y1="35" x2="20" y2="35" class="ln-a"/>')
    p.append(f'<text transform="translate(9 {(110+35)/2}) rotate(-90)" text-anchor="middle" class="cap" style="fill:var(--accent)">ȳ = 0.25 m</text>')
    p.append(f'<circle cx="{xa}" cy="{ya}" r="4.5" class="f-a"/><text x="{xa+8}" y="{ya+5}" style="fill:var(--accent);font-weight:600">A</text>')
    pts = [f'{xf},20']
    for ypx in range(20, 201, 5):
        yy = (110 - ypx) / 300
        pts.append(f'{xf + lmax*(0.09 - yy*yy)/0.09:.1f},{ypx}')
    pts.append(f'{xf},200')
    p.append(f'<polygon points="{" ".join(pts)}" class="f-shear"/><polyline points="{" ".join(pts)}" class="ln" stroke-width="1.2"/>')
    for yy in (40, 70, 95, 125, 150, 180):
        y_m = (110 - yy) / 300
        ln = lmax * (0.09 - y_m*y_m) / 0.09
        p.append(f'<line x1="{xf}" y1="{yy}" x2="{xf+ln-3:.1f}" y2="{yy}" class="s-shear" marker-end="url(#ah-shear)"/>')
    lA = lmax * (0.09 - 0.04) / 0.09
    p.append(f'<line x1="120" y1="{ya}" x2="{xf+lA:.1f}" y2="{ya}" class="ln-a" stroke-dasharray="3 3"/>')
    p.append(f'<circle cx="{xf+lA:.1f}" cy="{ya}" r="4" class="f-a"/>')
    p.append(f'<text x="{xf+lA+8:.1f}" y="{ya+4}" style="fill:var(--accent);font-weight:600" class="mono">τ<tspan baseline-shift="sub" font-size="8">A</tspan> = 37 kPa</text>')
    p.append(f'<text x="{xf+lmax+6}" y="114" class="mono" style="fill:var(--shear)">τ<tspan baseline-shift="sub" font-size="8">máx</tspan> = 66.7 kPa</text>')
    p.append(f'<text x="{xf+6}" y="16" class="cap">τ = 0</text><text x="{xf+6}" y="212" class="cap">τ = 0</text>')
    p.append(f'<text x="{xf}" y="{H-6}" class="cap" text-anchor="middle">τ = VQ/(Ib), parabólico en y</text>')
    p.append('</svg>'); return ''.join(p)

def svg_diagrama(tipo):
    W, H = 300, 118
    x = lambda xm: 30 + 50 * xm
    if tipo == 'V':
        yb, esc = 62, 1.4
        y = lambda v: yb - esc * v
        p = [f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Diagrama de fuerza cortante">']
        p.append(f'<polygon points="{x(0)},{y(0)} {x(0)},{y(20)} {x(4)},{y(-20)} {x(4)},{y(0)}" class="f-shear"/>')
        p.append(f'<polyline points="{x(0)},{y(20)} {x(4)},{y(-20)}" class="ln" stroke-width="1.5"/>')
        p.append(f'<text x="{x(0)-4}" y="{y(20)+4}" text-anchor="end" class="mono cap">+20</text><text x="{x(4)+4}" y="{y(-20)+4}" class="mono cap">−20</text>')
        vx = V; yv = y(vx)
        p.append(f'<line x1="{x(1.2)}" y1="{yb}" x2="{x(1.2)}" y2="{yv}" class="ln-a" stroke-dasharray="3 2"/><circle cx="{x(1.2)}" cy="{yv}" r="4" class="f-a"/>')
        p.append(f'<text x="{x(1.2)+8}" y="{yv-6}" class="mono" style="fill:var(--accent);font-weight:600">V(1.2) = 8 kN</text>')
        titulo = 'V (kN)'
    else:
        yb, esc = 92, 1.7
        y = lambda m: yb - esc * m
        p = [f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Diagrama de momento flexionante">']
        pts = ' '.join(f'{x(i/10):.1f},{y(R*(i/10) - w*(i/10)**2/2):.1f}' for i in range(0, 41))
        p.append(f'<polygon points="{x(0)},{yb} {pts} {x(4)},{yb}" class="f-comp"/><polyline points="{pts}" class="ln" stroke-width="1.5"/>')
        ym = y(M)
        p.append(f'<line x1="{x(1.2)}" y1="{yb}" x2="{x(1.2)}" y2="{ym:.1f}" class="ln-a" stroke-dasharray="3 2"/><circle cx="{x(1.2)}" cy="{ym:.1f}" r="4" class="f-a"/>')
        p.append(f'<text x="{x(1.2)-8}" y="{ym-8:.1f}" text-anchor="end" class="mono" style="fill:var(--accent);font-weight:600">M(1.2) = 16.8 kN·m</text>')
        p.append(f'<text x="{x(2)+6}" y="{y(20)+4}" class="mono cap">M<tspan baseline-shift="sub" font-size="8">máx</tspan> = 20 kN·m en x = 2 m</text>')
        titulo = 'M (kN·m)'
    p.append(f'<line x1="{x(0)}" y1="{yb}" x2="{x(4)}" y2="{yb}" class="ln-m"/>')
    for xm in (0, 1.2, 2, 4):
        p.append(f'<line x1="{x(xm)}" y1="{yb-3}" x2="{x(xm)}" y2="{yb+3}" class="ln-m"/><text x="{x(xm)}" y="{yb+14}" text-anchor="middle" class="cap mono">{xm:g}</text>')
    p.append(f'<text x="{x(4)+6}" y="{yb+14}" class="cap">x (m)</text><text x="4" y="12" class="cap">{titulo}</text>')
    p.append('</svg>'); return ''.join(p)

def svg_elemento():
    W, H = 262, 206
    p = [f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Elemento plano en A con sus esfuerzos">']
    p.append('<defs><marker id="e-comp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--comp)"/></marker>'
             '<marker id="e-shear" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--shear)"/></marker>'
             '<marker id="e-dim" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)"/></marker></defs>')
    p.append('<rect x="65" y="55" width="90" height="90" class="ln" stroke-width="1.5" fill="var(--panel-2)"/>')
    p.append('<text x="110" y="104" text-anchor="middle" style="fill:var(--accent);font-weight:600">A</text>')
    # σx (compresión: empujan hacia la cara)
    p.append('<line x1="18" y1="100" x2="61" y2="100" class="s-comp" stroke-width="2" marker-end="url(#e-comp)"/>')
    p.append('<line x1="202" y1="100" x2="159" y2="100" class="s-comp" stroke-width="2" marker-end="url(#e-comp)"/>')
    # τ
    p.append('<line x1="163" y1="70" x2="163" y2="128" class="s-shear" stroke-width="2" marker-end="url(#e-shear)"/>')
    p.append('<line x1="57" y1="130" x2="57" y2="72" class="s-shear" stroke-width="2" marker-end="url(#e-shear)"/>')
    p.append('<line x1="140" y1="47" x2="82" y2="47" class="s-shear" stroke-width="2" marker-end="url(#e-shear)"/>')
    p.append('<line x1="80" y1="153" x2="138" y2="153" class="s-shear" stroke-width="2" marker-end="url(#e-shear)"/>')
    p.append('<text x="178" y="92" class="mono" style="fill:var(--comp)">σ<tspan baseline-shift="sub" font-size="8">x</tspan> = 0.62 MPa</text>')
    p.append('<text x="172" y="140" class="mono" style="fill:var(--shear)">τ<tspan baseline-shift="sub" font-size="8">xy</tspan> = 37 kPa</text>')
    p.append('<text x="110" y="38" text-anchor="middle" class="mono" style="fill:var(--shear)">τ<tspan baseline-shift="sub" font-size="8">yx</tspan> = τ<tspan baseline-shift="sub" font-size="8">xy</tspan></text>')
    p.append('<text x="110" y="172" text-anchor="middle" class="mono cap">σ<tspan baseline-shift="sub" font-size="8">y</tspan> = 0</text>')
    p.append('<line x1="18" y1="192" x2="48" y2="192" class="ln-m" marker-end="url(#e-dim)"/><line x1="18" y1="192" x2="18" y2="162" class="ln-m" marker-end="url(#e-dim)"/>')
    p.append('<text x="52" y="196" class="cap">x</text><text x="14" y="158" class="cap">y</text>')
    p.append('</svg>'); return ''.join(p)

def svg_mohr():
    W, H = 330, 236
    X = lambda s: 40 + (s + 0.75) * (240 / 0.9)
    Y = lambda t: 118 + t * (240 / 0.9)   # τ positivo hacia abajo (convención de Hibbeler)
    cx, cy, r = X(avg), Y(0), Rm * (240 / 0.9)
    p = [f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Círculo de Mohr del estado de esfuerzos en A">']
    p.append(f'<line x1="22" y1="{cy}" x2="{W-8}" y2="{cy}" class="ln-m"/><line x1="{X(0)}" y1="14" x2="{X(0)}" y2="{H-14}" class="ln-m"/>')
    p.append(f'<text x="{W-10}" y="{cy-6}" text-anchor="end" class="cap">σ (MPa)</text><text x="{X(0)+6}" y="{H-16}" class="cap">τ (+ hacia abajo)</text>')
    p.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" class="ln-a" stroke-width="1.6" fill="var(--accent-soft)"/>')
    xX, yX, xY, yY = X(sx), Y(txy), X(sy), Y(-txy)
    p.append(f'<line x1="{xX:.1f}" y1="{yX:.1f}" x2="{xY:.1f}" y2="{yY:.1f}" class="ln" stroke-width="1"/>')
    p.append(f'<circle cx="{xX:.1f}" cy="{yX:.1f}" r="3.5" class="f-a"/><text x="{xX-6:.1f}" y="{yX-8:.1f}" text-anchor="end" class="mono cap">X (σ<tspan baseline-shift="sub" font-size="8">x</tspan>, τ<tspan baseline-shift="sub" font-size="8">xy</tspan>)</text>')
    p.append(f'<circle cx="{xY:.1f}" cy="{yY:.1f}" r="3.5" class="f-a"/><text x="{xY+6:.1f}" y="{yY+14:.1f}" class="mono cap">Y (0, −τ<tspan baseline-shift="sub" font-size="8">xy</tspan>)</text>')
    p.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="2.5" fill="var(--fg)"/><text x="{cx:.1f}" y="{cy+16:.1f}" text-anchor="middle" class="mono cap">C = σ<tspan baseline-shift="sub" font-size="8">prom</tspan> = {avg:.2f}</text>')
    p.append(f'<text x="{cx-r:.1f}" y="{cy-10:.1f}" text-anchor="middle" class="mono" style="fill:var(--comp)">σ<tspan baseline-shift="sub" font-size="8">2</tspan> = {s2:.2f}</text>')
    p.append(f'<text x="{cx+r:.1f}" y="{cy-26:.1f}" text-anchor="middle" class="mono" style="fill:var(--tens)">σ<tspan baseline-shift="sub" font-size="8">1</tspan> ≈ {s1:.3f}</text>')
    p.append(f'<text x="{cx:.1f}" y="{cy+r+16:.1f}" text-anchor="middle" class="mono" style="fill:var(--shear)">τ<tspan baseline-shift="sub" font-size="8">máx</tspan> = {Rm:.2f} MPa</text>')
    p.append('</svg>'); return ''.join(p)

# ---------- Fragmentos de panel ----------
NAV = lambda n: ('<nav class="nav" aria-label="Las tres gráficas">'
    + f'<a href="01_flexion_3D.html"{" aria-current=\"page\"" if n==1 else ""}>1 · Flexión</a>'
    + f'<a href="02_cortante_3D.html"{" aria-current=\"page\"" if n==2 else ""}>2 · Cortante</a>'
    + f'<a href="03_estado_de_esfuerzos_3D.html"{" aria-current=\"page\"" if n==3 else ""}>3 · Estado de esfuerzos</a></nav>')

def segs(izq='solido', der='transparente'):
    def sel(id_, seg, val):
        ops = ''.join(f'<option value="{v}"{" selected" if v==val else ""}>{t}</option>' for v, t in (('solido','Sólido'),('transparente','Transparente'),('oculto','Oculto')))
        return f'<select id="{id_}" data-seg="{seg}">{ops}</select>'
    return ('<div class="segs"><label for="segIzq">Tramo izquierdo (0 a 1.2 m)</label>' + sel('segIzq','izq',izq)
            + '<label for="segDer">Tramo derecho (1.2 a 4 m)</label>' + sel('segDer','der',der) + '</div>')

def capas(items):
    return '<div class="capas">' + ''.join(f'<label><input type="checkbox" id="capa-{k}" data-capa="{k}"{" checked" if on else ""}> {t}</label>' for k, t, on in items) + '</div>'

DATOS = ('<dl class="datos"><dt>Viga</dt><dd>simplemente apoyada, L = 4 m</dd>'
         '<dt>Carga</dt><dd>w = 10 kN/m uniforme en toda la longitud</dd>'
         '<dt>Sección</dt><dd>rectangular, b = 0.30 m, h = 0.60 m</dd>'
         '<dt>Corte 1</dt><dd>x = 1.2 m desde el apoyo izquierdo</dd>'
         '<dt>Punto A</dt><dd>y = +0.20 m (arriba del EN), z = 0 (centro del ancho)</dd>'
         '<dt>Reacciones</dt><dd>R = wL/2 = 20 kN en cada apoyo</dd></dl>')

ENUNCIADO = '<p class="nota">Del pizarrón: «Calcula el esfuerzo cortante y a flexión de la siguiente viga simplemente apoyada en los puntos que se indican». Estado de esfuerzos, repaso de cálculo de esfuerzos.</p>'

UBICACION = ('<h2>Ubicación de A que se usó</h2><p class="nota">En el pizarrón A aparece como una raya; aquí es un punto al centro del ancho de la sección. '
             'Su altura es la que usa el cálculo del pizarrón: c = 0.20 m medido desde el eje neutro, igual que en Q = 30·10·25 (área de 10 cm arriba de A). '
             'Es decir, A queda a 0.10 m de la fibra superior.</p>')

def sw(var): return f'<span class="sw" style="background:var({var})"></span>'

PANEL1 = f'''
<div class="eyebrow">Mecánica de materiales · Repaso de estado de esfuerzos</div>
<h1>Esfuerzo por flexión en el punto A</h1>
{ENUNCIADO}
<div class="pide"><b>Qué muestra esta gráfica.</b> El esfuerzo normal por flexión σ en el <b>punto A</b>: corte 1 a x = 1.2 m del apoyo izquierdo, 0.20 m arriba del eje neutro y exactamente al centro del ancho de la sección (a 0.15 m de cada cara lateral). La viga está cortada en x = 1.2 m y el tramo derecho se vuelve transparente para ver cómo se reparte σ sobre la sección: las flechas azules empujan contra la cara (compresión), las rojas jalan (tensión), y la flecha naranja es la de A.</div>
{NAV(1)}
<h2>Capas</h2>
{capas([('flechas','Flechas de σ sobre la sección',True),('envolvente','Envolvente (prismas de σ)',True),('momento','Momento interno M',True),('cotasA','Acotaciones de A',True),('carga','Carga y reacciones',True),('cotas','Acotaciones generales',True),('B','Punto B (corte 2, x = 2.4 m)',False),('ejes','Ejes x, y, z',False)])}
{segs()}
<h2>Datos</h2>
{DATOS}
<h2>Cálculo</h2>
<div class="paso"><div class="q">1. Momento flexionante en el corte (x = 1.2 m)</div><div class="f">M = R·x − w·x²/2 = 20(1.2) − 10(1.2)²/2 = 24 − 7.2 = <b>16.8 kN·m</b></div></div>
<div class="paso"><div class="q">2. Momento de inercia de la sección</div><div class="f">I = {frac('b·h³','12')} = {frac('(0.30)(0.60)³','12')} = <b>5.4 × 10⁻³ m⁴</b></div></div>
<div class="paso"><div class="q">3. Distancia del eje neutro al punto A</div><div class="f">c = <b>0.20 m</b></div></div>
<div class="paso"><div class="q">4. Fórmula de la flexión</div><div class="f">σ<sub>A</sub> = {frac('M·c','I')} = {frac('(16.8 × 10³ N·m)(0.20 m)','5.4 × 10⁻³ m⁴')} = 622 222 Pa</div></div>
<div class="resultado"><div class="num">σ<sub>A</sub> = 0.62 MPa</div><div class="sub">Compresión: A está arriba del EN y el momento es positivo (la fibra superior se acorta). Para comparar, en las fibras extremas (c = 0.30 m) el esfuerzo llega a 0.93 MPa.</div></div>
<h2>Sección en el corte 1</h2>
<div class="fig">{svg_seccion_sigma()}</div>
<h2>Diagrama de momento</h2>
<div class="fig">{svg_diagrama('M')}</div>
<h2>Cómo leer la gráfica 3D</h2>
<ul class="leyenda">
<li>{sw('--comp')}<span>Flechas azules: compresión. Apuntan hacia la cara del corte y crecen linealmente desde el EN hasta la fibra superior.</span></li>
<li>{sw('--tens')}<span>Flechas rojas: tensión. Salen de la cara y crecen hacia la fibra inferior.</span></li>
<li>{sw('--accent')}<span>Flecha y esfera naranjas: el punto A y su esfuerzo σ<sub>A</sub>. La longitud de cada flecha es proporcional a σ (0.93 MPa = 0.55 m de dibujo).</span></li>
<li>{sw('--load')}<span>Flecha curva: el momento interno M = 16.8 kN·m que actúa en la cara del corte.</span></li>
</ul>
<p class="nota">Pon el tramo derecho en «Oculto» y usa la vista «Sección» para ver la cara del corte de frente. «Girar solo» sirve para proyectar en clase.</p>
{UBICACION}
'''

PANEL2 = f'''
<div class="eyebrow">Mecánica de materiales · Repaso de estado de esfuerzos</div>
<h1>Esfuerzo cortante en el punto A</h1>
{ENUNCIADO}
<div class="pide"><b>Qué muestra esta gráfica.</b> El esfuerzo cortante τ en el <b>punto A</b> (corte 1, x = 1.2 m; 0.20 m arriba del eje neutro; centro del ancho). Sobre la cara del corte se dibuja la parábola de τ: vale cero en las fibras superior e inferior y es máxima en el eje neutro. El tallo naranja es la magnitud en A; el área sombreada arriba de A es la A′ que entra en Q.</div>
{NAV(2)}
<h2>Capas</h2>
{capas([('parabola','Parábola de τ (magnitud)',True),('tallos','Tallos: τ a cada altura',True),('direccion','Dirección de τ sobre la cara',True),('areaQ','Área A′ para Q y su centroide',True),('planoA','Plano horizontal en A (τ longitudinal)',False),('cortante','Cortante interno V',True),('cotasA','Acotaciones de A',True),('carga','Carga y reacciones',True),('cotas','Acotaciones generales',True),('B','Punto B (corte 2, x = 2.4 m)',False),('ejes','Ejes x, y, z',False)])}
{segs()}
<h2>Datos</h2>
{DATOS}
<h2>Cálculo</h2>
<div class="paso"><div class="q">1. Fuerza cortante en el corte (x = 1.2 m)</div><div class="f">V = R − w·x = 20 − 10(1.2) = <b>8 kN</b></div></div>
<div class="paso"><div class="q">2. Primer momento del área arriba de A</div><div class="f">Q = A′·ȳ = (30 cm)(10 cm)(25 cm) = 7 500 cm³ = <b>7.5 × 10⁻³ m³</b><br><span class="nota">ȳ = 20 + 10/2 = 25 cm: distancia del EN al centroide de A′.</span></div></div>
<div class="paso"><div class="q">3. Inercia y ancho en el punto</div><div class="f">I = b·h³/12 = <b>5.4 × 10⁻³ m⁴</b>, b = <b>0.30 m</b></div></div>
<div class="paso"><div class="q">4. Fórmula del cortante</div><div class="f">τ<sub>A</sub> = {frac('V·Q','I·b')} = {frac('(8 × 10³ N)(7.5 × 10⁻³ m³)','(5.4 × 10⁻³ m⁴)(0.30 m)')} = 37 037 Pa</div></div>
<div class="resultado"><div class="num">τ<sub>A</sub> = 37 kPa</div><div class="sub">Actúa sobre la cara del corte, vertical y en el sentido de V (hacia abajo), y con el mismo valor sobre el plano horizontal que pasa por A (cortante longitudinal). Para comparar, en el eje neutro τ<sub>máx</sub> = 1.5·V/A = 66.7 kPa.</div></div>
<h2>Sección en el corte 1</h2>
<div class="fig">{svg_seccion_tau()}</div>
<h2>Diagrama de cortante</h2>
<div class="fig">{svg_diagrama('V')}</div>
<h2>Cómo leer la gráfica 3D</h2>
<ul class="leyenda">
<li>{sw('--shear')}<span>Prisma verde: la parábola de τ dibujada hacia afuera de la cara, como una gráfica (66.7 kPa = 0.55 m de dibujo). Los tallos marcan la magnitud a cada altura.</span></li>
<li>{sw('--shear')}<span>Flechitas sobre la cara: la dirección real de τ, vertical y hacia abajo como V. Más largas cerca del EN, nulas en los bordes.</span></li>
<li>{sw('--accent')}<span>Naranja: el punto A, su tallo τ<sub>A</sub> y el área A′ (30 × 10 cm) con su centroide a ȳ = 25 cm del EN.</span></li>
<li>{sw('--load')}<span>Flecha recta: el cortante interno V = 8 kN en la cara del corte.</span></li>
</ul>
<p class="nota">Activa «Plano horizontal en A» (vuelve transparente el tramo izquierdo) para ver el cortante longitudinal: el mismo τ actuando sobre el plano que separa A′ del resto de la viga. Es lo que explica por qué Q entra en la fórmula.</p>
{UBICACION}
'''

PANEL3 = f'''
<div class="eyebrow">Mecánica de materiales · Repaso de estado de esfuerzos</div>
<h1>Estado de esfuerzos en el punto A</h1>
{ENUNCIADO}
<div class="pide"><b>Qué muestra esta gráfica.</b> Un elemento diferencial tomado en el <b>punto A</b> (corte 1, x = 1.2 m; 0.20 m arriba del EN; centro del ancho), amplificado y sacado de la viga, con los dos esfuerzos que ya se calcularon: σ<sub>x</sub> por flexión sobre las caras perpendiculares al eje de la viga y τ<sub>xy</sub> por cortante sobre las cuatro caras del plano x–y. Las caras z son libres. Las flechas no están a escala entre sí: τ es 17 veces menor que σ.</div>
{NAV(3)}
<h2>Capas</h2>
{capas([('sigma','Flechas de σ<sub>x</sub>',True),('tau','Flechas de τ',True),('ejesCubo','Ejes junto al elemento',True),('viga','Viga de contexto',True),('carga','Carga y reacciones',True),('cotas','Acotaciones generales',True),('cotasA','Acotaciones de A',True)])}
{segs('transparente','transparente')}
<h2>Componentes del estado de esfuerzos</h2>
<table class="tabla"><tr><th>Componente</th><th>Valor en A</th><th>De dónde sale</th></tr>
<tr><td>σ<sub>x</sub></td><td class="v">−0.62 MPa</td><td>Flexión, Mc/I. Negativo = compresión (A está arriba del EN con M positivo).</td></tr>
<tr><td>τ<sub>xy</sub> = τ<sub>yx</sub></td><td class="v">37 kPa = 0.037 MPa</td><td>Cortante, VQ/(Ib). En la cara +x apunta hacia abajo, como V; en las caras ±y aparece el complementario.</td></tr>
<tr><td>σ<sub>y</sub></td><td class="v">≈ 0</td><td>La teoría elemental de vigas desprecia el aplastamiento de la carga repartida.</td></tr>
<tr><td>σ<sub>z</sub>, τ<sub>xz</sub>, τ<sub>yz</sub></td><td class="v">0</td><td>Caras laterales libres: estado plano de esfuerzos.</td></tr></table>
<h2>Elemento plano en A</h2>
<div class="fig">{svg_elemento()}</div>
<p class="nota">Las flechas de τ giran el elemento en un sentido sobre las caras ±x y en el contrario sobre las caras ±y: así se equilibran los momentos (τ<sub>xy</sub> = τ<sub>yx</sub>).</p>
<h2>Cálculo (resumen de las gráficas 1 y 2)</h2>
<div class="paso"><div class="f">V = 8 kN, M = 16.8 kN·m, I = 5.4 × 10⁻³ m⁴, Q<sub>A</sub> = 7.5 × 10⁻³ m³</div></div>
<div class="paso"><div class="f">σ<sub>x</sub> = {frac('M·c','I')} = {frac('(16.8 × 10³)(0.20)','5.4 × 10⁻³')} = 0.62 MPa (compresión)</div></div>
<div class="paso"><div class="f">τ<sub>xy</sub> = {frac('V·Q','I·b')} = {frac('(8 × 10³)(7.5 × 10⁻³)','(5.4 × 10⁻³)(0.30)')} = 37 kPa</div></div>
<h2>Extra: esfuerzos principales en A</h2>
<p class="nota">No forma parte del repaso del pizarrón; se incluye porque es el siguiente paso natural del estado de esfuerzos.</p>
<div class="paso"><div class="f">σ<sub>prom</sub> = {frac('σ<sub>x</sub> + σ<sub>y</sub>','2')} = {avg:.3f} MPa, &nbsp; R = √[((σ<sub>x</sub> − σ<sub>y</sub>)/2)² + τ<sub>xy</sub>²] = {Rm:.3f} MPa</div></div>
<div class="paso"><div class="f">σ<sub>1</sub> = σ<sub>prom</sub> + R = {s1:+.3f} MPa &nbsp;·&nbsp; σ<sub>2</sub> = σ<sub>prom</sub> − R = {s2:.3f} MPa &nbsp;·&nbsp; τ<sub>máx</sub> = R = {Rm:.3f} MPa</div></div>
<div class="paso"><div class="f">tan 2θ<sub>p</sub> = {frac('2τ<sub>xy</sub>','σ<sub>x</sub> − σ<sub>y</sub>')} → σ<sub>2</sub> actúa en el plano girado θ = {th2:.1f}° desde el eje x; σ<sub>1</sub> a {th1:.1f}°</div></div>
<p class="nota">Como τ es muy pequeño frente a σ, el círculo casi toca el origen: en A el estado es prácticamente compresión uniaxial a lo largo de la viga.</p>
<div class="fig">{svg_mohr()}</div>
{UBICACION}
'''

VISTAS_12 = [('iso','Isométrica'),('lateral','Alzado'),('seccion','Sección'),('planta','Planta')]
VISTAS_3 = [('iso','Isométrica'),('elemento','Elemento'),('frente','Frente'),('planta','Planta')]

def html(titulo, corto, panel, page_js, vistas):
    botones = ''.join(f'<button type="button" data-vista="{k}">{t}</button>' for k, t in vistas)
    three = (SRC / 'three.min.js').read_text()
    orbit = (SRC / 'OrbitControls.js').read_text()
    common_js = (SRC / 'common.js').read_text()
    css = (SRC / 'common.css').read_text()
    for s in (three, orbit, common_js, page_js):
        assert '</script' not in s.lower()
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{titulo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
{css}
</style>
</head>
<body>
<div class="app">
  <section id="vista" aria-label="Vista 3D interactiva">
    <div id="etiquetas" aria-hidden="true"></div>
    <div class="barra">
      <span class="barra-titulo">{corto}</span>
      <div class="vistas">{botones}<label class="chk"><input type="checkbox" id="girar"> Girar solo</label></div>
    </div>
    <div class="ayuda">Arrastra para girar · rueda o dos dedos para acercar · clic derecho para desplazar</div>
  </section>
  <aside class="panel">{panel}</aside>
</div>
<!-- Three.js r128 (MIT) y OrbitControls, incrustados para que el archivo funcione sin internet -->
<script>{three}</script>
<script>{orbit}</script>
<script>
{common_js}
{page_js}
</script>
</body>
</html>
'''

paginas = [
    ('01_flexion_3D.html', 'Flexión en el punto A', 'Gráfica 1 · Esfuerzo por flexión σ en A', PANEL1, 'page1.js', VISTAS_12),
    ('02_cortante_3D.html', 'Cortante en el punto A', 'Gráfica 2 · Esfuerzo cortante τ en A', PANEL2, 'page2.js', VISTAS_12),
    ('03_estado_de_esfuerzos_3D.html', 'Estado de esfuerzos en A', 'Gráfica 3 · Estado de esfuerzos en A', PANEL3, 'page3.js', VISTAS_3),
]
for nombre, titulo, corto, panel, js, vistas in paginas:
    out = OUT / nombre
    out.write_text(html(titulo, corto, panel, (SRC / js).read_text(), vistas), encoding='utf-8')
    print(f"{nombre}: {out.stat().st_size/1024:.0f} KB")
