#!/usr/bin/env python3
"""Generate the HSST Trip 2026 shirt artwork (single-colour screen print).

Outputs: back-a4-landscape.svg, front-left-chest.svg (black ink, print files)
         index.html (mockup on both shirt colours)
Run:     python3 build.py
"""
from pathlib import Path

INK, BG = "var(--ink)", "var(--shirt)"
FONTS = ("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700;1,600"
         "&family=Jost:wght@500&display=swap")
SERIF = "font-family:'Cormorant Garamond',serif"
SANS = "font-family:'Jost',sans-serif;font-weight:500"


def star(cx, cy, r):
    return (f'<path d="M{cx} {cy-r}Q{cx} {cy} {cx+r} {cy}Q{cx} {cy} {cx} {cy+r}'
            f'Q{cx} {cy} {cx-r} {cy}Q{cx} {cy} {cx} {cy-r}Z" fill="{INK}"/>')


EYES = {
    "dot": f'<circle cx="-1.9" cy=".9" r=".7" fill="{INK}"/><circle cx="1.9" cy=".9" r=".7" fill="{INK}"/>',
    "happy": '<path d="M-2.8 1.3Q-1.9 0 -1 1.3M1 1.3Q1.9 0 2.8 1.3"/>',
    "sleep": '<path d="M-2.8 .7Q-1.9 1.8 -1 .7M1 .7Q1.9 1.8 2.8 .7"/>',
}
MOUTH = {
    "smile": '<path d="M-1.1 2.7Q0 3.7 1.1 2.7"/>',
    "open": f'<path d="M-1.3 2.4H1.3Q0 4.6 -1.3 2.4Z" fill="{INK}"/>',
}
FRINGE = "M-5.1 -.2A5.1 5.1 0 0 1 5.1 -.2Q3.5 -2.8 1 -2.4Q-2 -1.6 -5.1 -.2Z"
NIGHTCAP = (f'<path d="M-4.8 -1.9Q-2 -10 6.5 -7.6Q3.4 -5.6 4.8 -1.9Z" fill="{BG}"/>'
            f'<path d="M-3.6 -4.6Q0 -6 3.9 -4.4"/><circle cx="7.5" cy="-7.7" r="1.4" fill="{INK}"/>')


def face(cx, cy, s=1.0, hair="boy", eyes="dot", mouth="smile", body=True):
    """Chibi head (r=5 at scale 1) with shoulders; hair is solid ink."""
    back = top = ""
    if hair == "boy":
        top = f'<path d="{FRINGE}" fill="{INK}"/>'
    elif hair == "bun":
        top = f'<path d="{FRINGE}" fill="{INK}"/><circle cy="-6.2" r="2.3" fill="{INK}"/>'
    elif hair == "long":
        back = f'<path d="M-5.8 0A5.8 5.8 0 0 1 5.8 0V6.5H-5.8Z" fill="{INK}"/>'
        top = f'<path d="M-5.1 -.2A5.1 5.1 0 0 1 5.1 -.2Q2.5 -1.4 0 -2.7Q-2.5 -1.4 -5.1 -.2Z" fill="{INK}"/>'
    elif hair == "mask":   # sleep mask pushed up on the forehead
        top = (f'<path d="M-4.1 -3A5.1 5.1 0 0 1 4.1 -3Z" fill="{INK}"/>'
               f'<rect x="-5" y="-3.4" width="10" height="2.7" rx="1.35" fill="{INK}"/>')
    elif hair == "cap":    # driver
        top = f'<path d="M-5.3 -1.5A5.3 5.3 0 0 1 5.3 -1.5Z" fill="{INK}"/><path d="M3 -1.5H8.2" stroke-width="1.1"/>'
    elif hair == "nightcap":
        top = NIGHTCAP
    shoulders = f'<path d="M-5.6 10Q-5.6 5.4 0 5.4Q5.6 5.4 5.6 10Z" fill="{BG}"/>' if body else ""
    return (f'<g transform="translate({cx} {cy}) scale({s})" stroke="{INK}" stroke-width=".6" fill="none">'
            f'{back}{shoulders}<circle r="5" fill="{BG}"/>{top}{EYES[eyes]}{MOUTH[mouth]}'
            f'<path d="M-4 2.6l.8 -.7M3.2 2.6l.8 -.7" stroke-width=".4"/></g>')


