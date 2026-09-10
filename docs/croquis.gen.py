# Génère docs/croquis.html (annexe B des specs fonctionnelles). Lancer : python3 docs/croquis.gen.py
import math

SQ3 = math.sqrt(3)
ACC = "#d97706"  # piste

def hex_pts(cx, cy, R):
    # flat-top: vertices at 0,60,...,300 degrees
    return [(cx + R*math.cos(math.radians(a)), cy + R*math.sin(math.radians(a))) for a in range(0, 360, 60)]

def pts_str(pts):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)

def hex_poly(cx, cy, R, fill="none", stroke="currentColor", extra=""):
    return f'<polygon points="{pts_str(hex_pts(cx,cy,R))}" fill="{fill}" stroke="{stroke}" stroke-width="1.5" {extra}/>'

# heading d: 0=up(12), 1=2h, 2=4h, 3=6h, 4=8h, 5=10h ; screen angle
def ang(d):
    return math.radians(-90 + 60*d)

def face_mid(cx, cy, R, d):
    a = R*SQ3/2
    return (cx + a*math.cos(ang(d)), cy + a*math.sin(ang(d)))

def track_path(cx, cy, R, d_in, d_out, width, color=ACC, opacity=1):
    # d_in: heading of travel when entering (entry face is behind: direction d_in+3)
    x0, y0 = face_mid(cx, cy, R, (d_in+3) % 6)
    x1, y1 = face_mid(cx, cy, R, d_out)
    return (f'<path d="M{x0:.1f},{y0:.1f} Q{cx:.1f},{cy:.1f} {x1:.1f},{y1:.1f}" fill="none" '
            f'stroke="{color}" stroke-width="{width}" stroke-linecap="butt" opacity="{opacity}"/>')

FACE_NAMES = {0:"12",1:"2",2:"4",3:"6",4:"8",5:"10"}

def fig(svg, caption, label, w, h):
    return (f'<figure><svg viewBox="0 0 {w} {h}" role="img" aria-label="{label}">{svg}</svg>'
            f'<figcaption>{caption}</figcaption></figure>')

figs = []

# ---------- F1 : faces ----------
R = 70; cx, cy = 200, 205
s = hex_poly(cx, cy, R)
for d in range(6):
    x, y = face_mid(cx, cy, R, d)
    lx = cx + (R*SQ3/2 + 18)*math.cos(ang(d)); ly = cy + (R*SQ3/2 + 18)*math.sin(ang(d))
    s += f'<text x="{lx:.1f}" y="{ly+4:.1f}" text-anchor="middle" font-size="13" font-weight="600">{FACE_NAMES[d]}</text>'
    s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.5" fill="currentColor"/>'
# avant arrow
s += f'<line x1="440" y1="245" x2="440" y2="165" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)"/>'
s += f'<text x="450" y="209" font-size="12">avant</text>'
# neighbours ghost
for d in range(6):
    nx = cx + R*SQ3*math.cos(ang(d)); ny = cy + R*SQ3*math.sin(ang(d))
    s += hex_poly(nx, ny, R, extra='opacity="0.18" stroke-dasharray="4 3"')
s += f'<text x="{cx}" y="{cy+5}" text-anchor="middle" font-size="12" opacity="0.7">tuile</text>'
figs.append(fig(s, "Fig. 1. Côté plat vers l'avant. Les six faces portent les heures d'une horloge : 12 devant, 6 derrière. Les voisines (en pointillé) se trouvent au bout de chaque face.",
                "Un hexagone à côté plat vers l'avant, faces numérotées 12, 2, 4, 6, 8, 10, voisines en pointillé", 500, 410))

