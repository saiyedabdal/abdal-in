#!/usr/bin/env python3
"""Import the UPSC Coaching Notes export into abdal.in.

Renders the Notion markdown export as static pages under /upsc/notes/ and
converts every referenced image to WebP (the raw export is 2.4 GB of retina
PNG screenshots; the converted set is ~171 MB).

    python3 tools/build_upsc.py [--skip-images] [--limit-subject NAME]

Markdown is parsed with mistune. An earlier hand-written parser was
superlinear and could not finish the largest page (10,374 lines) in five
seconds; mistune does all 371 pages in under six.

Output:
    upsc/notes/index.html                  library index + search
    upsc/notes/<subject>/index.html        subject contents
    upsc/notes/<subject>/<page>.html       one note
    assets/upsc/<hash>.webp                converted images
    assets/data/upsc-search.json           search index
"""
import os, re, sys, html, json, hashlib, subprocess, unicodedata
from urllib.parse import unquote
from concurrent.futures import ProcessPoolExecutor

import mistune

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "/Users/saiyedabdal/Documents/GitHub/_abdal-source/upsc/Private & Shared/UPSC Coaching Notes"
OUT = os.path.join(ROOT, "upsc", "notes")
IMGDIR = os.path.join(ROOT, "assets", "upsc")
MAXW, QUALITY = 1500, 72

NOTION_ID = re.compile(r"\s*\b[0-9a-f]{32}\b")
md = mistune.create_markdown(plugins=["table", "strikethrough", "url"], escape=False)


# ── naming ─────────────────────────────────────────────────────────────
def clean_title(s):
    s = NOTION_ID.sub("", s).strip()
    s = s.replace("✅", "").replace("’", "'").strip()
    s = re.sub(r"\s*\(\d+\)$", "", s)
    return re.sub(r"\s+", " ", s).strip(" -—:")


def slug(s):
    s = unicodedata.normalize("NFKD", clean_title(s))
    s = re.sub(r"[^\w\s-]", "", s, flags=re.U).strip().lower()
    s = re.sub(r"[\s_]+", "-", s)
    return re.sub(r"-{2,}", "-", s).strip("-")[:70] or "page"


def esc(s):
    return html.escape(s, quote=False)


# ── images ─────────────────────────────────────────────────────────────
def img_key(path):
    return hashlib.sha1(path.encode("utf-8")).hexdigest()[:12]


def convert(job):
    src, dst = job
    if os.path.exists(dst):
        return True
    for args in (["-resize", str(MAXW), "0"], []):
        try:
            r = subprocess.run(["cwebp", "-quiet", "-q", str(QUALITY)] + args +
                               [src, "-o", dst], capture_output=True, timeout=60)
            if r.returncode == 0 and os.path.exists(dst):
                return True
        except Exception:
            pass
    return False


# ── markdown -> html ───────────────────────────────────────────────────
def preprocess(text, base_dir, images):
    """Normalise Notion's export quirks before mistune sees it."""
    # Notion writes `**word **` as a spacing artifact; genuine bold has no
    # whitespace before the closing pair. Protect the latter, drop the rest.
    text = re.sub(r"\*\*([^*\n]*[^*\s])\*\*", lambda m: "\x00" + m.group(1) + "\x01", text)
    text = text.replace("**", " ")
    text = text.replace("\x00", "**").replace("\x01", "**")

    def fix_img(m):
        alt, target = m.group(1), m.group(2)
        if target.startswith("http"):
            return m.group(0)
        p = os.path.normpath(os.path.join(base_dir, unquote(target)))
        key = images.get(p)
        return f"![{alt}](/assets/upsc/{key}.webp)" if key else ""

    text = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", fix_img, text)
    text = text.replace("<aside>", '<div class="ncall">').replace("</aside>", "</div>")
    return text


