/* abdal.in/private — content calendar.
   Talks to /api/calendar, which stores entries in Netlify Blobs. */
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const API = '/api/calendar';
const CHANNELS = {
  linkedin: 'LinkedIn', instagram: 'Instagram', youtube: 'YouTube',
  substack: 'Substack', poetry: 'Poetry', other: 'Other',
};
const STATUSES = ['idea', 'draft', 'ready', 'posted'];
const LABEL = { idea: 'Idea', draft: 'Draft', ready: 'Ready', posted: 'Posted' };

let entries = [];
let filter = 'all';
let editing = null;

/* ── helpers ─────────────────────────────────────────────────── */
const pad = (n) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function parts(iso) {
  // Built from the parts rather than new Date(iso) so a date never shifts a
  // day for someone in a different timezone.
  const [y, m, d] = (iso || '').split('-').map(Number);
  if (!y) return { day: '--', mon: '' };
  const dt = new Date(y, m - 1, d);
  return {
    day: pad(d),
    mon: dt.toLocaleDateString('en-GB', { month: 'short' }),
    dow: dt.toLocaleDateString('en-GB', { weekday: 'short' }),
  };
}

function relative(iso) {
  if (!iso) return '';
  const t = new Date(today()), d = new Date(iso);
  const days = Math.round((d - t) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1 && days < 7) return `In ${days} days`;
  if (days < 0) return `${Math.abs(days)} days ago`;
  return '';
}

function say(text, kind) {
  const el = $('#msg');
  if (!text) { el.hidden = true; return; }
  el.textContent = text;
  el.dataset.kind = kind || 'warn';
  el.hidden = false;
  if (kind === 'ok') setTimeout(() => { el.hidden = true; }, 2600);
}

/* ── data ────────────────────────────────────────────────────── */
async function api(method, body, id) {
  const res = await fetch(API + (id ? `?id=${encodeURIComponent(id)}` : ''), {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    // The private cookie lapsed — send them back to the door.
    location.reload();
    throw new Error('not authorised');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function load() {
  try {
    const { entries: rows } = await api('GET');
    entries = rows || [];
    render();
  } catch (err) {
    $('#headline').textContent = 'Could not load';
    say(err.message, 'warn');
  }
}

/* ── render ──────────────────────────────────────────────────── */
function headline() {
  const n = entries.length;
  if (!n) return 'Nothing scheduled';
  const ahead = entries.filter((e) => e.date >= today() && e.status !== 'posted').length;
  return ahead ? `${ahead} coming up` : `${n} ${n === 1 ? 'entry' : 'entries'}`;
}

function render() {
  $('#headline').textContent = headline();
  const shown = filter === 'all' ? entries : entries.filter((e) => e.status === filter);

  const list = $('#rows');
  list.textContent = '';
  shown.forEach((e) => list.appendChild(rowEl(e)));

  $('#empty').hidden = shown.length !== 0;
  $('#rows').hidden = shown.length === 0;

  board();
}

function rowEl(e) {
  const p = parts(e.date);
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'row';
  b.dataset.status = e.status;
  b.addEventListener('click', () => open(e));

  const rel = relative(e.date);
  b.innerHTML =
    `<span class="row__date">${p.dow || ''}<b>${p.day}</b>${p.mon}</span>` +
    `<span class="row__main">` +
      `<span class="row__title"></span>` +
      `<span class="row__meta">${CHANNELS[e.channel] || 'Other'}${rel ? ' &middot; ' + rel : ''}</span>` +
    `</span>` +
    `<span class="pill" data-s="${e.status}">${LABEL[e.status]}</span>`;
  // Set as text, never markup — a title is user content, not HTML.
  b.querySelector('.row__title').textContent = e.title;
  li.appendChild(b);
  return li;
}

function board() {
  const wrap = $('#board');
  wrap.textContent = '';
  STATUSES.forEach((s) => {
    const rows = entries.filter((e) => e.status === s);
    const col = document.createElement('div');
    const head = document.createElement('p');
    head.className = 'col__head';
    head.innerHTML = `${LABEL[s]} <b>${rows.length}</b>`;
    col.appendChild(head);

    const list = document.createElement('div');
    list.className = 'col__list';
    rows.forEach((e) => {
      const p = parts(e.date);
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'card';
      c.dataset.status = e.status;
      c.addEventListener('click', () => open(e));
      c.innerHTML = `<span class="card__t"></span>` +
        `<span class="card__m">${p.day} ${p.mon} &middot; ${CHANNELS[e.channel] || 'Other'}</span>`;
      c.querySelector('.card__t').textContent = e.title;
      list.appendChild(c);
    });
    col.appendChild(list);
    wrap.appendChild(col);
  });
}

/* ── editor ──────────────────────────────────────────────────── */
function open(entry) {
  editing = entry || null;
  $('#sheet-title').textContent = entry ? 'Edit entry' : 'New entry';
  $('#f-title').value = entry ? entry.title : '';
  $('#f-date').value = entry ? entry.date : today();
  $('#f-channel').value = entry ? entry.channel : 'linkedin';
  $('#f-status').value = entry ? entry.status : 'idea';
  $('#f-notes').value = entry ? (entry.notes || '') : '';
  $('#delete').hidden = !entry;
  $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#f-title').focus(), 30);
}

function close() {
  $('#sheet').hidden = true;
  document.body.style.overflow = '';
  editing = null;
}

async function save(ev) {
  ev.preventDefault();
  const payload = {
    title: $('#f-title').value.trim(),
    date: $('#f-date').value,
    channel: $('#f-channel').value,
    status: $('#f-status').value,
    notes: $('#f-notes').value,
  };
  if (!payload.title) return;

  const btn = $('#save');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    if (editing) await api('PUT', payload, editing.id);
    else await api('POST', payload);
    close();
    await load();
    say(editing ? 'Saved.' : 'Added.', 'ok');
  } catch (err) {
    say(err.message, 'warn');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}

async function remove() {
  if (!editing) return;
  if (!confirm(`Delete “${editing.title}”?`)) return;
  try {
    await api('DELETE', null, editing.id);
    close();
    await load();
    say('Deleted.', 'ok');
  } catch (err) {
    say(err.message, 'warn');
  }
}

/* ── wiring ──────────────────────────────────────────────────── */
$('#new').addEventListener('click', () => open(null));
$('#empty-new').addEventListener('click', () => open(null));
$('#form').addEventListener('submit', save);
$('#delete').addEventListener('click', remove);
$$('[data-close]').forEach((el) => el.addEventListener('click', close));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#sheet').hidden) close();
});

$$('.chip').forEach((c) => c.addEventListener('click', () => {
  $$('.chip').forEach((x) => x.classList.toggle('is-on', x === c));
  filter = c.dataset.status;
  render();
}));

$$('.pv__tab').forEach((t) => t.addEventListener('click', () => {
  $$('.pv__tab').forEach((x) => x.classList.toggle('is-on', x === t));
  const cal = t.dataset.view === 'calendar';
  $('#view-calendar').hidden = !cal;
  $('#view-board').hidden = cal;
  $('#filters').hidden = !cal;
}));

load();
