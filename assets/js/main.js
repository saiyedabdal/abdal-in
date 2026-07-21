/* abdal.in — behaviour */
(() => {
'use strict';

const $ = (s, c = document) => c.querySelector(s);

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
const items = [...document.querySelectorAll('.quote, .story__col, .door, .foot__head')];
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

/* ── Video lightbox ─────────────────────────────────────────── */
const lb      = $('#lightbox');
const lbFrame = $('#lbFrame');
const VIDEO   = 'OgKw0qpt930';
let lastFocus = null;

function openLb() {
  lastFocus = document.activeElement;
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${VIDEO}?autoplay=1&rel=0&modestbranding=1`;
  f.title = 'Saiyed Abdal — Global Youth Summit application video';
  f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  f.allowFullscreen = true;
  lbFrame.replaceChildren(f);
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#lbClose')?.focus();
}

function closeLb() {
  lb.hidden = true;
  lbFrame.replaceChildren();
  document.body.style.overflow = '';
  lastFocus?.focus();
}

$('#playTalk')?.addEventListener('click', openLb);
$('#lbClose')?.addEventListener('click', closeLb);
lb?.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb && !lb.hidden) closeLb(); });

/* ── Year ───────────────────────────────────────────────────── */
const yr = $('#year');
if (yr) yr.textContent = String(new Date().getFullYear());

})();
