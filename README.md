# abdal.in

Personal site of **Saiyed Mohammad Ahsan Abdal** — founder of UPSC Vision,
poet at Poetic Whispers, Toastmaster, computer science graduate.

A single-page personal hub in the sidebar-portfolio style: fixed black rail
with a handwritten wordmark, full-bleed hero photo with condensed uppercase
title, a quote interlude, a two-persona split, and three doors to the rest of
the internet:

| Door | Destination |
|---|---|
| **My corporate life** | [LinkedIn](https://www.linkedin.com/in/saiyedabdal) |
| **My poetry** | `poetry.html` — the full archive, hosted here |
| **My UPSC preparation journey** | [upscvision.org](http://upscvision.org/) |

No framework, no build step, no dependencies. Open `index.html` and it runs.

---

## Design notes

| | |
|---|---|
| **Palette** | Black `#0B0B0B` · white · yellow `#F7D842` |
| **Display** | [Oswald](https://fonts.google.com/specimen/Oswald) — condensed uppercase |
| **Body** | [Inter](https://fonts.google.com/specimen/Inter) |
| **Wordmark** | [Caveat](https://fonts.google.com/specimen/Caveat) — handwritten "Abdal" |

The layout: a yellow announcement bar pinned to the top, a 300px fixed black
sidebar (wordmark, uppercase nav, social icons), and a main column whose hero
fills the remaining viewport. On screens under 980px the sidebar collapses
into a top bar with a hamburger menu.

## The poetry archive

`poetry.html` holds **अब्दाल की कलम से** — the complete collection, 119 pieces
migrated out of Notion:

| | |
|---|---|
| ग़ज़ल · Ghazal | 33 poems |
| शेर · Sher | 63 couplets (1 / 2 / 3-couplet groups) |
| सूफ़ी · Sufi | 13 couplets + 9 ghazals |
| हिंदी · Hindi | 1 |

Verse is set in [Tiro Devanagari Hindi](https://fonts.google.com/specimen/Tiro+Devanagari+Hindi),
a literary Devanagari serif, at a line-height loose enough for the matras to
breathe; headings use Noto Serif Devanagari. The black/white/yellow chrome
carries over from the home page unchanged.

Every poem is written into the HTML as static markup — the category filter and
search are enhancement only, so the archive reads (and indexes) with JavaScript
off. Search normalises away nuqta marks and danda, so `इश्क` finds `इश्क़`.

### Rebuilding it

`assets/data/poems.json` is the source of truth. Edit it (or re-export from
Notion and re-run the parser), then:

```bash
python3 tools/build_poetry.py     # → poetry.html
```

## Structure

```
index.html            home page
poetry.html           generated — do not hand-edit
assets/css/style.css  design tokens, layout, responsive rules
assets/css/poetry.css poetry archive styles
assets/js/main.js     mobile menu, scroll reveal, video lightbox
assets/js/poetry.js   category filter + search
assets/data/          poems.json — the poetry source of truth
assets/img/           photos
tools/build_poetry.py generates poetry.html from poems.json
dev-server.js         zero-dependency static server for local preview
```

## Running it

Any static server works. With Node installed:

```bash
node dev-server.js 4321      # → http://localhost:4321
```

Or just open `index.html` directly.

## Deploying

Fully static — GitHub Pages serves it from the repository root with no build
step. Any static host (Netlify, Vercel, Cloudflare Pages) works the same way.

## Notes on robustness

- **Scroll-reveal is gated on a `.js` class** — if the script never runs, all
  content is simply visible. A timer plus a `visibilitychange` handler cover
  the case where `IntersectionObserver` callbacks are starved (background
  tabs, some embedded webviews).
- The hero video opens in an in-page lightbox via `youtube-nocookie.com`, so
  no YouTube script loads until the visitor asks for it.
- `prefers-reduced-motion` disables all animation.

## Credits

Photography and video are the author's own. Type is served from Google Fonts.

## Licence

Source code is [MIT](LICENSE). Personal content — text, photographs, and the
likeness of Saiyed Abdal — is **not** covered by that licence and remains
© Saiyed Mohammad Ahsan Abdal.
