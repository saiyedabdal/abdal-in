/* ═══════════════════════════════════════════════════════════════
   abdal.in — behaviour
   ═══════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Theme ──────────────────────────────────────────────────── */
const root   = document.documentElement;
const btn    = $('#theme');
const KEY    = 'abdal-theme';

function applyTheme(t, persist) {
  root.setAttribute('data-theme', t);
  if (btn) btn.setAttribute('aria-pressed', String(t === 'dark'));
  if (persist) { try { localStorage.setItem(KEY, t); } catch (_) {} }
  document.dispatchEvent(new CustomEvent('themechange'));
}

/* The inline head script already picked the theme before first paint —
   just mirror it onto the toggle. */
if (btn) btn.setAttribute('aria-pressed', String(root.getAttribute('data-theme') === 'dark'));

btn?.addEventListener('click', () => {
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
});

/* ── Girih: an 8-fold star-and-cross tessellation ───────────── */
const canvas = $('#girih');

if (canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const S   = 128;               // lattice period — must match --S in style.css
  let W, H, dpr;

  /* {n/step} star polygon — for n=8, step=3 this is the classic khatam star */
  function star(c, cx, cy, r, n, step, rot) {
    const seen = new Array(n).fill(false);
    for (let s = 0; s < n; s++) {
      if (seen[s]) continue;
      c.beginPath();
      let i = s, first = true;
      do {
        seen[i] = true;
        const a = rot + (i / n) * Math.PI * 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        first ? (c.moveTo(x, y), first = false) : c.lineTo(x, y);
        i = (i + step) % n;
      } while (i !== s);
      c.closePath();
      c.stroke();
    }
  }

  function gold() {
    return getComputedStyle(root).getPropertyValue('--gold').trim() || '#c9a75c';
  }

  /* Draw the lattice once. Drift is handled by a compositor-only CSS
     transform (see .girih in style.css), so there is no per-frame work. */
  function build() {
    W = canvas.clientWidth  || innerWidth;
    H = canvas.clientHeight || innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);

    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const c = ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    const g = gold();
    c.lineJoin = c.lineCap = 'round';

    const cols = Math.ceil(W / S) + 1;
    const rows = Math.ceil(H / S) + 1;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * S, y = j * S;

        // primary star at the lattice point
        c.strokeStyle = g;
        c.globalAlpha = 0.30;
        c.lineWidth = 1;
        star(c, x, y, S * 0.46, 8, 3, Math.PI / 8);

        // octagon halo
        c.globalAlpha = 0.15;
        c.lineWidth = 0.75;
        star(c, x, y, S * 0.30, 8, 1, Math.PI / 8);

        // interstitial star at the half-offset point
        c.globalAlpha = 0.20;
        c.lineWidth = 0.75;
        star(c, x + S / 2, y + S / 2, S * 0.19, 8, 3, 0);

        // hairline connective grid
        c.globalAlpha = 0.06;
        c.lineWidth = 0.5;
        c.beginPath();
        c.moveTo(x, y); c.lineTo(x + S, y);
        c.moveTo(x, y); c.lineTo(x, y + S);
        c.stroke();
      }
    }
    c.globalAlpha = 1;
  }

  /* Redraw whenever the canvas box actually changes size. This covers the
     first paint (before fonts/layout settle), scrollbar appearance, rotation
     and window resizing — without redrawing on every scroll-driven reflow. */
  let rt, pw = 0, ph = 0;
  function schedule() {
    const w = Math.round(canvas.clientWidth);
    const h = Math.round(canvas.clientHeight);
    if (!w || !h || (w === pw && h === ph)) return;
    pw = w; ph = h;
    clearTimeout(rt);
    rt = setTimeout(build, 120);
  }

  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(schedule).observe(canvas);
  } else {
    addEventListener('resize', schedule, { passive: true });
  }

  document.addEventListener('themechange', build);
  document.fonts?.ready.then(() => { pw = ph = 0; schedule(); });

  build();
}

/* ── Scroll: progress bar + sticky nav ──────────────────────── */
const bar = $('#progress');
const nav = $('#nav');
let ticking = false;

function onScroll() {
  const y   = scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  nav?.classList.toggle('is-stuck', y > 24);
  ticking = false;
}
addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
onScroll();

/* ── Reveal on scroll ───────────────────────────────────────────
   Content is opacity:0 until revealed, so a starved observer would leave
   the page blank. Two guards: reveal anything already in view on a hard
   timer, and re-check when the tab becomes visible again. */
const items = $$('.rv');
if (items.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

  items.forEach((el) => io.observe(el));

  const revealSeen = () => {
    items.forEach((el) => {
      if (el.classList.contains('in')) return;
      if (el.getBoundingClientRect().top < innerHeight) {
        el.classList.add('in');
        io.unobserve(el);
      }
    });
  };

  setTimeout(revealSeen, 2200);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(revealSeen, 250);
  });
}

/* ── Role rotator ───────────────────────────────────────────── */
const roles = $('#roles');
if (roles && !reduced) {
  const words = ['Founder', 'Poet', 'Toastmaster', 'Engineer', 'Innovator'];
  let n = 0;
  setInterval(() => {
    n = (n + 1) % words.length;
    const span = document.createElement('span');
    span.className = 'roles__word';
    span.textContent = words[n];
    roles.replaceChildren(span);
  }, 2600);
}

/* ── Video lightbox ─────────────────────────────────────────── */
const lb      = $('#lightbox');
const lbFrame = $('#lbFrame');
const play    = $('#playTalk');
const VIDEO   = 'OgKw0qpt930';
let lastFocus = null;

function openLb() {
  if (!lb || !lbFrame) return;
  lastFocus = document.activeElement;
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${VIDEO}?autoplay=1&rel=0&modestbranding=1`;
  f.title = 'Saiyed Abdal | Global Changemakers | Global Youth Summit Application Video';
  f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  f.allowFullscreen = true;
  lbFrame.replaceChildren(f);
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#lbClose')?.focus();
}

function closeLb() {
  if (!lb || !lbFrame) return;
  lb.hidden = true;
  lbFrame.replaceChildren();
  document.body.style.overflow = '';
  lastFocus?.focus();
}

play?.addEventListener('click', openLb);
$('#lbClose')?.addEventListener('click', closeLb);
lb?.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb && !lb.hidden) closeLb(); });

/* ── Year ───────────────────────────────────────────────────── */
const yr = $('#year');
if (yr) yr.textContent = String(new Date().getFullYear());

})();
