# abdal.in

Personal site of **Saiyed Mohammad Ahsan Abdal** — founder, poet, Toastmaster,
computer science graduate.

A rebuild of [abdal.in](https://abdal.in) as a hand-built static site, styled as an
illuminated manuscript: **midnight lapis and gold leaf**, with a generative
eight-fold Islamic *girih* lattice behind the masthead — a nod to a long-standing
interest in Sufism.

No framework, no build step, no dependencies. Open `index.html` and it runs.

---

## Design notes

| | |
|---|---|
| **Palette** | Midnight lapis `#080A0F` → gold leaf `#C9A75C` (dark) · parchment `#F3EDE0` → antique gold `#8A6A22` (light) |
| **Display** | [Fraunces](https://fonts.google.com/specimen/Fraunces) — variable, using the `SOFT` and `WONK` axes for a warm, slightly irregular old-style voice |
| **Body** | [Karla](https://fonts.google.com/specimen/Karla) |
| **Labels** | [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) |
| **Motif** | Regular octagons and `{8/3}` star polygons — the classic *khatam* star-and-cross tessellation |

The octagon recurs deliberately: the portrait medallion, the section seals, the
play button, and the favicon are all cut from the same eight-fold geometry.

### The girih background

`assets/js/main.js` draws the lattice once into a `<canvas>`, tiling `{8/3}` star
polygons on a 128px square lattice with an interstitial star at each half-offset
point. Because the pattern is periodic in exactly that period, the slow diagonal
drift is a pure CSS `transform` that translates by one period and loops —
compositor-only, with no per-frame JavaScript.

---

## Structure

```
index.html            markup + metadata (Open Graph, JSON-LD Person schema)
assets/css/style.css  design tokens, layout, motion
assets/js/main.js     girih engine, theme, scroll reveal, lightbox
assets/img/           portrait, cover, video thumbnail
dev-server.js         zero-dependency static server for local preview
```

## Running it

Any static server works. With Node installed:

```bash
node dev-server.js 4321      # → http://localhost:4321
```

Or just open `index.html` directly.

## Deploying

The site is fully static, so GitHub Pages serves it from the repository root
with no build step. Any static host (Netlify, Vercel, Cloudflare Pages) works
the same way.

---

## Notes on robustness

A few things are deliberate rather than incidental:

- **Theme is resolved before first paint** by a small inline script in `<head>`,
  so there is no flash of the wrong theme. It honours a stored preference first,
  then `prefers-color-scheme`, defaulting to dark.
- **Scroll-reveal is gated on a `.js` class.** If the script never runs, the
  content is simply visible — it is never left stranded at `opacity: 0`. A timer
  and a `visibilitychange` handler cover the case where `IntersectionObserver`
  callbacks are starved (background tabs, some embedded webviews).
- **The canvas redraws from a `ResizeObserver`**, not a `resize` listener, so it
  is correct even when it is first measured before layout settles.
- `prefers-reduced-motion` stops the drift, the grain, the marquee and the
  role rotator.

## Credits

Photography and video are the author's own. Type is served from Google Fonts.

## Licence

Source code is [MIT](LICENSE). Personal content — text, photographs, and the
likeness of Saiyed Abdal — is **not** covered by that licence and remains
© Saiyed Mohammad Ahsan Abdal.
