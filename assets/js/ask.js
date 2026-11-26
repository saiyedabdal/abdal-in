/* Ask Abdal — floating chat with the AI version of Saiyed Abdal.
   Text in/out everywhere; voice in (SpeechRecognition) and voice out
   (speechSynthesis) where the browser supports them. No dependencies. */
(() => {
  'use strict';
  if (window.__askAbdal || location.pathname.startsWith('/private')) return;
  window.__askAbdal = true;

  const API = '/api/ask';
  const KEY = 'ask-abdal-v1';
  const HELLO = "Hi, I'm the AI version of Abdal. Ask me about my work at Frido, how I built inside sales and retail, Frido Care, AI agents, my poetry or the UPSC years.";
  const CHIPS = [
    'What do you do at Frido?',
    'How did you build inside sales from zero?',
    'What is Frido Care?',
    'How do you use AI at work?',
    'Tell me about your poetry',
  ];

  const ic = {
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    spk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // Styles
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = '/assets/css/ask.css';
  document.head.appendChild(css);

  // Markup
  const fab = document.createElement('button');
  fab.className = 'askfab'; fab.type = 'button';
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.innerHTML = '<span class="askfab__dot" aria-hidden="true"></span>Ask Abdal';

  const box = document.createElement('section');
  box.className = 'ask'; box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Ask Abdal, AI chat');
  box.innerHTML = `
    <header class="ask__top">
      <span class="ask__mark" aria-hidden="true">Abdal</span>
      <div class="ask__id"><div class="ask__name">Ask Abdal</div><div class="ask__sub">AI version &middot; trained on my public work</div></div>
      <button class="ask__ic" type="button" data-act="voice" aria-pressed="false" aria-label="Read answers aloud" title="Read answers aloud">${ic.spk}</button>
      <button class="ask__ic" type="button" data-act="reset" aria-label="New conversation" title="New conversation">${ic.reset}</button>
      <button class="ask__ic" type="button" data-act="close" aria-label="Close">${ic.close}</button>
    </header>
    <div class="ask__log" aria-live="polite"></div>
    <div class="ask__chips"></div>
    <form class="ask__form">
      <button class="ask__btn ask__btn--mic" type="button" data-act="mic" aria-label="Speak your question" title="Speak">${ic.mic}</button>
      <textarea class="ask__in" rows="1" maxlength="1200" placeholder="Ask me anything…" aria-label="Your question"></textarea>
      <button class="ask__btn" type="submit" aria-label="Send">${ic.send}</button>
    </form>
    <p class="ask__fine">An AI, so it can be wrong. For anything real, email smahsanabdal@gmail.com.</p>`;
  document.body.append(fab, box);

  const $ = (s) => box.querySelector(s);
  const log = $('.ask__log'), chips = $('.ask__chips'), form = $('.ask__form'), input = $('.ask__in');
  const sendBtn = form.querySelector('[type="submit"]'), micBtn = $('[data-act="mic"]'), voiceBtn = $('[data-act="voice"]');

  // State (sessionStorage is a convenience; it may be unavailable)
  let msgs = [];
  let speakOn = false;
  let busy = false;
  try { const s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (s) { msgs = s.msgs || []; speakOn = !!s.speak; } } catch {}
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ msgs: msgs.slice(-20), speak: speakOn })); } catch {} };

  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const linkify = (s) => esc(s).replace(/(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/\b([\w.+-]+@[\w-]+\.[\w.]+)\b/g, '<a href="mailto:$1">$1</a>');

  function bubble(role, text, cls = '') {
    const el = document.createElement('div');
    el.className = `ask__msg ask__msg--${role === 'user' ? 'me' : 'bot'} ${cls}`.trim();
    el.innerHTML = linkify(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function render() {
    log.innerHTML = '';
    bubble('assistant', HELLO);
    msgs.forEach((m) => bubble(m.role, m.content));
    chips.innerHTML = '';
    if (!msgs.length) CHIPS.forEach((q) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ask__chip'; b.textContent = q;
      b.addEventListener('click', () => ask(q));
      chips.appendChild(b);
    });
    voiceBtn.setAttribute('aria-pressed', String(speakOn));
  }

  // Voice out
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  if (!synth) voiceBtn.hidden = true;
  function pickVoice(text) {
    const vs = synth.getVoices();
    const hindi = /[ऀ-ॿ]/.test(text);
    const want = hindi ? ['hi-IN'] : ['en-IN', 'en-GB', 'en-US'];
    for (const w of want) { const v = vs.find((v) => v.lang === w || v.lang.replace('_', '-') === w); if (v) return v; }
    return null;
  }
  function speak(text) {
    if (!synth || !speakOn) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/https?:\/\/\S+/g, 'the link'));
    const v = pickVoice(text); if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = 1.02;
    synth.speak(u);
  }

  // Voice in
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false;
  if (!SR) micBtn.hidden = true;
  function toggleMic() {
    if (!SR) return;
    if (listening) { rec && rec.stop(); return; }
    rec = new SR();
    rec.lang = (navigator.language || 'en-IN').startsWith('hi') ? 'hi-IN' : 'en-IN';
    rec.interimResults = true; rec.maxAlternatives = 1;
    let finalText = '';
    rec.onstart = () => { listening = true; micBtn.dataset.on = 'true'; input.placeholder = 'Listening…'; };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      input.value = (finalText + interim).trim();
    };
    rec.onerror = () => {};
    rec.onend = () => {
      listening = false; micBtn.dataset.on = 'false'; input.placeholder = 'Ask me anything…';
      const q = input.value.trim();
      if (q) { if (synth && !speakOn) { speakOn = true; voiceBtn.setAttribute('aria-pressed', 'true'); save(); } ask(q); }
    };
    try { rec.start(); } catch {}
  }

  // Ask
  async function ask(q) {
    q = (q || '').trim();
    if (!q || busy) return;
    busy = true; sendBtn.disabled = true; input.value = ''; autosize();
    chips.innerHTML = '';
    msgs.push({ role: 'user', content: q.slice(0, 1200) });
    bubble('user', q);
    const el = bubble('assistant', '');
    el.innerHTML = '<span class="ask__typing" aria-label="Thinking"><i></i><i></i><i></i></span>';
    let out = '';
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: msgs.slice(-12) }),
      });
      if (res.status === 429) throw new Error("You're asking quickly. Give me a minute, then try again.");
      if (!res.ok || !res.body) throw new Error((await res.text().catch(() => '')) || 'I couldn’t answer just now. Please try again.');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        out += dec.decode(value, { stream: true });
        el.innerHTML = linkify(out);
        log.scrollTop = log.scrollHeight;
      }
      out = out.trim() || 'Sorry, I lost my train of thought. Ask me again?';
      el.innerHTML = linkify(out);
      msgs.push({ role: 'assistant', content: out });
      save();
      speak(out);
    } catch (err) {
      msgs.pop();
      el.classList.add('ask__msg--err');
      el.textContent = err.message.length < 200 ? err.message : 'I couldn’t answer just now. Please try again.';
    } finally {
      busy = false; sendBtn.disabled = false; input.focus();
    }
  }

  // Wiring
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; }
  function open() { box.hidden = false; fab.hidden = true; render(); setTimeout(() => input.focus(), 50); }
  function close() { box.hidden = true; fab.hidden = false; if (synth) synth.cancel(); if (listening && rec) rec.stop(); fab.focus(); }

  fab.addEventListener('click', open);
  document.addEventListener('click', (e) => { if (e.target.closest('[data-ask-open]')) { e.preventDefault(); open(); } });
  box.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'close') close();
    if (act === 'reset') { msgs = []; save(); if (synth) synth.cancel(); render(); input.focus(); }
    if (act === 'voice') { speakOn = !speakOn; if (!speakOn && synth) synth.cancel(); voiceBtn.setAttribute('aria-pressed', String(speakOn)); save(); }
    if (act === 'mic') toggleMic();
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) close(); });
  if (location.hash === '#ask') open();
})();
