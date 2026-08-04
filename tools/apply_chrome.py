#!/usr/bin/env python3
"""Single source of truth for the sidebar and footer across every page.

The site now spans ~390 HTML files (home, five sections, 371 notes). Editing
navigation by hand meant touching all of them, so this rewrites the
`<header class="side">` and `<footer class="foot">` blocks everywhere from
the definitions below.

Run it last, after build_poetry.py / build_upsc.py:

    python3 tools/apply_chrome.py
"""
import html
import os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── navigation ─────────────────────────────────────────────────────────
NAV = [
    ("Saiyed Abdal",     "/",                    ("index.html",)),
    ("Entrepreneurship", "/entrepreneurship.html", ("entrepreneurship.html",)),
    ("Timeline",         "/beyond-work.html",    ("beyond-work.html",)),
    ("The Studio",       "/studio.html",         ("studio.html",)),
    ("Poetry",           "/poetry.html",         ("poetry.html",)),
    ("Books",            "/books.html",          ("books.html",)),
    ("Quotes",           "/quotes.html",         ("quotes.html",)),
    ("UPSC",             "/upsc.html",           ("upsc.html", "upsc/")),
    ("Resources",        "/resources.html",      ("resources.html",)),
    ("Contact",          "/#connect",            ()),
]

# ── announcement bar ───────────────────────────────────────────────────
# One message, site-wide. It was hardcoded three different ways and missing
# from two pages before this moved here.
TOPBAR = ('<a class="topbar" href="https://www.linkedin.com/in/saiyedabdal" '
          'target="_blank" rel="noopener" aria-label="Saiyed Abdal on LinkedIn">\n'
          '  <span class="topbar__slide is-on">'
          '<span class="topbar__tag">Not a generalist &mdash; but a multi-specialist</span>'
          '</span>\n'
          '  <span class="topbar__slide">'
          '<span class="topbar__q1">Jack of all trades, master of none&hellip;</span>'
          '<span class="topbar__q2">but oftentimes better than a master of one.</span>'
          '</span>\n'
          '  <span class="topbar__slide">'
          '<span class="topbar__cta">Follow along on LinkedIn &#8599;</span>'
          '</span>\n'
          '</a>')

ICON = {
 "li": "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5M3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.06-1.9-3.06-1.9 0-2.2 1.45-2.2 2.96V21H9z",
 "x": "M17.5 3h3.1l-6.8 7.78L21.8 21h-6.24l-4.89-6.39L4.28 21H1.17l7.27-8.31L1.5 3h6.4l4.42 5.84zm-1.09 16.14h1.72L7.67 4.77H5.83z",
 "yt": "M23.5 6.5a3 3 0 0 0-2.11-2.13C19.5 3.85 12 3.85 12 3.85s-7.5 0-9.39.52A3 3 0 0 0 .5 6.5C0 8.4 0 12 0 12s0 3.6.5 5.5a3 3 0 0 0 2.11 2.13c1.89.52 9.39.52 9.39.52s7.5 0 9.39-.52a3 3 0 0 0 2.11-2.13C24 15.6 24 12 24 12s0-3.6-.5-5.5M9.6 15.6V8.4l6.25 3.6z",
 "ig": "M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.25.07 1.65.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.25.06-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.21 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.44 2.21 8.84 2.2 12 2.2m0 5.14a4.66 4.66 0 1 0 0 9.32 4.66 4.66 0 0 0 0-9.32m0 7.69a3.03 3.03 0 1 1 0-6.06 3.03 3.03 0 0 1 0 6.06m5.93-7.87a1.09 1.09 0 1 1-2.18 0 1.09 1.09 0 0 1 2.18 0",
 "mail": "M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m1.6 2L12 11.7 19.4 6zM20 8.4l-7.4 5.7a1 1 0 0 1-1.2 0L4 8.4V18h16z",
}
EXT = ' target="_blank" rel="noopener"'

RAIL = [("li", "https://www.linkedin.com/in/saiyedabdal", "LinkedIn", 1),
        ("x", "https://x.com/saiyedspeaks", "X", 1),
        ("yt", "https://www.youtube.com/@SaiyedAbdal", "YouTube", 1),
        ("ig", "https://www.instagram.com/saiyedabdal/", "Instagram", 1),
        ("mail", "mailto:smahsanabdal@gmail.com", "Email", 0)]

GROUPS = [
    ("Instagram", [
        ("ig", "https://www.instagram.com/saiyedabdal/", "Personal", "@saiyedabdal", 1),
        ("ig", "https://www.instagram.com/practicalplaybook/", "Practical Playbook", "@practicalplaybook", 1)]),
    ("Professional", [
        ("li", "https://www.linkedin.com/in/saiyedabdal", "LinkedIn", "/in/saiyedabdal", 1),
        ("x", "https://x.com/saiyedspeaks", "X", "@saiyedspeaks", 1)]),
    ("Elsewhere", [
        ("yt", "https://www.youtube.com/@SaiyedAbdal", "YouTube", "@SaiyedAbdal", 1),
        ("mail", "mailto:smahsanabdal@gmail.com", "Email", "smahsanabdal@gmail.com", 0)]),
]