# ---------- F2 : traversées ----------
R = 44; s = ""
cases = [(0,"12","droite"), (1,"2","60° à droite"), (2,"4","120° à droite"), (5,"10","60° à gauche"), (4,"8","120° à gauche")]
for i, (d_out, name, lab) in enumerate(cases):
    cx = 60 + i*120; cy = 70
    s += hex_poly(cx, cy, R)
    s += track_path(cx, cy, R, 0, d_out, 14)
    ex, ey = face_mid(cx, cy, R, d_out)
    s += f'<text x="{cx}" y="{cy+R+22}" text-anchor="middle" font-size="12" font-weight="600">sortie {name}</text>'
    s += f'<text x="{cx}" y="{cy+R+38}" text-anchor="middle" font-size="11" opacity="0.75">{lab}</text>'
    if i == 0:
        x0, y0 = face_mid(cx, cy, R, 3)
        s += f'<text x="{cx}" y="{y0-6}" text-anchor="middle" font-size="10" opacity="0.75" fill="#fff" stroke="none">6</text>'
s += '<text x="12" y="18" font-size="11" opacity="0.75">entrée toujours par la face 6 (en bas)</text>'
figs.append(fig(s, "Fig. 2. Les cinq traversées possibles. L'entrée est toujours la face 6, seule la face de sortie change : 12 pour une droite, 2 ou 10 pour un virage à 60°, 4 ou 8 pour un virage à 120°. On ne ressort jamais par la 6.",
                "Cinq hexagones montrant la piste entrant par la face 6 et sortant par 12, 2, 4, 10 ou 8", 600, 175))

# ---------- F3 : profil de face ----------
U = 56; x0 = 30; y0 = 40; s = ""
cells = [("paysage",None,0.12),("bas-côté",None,0.28),("piste",ACC,1),("piste",ACC,1),("piste",ACC,1),("bas-côté",None,0.28),("paysage",None,0.12),("paysage",None,0.12)]
for i,(name,col,op) in enumerate(cells):
    x = x0 + i*U
    fill = col if col else "currentColor"
    s += f'<rect x="{x}" y="{y0}" width="{U}" height="40" fill="{fill}" opacity="{op}" stroke="none"/>'
    s += f'<rect x="{x}" y="{y0}" width="{U}" height="40" fill="none" stroke="currentColor" stroke-width="1"/>'
    s += f'<text x="{x+U/2}" y="{y0+40+16}" text-anchor="middle" font-size="11" opacity="0.8">{i}</text>'
# group labels
def brace(xa, xb, y, text):
    return (f'<line x1="{xa+2}" y1="{y}" x2="{xb-2}" y2="{y}" stroke="currentColor" stroke-width="1"/>'
            f'<line x1="{xa+2}" y1="{y-4}" x2="{xa+2}" y2="{y+4}" stroke="currentColor" stroke-width="1"/>'
            f'<line x1="{xb-2}" y1="{y-4}" x2="{xb-2}" y2="{y+4}" stroke="currentColor" stroke-width="1"/>'
            f'<text x="{(xa+xb)/2}" y="{y+15}" text-anchor="middle" font-size="11">{text}</text>')
s += brace(x0, x0+U, 118, "paysage")
s += brace(x0+U, x0+2*U, 118, "bas-côté")
s += brace(x0+2*U, x0+5*U, 118, "piste : 3")
s += brace(x0+5*U, x0+6*U, 118, "bas-côté")
s += brace(x0+6*U, x0+8*U, 118, "paysage")
s += brace(x0, x0+8*U, 22, "une face : 8 unités")
s += f'<text x="{x0}" y="166" font-size="11" opacity="0.8">position = 2 (première unité du bloc depuis la gauche) · largeur piste = 3</text>'
s += f'<text x="{x0}" y="182" font-size="11" opacity="0.8">bas-côtés 1 + 1 · piste + bas-côtés = 5 ≤ 6 · paysage 1 à gauche, 2 à droite</text>'
figs.append(fig(s, "Fig. 3. Le profil d'une face, en unités (une unité = une largeur de voiture). Le bloc piste plus bas-côtés fait au plus 6 unités, ce qui laisse au moins une unité de paysage de chaque côté. La position se compte depuis la gauche.",
                "Une barre de huit cellules : paysage, bas-côté, trois cellules de piste, bas-côté, deux de paysage", 520, 195))

