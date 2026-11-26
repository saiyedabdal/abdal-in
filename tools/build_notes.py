#!/usr/bin/env python3
"""Render the /now list and the field notes into _src/now.body.html.

assets/data/notes.json is the source of truth. Notes are written as static
markup so the page reads (and indexes) with JavaScript off.

    python3 tools/build_notes.py   # then build_pages.py, apply_chrome.py
"""
import html, json, os, re
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "_src", "now.body.html")
DATA = os.path.join(ROOT, "assets", "data", "notes.json")

e = lambda s: html.escape(s, quote=True)


def nice(d):
    y, m, dd = map(int, d.split("-"))
    return date(y, m, dd).strftime("%-d %b %Y")


def put(s, key, inner):
    pat = re.compile(rf"(<!-- {key}:start -->).*?(<!-- {key}:end -->)", re.S)
    if not pat.search(s):
        raise SystemExit(f"marker {key} missing in {SRC}")
    return pat.sub(lambda m: m.group(1) + inner + m.group(2), s)


def main():
    data = json.load(open(DATA, encoding="utf-8"))
    s = open(SRC, encoding="utf-8").read()

    upd = data["now_updated"]
    s = put(s, "now:updated",
            f'\n  <p class="nowupd">Last updated <time datetime="{upd}">{nice(upd)}</time> &middot; Pune</p>\n  ')

    items = []
    for it in data["now"]:
        title = e(it["t"])
        if it.get("u"):
            title = f'<a href="{e(it["u"])}" target="_blank" rel="noopener">{title}</a>'
        items.append(f'        <li><b>{title}</b><span>{e(it["d"])}</span></li>')
    s = put(s, "now:list", '\n      <ul class="nowlist">\n' + "\n".join(items) + "\n      </ul>\n      ")

    notes = []
    for n in sorted(data["notes"], key=lambda n: n["date"], reverse=True):
        notes.append(
            '      <li class="fnote">'
            f'<time class="fnote__d" datetime="{n["date"]}">{nice(n["date"])}</time>'
            f'<p class="fnote__t">{e(n["text"])}</p></li>')
    s = put(s, "notes", '\n    <ol class="fnotes">\n' + "\n".join(notes) + "\n    </ol>\n    ")

    open(SRC, "w", encoding="utf-8").write(s)
    print(f"  now: {len(items)} items, {len(notes)} field notes")


if __name__ == "__main__":
    main()
