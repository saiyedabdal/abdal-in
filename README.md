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
| **My poetry** | [poeticcwhisperss.com](http://poeticcwhisperss.com/) |
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

## Structure

```
index.html            markup + metadata (Open Graph, JSON-LD Person schema)
assets/css/style.css  design tokens, layout, responsive rules
assets/js/main.js     mobile menu, scroll reveal, video lightbox
assets/img/           photos
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
