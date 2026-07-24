/* abdal.in — behaviour */
(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

document.documentElement.classList.add('js');

/* ── Mobile menu ────────────────────────────────────────────── */
const side   = $('#side');
const burger = $('#burger');

burger?.addEventListener('click', () => {
  const open = side.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});

/* close the menu when a nav link is chosen */
$('#sidenav')?.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    side.classList.remove('open');
    burger?.setAttribute('aria-expanded', 'false');
  }
});

/* ── Reveal on scroll ───────────────────────────────────────── */
const items = [...document.querySelectorAll('.quote, .story__col, .foot__head')];
items.forEach((el) => el.classList.add('rv'));

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  items.forEach((el) => io.observe(el));

  /* safety net: never leave content invisible if callbacks are starved */
  const revealSeen = () => items.forEach((el) => {
    if (!el.classList.contains('in') && el.getBoundingClientRect().top < innerHeight) {
      el.classList.add('in'); io.unobserve(el);
    }
  });
  setTimeout(revealSeen, 2000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(revealSeen, 200);
  });
} else {
  items.forEach((el) => el.classList.add('in'));
}

/* ── Beyond Work timeline ───────────────────────────────────────
   Two scroll effects, both optional: each point reveals from its own
   side, and the yellow line fills the spine as you go. The fill is a
   single element and a single transform, so scrolling stays on the
   compositor and never touches layout. */
const tl = document.querySelector('.tl');
if (tl) {
  const tlItems = [...tl.querySelectorAll('.tl__item')];

  if ('IntersectionObserver' in window) {
    const tio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); tio.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    tlItems.forEach((el) => tio.observe(el));

    /* same safety net as the rest of the site: never strand a point unseen */
    const seeAll = () => tlItems.forEach((el) => {
      if (!el.classList.contains('in') && el.getBoundingClientRect().top < innerHeight) {
        el.classList.add('in'); tio.unobserve(el);
      }
    });
    setTimeout(seeAll, 2000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') setTimeout(seeAll, 200);
    });
  } else {
    tlItems.forEach((el) => el.classList.add('in'));
  }

  const fill = tl.querySelector('.tl__fill');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  if (fill && !still.matches) {
    let queued = false;
    const draw = () => {
      queued = false;
      const r = tl.getBoundingClientRect();
      const p = (innerHeight * 0.55 - r.top) / r.height;
      fill.style.transform =
        `translateX(-50%) scaleY(${Math.max(0, Math.min(1, p)).toFixed(4)})`;
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    draw();
  }

  /* Sort toggle. Reorder the actual list nodes rather than flip them with
     CSS — that keeps the positioned alternating layout (which is keyed to
     nth-child) coherent in either direction. Once someone sorts, reveal every
     point: a card that moved up from below the fold would otherwise sit
     invisible, never having crossed the reveal threshold. */
  const sort = document.querySelector('.tlsort');
  const list = tl.querySelector('.tl__list');
  if (sort && list) {
    const original = [...list.children];
    sort.addEventListener('click', (e) => {
      const btn = e.target.closest('.tlsort__btn');
      if (!btn) return;
      const desc = btn.dataset.sort === 'desc';
      list.replaceChildren(...(desc ? [...original].reverse() : original));
      sort.querySelectorAll('.tlsort__btn').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      tlItems.forEach((el) => el.classList.add('in'));
    });
  }
}

/* ── Studio: category filter ────────────────────────────────────
   The chips are enhancement-only (hidden without JS, so every section
   stays reachable). Clicking one shows just the matching sections; the
   #live deep-link from the poetry page lands on "All", so the singing
   section it points at is always visible on arrival. */
const sfilter = document.querySelector('.sfilter');
if (sfilter) {
  const cards = [...document.querySelectorAll('section[data-cat]')];
  sfilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.sfilter__btn');
    if (!btn) return;
    const cat = btn.dataset.cat;
    cards.forEach((s) => { s.hidden = !(cat === 'all' || s.dataset.cat === cat); });
    sfilter.querySelectorAll('.sfilter__btn').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  });
}

/* ── Video lightbox ─────────────────────────────────────────────
   Any element with data-video="<youtube id>" opens the player. The
   overlay is built on demand so pages don't have to carry the markup,
   and nothing is requested from YouTube until someone actually clicks. */
let lb = null, lbFrame = null, lastFocus = null;

