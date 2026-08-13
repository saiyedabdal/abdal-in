/* abdal.in — behaviour */
(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

document.documentElement.classList.add('js');

/* ── Greeting: a friendly, optional hello on the public site ─────────
   Not a lock — the site is open. It asks (nicely, across up to three
   visits) who dropped by and why, lets anyone carry on without a word,
   and only asks for a number if they offer one. To Netlify Forms. */
(() => {
  if (location.pathname.startsWith('/private')) return;   // never in the workspace
  let st; try { st = JSON.parse(localStorage.getItem('abdal_greet') || '{}'); } catch { return; }
  if (st.done || (st.skips || 0) >= 3) return;
  const save = () => { try { localStorage.setItem('abdal_greet', JSON.stringify(st)); } catch {} };
  const esc = (s) => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

  const LINES = [
    ['Well, hello there', 'Who do I have the pleasure of showing my corner of the internet to? Totally optional — I’m not the police.'],
    ['Oh, it’s you again', 'No name last time — very mysterious. Care to introduce yourself, or shall I keep calling you “Anonymous Legend”?'],
    ['Okay, last try, I promise', 'I only ask thrice. A name and a reason, and I’ll leave you in peace forever.'],
  ];
  const [gh, gp] = LINES[Math.min(st.skips || 0, 2)];
  const lastFocus = document.activeElement;

  const wrap = document.createElement('div');
  wrap.className = 'greet';
  wrap.innerHTML = `
    <div class="greet__box" role="dialog" aria-modal="true" aria-labelledby="greetH">
      <button class="greet__x" type="button" aria-label="Close and keep browsing">&times;</button>
      <div class="greet__step" data-step="1">
        <p class="greet__k">A quick hello</p>
        <h2 class="greet__h" id="greetH">${gh}</h2>
        <p class="greet__p">${gp}</p>
        <label class="greet__f"><span>Your name</span>
          <input name="name" type="text" autocomplete="name" placeholder="Anonymous Legend"></label>
        <label class="greet__f"><span>Why&rsquo;d you wander in?</span>
          <input name="reason" type="text" placeholder="Just being nosy, honestly"></label>
        <div class="greet__row">
          <button class="greet__go" type="button">Say hi</button>
          <button class="greet__skip" type="button">Just browsing &rarr;</button>
        </div>
      </div>
      <div class="greet__step" data-step="2" hidden>
        <p class="greet__k">One more, if you&rsquo;re game</p>
        <h2 class="greet__h">Feeling bold?</h2>
        <p class="greet__p greet__p2"></p>
        <label class="greet__f greet__phone" hidden><span>Your number</span>
          <input name="phone" type="tel" autocomplete="tel" placeholder="+91&hellip;"></label>
        <div class="greet__row">
          <button class="greet__yes" type="button">Sure, here&rsquo;s my number</button>
          <button class="greet__no" type="button">I&rsquo;m good, thanks</button>
        </div>
      </div>
      <div class="greet__step" data-step="3" hidden>
        <p class="greet__k">&mdash;</p>
        <h2 class="greet__h greet__thanks"></h2>
        <p class="greet__p">Enjoy the site. The door&rsquo;s open.</p>
        <div class="greet__row"><button class="greet__done" type="button">Let me in &rarr;</button></div>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const q = (s) => wrap.querySelector(s);
  const steps = [...wrap.querySelectorAll('.greet__step')];
  const show = (n) => steps.forEach((s) => (s.hidden = +s.dataset.step !== n));
  const nameEl = q('input[name=name]'), reasonEl = q('input[name=reason]'), phoneEl = q('input[name=phone]');

  const onKey = (e) => {
    if (e.key === 'Escape') return skip();
    if (e.key !== 'Tab') return;
    const f = [...wrap.querySelectorAll('button,input')].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  };
  function close() {
    wrap.remove();
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function skip() { st.skips = (st.skips || 0) + 1; save(); close(); }
  function send(extra) {
    st.done = true; save();
    const data = { 'form-name': 'greeting', 'bot-field': '',
      name: nameEl.value.trim(), reason: reasonEl.value.trim(), ...extra };
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data).toString() }).catch(() => {});
  }
  function thanks() {
    const who = nameEl.value.trim();
    q('.greet__thanks').innerHTML = 'Lovely to meet you' + (who ? ', ' + esc(who) : '') + ' \u{1F44B}';
    show(3); q('.greet__done').focus();
  }

  q('.greet__x').addEventListener('click', skip);
  q('.greet__skip').addEventListener('click', skip);
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) skip(); });

  q('.greet__go').addEventListener('click', () => {
    if (!nameEl.value.trim() && !reasonEl.value.trim()) {
      q('.greet__box').classList.add('greet--nudge');
      setTimeout(() => q('.greet__box').classList.remove('greet--nudge'), 420);
      nameEl.focus(); return;
    }
    const who = nameEl.value.trim() || 'friend';
    q('.greet__p2').innerHTML = 'Thanks, ' + esc(who) +
      '! Leave a number and I might actually call to say thanks. Or don&rsquo;t &mdash; I&rsquo;ve got trust issues too.';
    show(2); q('.greet__yes').focus();
  });
  let phoneOpen = false;
  q('.greet__yes').addEventListener('click', () => {
    if (!phoneOpen) { phoneOpen = true; q('.greet__phone').hidden = false; q('.greet__yes').textContent = 'Send it'; phoneEl.focus(); }
    else { send({ phone: phoneEl.value.trim() }); thanks(); }
  });
  q('.greet__no').addEventListener('click', () => { send({ phone: '' }); thanks(); });
  q('.greet__done').addEventListener('click', close);

  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => { wrap.classList.add('greet--in'); nameEl.focus({ preventScroll: true }); });
})();

/* ── Live presence: "● N online" ────────────────────────────────
   A WebSocket to Supabase Realtime — it never touches Netlify's
   functions, so it costs zero Netlify credits. Paste a free Supabase
   project's URL + anon (public) key below and the pill lights up;
   left blank it stays hidden. The anon key is safe to expose. */
const PRESENCE = {   // Supabase project "abdal.in" (ref rrdtnbyrwnxiqdawazmz) — anon key is public/safe
  url: 'https://rrdtnbyrwnxiqdawazmz.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyZHRuYnlyd254aXFkYXdhem16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNjg5ODQsImV4cCI6MjEwMTk0NDk4NH0.ZQVUepONZJ9sLKz24Vp2HiJ4CWUjSB3GTdQfYuaRhI8',
};
(() => {
  const pill = $('.side__online');
  if (!pill || !PRESENCE.url || !PRESENCE.key) return;
  const nEl = pill.querySelector('.side__online__n');
  import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => {
    const sb = createClient(PRESENCE.url, PRESENCE.key, { realtime: { params: { eventsPerSecond: 2 } } });
    const id = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random());
    const ch = sb.channel('online', { config: { presence: { key: id } } });
    const render = () => {
      const n = Object.keys(ch.presenceState()).length;
      nEl.textContent = n;
      pill.hidden = n < 1;
    };
    ch.on('presence', { event: 'sync' }, render)
      .subscribe((s) => { if (s === 'SUBSCRIBED') ch.track({ at: Date.now() }); });
  }).catch(() => {});
})();

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

/* ── Top bar: two announcements take turns ──────────────────────
   The positioning line and the jack-of-all-trades quote cross-fade
   in place. Enhancement only — without JS the first slide stays put.
   Auto-play pauses on hover and stands down for reduced-motion. */
const bar = $('.topbar');
const slides = $$('.topbar__slide', bar || document);
if (bar && slides.length > 1 &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let i = 0, timer = null;
  const show = (n) => {
    slides[i].classList.remove('is-on');
    i = (n + slides.length) % slides.length;
    slides[i].classList.add('is-on');
  };
  const play = () => { timer ??= setInterval(() => show(i + 1), 5000); };
  const stop = () => { clearInterval(timer); timer = null; };
  play();
  bar.addEventListener('mouseenter', stop);
  bar.addEventListener('mouseleave', play);
  document.addEventListener('visibilitychange', () =>
    document.visibilityState === 'visible' ? play() : stop());
}

/* ── A face that follows the cursor (Books & Quotes) ──────────────
   The pupils track the pointer; the whole thing is inert on pages that
   don't carry a .face. rAF-throttled so mousemove stays cheap, and it
   blinks now and then for company (unless reduced-motion is asked). */
const faceSvgs = $$('.face svg');
if (faceSvgs.length) {
  const MAX = 9;                       // pupil travel, in viewBox units
  let mx = innerWidth / 2, my = innerHeight / 2, queued = false;
  const paint = () => {
    queued = false;
    faceSvgs.forEach((svg) => {
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      const vx = (mx - r.left) / r.width * 200;
      const vy = (my - r.top) / r.height * 200;
      svg.querySelectorAll('.face__pupil').forEach((p) => {
        const dx = vx - (+p.dataset.cx), dy = vy - (+p.dataset.cy);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(d, MAX) / d;
        p.setAttribute('transform', `translate(${(dx * k).toFixed(1)} ${(dy * k).toFixed(1)})`);
      });
    });
  };
  addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(paint); }
  }, { passive: true });
  paint();

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const faces = $$('.face');
    const blink = () => {
      faces.forEach((f) => f.classList.add('is-blinking'));
      setTimeout(() => faces.forEach((f) => f.classList.remove('is-blinking')), 150);
      setTimeout(blink, 2800 + Math.random() * 3400);
    };
    setTimeout(blink, 3000);
  }
}

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

/* ── Books shelf: filter, and pull a book out to spin its cover ──── */
const shelf = $('.shelf');
if (shelf) {
  const books = $$('.book', shelf);
  const detail = $('.bdetail');
  const dImg = $('.bdetail__cover img'), dTitle = $('.bdetail__title');
  const dAuthor = $('.bdetail__author'), dCat = $('.bdetail__cat');
  const dStars = $('.bdetail__stars'), dNote = $('.bdetail__note');
  const hint = $('.shelf__hint');
  if (hint) hint.hidden = false;
  let openLi = null;

  const close = () => {
    if (openLi) openLi.classList.remove('is-open');
    openLi = null;
    detail.classList.remove('is-open');
  };
  const open = (li) => {
    if (openLi === li) { close(); return; }
    if (openLi) openLi.classList.remove('is-open');
    openLi = li; li.classList.add('is-open');
    const d = li.dataset, r = Math.max(0, Math.min(5, +d.rating || 0));
    dImg.src = d.cover; dImg.alt = d.title + ' — cover';
    dTitle.textContent = d.title;
    dAuthor.textContent = d.author;
    dCat.textContent = d.catLabel || '';
    if (r) {
      dStars.hidden = false;
      dStars.innerHTML = '★'.repeat(r) + '<span class="off">' + '★'.repeat(5 - r) + '</span>';
      dStars.setAttribute('aria-label', `Rated ${r} of 5`);
    } else { dStars.hidden = true; }
    dNote.textContent = d.note || '';
    dNote.hidden = !d.note;
    detail.classList.remove('is-open'); void detail.offsetWidth; detail.classList.add('is-open');
    detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  shelf.addEventListener('click', (e) => {
    const li = e.target.closest('.book');
    if (li) open(li);
  });
  $('.bdetail__close')?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  $('.bfilter')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.bfilter__btn');
    if (!btn) return;
    const cat = btn.dataset.cat;
    books.forEach((li) => { li.hidden = !(cat === 'all' || li.dataset.cat === cat); });
    $$('.bfilter__btn').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (openLi && openLi.hidden) close();
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

/* ── Writings index: theme filter ───────────────────────────── */
const wfilter = $('.wfilter');
if (wfilter) {
  const rows = $$('.wlist > li');
  const empty = $('.wempty');
  wfilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.wfilter__btn');
    if (!btn) return;
    const cat = btn.dataset.cat;
    let shown = 0;
    rows.forEach((li) => {
      const on = cat === 'all' || li.dataset.cat === cat;
      li.hidden = !on; if (on) shown++;
    });
    $$('.wfilter__btn', wfilter).forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (empty) empty.hidden = shown > 0;
  });
}

/* ── Writings: the gamified, gated long-read ────────────────────
   The essay unlocks a chapter at a time — the next only appears once
   you've read the current one and press Continue. A sticky bar tracks
   progress; the revenue chart animates on arrival; the last chapter
   opens the "what's your take" note, which posts to Netlify Forms.

   Enhancement only, and deliberately fail-safe: the class that HIDES
   un-read chapters ('is-gated') is added here, in JS. So without JS —
   or if anything above ever throws before this runs — nothing is
   gated and the whole piece reads straight through, fully indexable. */
const reader = $('[data-reader]');
if (reader) {
  const chs = $$('.ch:not([data-take])', reader);
  const take = $('.ch[data-take]', reader);
  const fill = $('[data-fill]', reader);
  const countEl = $('[data-count]', reader);
  const total = chs.length || 1;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const paint = () => {
    const on = chs.filter((c) => c.classList.contains('ch--on')).length;
    if (fill) fill.style.width = (on / total * 100) + '%';
    if (countEl) countEl.textContent = String(on).padStart(2, '0');
  };
  const reveal = (el) => {
    if (!el) return;
    el.classList.add('ch--on');
    // a chapter's revenue chart grows once it's on screen; the short timer gives
    // the just-shown bars a frame at height 0 so the transition to full plays.
    const chart = $('.rev', el);
    if (chart) setTimeout(() => chart.classList.add('rev--in'), 60);
    paint();
  };

  reader.classList.add('is-gated');
  reveal(chs[0]);

  reader.addEventListener('click', (e) => {
    const btn = e.target.closest('.ch__go');
    if (!btn) return;
    const cur = btn.closest('.ch');
    const next = btn.hasAttribute('data-finish') ? take : cur.nextElementSibling;
    if (!next) return;
    cur.classList.add('ch--done');
    reveal(next);
    next.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    const h = $('.ch__h, .take__h', next);
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  });

  const tform = $('.take__form', reader);
  if (tform) {
    const st = $('[data-take-status]', reader);
    tform.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!tform.reportValidity()) return;
      const send = $('.take__send', tform);
      if (send) send.disabled = true;
      if (st) { st.dataset.state = ''; st.textContent = 'Sending…'; }
      try {
        const res = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(new FormData(tform)).toString(),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        tform.classList.add('is-sent');
        if (st) { st.dataset.state = 'ok'; st.textContent = 'Got it — thank you. That genuinely makes my day.'; }
      } catch (err) {
        if (send) send.disabled = false;
        if (st) { st.dataset.state = 'error'; st.textContent = 'That didn’t send. Mail me at smahsanabdal@gmail.com?'; }
      }
    });
  }
}

/* ── Year ───────────────────────────────────────────────────── */
const yr = $('#year');
if (yr) yr.textContent = String(new Date().getFullYear());

})();
