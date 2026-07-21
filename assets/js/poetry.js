/* ═══════════════════════════════════════════════════════════════
   Poetry archive — category filter + search.
   Progressive enhancement: every poem is already in the HTML, so
   with JS off the page is simply the full archive.
   ═══════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const buttons  = $$('.pf__btn');
const sections = $$('.ps');
const input    = $('#q');
if (!buttons.length || !sections.length) return;

const items = $$('[data-t]');
let cat = 'all';

/* Normalise so a search ignores case, Devanagari nuqta variants and
   the danda marks that end most lines. */
const norm = (s) => s
  .toLowerCase()
  .normalize('NFD')
  .replace(/[़॑-॔]/g, '')   // nuqta + vedic accents
  .replace(/[।॥|]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

items.forEach((el) => { el._t = norm(el.getAttribute('data-t') || ''); });

function apply() {
  const q = norm(input ? input.value : '');
  let total = 0;

  sections.forEach((sec) => {
    const inCat = cat === 'all' || sec.dataset.cat === cat;
    let shown = 0;

    $$('[data-t]', sec).forEach((el) => {
      const hit = inCat && (!q || el._t.includes(q));
      el.hidden = !hit;
      if (hit) shown++;
    });

    // hide a band heading whose grid has nothing left in it
    $$('.grid, .poems', sec).forEach((g) => {
      const any = $$('[data-t]', g).some((el) => !el.hidden);
      g.hidden = !any;
      const head = g.previousElementSibling;
      if (head && head.classList.contains('ps__band')) head.hidden = !any;
    });

    sec.hidden = !shown;
    total += shown;
  });

  document.body.classList.toggle('is-empty', total === 0);
}

buttons.forEach((b) => b.addEventListener('click', () => {
  cat = b.dataset.f;
  buttons.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  apply();
  const first = sections.find((s) => !s.hidden);
  if (first && cat !== 'all') {
    const y = first.getBoundingClientRect().top + scrollY
            - (parseInt(getComputedStyle(document.documentElement)
                .getPropertyValue('--bar')) || 44) - 70;
    scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }
}));

if (input) {
  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 120); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; apply(); }
  });
}

/* Only one poem open at a time keeps the grid from jumping around. */
$$('.poem').forEach((p) => p.addEventListener('toggle', () => {
  if (!p.open) return;
  const grid = p.parentElement;
  $$('.poem[open]', grid).forEach((o) => { if (o !== p) o.open = false; });
}));

})();
