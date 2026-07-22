/* ═══════════════════════════════════════════════════════════════
   UPSC notes library — search across every note.
   Subject cards show by default; typing swaps in a flat result list.
   ═══════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const input = document.getElementById('nq');
const libs  = document.getElementById('libs');
const all   = document.getElementById('allnotes');
const empty = document.getElementById('nempty');
if (!input || !libs || !all) return;

const rows = [...all.querySelectorAll('li')];
rows.forEach((r) => { r._t = (r.getAttribute('data-t') || ''); });

/* Headings are fetched lazily — the index is ~100 KB, so it is not worth
   loading unless someone actually searches. */
let deep = null;
async function loadDeep() {
  if (deep) return deep;
  try {
    const res = await fetch('/assets/data/upsc-search.json');
    const data = await res.json();
    deep = new Map();
    data.forEach((d) => deep.set(d.u, (d.h || []).join(' ').toLowerCase()));
  } catch (_) {
    deep = new Map();
  }
  return deep;
}

const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

async function apply() {
  const q = norm(input.value);

  if (!q) {
    libs.hidden = false;
    all.hidden = true;
    empty.hidden = true;
    rows.forEach((r) => { r.hidden = false; });
    return;
  }

  const map = await loadDeep();
  let shown = 0;
  rows.forEach((r) => {
    const href = r.querySelector('a').getAttribute('href');
    const hit = r._t.includes(q) || (map.get(href) || '').includes(q);
    r.hidden = !hit;
    if (hit) shown++;
  });

  libs.hidden = true;
  all.hidden = false;
  empty.hidden = shown > 0;
}

let t;
input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 130); });
input.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { input.value = ''; apply(); }
});

})();
