#!/usr/bin/env python3
"""Assemble the hand-written section pages from their body sources.

Each page is `_src/<name>.body.html` wrapped in the shared head/chrome.
Run apply_chrome.py afterwards to normalise nav and footer.

    python3 tools/build_pages.py
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAGES = {
    "entrepreneurship.html": dict(
        title="Entrepreneurship — Saiyed Abdal",
        desc="AVP in Frido's Founder's Office — inside sales, retail revenue and "
             "operations, online reputation management, P&L ownership and zero-to-one GTM.",
        css="upsc.css", topbar=None),
    "beyond-work.html": dict(
        title="Beyond Work — Saiyed Abdal",
        desc="UNDP Asia-Pacific and the ADB, the Smart India Hackathon, a public speaking "
             "championship in London, and building from zero to one.",
        css="upsc.css", topbar=None),
    "studio.html": dict(
        title="The Studio — Saiyed Abdal",
        desc="The Studio.",
        css="upsc.css", topbar=None),
    "resources.html": dict(
        title="Resources — Saiyed Abdal",
        desc="Resources.",
        css="upsc.css", topbar=None),
    "books.html": dict(
        title="Books — Saiyed Abdal",
        desc="Books.",
        css="upsc.css", topbar=None),
    "quotes.html": dict(
        title="Values — Saiyed Abdal",
        desc="The lines Saiyed Abdal keeps coming back to — borrowed, and a few of his own.",
        css="upsc.css", topbar=None),
    "dispatch.html": dict(
        title="Dispatch — Saiyed Abdal",
        desc="A letter now and then — on retail, founders'-office life, "
             "systems, and the odd poem. No noise.",
        css="upsc.css", topbar=None),
    "upsc.html": dict(
        title="The UPSC Years — Saiyed Abdal",
        desc="A computer science graduate who studied history, polity, economics and "
             "anthropology for the Civil Services — and how it changed the way he reads problems.",
        css="upsc.css", topbar=None),
}

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="author" content="Saiyed Abdal">
<meta name="theme-color" content="#0B0B0B">
<link rel="canonical" href="https://abdal.in/{name}">

<meta property="og:type" content="article">
<meta property="og:url" content="https://abdal.in/{name}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@saiyedspeaks">

<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%230B0B0B'/%3E%3Ctext x='50' y='68' font-family='Georgia,serif' font-style='italic' font-size='52' fill='%23fff' text-anchor='middle'%3ESA%3C/text%3E%3C/svg%3E">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Inter:wght@400;500;600&family=Caveat:wght@600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="stylesheet" href="/assets/css/{css}">
</head>
<body>

<a class="skip" href="#main">Skip to main content</a>
{topbar}
<header class="side" id="side"></header>

<main id="main">

{body}
<footer class="foot"></footer>

</main>

<script src="/assets/js/main.js"></script>
</body>
</html>
"""


def main():
    for name, cfg in PAGES.items():
        src = os.path.join(ROOT, "_src", name.replace(".html", ".body.html"))
        if not os.path.exists(src):
            print(f"  skip {name} (no {os.path.relpath(src, ROOT)})")
            continue
        body = open(src, encoding="utf-8").read()
        tb = (f'\n<a class="topbar" href="{cfg["topbar"][0]}">{cfg["topbar"][1]}</a>\n'
              if cfg["topbar"] else "")
        page = HEAD.format(title=cfg["title"], desc=cfg["desc"], name=name,
                           css=cfg["css"], topbar=tb, body=body)
        open(os.path.join(ROOT, name), "w", encoding="utf-8").write(page)
        print(f"  wrote {name}")


if __name__ == "__main__":
    main()