def moon(cx, cy, s=1.0, zzz=True):
    """Sleepy crescent moon in a nightcap (pajama-party mascot). R=13 at scale 1."""
    z = ""
    if zzz:
        z = (f'<g fill="{INK}" stroke="none" style="{SERIF};font-weight:700;font-style:italic">'
             '<text x="17" y="-3" font-size="5">z</text><text x="21.5" y="-8.5" font-size="6.5">z</text>'
             '<text x="27" y="-14.5" font-size="8">Z</text></g>')
    return (f'<g transform="translate({cx} {cy}) scale({s})" stroke="{INK}" fill="none">'
            f'<path d="M-8 -9Q-9 -24 11 -24.5" stroke="{BG}" stroke-width="5"/>'
            f'<circle cx="12.4" cy="-23.6" r="4.2" fill="{BG}" stroke="none"/>'
            f'<path d="M4 -12.37A13 13 0 1 0 4 12.37A15 15 0 0 1 4 -12.37Z" fill="{BG}" stroke-width="1"/>'
            f'<path d="M-10.2 -7.6Q-9 -22 9.5 -23.5Q2.5 -18.5 3.6 -12.2Z" fill="{BG}" stroke-width=".9"/>'
            f'<path d="M-9.6 -11.4Q-3 -15.2 3.3 -15.6M-8.2 -15Q-2.5 -18.6 4.4 -19.2" stroke-width=".6"/>'
            f'<circle cx="11.4" cy="-23.8" r="2.3" fill="{INK}" stroke="none"/>'
            f'<path d="M-9.4 .6Q-7.6 2.6 -5.8 .6" stroke-width=".8"/>'
            f'<path d="M-6.6 5.2Q-5.2 6.6 -3.6 5.6" stroke-width=".7"/>'
            f'<path d="M-10.6 4l1 -.9M-9.4 5l1 -.9" stroke-width=".45"/>{z}</g>')