# ---------- F4 : changement au milieu (vue de dessus + coupe) ----------
s = ""
# top view: a straight tile drawn as a vertical band of 8 units, entry bottom exit top
U = 22; x0 = 40; top = 30; H = 200
face_w = 8*U
s += f'<rect x="{x0}" y="{top}" width="{face_w}" height="{H}" fill="currentColor" opacity="0.10" stroke="none"/>'
s += f'<rect x="{x0}" y="{top}" width="{face_w}" height="{H}" fill="none" stroke="currentColor" stroke-width="1.5"/>'
# entry profile pos=1 w=4 shoulders 1,1 ; exit profile pos=4 w=2 shoulders 1,1
def band(px, w, ya, yb, col, op):
    return f'<rect x="{x0+px*U}" y="{ya}" width="{w*U}" height="{yb-ya}" fill="{col}" opacity="{op}" stroke="none"/>'
mid_a = top + H*0.38; mid_b = top + H*0.62
# entry half (bottom)
s += band(1, 1, mid_b, top+H, "currentColor", 0.28); s += band(6, 1, mid_b, top+H, "currentColor", 0.28); s += band(2, 4, mid_b, top+H, ACC, 1)
# exit half (top)
s += band(4, 1, top, mid_a, "currentColor", 0.28); s += band(7, 1, top, mid_a, "currentColor", 0.28); s += band(5, 2, top, mid_a, ACC, 1)
# transition polygons
s += f'<polygon points="{x0+2*U},{mid_b} {x0+6*U},{mid_b} {x0+7*U},{mid_a} {x0+5*U},{mid_a}" fill="{ACC}" opacity="1"/>'
s += f'<polygon points="{x0+1*U},{mid_b} {x0+2*U},{mid_b} {x0+5*U},{mid_a} {x0+4*U},{mid_a}" fill="currentColor" opacity="0.28"/>'
s += f'<polygon points="{x0+6*U},{mid_b} {x0+7*U},{mid_b} {x0+8*U},{mid_a} {x0+7*U},{mid_a}" fill="currentColor" opacity="0.28"/>'
s += f'<line x1="{x0-6}" y1="{mid_a}" x2="{x0+face_w+6}" y2="{mid_a}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>'
s += f'<line x1="{x0-6}" y1="{mid_b}" x2="{x0+face_w+6}" y2="{mid_b}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>'
s += f'<text x="{x0+face_w+12}" y="{(mid_a+mid_b)/2+4}" font-size="11">changement<tspan x="{x0+face_w+12}" dy="14">au milieu</tspan></text>'
s += f'<text x="{x0+face_w/2}" y="{top-10}" text-anchor="middle" font-size="11">sortie : pos 4 · piste 2</text>'
s += f'<text x="{x0+face_w/2}" y="{top+H+18}" text-anchor="middle" font-size="11">entrée : pos 1 · piste 4</text>'
s += f'<text x="{x0+face_w/2}" y="{top+H+34}" text-anchor="middle" font-size="10" opacity="0.7">vue de dessus (tuile redressée en bande)</text>'
# side view
sx = 330; base = top+H
s += f'<text x="{sx+110}" y="{top-10}" text-anchor="middle" font-size="11">coupe : hauteur 4 → 6</text>'
h_in, h_out = 4, 6; scale = 14
y_in = base - h_in*scale; y_out = base - h_out*scale
L = 220; a = sx + L*0.38; b = sx + L*0.62
s += f'<polygon points="{sx},{base} {sx},{y_in} {a},{y_in} {b},{y_out} {sx+L},{y_out} {sx+L},{base}" fill="currentColor" opacity="0.12"/>'
s += f'<polyline points="{sx},{y_in} {a},{y_in} {b},{y_out} {sx+L},{y_out}" fill="none" stroke="{ACC}" stroke-width="4"/>'
s += f'<line x1="{sx}" y1="{base}" x2="{sx+L}" y2="{base}" stroke="currentColor" stroke-width="1"/>'
s += f'<line x1="{a}" y1="{top+30}" x2="{a}" y2="{base}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>'
s += f'<line x1="{b}" y1="{top+30}" x2="{b}" y2="{base}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>'
s += f'<text x="{sx-4}" y="{y_in+4}" text-anchor="end" font-size="11">h = 4</text>'
s += f'<text x="{sx+L+4}" y="{y_out+4}" font-size="11">h = 6</text>'
s += f'<text x="{sx}" y="{top+H+18}" font-size="11">entrée</text>'
s += f'<text x="{sx+L}" y="{top+H+18}" text-anchor="end" font-size="11">sortie</text>'
s += f'<text x="{(a+b)/2}" y="{top+22}" text-anchor="middle" font-size="11">pente</text>'
figs.append(fig(s, "Fig. 4. Une même tuile vue de dessus et en coupe. Les deux moitiés portent les profils d'entrée et de sortie tels quels ; tout ce qui change (largeur, position, hauteur, type) le fait dans la bande centrale. Aux jonctions, les profils sont donc toujours identiques des deux côtés.",
                "À gauche, une tuile dont la piste se resserre et se décale dans sa bande centrale ; à droite, une coupe où la hauteur passe de 4 à 6 par une pente au milieu", 600, 280))

