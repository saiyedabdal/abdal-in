#!/usr/bin/env python3
"""Generate poetry.html from assets/data/poems.json.

Every poem is written into the page as static HTML — the filter and search
are progressive enhancement only, so the archive is fully readable (and
indexable) with JavaScript disabled.

Usage:  python3 tools/build_poetry.py
"""
import json, os, re, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets", "data", "poems.json")
OUT = os.path.join(ROOT, "poetry.html")


def esc(s):
    """Escape for HTML but keep the <em> emphasis the parser preserved."""
    s = html.escape(s, quote=False)
    return s.replace("&lt;em&gt;", "<em>").replace("&lt;/em&gt;", "</em>")


def verse(stanzas, cls="v"):
    out = [f'<div class="{cls}">']
    for st in stanzas:
        lines = "".join(f'<span class="l">{esc(l)}</span>' for l in st)
        out.append(f"<p>{lines}</p>")
    out.append("</div>")
    return "".join(out)


def plain(stanzas):
    """Flat text for the search index."""
    t = " ".join(l for st in stanzas for l in st)
    return re.sub(r"</?em>", "", t)


CHEV = ('<svg class="poem__chev" viewBox="0 0 24 24" aria-hidden="true">'
        '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" '
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>')
EXT = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" '
       'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
       'stroke-linejoin="round"/></svg>')


def poem_card(num, title, stanzas, reel):
    matla = ""
    if stanzas:
        matla = ('<span class="poem__matla">'
                 + "".join(f'<span class="l">{esc(l)}</span>' for l in stanzas[0][:2])
                 + "</span>")
    reel_html = ""
    if reel:
        reel_html = (f'<a class="poem__reel" href="{html.escape(reel)}" target="_blank" '
                     f'rel="noopener">Watch the recitation {EXT}</a>')
    return (
        f'<details class="poem" data-t="{html.escape(plain(stanzas) + " " + title, quote=True)}">'
        f'<summary><span class="poem__n">{num}</span>'
        f'<span class="poem__title">{esc(title)}</span>{CHEV}{matla}</summary>'
        f'<div class="poem__body">{verse(stanzas)}{reel_html}</div>'
        f"</details>"
    )


def couplet_card(label, stanzas):
    return (f'<article class="cp" data-t="{html.escape(plain(stanzas), quote=True)}">'
            f'<div class="cp__n">{esc(label)}</div>{verse(stanzas)}</article>')


d = json.load(open(DATA, encoding="utf-8"))

n_ghazal = len(d["ghazal"])
n_sher = sum(len(d["sher"][k]) for k in ("one", "two", "three"))
n_sufi = len(d["sufi"]["sher"]) + len(d["sufi"]["ghazal"])
n_hindi = len(d["hindi"])
total = n_ghazal + n_sher + n_sufi + n_hindi

# ── Ghazal ─────────────────────────────────────────────────────────────
ghazal = "".join(poem_card(f'{p["n"]:02d}', p["title"], p["stanzas"], p["reel"])
                 for p in d["ghazal"])

# ── Sher ───────────────────────────────────────────────────────────────
BANDS = [("one", "One couplet", "एक शेर"),
         ("two", "Two couplets", "दो शेर"),
         ("three", "Three couplets", "तीन शेर")]
sher = ""
for key, en, dv in BANDS:
    items = d["sher"][key]
    if not items:
        continue
    sher += (f'<h3 class="ps__band">{dv} &nbsp;·&nbsp; {en} '
             f'&nbsp;·&nbsp; {len(items)}</h3><div class="grid">'
             + "".join(couplet_card(i["label"], i["stanzas"]) for i in items)
             + "</div>")

# ── Sufi ───────────────────────────────────────────────────────────────
sufi = (f'<h3 class="ps__band">सूफ़ी शेर &nbsp;·&nbsp; Sufi couplets '
        f'&nbsp;·&nbsp; {len(d["sufi"]["sher"])}</h3><div class="grid">'
        + "".join(couplet_card(i["label"], i["stanzas"]) for i in d["sufi"]["sher"])
        + "</div>")
sufi += (f'<h3 class="ps__band">सूफ़ी ग़ज़ल &nbsp;·&nbsp; Sufi ghazals '
         f'&nbsp;·&nbsp; {len(d["sufi"]["ghazal"])}</h3><div class="poems">'
         + "".join(poem_card(f"{i+1:02d}", p["title"], p["stanzas"], p["reel"])
                   for i, p in enumerate(d["sufi"]["ghazal"]))
         + "</div>")