# ── Share cards ────────────────────────────────────────────────────────
# Open Graph is what WhatsApp, LinkedIn, X, Slack and iMessage read when
# someone pastes a link. None of it is visible on the site itself. Only six
# pages used to carry any, and the image they pointed at had never existed,
# so every share rendered a blank card. Deriving the text from each page's
# own <title>/description keeps 399 pages correct without a second copy.
OG_IMAGE = "https://abdal.in/assets/img/og.jpg"
OG_ALT = "Saiyed Abdal at a Frido store opening"
OG_SITE = "Saiyed Abdal"
TWITTER = "@saiyedspeaks"

# The home page's meta description is deliberately just the name, because
# that one is the Google snippet. A share card needs a line that says
# something, so it gets its own.
OG_DESC = {
    "index.html": "AVP, Founder\u2019s Office at Frido. Poet, Sufi, "
                  "Toastmaster & car enthusiast.",
}


def og(s, rel):
    """Rewrite the Open Graph / Twitter block from the page's own head."""
    def grab(pat, default=""):
        m = re.search(pat, s, re.S)
        return m.group(1).strip() if m else default

    title = grab(r"<title>(.*?)</title>", OG_SITE)
    url = grab(r'<link rel="canonical" href="([^"]+)"', "https://abdal.in/")
    desc = OG_DESC.get(rel) or grab(r'<meta name="description" content="([^"]*)"')

    tags = [
        ('meta', 'property="og:type"', "website"),
        ('meta', 'property="og:site_name"', OG_SITE),
        ('meta', 'property="og:url"', url),
        ('meta', 'property="og:title"', title),
        ('meta', 'property="og:description"', desc),
        ('meta', 'property="og:image"', OG_IMAGE),
        ('meta', 'property="og:image:width"', "1200"),
        ('meta', 'property="og:image:height"', "630"),
        ('meta', 'property="og:image:alt"', OG_ALT),
        ('meta', 'name="twitter:card"', "summary_large_image"),
        ('meta', 'name="twitter:site"', TWITTER),
        ('meta', 'name="twitter:image"', OG_IMAGE),
    ]
    fresh = "\n".join('<%s %s content="%s">' % (t, k, html.escape(v, quote=True))
                      for t, k, v in tags)

    # Drop whatever was there before, then re-anchor on the canonical link.
    s = re.sub(r'[ \t]*<meta (?:property="og:|name="twitter:)[^>]*>\n?', "", s)
    anchor = (re.search(r'<link rel="canonical"[^>]*>\n', s)
              or re.search(r'<meta name="theme-color"[^>]*>\n', s))
    if anchor:
        s = s[:anchor.end()] + "\n" + fresh + "\n" + s[anchor.end():]

    # Stripping the old tags leaves the blank line that separated them, and
    # the insert adds its own — without this the head would gain one blank
    # line on every single run. Confined to the head so page bodies are
    # never reformatted.
    cut = s.find("</head>")
    return re.sub(r"\n{3,}", "\n\n", s[:cut]) + s[cut:] if cut > -1 else s


def svg(k, cls=""):
    c = f' class="{cls}"' if cls else ""
    return (f'<svg{c} viewBox="0 0 24 24" aria-hidden="true">'
            f'<path fill="currentColor" d="{ICON[k]}"/></svg>')


def sidebar(active):
    CUR = ' aria-current="page"'
    links = "".join(
        '    <a href="%s"%s>%s</a>\n' % (href, CUR if active in marks else "", label)
        for label, href, marks in NAV)
    rail = "\n".join(
        f'    <li><a href="{h}"{EXT if e else ""} aria-label="{lab}">\n      {svg(k)}\n    </a></li>'
        for k, h, lab, e in RAIL)
    return (
        '<header class="side" id="side">\n'
        '  <a class="side__logo" href="/" aria-label="Saiyed Abdal — home">\n'
        '    <span class="side__logo__name">Abdal</span>\n'
        '    <span class="side__logo__creed">Anonymity &middot; Ability &middot; Austerity</span>\n'
        '  </a>\n\n'
        '  <button class="side__burger" id="burger" type="button" aria-label="Open menu" '
        'aria-expanded="false" aria-controls="sidenav">\n'
        '    <span></span><span></span><span></span>\n  </button>\n\n'
        '  <nav class="side__nav" id="sidenav" aria-label="Primary">\n'
        f'{links}  </nav>\n\n'
        '  <ul class="side__social" aria-label="Social links">\n'
        f'{rail}\n  </ul>\n</header>')