# ---------- F5 : boucle + fichier ----------
R = 30
seq = ["12","2"]*6  # alternate straight / 60° right
turn = {"12":0,"2":1,"4":2,"10":-1,"8":-2}
cx, cy, d = 0.0, 0.0, 0
tiles = []
for i, ex in enumerate(seq):
    d_out = (d + turn[ex]) % 6
    tiles.append((cx, cy, d, d_out, ex))
    cx += R*SQ3*math.cos(ang(d_out)); cy += R*SQ3*math.sin(ang(d_out)); d = d_out
closes = abs(cx - tiles[0][0]) < 1 and abs(cy - tiles[0][1]) < 1 and d == tiles[0][2]
assert closes, (cx, cy, d)
xs = [t[0] for t in tiles]; ys = [t[1] for t in tiles]
ox = 130 - min(xs) + R; oy = 30 - min(ys) + R
W = int(max(xs)-min(xs) + 2*R + 170); H = int(max(ys)-min(ys) + 2*R + 60)
s = ""
for i,(x,y,d_in,d_out,ex) in enumerate(tiles):
    X, Y = x+ox, y+oy
    s += hex_poly(X, Y, R)
    s += track_path(X, Y, R, d_in, d_out, 9)
    s += f'<text x="{X:.1f}" y="{Y+4:.1f}" text-anchor="middle" font-size="9" fill="#fff" stroke="none" opacity="0.95">{i+1}</text>'
X0, Y0 = tiles[0][0]+ox, tiles[0][1]+oy
s += f'<line x1="{X0-R*SQ3/2-2:.1f}" y1="{Y0:.1f}" x2="{X0+R*SQ3/2+2:.1f}" y2="{Y0:.1f}" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/>'
s += f'<text x="{X0-R-6:.1f}" y="{Y0+4:.1f}" text-anchor="end" font-size="11">départ / arrivée</text>'
figs.append(fig(s, "Fig. 5. Une boucle de douze tuiles alternant droite (sortie 12) et virage à 60° (sortie 2). Aucune position n'est écrite : chaque tuile se place au bout de la face de sortie de la précédente, et la douzième ressort dans la face 6 de la première.",
                "Douze hexagones formant un anneau, la piste passant de l'un au suivant, numérotés de 1 à 12, la tuile 1 marquée départ arrivée", W, H))