# ── Hindi ──────────────────────────────────────────────────────────────
h = d["hindi"][0]["stanzas"]
hs = [[l for l in st if not l.startswith("~")] for st in h]
hs = [st for st in hs if st]
hindi = (f'<div class="hindi" data-t="{html.escape(plain(hs), quote=True)}">'
         f'{verse(hs)}<span class="hindi__sig">~ अब्दाल</span></div>')

SOCIAL = """<li><a href="https://twitter.com/SaiyedAbdal2" target="_blank" rel="noopener" aria-label="X / Twitter">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.5 3h3.1l-6.8 7.78L21.8 21h-6.24l-4.89-6.39L4.28 21H1.17l7.27-8.31L1.5 3h6.4l4.42 5.84zm-1.09 16.14h1.72L7.67 4.77H5.83z"/></svg>
    </a></li>
    <li><a href="https://www.linkedin.com/in/saiyedabdal" target="_blank" rel="noopener" aria-label="LinkedIn">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5M3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.06-1.9-3.06-1.9 0-2.2 1.45-2.2 2.96V21H9z"/></svg>
    </a></li>
    <li><a href="https://www.instagram.com/poeticc_whisperss/" target="_blank" rel="noopener" aria-label="Instagram">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.25.07 1.65.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.25.06-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.21 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.44 2.21 8.84 2.2 12 2.2m0 5.14a4.66 4.66 0 1 0 0 9.32 4.66 4.66 0 0 0 0-9.32m0 7.69a3.03 3.03 0 1 1 0-6.06 3.03 3.03 0 0 1 0 6.06m5.93-7.87a1.09 1.09 0 1 1-2.18 0 1.09 1.09 0 0 1 2.18 0"/></svg>
    </a></li>
    <li><a href="https://github.com/saiyedabdal" target="_blank" rel="noopener" aria-label="GitHub">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.55v-2.1c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .3.21.66.8.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5"/></svg>
    </a></li>"""