function buildLb() {
  if (lb) return;
  lb = $('#lightbox');
  if (lb) { lbFrame = $('#lbFrame'); return; }

  lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.id = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Video player');
  lb.hidden = true;
  lb.innerHTML =
    '<button class="lightbox__close" id="lbClose" type="button" aria-label="Close video">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" ' +
    'stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>' +
    '<div class="lightbox__frame" id="lbFrame"></div>';
  document.body.appendChild(lb);
  lbFrame = $('#lbFrame', lb);
}

function openLb(id, title) {
  buildLb();
  if (!lb || !lbFrame) return;
  lb.classList.remove('lightbox--press');
  lastFocus = document.activeElement;
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
  f.title = title || 'Video';
  f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  f.allowFullscreen = true;
  lbFrame.replaceChildren(f);
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#lbClose', lb)?.focus();
}

function closeLb() {
  if (!lb) return;
  lb.hidden = true;
  lbFrame.replaceChildren();          // stops playback
  document.body.style.overflow = '';
  lastFocus?.focus();
}

$$('[data-video]').forEach((el) => el.addEventListener('click', () => {
  openLb(el.getAttribute('data-video'), el.getAttribute('aria-label'));
}));

/* Photos reuse the same shell, with arrow-key paging through the set. */
const shots = $$('[data-photo]');
let shotIdx = -1;

function openPhoto(i) {
  const el = shots[(i + shots.length) % shots.length];
  if (!el) return;
  shotIdx = (i + shots.length) % shots.length;
  buildLb();
  if (!lb || !lbFrame) return;
  lb.classList.remove('lightbox--press');
  lastFocus = lastFocus || document.activeElement;
  const img = document.createElement('img');
  img.className = 'lightbox__photo';
  img.src = el.getAttribute('data-photo');
  img.alt = el.querySelector('img')?.alt || '';
  lbFrame.replaceChildren(img);
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#lbClose', lb)?.focus();
}

shots.forEach((el, i) => el.addEventListener('click', () => openPhoto(i)));

addEventListener('keydown', (e) => {
  if (!lb || lb.hidden || shotIdx < 0) return;
  if (e.key === 'ArrowRight') openPhoto(shotIdx + 1);
  if (e.key === 'ArrowLeft') openPhoto(shotIdx - 1);
});

/* Press: an event's clippings, stacked in one scrollable panel. */
function openPress(urls, label) {
  buildLb();
  if (!lb || !lbFrame) return;
  lb.classList.add('lightbox--press');
  shotIdx = -1;                 // keep the photo arrow-keys out of this view
  lastFocus = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'lightbox__press';
  urls.map((u) => u.trim()).filter(Boolean).forEach((u) => {
    const img = document.createElement('img');
    img.src = u;
    img.alt = label ? `${label} — press cutting` : 'Press cutting';
    wrap.appendChild(img);
  });
  lbFrame.replaceChildren(wrap);
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#lbClose', lb)?.focus();
}

$$('[data-press]').forEach((el) => el.addEventListener('click', () => {
  openPress((el.getAttribute('data-press') || '').split(','),
            el.getAttribute('aria-label') || el.textContent.trim());
}));

document.addEventListener('click', (e) => {
  if (e.target === lb) closeLb();
  if (e.target.closest?.('#lbClose')) closeLb();
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb && !lb.hidden) closeLb(); });

/* ── Contact form ───────────────────────────────────────────────
   Submits to Netlify Forms over fetch so the visitor stays on the page.
   Without JS the form posts normally and lands on /thanks.html — the
   `action` attribute handles that, so this is enhancement only. */
const cform = $('#cform');
if (cform) {
  const status  = $('#cfStatus');
  const subject = $('#cfSubject');
  const send    = cform.querySelector('.cform__send');

  cform.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!cform.reportValidity()) return;

    // Give the notification email a useful subject line
    const topic = cform.elements.topic?.value.trim();
    subject.value = topic ? `Query from ABDAL.IN — ${topic}` : 'Query from ABDAL.IN';

    send.disabled = true;
    status.dataset.state = '';
    status.textContent = 'Sending…';

    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(cform)).toString(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      cform.classList.add('is-sent');
      status.dataset.state = 'ok';
      status.textContent = 'Thank you — your message is on its way. I’ll reply to you by email.';
    } catch (err) {
      send.disabled = false;
      status.dataset.state = 'error';
      status.textContent = 'That didn’t send. Please email smahsanabdal@gmail.com directly.';
    }
  });
}

/* ── Year ───────────────────────────────────────────────────── */
const yr = $('#year');
if (yr) yr.textContent = String(new Date().getFullYear());

})();