def to_html(text, base_dir, images):
    out = md(preprocess(text, base_dir, images))
    # give tables and images their own wrappers so they can scroll / breathe
    out = re.sub(r"<table>", '<div class="ntable"><table>', out)
    out = re.sub(r"</table>", "</table></div>", out)
    out = re.sub(r'<p>(<img [^>]*>)</p>', r'<figure class="nfig">\1</figure>', out)
    out = re.sub(r'<img ', '<img loading="lazy" decoding="async" ', out)
    return out


def headings(text):
    return [clean_title(m.group(1)) for m in re.finditer(r"^#{2,4}\s+(.+)$", text, re.M)][:40]


# ── page shells ────────────────────────────────────────────────────────
def chrome():
    idx = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    side = re.search(r'<header class="side".*?</header>', idx, re.S).group(0)
    foot = re.search(r'<footer class="foot".*?</footer>', idx, re.S).group(0)
    side = (side.replace('href="#top"', 'href="/"')
                .replace('<a href="#story">Saiyed Abdal</a>', '<a href="/#story">Saiyed Abdal</a>')
                .replace('<a href="upsc.html">UPSC</a>', '<a href="/upsc.html" aria-current="page">UPSC</a>')
                .replace('<a href="poetry.html">Poetry</a>', '<a href="/poetry.html">Poetry</a>')
                .replace('<a href="#connect">Contact</a>', '<a href="/#connect">Contact</a>'))
    foot = re.sub(r'<form class="cform".*?</form>\n\n  ', '', foot, flags=re.S)
    foot = foot.replace('<footer class="foot" id="connect">', '<footer class="foot">')
    foot = foot.replace("<h2 class=\"foot__head\">Let's connect</h2>",
        "<h2 class=\"foot__head\">Let's connect</h2>\n  <p class=\"foot__line\">The form on the "
        "<a href=\"/#connect\">home page</a> reaches me directly.</p>")
    return side, foot


HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0B0B0B">
<link rel="canonical" href="https://abdal.in{canon}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%230B0B0B'/%3E%3Ctext x='50' y='68' font-family='Georgia,serif' font-style='italic' font-size='52' fill='%23fff' text-anchor='middle'%3ESA%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Inter:wght@400;500;600&family=Caveat:wght@600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="stylesheet" href="/assets/css/upsc.css">
</head>
<body>
<a class="skip" href="#main">Skip to main content</a>
<a class="topbar"></a>
{side}
<main id="main">
"""

TAIL = """{foot}
</main>
<script src="/assets/js/main.js"></script>
{extra}
</body>
</html>
"""

ARROW = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" '
         'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" '
         'stroke-linejoin="round"/></svg>')


def crumb(*parts):
    out = ['<nav class="ncrumb" aria-label="Breadcrumb"><a href="/upsc.html">UPSC</a>',
           '<span>/</span><a href="/upsc/notes/">Notes</a>']
    for i, (label, href) in enumerate(parts):
        out.append("<span>/</span>")
        out.append(f'<a href="{href}">{esc(label)}</a>' if href else f"<b>{esc(label)}</b>")
    return "".join(out) + "</nav>"


def write(path, s):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8").write(s)
    return len(s.encode("utf-8"))


# ── build ──────────────────────────────────────────────────────────────
def scan():
    pages, image_paths = [], set()
    for dp, dn, fn in os.walk(SRC):
        for f in sorted(fn):
            if not f.endswith(".md"):
                continue
            full = os.path.join(dp, f)
            rel = os.path.relpath(dp, SRC)
            parts = [] if rel == "." else rel.split(os.sep)
            subject = clean_title(parts[0]) if parts else "General"
            section = clean_title(parts[1]) if len(parts) > 1 else ""
            raw = open(full, encoding="utf-8").read()
            lines = raw.split("\n")
            if lines and lines[0].startswith("# "):
                title = clean_title(lines[0][2:]); body = "\n".join(lines[1:])
            else:
                title = clean_title(f[:-3]); body = raw
            for m in re.finditer(r"!\[[^\]]*\]\(([^)]+)\)", body):
                t = m.group(1)
                if not t.startswith("http"):
                    image_paths.add(os.path.normpath(os.path.join(dp, unquote(t))))
            pages.append(dict(dir=dp, subject=subject, section=section,
                              title=title, body=body))
    return pages, image_paths


def main():
    args = sys.argv[1:]
    skip_images = "--skip-images" in args
    only = args[args.index("--limit-subject") + 1] if "--limit-subject" in args else None

    pages, image_paths = scan()
    if only:
        pages = [p for p in pages if only.lower() in p["subject"].lower()]
        image_paths = set()
        for p in pages:
            for m in re.finditer(r"!\[[^\]]*\]\(([^)]+)\)", p["body"]):
                t = m.group(1)
                if not t.startswith("http"):
                    image_paths.add(os.path.normpath(os.path.join(p["dir"], unquote(t))))

    os.makedirs(IMGDIR, exist_ok=True)
    images, jobs = {}, []
    for p in sorted(image_paths):
        if os.path.exists(p):
            k = img_key(p)
            images[p] = k
            jobs.append((p, os.path.join(IMGDIR, k + ".webp")))

    if not skip_images and jobs:
        print(f"converting {len(jobs)} images -> webp ...", flush=True)
        with ProcessPoolExecutor(max_workers=max(1, (os.cpu_count() or 4) - 1)) as ex:
            ok = sum(1 for r in ex.map(convert, jobs, chunksize=8) if r)
        print(f"  {ok}/{len(jobs)} converted", flush=True)

    images = {p: k for p, k in images.items()
              if os.path.exists(os.path.join(IMGDIR, k + ".webp"))}

    # group + slug
    subjects = {}
    for p in pages:
        p["subject_slug"] = slug(p["subject"])
        subjects.setdefault(p["subject"], []).append(p)
    for subj, items in subjects.items():
        items.sort(key=lambda p: (p["section"], p["title"]))
        seen = {}
        for p in items:
            s = slug(p["title"])
            seen[s] = seen.get(s, 0) + 1
            p["slug"] = s if seen[s] == 1 else f"{s}-{seen[s]}"
            p["url"] = f'/upsc/notes/{p["subject_slug"]}/{p["slug"]}.html'

    side, foot = chrome()
    search, total_bytes = [], 0

    # ── note pages ─────────────────────────────────────────────────────
    for subj, items in subjects.items():
        for i, p in enumerate(items):
            body = to_html(p["body"], p["dir"], images)
            desc = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body))[:170].strip()
            nav = []
            if i:
                q = items[i - 1]
                nav.append(f'<a class="npager__prev" href="{q["url"]}">'
                           f'<span>Previous</span>{esc(q["title"])}</a>')
            if i + 1 < len(items):
                q = items[i + 1]
                nav.append(f'<a class="npager__next" href="{q["url"]}">'
                           f'<span>Next</span>{esc(q["title"])}</a>')
            page = (HEAD.format(title=esc(f'{p["title"]} — UPSC Notes — Saiyed Abdal'),
                                desc=esc(desc), canon=p["url"], side=side)
                    + '<article class="note">'
                    + crumb((subj, f'/upsc/notes/{p["subject_slug"]}/'), (p["title"], None))
                    + f'<h1 class="note__title">{esc(p["title"])}</h1>'
                    + (f'<p class="note__sec">{esc(p["section"])}</p>' if p["section"] else "")
                    + f'<div class="ncontent">{body}</div>'
                    + (f'<nav class="npager">{"".join(nav)}</nav>' if nav else "")
                    + "</article>"
                    + TAIL.format(foot=foot, extra=""))
            total_bytes += write(os.path.join(OUT, p["subject_slug"], p["slug"] + ".html"), page)
            search.append({"t": p["title"], "s": subj, "u": p["url"],
                           "h": headings(p["body"])})

    # ── subject indexes ────────────────────────────────────────────────
    for subj, items in subjects.items():
        sslug = items[0]["subject_slug"]
        groups = {}
        for p in items:
            groups.setdefault(p["section"], []).append(p)
        blocks = []
        for sec in sorted(groups, key=lambda s: (s == "", s)):
            if sec:
                blocks.append(f'<h2 class="ns__band">{esc(sec)}</h2>')
            blocks.append('<ol class="nrows">' + "".join(
                f'<li><a href="{p["url"]}"><span class="nrow__n">{i + 1:02d}</span>'
                f'<span class="nrow__t">{esc(p["title"])}</span>{ARROW}</a></li>'
                for i, p in enumerate(groups[sec])) + "</ol>")
        page = (HEAD.format(title=esc(f"{subj} — UPSC Notes — Saiyed Abdal"),
                            desc=esc(f"{len(items)} sets of UPSC notes on {subj}."),
                            canon=f"/upsc/notes/{sslug}/", side=side)
                + f'<section class="ns">{crumb((subj, None))}'
                  f'<h1 class="ns__title">{esc(subj)}</h1>'
                  f'<p class="ns__count">{len(items)} note{"s" if len(items) != 1 else ""}</p>'
                + "".join(blocks) + "</section>"
                + TAIL.format(foot=foot, extra=""))
        total_bytes += write(os.path.join(OUT, sslug, "index.html"), page)

    # ── library index ──────────────────────────────────────────────────
    cards = "".join(
        f'<a class="lib" href="/upsc/notes/{v[0]["subject_slug"]}/">'
        f'<span class="lib__n">{len(v)}</span>'
        f'<span class="lib__name">{esc(k)}</span>'
        f'<span class="lib__go">{ARROW}</span></a>'
        for k, v in sorted(subjects.items(), key=lambda x: -len(x[1])))
    rows = "".join(
        f'<li data-t="{html.escape((p["title"] + " " + subj).lower(), quote=True)}">'
        f'<a href="{p["url"]}"><span class="nrow__t">{esc(p["title"])}</span>'
        f'<span class="nrow__s">{esc(subj)}</span>{ARROW}</a></li>'
        for subj, items in sorted(subjects.items()) for p in items)
    page = (HEAD.format(title="UPSC Notes — Saiyed Abdal",
                        desc=f"The full UPSC notes archive — {len(pages)} sets across {len(subjects)} subjects.",
                        canon="/upsc/notes/", side=side)
            + '<section class="ns">'
            + '<nav class="ncrumb" aria-label="Breadcrumb"><a href="/upsc.html">UPSC</a>'
              '<span>/</span><b>Notes</b></nav>'
            + '<h1 class="ns__title">The notes</h1>'
            + f'<p class="ns__count">{len(pages)} sets &nbsp;·&nbsp; {len(subjects)} subjects '
              f'&nbsp;·&nbsp; {len(images)} figures</p>'
            + '<label class="nsearch"><span class="skip">Search the notes</span>'
              '<input type="search" id="nq" placeholder="Search all notes…" autocomplete="off">'
              '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" '
              'stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" '
              'stroke-width="2" stroke-linecap="round"/></svg></label>'
            + f'<div class="libs" id="libs">{cards}</div>'
            + f'<ol class="nrows nrows--all" id="allnotes" hidden>{rows}</ol>'
            + '<p class="nempty" id="nempty" hidden>No notes match that search.</p>'
            + "</section>"
            + TAIL.format(foot=foot, extra='<script src="/assets/js/upsc.js"></script>'))
    total_bytes += write(os.path.join(OUT, "index.html"), page)

    json.dump(search, open(os.path.join(ROOT, "assets", "data", "upsc-search.json"),
                           "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    img_bytes = sum(os.path.getsize(os.path.join(IMGDIR, f)) for f in os.listdir(IMGDIR))
    print(f"{len(pages)} notes + {len(subjects)} subject indexes + 1 library index")
    print(f"  html  {total_bytes/1048576:6.1f} MB")
    print(f"  webp  {img_bytes/1048576:6.1f} MB  ({len(images)} images)")


if __name__ == "__main__":
    main()