page = f"""<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>अब्दाल की कलम से — Poetry of Saiyed Abdal</title>
<meta name="description" content="The complete poetry archive of Saiyed Abdal — {n_ghazal} ghazals, {n_sher} sher, and {n_sufi} Sufi pieces in Hindi and Urdu.">
<meta name="author" content="Saiyed Mohammad Ahsan Abdal">
<meta name="theme-color" content="#0B0B0B">
<link rel="canonical" href="https://abdal.in/poetry.html">

<meta property="og:type" content="website">
<meta property="og:url" content="https://abdal.in/poetry.html">
<meta property="og:title" content="अब्दाल की कलम से — Poetry of Saiyed Abdal">
<meta property="og:description" content="{total} pieces — ghazal, sher, and Sufi verse by Saiyed Abdal.">
<meta property="og:image" content="https://abdal.in/assets/img/talk-thumb.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@SaiyedAbdal2">

<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%230B0B0B'/%3E%3Ctext x='50' y='68' font-family='Georgia,serif' font-style='italic' font-size='52' fill='%23fff' text-anchor='middle'%3ESA%3C/text%3E%3C/svg%3E">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Inter:wght@400;500;600&family=Caveat:wght@600&family=Tiro+Devanagari+Hindi:ital@0;1&family=Noto+Serif+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/poetry.css">

<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "अब्दाल की कलम से",
  "alternateName": "Poetry of Saiyed Abdal",
  "url": "https://abdal.in/poetry.html",
  "inLanguage": ["hi", "ur"],
  "author": {{
    "@type": "Person",
    "name": "Saiyed Mohammad Ahsan Abdal",
    "url": "https://abdal.in/"
  }}
}}
</script>
</head>
<body>

<a class="skip" href="#main">Skip to main content</a>

<a class="topbar" href="https://www.instagram.com/poeticc_whisperss/" target="_blank" rel="noopener">
  Hear these poems recited on Instagram!
</a>

<header class="side" id="side">
  <a class="side__logo" href="index.html" aria-label="Saiyed Abdal — home">Abdal</a>

  <button class="side__burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="sidenav">
    <span></span><span></span><span></span>
  </button>

  <nav class="side__nav" id="sidenav" aria-label="Primary">
    <a href="index.html#story">Saiyed Abdal</a>
    <a href="http://upscvision.org/" target="_blank" rel="noopener">UPSC Vision</a>
    <a href="poetry.html" aria-current="page">Poetry</a>
    <a href="index.html#connect">Contact</a>
  </nav>

  <ul class="side__social" aria-label="Social links">
    {SOCIAL}
  </ul>
</header>

<main id="main">

<section class="pm">
  <p class="pm__kicker">The Poetry of Saiyed Abdal</p>
  <h1 class="pm__title">अब्दाल की कलम से</h1>
  <p class="pm__sub">Ghazal and sher, love and Sufism — written in Hindi and Urdu.
     The complete collection, gathered in one place.</p>
  <span class="pm__sig">Abdal</span>

  <div class="pm__stats">
    <div class="pm__stat"><b>{total}</b><span>Pieces</span></div>
    <div class="pm__stat"><b>{n_ghazal}</b><span>ग़ज़ल · Ghazal</span></div>
    <div class="pm__stat"><b>{n_sher}</b><span>शेर · Sher</span></div>
    <div class="pm__stat"><b>{n_sufi}</b><span>सूफ़ी · Sufi</span></div>
  </div>
</section>

<div class="pf" id="filters">
  <button class="pf__btn" type="button" data-f="all" aria-pressed="true">All</button>
  <button class="pf__btn" type="button" data-f="ghazal" aria-pressed="false">ग़ज़ल Ghazal</button>
  <button class="pf__btn" type="button" data-f="sher" aria-pressed="false">शेर Sher</button>
  <button class="pf__btn" type="button" data-f="sufi" aria-pressed="false">सूफ़ी Sufi</button>
  <button class="pf__btn" type="button" data-f="hindi" aria-pressed="false">हिंदी Hindi</button>

  <label class="pf__search">
    <span class="skip">Search the poems</span>
    <input type="search" id="q" placeholder="Search a line or a word…" autocomplete="off">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
  </label>
</div>

<p class="empty">No poems match that search.</p>

<section class="ps" data-cat="ghazal">
  <header class="ps__head">
    <h2 class="ps__deva">ग़ज़ल</h2>
    <p class="ps__en">Ghazal &nbsp;·&nbsp; <b>{n_ghazal} poems</b></p>
    <p class="ps__note">Each ghazal keeps one refrain and returns to it, couplet after couplet.
       Tap any title to read it in full.</p>
  </header>
  <div class="poems">{ghazal}</div>
</section>

<section class="ps" data-cat="sher">
  <header class="ps__head">
    <h2 class="ps__deva">शेर</h2>
    <p class="ps__en">Sher &nbsp;·&nbsp; <b>{n_sher} pieces</b></p>
    <p class="ps__note">Standalone couplets — a complete thought in two lines,
       grouped by how many couplets carry it.</p>
  </header>
  {sher}
</section>

<section class="ps" data-cat="sufi">
  <header class="ps__head">
    <h2 class="ps__deva">सूफ़ी</h2>
    <p class="ps__en">Sufi &nbsp;·&nbsp; <b>{n_sufi} pieces</b></p>
    <p class="ps__note">Verse written toward the divine beloved — the devotional
       strand running through the whole collection.</p>
  </header>
  {sufi}
</section>

<section class="ps" data-cat="hindi">
  <header class="ps__head">
    <h2 class="ps__deva">हिंदी</h2>
    <p class="ps__en">Hindi &nbsp;·&nbsp; <b>{n_hindi} piece</b></p>
    <p class="ps__note">On trying to write in Hindi alone — and finding that Urdu
       arrives anyway.</p>
  </header>
  {hindi}
</section>

<div class="pback">
  <a href="index.html">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    Back to abdal.in
  </a>
</div>

<footer class="foot" id="connect">
  <h2 class="foot__head">Let's connect</h2>
  <a class="foot__mail" href="mailto:smahsanabdal@gmail.com">smahsanabdal@gmail.com</a>

  <ul class="foot__social" aria-label="Social links">
    {SOCIAL}
  </ul>

  <p class="foot__legal">© Saiyed Mohammad Ahsan Abdal <span id="year">2026</span></p>
</footer>

</main>

<script src="assets/js/main.js"></script>
<script src="assets/js/poetry.js"></script>
</body>
</html>
"""

open(OUT, "w", encoding="utf-8").write(page)
print(f"wrote {os.path.relpath(OUT, ROOT)}  "
      f"({total} pieces: {n_ghazal} ghazal / {n_sher} sher / {n_sufi} sufi / {n_hindi} hindi, "
      f"{len(page)/1024:.0f} KB)")