def back_art():
    o = []
    # --- scenery, clipped to the arch window ---
    o.append('<clipPath id="arch"><path d="M49.5 113.8V54A38.5 38.5 0 0 1 88 15.5H209A38.5 38.5 0 0 1 247.5 54V113.8Z"/></clipPath>')
    o.append('<clipPath id="win">' + "".join(
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3"/>' for x, y, w, h in WINDOWS) + '</clipPath>')
    s = [f'<path d="M49.5 80L66 58L74 67L88 42L108 74L120 64L150 84L180 62L192 72L212 46L226 66L234 58L247.5 76V88H49.5Z" fill="{BG}" stroke-width=".8"/>',
         '<path d="M82 51l3.5 3 2.5-3 3 3.5 3.5-2.5M207 54.5l3 2.5 2.5-3 3 3.5 3-2.5M62.5 63l2.5 2 2-2.2 2 2.4" stroke-width=".5"/>',
         '<path d="M88 42l4 12M212 46l3.5 11" stroke-width=".4"/>']
    # lake ripples
    for x, y in [(54, 92), (78, 90), (60, 110), (84, 109.5), (201, 109), (226, 110.5), (214, 92), (236, 90)]:
        s.append(f'<path d="M{x} {y}q2.5 -1.8 5 0t5 0" stroke-width=".5"/>')
    # suspension bridge (Kaeng Krachan dam)
    hang = "".join(f'M{206+34*t:.1f} {85+38*t*(1-t):.1f}V101' for t in [i / 8 for i in range(1, 8)])
    s.append(f'<path d="M197 99L206 85Q223 104 240 85L249 99" stroke-width=".6"/><path d="{hang}" stroke-width=".35"/>'
             '<path d="M206 83V106M240 83V106" stroke-width="1"/><path d="M196 101H249M196 103H249" stroke-width=".5"/>')
    # rubber raft with two rafters
    s.append('<path d="M60 94L92 106" stroke-width=".7"/>' + face(70, 97, .82, "bun", "happy", "open") + face(82, 97, .82, "boy", "happy"))
    s.append(f'<path d="M60 102.5Q76 110 92 102.5Q92 99.5 89 99.5H63Q60 99.5 60 102.5Z" fill="{BG}" stroke-width=".8"/><path d="M64 103Q76 107 88 103" stroke-width=".4"/>')
    o.append(f'<g clip-path="url(#arch)" fill="none" stroke="{INK}" stroke-linecap="round" stroke-linejoin="round">{"".join(s)}</g>')
    # --- arch frame + ground line ---
    o.append(f'<g fill="none" stroke="{INK}" stroke-linecap="round">'
             '<path d="M46 113.8V54A42 42 0 0 1 88 12H209A42 42 0 0 1 251 54V113.8" stroke-width=".9"/>'
             '<path d="M49.5 113.8V54A38.5 38.5 0 0 1 88 15.5H209A38.5 38.5 0 0 1 247.5 54V113.8" stroke-width=".35"/>'
             '<path d="M30 113.8H267" stroke-width=".9"/></g>'
             f'<path d="M26 113.8l2.2 -2.2 2.2 2.2 -2.2 2.2ZM266.6 113.8l2.2 -2.2 2.2 2.2 -2.2 2.2Z" fill="{INK}"/>')
    # --- sky: five stars = five buses ---
    o += [star(110, 30, 3.4), star(96, 44, 2), star(124, 43, 1.8), star(194, 27, 2.2), star(205, 36, 1.5)]
    o.append(moon(148.5, 35))
    # --- chibi double-decker ---
    b = ['<path d="M97 68h-9M99 79h-13M97 90h-8" stroke-width=".7"/>',
         # roof-hatch rider with pennant
         '<path d="M177 56L172.5 49M184 56L188.5 49M188.5 50V37.5" stroke-width=".8"/>'
         f'<path d="M188.5 37.5L197 40.2L188.5 43Z" fill="{INK}" stroke-width=".5"/>'
         f'<path d="M176 58.5V55Q180.5 52.2 185 55V58.5" fill="{BG}" stroke-width=".7"/>',
         face(180.5, 49, .9, "nightcap", "happy", "open", body=False),
         f'<rect x="103" y="58" width="92" height="46" rx="10" fill="{BG}" stroke-width="1.1"/>',
         f'<rect x="103.6" y="80.4" width="90.8" height="4.2" fill="{INK}" stroke="none"/>']
    b += [f'<circle cx="{x}" cy="82.5" r=".85" fill="{BG}" stroke="none"/>' for x in (129, 139, 149, 159, 169)]
    b += [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" stroke-width=".7"/>' for x, y, w, h in WINDOWS]
    riders = [(115, 71.5, 1, "boy", "happy", "open"), (132, 71.5, 1, "bun", "dot", "smile"),
              (149, 71.5, 1, "mask", "happy", "smile"), (166, 71.5, 1, "long", "dot", "open"),
              (183.5, 71.5, 1, "boy", "dot", "smile"),
              (115, 94.6, .9, "long", "happy", "smile"), (132, 94.6, .9, "boy", "sleep", "smile"),
              (149, 94.6, .9, "bun", "happy", "open"), (182, 94.6, .9, "cap", "dot", "smile")]
    b.append('<g clip-path="url(#win)">' + "".join(face(*r) for r in riders) + '</g>')
    b.append('<rect x="160" y="87" width="11" height="17" rx="2" stroke-width=".7"/><path d="M165.5 87V104" stroke-width=".5"/>'
             f'<circle cx="191" cy="99.5" r="1.7" fill="{INK}" stroke="none"/><path d="M186 101.2Q188 102.6 190 101.6" stroke-width=".5"/>')
    for x in (122, 176):
        b.append(f'<circle cx="{x}" cy="106" r="7.6" fill="{BG}" stroke-width="1.1"/><circle cx="{x}" cy="106" r="2.6" fill="{INK}" stroke="none"/>')
    o.append(f'<g fill="none" stroke="{INK}" stroke-linecap="round" stroke-linejoin="round">{"".join(b)}</g>')
    # --- lettering ---
    o.append(f'<g fill="{INK}">'
             f'<text x="148.5" y="127" text-anchor="middle" font-size="6.2" letter-spacing="6" style="{SANS}">COMPANY TRIP</text>'
             f'<text x="50.5" y="159" font-size="43" textLength="100" lengthAdjust="spacingAndGlyphs" style="{SERIF};font-weight:700">HSST</text>'
             f'<text x="158" y="159" font-size="43" style="{SERIF};font-weight:700">2</text>'
             f'<text x="208" y="159" font-size="43" style="{SERIF};font-weight:700">26</text>'
             f'<text x="148.5" y="174.5" text-anchor="middle" font-size="12" letter-spacing=".6" style="{SERIF};font-weight:600;font-style:italic">One Team  •  One Journey</text>'
             f'<text x="97" y="190.4" text-anchor="end" font-size="5" letter-spacing="2" style="{SANS}">CHONBURI</text>'
             f'<text x="201" y="190.4" font-size="5" letter-spacing="2" style="{SANS}">KAENG KRACHAN</text>'
             f'<text x="148.5" y="200" text-anchor="middle" font-size="4" letter-spacing="2.4" style="{SANS}">20 – 21 NOVEMBER 2026</text>'
             f'<path d="M40 125H82M215 125H257M56 170.5H96M201 170.5H241" stroke="{INK}" stroke-width=".35"/>'
             '<path d="M98 170.5l1.6 -1.6 1.6 1.6 -1.6 1.6ZM195.8 170.5l1.6 -1.6 1.6 1.6 -1.6 1.6Z"/>'
             '<circle cx="102" cy="188.6" r="1.2"/><circle cx="196" cy="188.6" r="1.2"/></g>')
    # the "0" of 2026 is a sleepy chibi face
    o.append(f'<g transform="translate(191.5 146.2)" fill="none" stroke="{INK}" stroke-linecap="round">'
             f'<circle r="11.2" stroke-width="2.6"/><path d="M-6.2 -.6Q-4 2 -1.8 -.6M1.8 -.6Q4 2 6.2 -.6" stroke-width="1.1"/>'
             f'<path d="M-2 4.2Q0 6 2 4.2" stroke-width="1"/><path d="M-7.6 3.6l1.4 -1.2M6.2 3.6l1.4 -1.2" stroke-width=".6"/></g>')
    # route line with a mini bus
    o.append(f'<g fill="none" stroke="{INK}" stroke-linecap="round"><path d="M106 188.6H139M158 188.6H192" stroke-width=".5" stroke-dasharray=".2 2.2"/>'
             f'<rect x="141.5" y="183.6" width="14" height="6.6" rx="2" stroke-width=".6"/><path d="M144 186.2h2.4m1.6 0h2.4m1.6 0h1.6" stroke-width="1"/>'
             f'<circle cx="145" cy="190.6" r="1.3" fill="{INK}" stroke="none"/><circle cx="152" cy="190.6" r="1.3" fill="{INK}" stroke="none"/></g>')
    return "".join(o)


WINDOWS = [(108, 63, 14, 14.5), (125, 63, 14, 14.5), (142, 63, 14, 14.5), (159, 63, 14, 14.5), (176, 63, 15, 14.5),
           (108, 87.5, 14, 12), (125, 87.5, 14, 12), (142, 87.5, 14, 12), (174.5, 87.5, 16, 12)]


def front_art():
    return (moon(10.5, 15.5, .58, zzz=False) +
            f'<g fill="{INK}">'
            f'<text x="24" y="15.4" font-size="14" textLength="31" lengthAdjust="spacingAndGlyphs" style="{SERIF};font-weight:700">HSST</text>'
            f'<text x="58" y="9.6" font-size="3.3" letter-spacing=".9" style="{SANS}">COMPANY</text>'
            f'<text x="58" y="15.2" font-size="3.3" letter-spacing=".9" style="{SANS}">TRIP 2026</text>'
            f'<text x="24" y="24.4" font-size="2.9" textLength="54" lengthAdjust="spacing" style="{SANS}">ONE TEAM  •  ONE JOURNEY</text>'
            f'<path d="M24 18.8H78" stroke="{INK}" stroke-width=".3"/>' + star(20.6, 5.4, 1.5) + star(23.8, 2.6, .8) + '</g>')


def svg_file(art, w, h):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}mm" height="{h}mm" viewBox="0 0 {w} {h}">'
            f'<style>@import url("{FONTS.replace("&", "&amp;")}");svg{{--ink:#000;--shirt:#fff}}</style>'
            f'<rect width="{w}" height="{h}" fill="#fff"/>{art}</svg>\n')


def shirt(side, shirt_col, ink_col):
    body = "M132 26Q200 58 268 26L352 66L392 150L338 178L322 142V424H78V142L62 178L8 150L48 66Z"
    if side == "back":
        neck = '<path d="M132 26Q200 46 268 26" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="5"/>'
        art = '<use href="#back" x="131" y="92" width="138" height="97.6"/>'
    else:
        neck = ('<path d="M132 26Q200 96 268 26" fill="rgba(0,0,0,.22)"/>'
                '<path d="M132 26Q200 96 268 26" fill="none" stroke="rgba(0,0,0,.14)" stroke-width="6"/>')
        art = '<use href="#front" x="226" y="118" width="40" height="14"/>'
    return (f'<svg viewBox="0 0 400 440" style="--shirt:{shirt_col};--ink:{ink_col}">'
            f'<path d="{body}" fill="{shirt_col}"/><path d="M322 142V424M78 142V424" stroke="rgba(0,0,0,.08)" stroke-width="2"/>{neck}{art}</svg>')


def html(back, front):
    def card(title, sub, shirt_col, ink_col):
        return (f'<section class="card"><header><h2>{title}</h2><p>{sub}</p></header><div class="pair">'
                f'<figure>{shirt("front", shirt_col, ink_col)}<figcaption>หน้า · อกซ้าย 7–8 ซม.</figcaption></figure>'
                f'<figure>{shirt("back", shirt_col, ink_col)}<figcaption>หลัง · A4 แนวนอน 25–26 ซม.</figcaption></figure>'
                f'</div><div class="zoom" style="--shirt:{shirt_col};--ink:{ink_col}">'
                f'<svg viewBox="0 0 297 210"><use href="#back"/></svg></div></section>')
    return f'''<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HSST Trip 2026 · Shirt Artwork</title>
<link rel="stylesheet" href="{FONTS}&family=Anuphan:wght@400;600">
<style>
:root{{--page:#f4efe4;--card:#fffdf7;--text:#171713;--muted:#6b6455;--line:#d8c9aa;--gold:#8f5f2a}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--page);color:var(--text);font-family:Anuphan,sans-serif;line-height:1.6}}
main{{max-width:1100px;margin:0 auto;padding:40px 16px 64px}}
h1{{font-family:'Cormorant Garamond',serif;font-size:clamp(30px,5vw,46px);margin:0;line-height:1.1}}
.eyebrow{{font-family:Jost,sans-serif;letter-spacing:.3em;font-size:12px;color:var(--gold);text-transform:uppercase}}
.lead{{color:var(--muted);max-width:62ch;margin:10px 0 28px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:22px}}
.card header{{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline;margin-bottom:10px}}
h2{{font-size:19px;margin:0}}.card header p{{margin:0;color:var(--muted);font-size:14px}}
.pair{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}figure{{margin:0;text-align:center}}
figure svg{{width:100%;height:auto;display:block}}figcaption{{font-size:13px;color:var(--muted)}}
.zoom{{background:var(--shirt);border-radius:12px;margin-top:16px;padding:4%}}.zoom svg{{display:block;width:100%;height:auto}}
.print{{display:grid;grid-template-columns:2fr 1fr;gap:16px;align-items:start}}
.sheet{{background:#fff;border:1px solid var(--line);border-radius:8px;padding:10px;--ink:#000;--shirt:#fff}}.sheet svg{{display:block;width:100%;height:auto}}
ul{{margin:8px 0 0;padding-left:20px}}li{{margin:4px 0}}
@media(max-width:640px){{.print{{grid-template-columns:1fr}}}}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs>
<symbol id="back" viewBox="0 0 297 210">{back}</symbol><symbol id="front" viewBox="0 0 80 28">{front}</symbol></defs></svg>
<main>
<div class="eyebrow">Shirt artwork · v1</div>
<h1>HSST Company Trip 2026</h1>
<p class="lead">“รถนอนฝัน” — รถบัสชิบิพาทั้งทีมขึ้นแก่งกระจาน ใต้พระจันทร์ใส่หมวกนอน สกรีนสีเดียว (เมทัลลิก) ตามสเปกเสื้อเดิม</p>
{card("เสื้อพนักงาน", "Slate blue · Silver metallic", "#4f79a6", "#e3e7ec")}
{card("เสื้อออแกไนซ์", "Sky blue · Gunmetal metallic", "#9cc8ee", "#3b4148")}
<section class="card"><header><h2>ไฟล์สำหรับโรงสกรีน</h2><p>ดำ = ลงหมึก · ขาว = เว้นเนื้อผ้า</p></header>
<div class="print"><div class="sheet"><svg viewBox="0 0 297 210"><use href="#back"/></svg></div>
<div class="sheet"><svg viewBox="0 0 80 28"><use href="#front"/></svg></div></div>
<ul><li><b>ลูกเล่น:</b> เลข 0 ใน 2026 เป็นหน้าชิบิหลับ · ดาว 5 ดวง = รถ 5 คัน · คนโผล่หลังคาโบกธง · เส้นทาง Chonburi → Kaeng Krachan</li>
<li><b>อ้างอิงทริป:</b> รถบัส 2 ชั้น · ล่องแก่งเรือยาง · สะพานแขวนสันเขื่อน · ธีมปาร์ตี้ชุดนอน</li>
<li><b>เส้นบางสุด</b> 0.35 มม. ที่ขนาดจริง · ก่อนส่งโรงพิมพ์ให้แปลงตัวอักษรเป็น outline</li></ul></section>
</main></body></html>
'''


if __name__ == "__main__":
    here = Path(__file__).parent
    back, front = back_art(), front_art()
    (here / "back-a4-landscape.svg").write_text(svg_file(back, 297, 210), encoding="utf-8")
    (here / "front-left-chest.svg").write_text(svg_file(front, 80, 28), encoding="utf-8")
    (here / "index.html").write_text(html(back, front), encoding="utf-8")
    print("ok")