def accounts():
    out = []
    for title, rows in GROUPS:
        items = "\n".join(
            f'        <li><a href="{h}"{EXT if e else ""}>\n'
            f'          {svg(k, "accounts__ic")}\n'
            f'          <span class="accounts__name">{n}</span>\n'
            f'          <span class="accounts__handle">{hd}</span>\n'
            f'        </a></li>' for k, h, n, hd, e in rows)
        out.append('    <section class="accounts__group">\n'
                   f'      <h3 class="accounts__label">{title}</h3>\n'
                   f'      <ul>\n{items}\n      </ul>\n    </section>')
    return "\n".join(out)


CFORM = open(os.path.join(ROOT, "_src", "contact-form.html"), encoding="utf-8").read().rstrip() \
    if os.path.exists(os.path.join(ROOT, "_src", "contact-form.html")) else ""


def footer(with_form):
    body = (f"\n{CFORM}\n" if with_form and CFORM else
            '\n  <p class="foot__line">Questions, invitations or a note about the writing — '
            'the form on the <a href="/#connect">home page</a> reaches me directly.</p>\n')
    fid = ' id="connect"' if with_form else ""
    return (f'<footer class="foot"{fid}>\n'
            '  <h2 class="foot__head">Let\'s connect</h2>\n'
            f'{body}\n'
            '  <div class="accounts" aria-label="Social accounts">\n'
            f'{accounts()}\n  </div>\n\n'
            '  <p class="foot__quote">\n'
            '    <span class="foot__quote__common">&ldquo;Jack of all trades, master of none&hellip;&rdquo;</span>\n'
            '    <span class="foot__quote__twist">&hellip; but oftentimes better than a master of one.</span>\n'
            '  </p>\n\n'
            '  <p class="foot__legal">© Saiyed Abdal <span id="year">2026</span></p>\n'
            '</footer>')


_HASH = {}


def asset_v(rel_url):
    """Short content hash so a deploy can't leave a stale CSS/JS cached."""
    key = rel_url.split("?")[0]
    if key not in _HASH:
        p = os.path.join(ROOT, key.lstrip("/"))
        try:
            import hashlib
            _HASH[key] = hashlib.sha1(open(p, "rb").read()).hexdigest()[:8]
        except OSError:
            _HASH[key] = ""
    return _HASH[key]


def version_assets(s):
    def sub(m):
        attr, url = m.group(1), m.group(2)
        v = asset_v(url)
        return f'{attr}="{url.split("?")[0]}?v={v}"' if v else m.group(0)
    return re.sub(r'(href|src)="(/assets/(?:css|js)/[^"]+)"', sub, s)


def apply(path):
    rel = os.path.relpath(path, ROOT)
    s = orig = open(path, encoding="utf-8").read()
    if '<header class="side"' not in s:
        return False
    # normalise root-relative asset URLs, then version them
    s = re.sub(r'(href|src)="assets/(css|js)/', r'\1="/assets/\2/', s)
    s = version_assets(s)
    s = og(s, rel)
    active = rel if rel in ("index.html", "entrepreneurship.html", "beyond-work.html", "studio.html",
                            "poetry.html", "books.html", "quotes.html", "upsc.html",
                            "resources.html") else \
        ("upsc/" if rel.startswith("upsc/") else "")
    # announcement bar: replace it where present, insert it where it is not
    if '<a class="topbar"' in s:
        s = re.sub(r'<a class="topbar".*?</a>', lambda _: TOPBAR, s, count=1, flags=re.S)
    else:
        s = re.sub(r'(<a class="skip"[^<]*</a>\n)', r'\1\n' + TOPBAR.replace('\\', '\\\\') + '\n',
                   s, count=1)

    s2 = re.sub(r'<header class="side".*?</header>', lambda _: sidebar(active), s, count=1, flags=re.S)
    s2 = re.sub(r'<footer class="foot".*?</footer>',
                lambda _: footer(rel == "index.html"), s2, count=1, flags=re.S)
    if s2 != orig:
        open(path, "w", encoding="utf-8").write(s2)
        return True
    return False


def main():
    files = ([os.path.join(ROOT, f) for f in
              ("index.html", "entrepreneurship.html", "beyond-work.html", "studio.html",
               "poetry.html", "books.html", "quotes.html", "upsc.html", "resources.html")
              if os.path.exists(os.path.join(ROOT, f))]
             + glob.glob(os.path.join(ROOT, "upsc", "**", "*.html"), recursive=True))
    n = sum(1 for f in files if apply(f))
    print(f"chrome applied to {n} of {len(files)} pages")


if __name__ == "__main__":
    main()