file_example = """hexrace-track 1

id: europe-ring-01
name: Petit Anneau
environment: europe
mode: track
laps: 3

# Une ligne par tuile, dans l'ordre de parcours. L'entrée est toujours la face 6.
# exit      face de sortie (12, 2, 4, 8, 10)
# pos/w     position et largeur de la piste en sortie
# sh        bas-côtés gauche,droite en sortie (0 ou 1)
# h         hauteur en sortie
# t         types piste/bas-côté/paysage en sortie (1 à 3, 1 à 3, 1 à 2)
# obs       obstacles, optionnels : nom@unité[,largeur]

[tiles]
start  exit=12  pos=2 w=3  sh=1,1  h=5  t=1/1/1
       exit=2   pos=2 w=3  sh=1,1  h=5  t=1/1/1
       exit=12  pos=2 w=3  sh=1,1  h=6  t=1/1/1   obs=bump@3
       exit=2   pos=2 w=3  sh=1,1  h=6  t=2/1/1
       exit=12  pos=3 w=2  sh=1,1  h=6  t=2/1/1
       exit=2   pos=3 w=2  sh=1,1  h=6  t=2/1/1   obs=barrier@2 barrier@5
       exit=12  pos=3 w=2  sh=1,1  h=7  t=2/1/1   obs=ramp@3,2
       exit=2   pos=3 w=2  sh=1,1  h=7  t=2/1/1
       exit=12  pos=2 w=3  sh=1,1  h=6  t=1/1/1
       exit=2   pos=2 w=3  sh=1,1  h=6  t=1/1/1   obs=hay@1
       exit=12  pos=2 w=3  sh=1,1  h=5  t=1/1/1
       exit=2   pos=2 w=3  sh=1,1  h=5  t=1/1/1
"""

html = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HexRace - Croquis</title>
<style>
  :root {{ color-scheme: light dark; --bg: #fafaf9; --fg: #1c1917; --muted: #57534e; --rule: #d6d3d1; --code: #f5f5f4; }}
  @media (prefers-color-scheme: dark) {{ :root {{ --bg: #1c1917; --fg: #e7e5e4; --muted: #a8a29e; --rule: #44403c; --code: #292524; }} }}
  body {{ margin: 0; padding: 32px 16px 64px; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; }}
  main {{ max-width: 760px; margin: 0 auto; }}
  h1 {{ font-size: 1.5rem; margin: 0 0 4px; }}
  .lead {{ color: var(--muted); margin: 0 0 32px; }}
  figure {{ margin: 0 0 40px; }}
  svg {{ display: block; max-width: 100%; height: auto; }}
  svg text {{ fill: currentColor; }}
  svg text[fill="#fff"] {{ fill: #fff; }}
  figcaption {{ color: var(--muted); font-size: 0.92rem; margin-top: 8px; border-top: 1px solid var(--rule); padding-top: 8px; }}
  pre {{ background: var(--code); border: 1px solid var(--rule); border-radius: 6px; padding: 12px 14px; overflow-x: auto; font-size: 12.5px; line-height: 1.45; }}
  .defs {{ position: absolute; width: 0; height: 0; }}
</style>
</head>
<body>
<svg class="defs" aria-hidden="true"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs></svg>
<main>
<h1>HexRace - Croquis et schémas</h1>
<p class="lead">Annexe B des <a href="specs-fonctionnelles.md">spécifications fonctionnelles</a>. Cinq figures et un exemple de fichier ; la syntaxe du fichier est illustrative et sera fixée par la spécification technique.</p>
{''.join(figs)}
<figure>
<pre>{file_example}</pre>
<figcaption>Fig. 6. Le fichier qui décrit la boucle de la figure 5. En-tête versionné, paires clé/valeur, puis la liste ordonnée des tuiles. Chaque ligne ne donne que le profil de sortie : le profil d'entrée est celui de la tuile précédente. La tuile <code>start</code> porte le départ et, en mode Track, l'arrivée.</figcaption>
</figure>
</main>
</body>
</html>
"""
import os; open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "croquis.html"), "w").write(html)
print("ok", len(html))
