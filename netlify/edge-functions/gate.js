/**
 * Site-wide access gate.
 *
 * This runs at Netlify's edge, before any file is served — so a visitor
 * without the password never receives the page at all. That is the whole
 * point: a password checked in browser JavaScript would still ship every
 * page to every visitor, and this repository is public, so the password
 * itself would be readable on GitHub. Neither is a lock.
 *
 * The password lives in the SITE_PASSWORD environment variable, set with
 * `netlify env:set`, and is never committed.
 */

const COOKIE = "abdal_gate";
const PRIVATE_COOKIE = "abdal_private";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** The private workspace and its data API, locked by a second password. */
const isPrivate = (p) => p === "/private" || p.startsWith("/private/") || p.startsWith("/api/");

/** "Request access" opens the visitor's own mail app with a note already
 *  written to Saiyed — no server, no third party, works on every device. */
const REQUEST_MAILTO =
  "mailto:smahsanabdal@gmail.com" +
  "?subject=" + encodeURIComponent("Access request — abdal.in") +
  "&body=" + encodeURIComponent(
    "Hi Saiyed,\n\nI’d like access to abdal.in.\n\nWho I am: \nWhy I’m asking: \n");

// Let the share-card image through unauthenticated. Link previews are built
// by WhatsApp/LinkedIn servers that cannot log in, and the image gives away
// nothing the gate page doesn't already say.
const PUBLIC_PATHS = new Set(["/assets/img/og.jpg", "/favicon.ico", "/robots.txt"]);

async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compare without leaking, through timing, how much of the value matched. */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async (request, context) => {
  const url = new URL(request.url);

  if (PUBLIC_PATHS.has(url.pathname)) return;

  const password = Netlify.env.get("SITE_PASSWORD");
  // No password configured means the gate cannot do its job. A lock that
  // opens when it is confused is not a lock, so this fails closed and says
  // exactly what is wrong.
  if (!password) return new Response(misconfigured(), { status: 503, headers: htmlHeaders() });

  const token = await sha256(password + "::abdal.in");
  const jar = request.headers.get("cookie") || "";
  const cookieIs = (name, want) => {
    const hit = jar.split(/;\s*/).find((c) => c.startsWith(name + "="));
    return !!hit && safeEqual(hit.slice(name.length + 1), want);
  };

  // Only a form submission can be a gate answer. The workspace API posts
  // JSON, and reading its body here would consume it before it ever
  // reached the function.
  const ct = request.headers.get("content-type") || "";
  const isForm =
    request.method === "POST" &&
    (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data"));
  const form = isForm ? await request.formData() : null;
  const stage = form ? String(form.get("stage") || "") : "";

  const redirect = (name, value, to) => {
    const dest = to.startsWith("/") && !to.startsWith("//") ? to : "/";
    return new Response(null, {
      status: 303,
      headers: {
        location: dest,
        "set-cookie":
          `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`,
      },
    });
  };

  // ── First lock: the site itself ──────────────────────────────────────
  if (!cookieIs(COOKIE, token)) {
    if (stage === "site") {
      if (safeEqual(String(form.get("password") || ""), password)) {
        return redirect(COOKIE, token, String(form.get("next") || "/"));
      }
      return new Response(gate(url.pathname, true), { status: 401, headers: htmlHeaders() });
    }
    return new Response(gate(url.pathname + url.search, false), {
      status: 401,
      headers: htmlHeaders(),
    });
  }

  // ── Second lock: the private workspace, a different password ─────────
  if (isPrivate(url.pathname)) {
    const secret = Netlify.env.get("PRIVATE_PASSWORD");
    if (!secret) {
      return new Response(misconfigured("PRIVATE_PASSWORD"), {
        status: 503,
        headers: htmlHeaders(),
      });
    }
    const pToken = await sha256(secret + "::abdal.in/private");
    if (cookieIs(PRIVATE_COOKIE, pToken)) return;

    if (stage === "private") {
      if (safeEqual(String(form.get("password") || ""), secret)) {
        return redirect(PRIVATE_COOKIE, pToken, String(form.get("next") || "/private"));
      }
      return new Response(privateGate(url.pathname, true), {
        status: 401,
        headers: htmlHeaders(),
      });
    }
    // An API call without the second cookie gets JSON, not a login page —
    // the workspace's own fetch() would otherwise choke on HTML.
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "not authorised" }), {
        status: 401,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }
    return new Response(privateGate(url.pathname + url.search, false), {
      status: 401,
      headers: htmlHeaders(),
    });
  }
};

function htmlHeaders() {
  return {
    "content-type": "text/html; charset=utf-8",
    // Never let a CDN or browser keep the gate — or a logged-in page — around.
    "cache-control": "no-store, must-revalidate",
    "x-robots-tag": "noindex",
  };
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function shell(title, body) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0B0B0B">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%230B0B0B'/%3E%3Ctext x='50' y='68' font-family='Georgia,serif' font-style='italic' font-size='52' fill='%23fff' text-anchor='middle'%3ESA%3C/text%3E%3C/svg%3E">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Saiyed Abdal">
<meta property="og:url" content="https://abdal.in/">
<meta property="og:title" content="Saiyed Abdal">
<meta property="og:description" content="AVP, Founder&rsquo;s Office at Frido. Poet, Sufi, Toastmaster &amp; car enthusiast.">
<meta property="og:image" content="https://abdal.in/assets/img/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://abdal.in/assets/img/og.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Inter:wght@400;500&family=Caveat:wght@600&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{
    min-height:100svh;display:grid;place-items:center;padding:2rem;
    font-family:'Inter',system-ui,sans-serif;
    background:#0B0B0B;color:#fff;-webkit-font-smoothing:antialiased;
    position:relative;overflow:hidden;
  }
  /* the same faint rotated squares the share card uses */
  body::before,body::after{
    content:'';position:absolute;border:1px solid rgba(247,216,66,.07);
    transform:rotate(45deg);pointer-events:none;
  }
  body::before{width:620px;height:620px;right:-190px;bottom:-240px}
  body::after{width:380px;height:380px;left:-150px;top:-160px}
  main{width:min(100%,420px);position:relative;z-index:1;text-align:center}
  .mark{font-family:'Caveat',cursive;font-size:2.6rem;color:#fff;display:inline-block;transform:rotate(-5deg)}
  .rule{width:56px;height:4px;background:#F7D842;margin:2rem auto 1.6rem}
  h1{
    font-family:'Oswald','Arial Narrow',sans-serif;
    font-size:clamp(1.9rem,6vw,2.7rem);font-weight:600;
    letter-spacing:.02em;text-transform:uppercase;line-height:1.06;
  }
  h1 em{font-style:normal;color:#F7D842}
  p.lede{color:#9E9E9E;margin-top:1.1rem;line-height:1.7;font-size:.97rem}
  form{margin-top:2.2rem;display:flex;flex-direction:column;gap:.7rem}
  label{
    font-family:'Oswald',sans-serif;font-size:.7rem;font-weight:500;
    letter-spacing:.2em;text-transform:uppercase;color:#7A7A7A;
  }
  input{
    font:inherit;font-size:1rem;padding:.95rem 1.1rem;width:100%;
    background:#151515;border:1px solid #2A2A2A;color:#fff;border-radius:0;
    /* centred to match the rest of the column — the dots would otherwise
       start hard left under centred type, which is what reads as crooked */
    text-align:center;letter-spacing:.08em;
    transition:border-color .2s;
  }
  input::placeholder{letter-spacing:.24em;color:#4A4A4A}
  input:focus{outline:2px solid #F7D842;outline-offset:1px;border-color:#F7D842}
  button{
    font-family:'Oswald',sans-serif;font-size:.82rem;font-weight:500;
    letter-spacing:.18em;text-transform:uppercase;cursor:pointer;
    padding:1rem 2rem;margin-top:.5rem;
    background:#F7D842;color:#0B0B0B;border:0;
    transition:background .2s,transform .2s;
  }
  button:hover{background:#FFE976;transform:translateY(-2px)}
  .err{
    margin-top:1.2rem;padding:.85rem 1rem;
    border-top:3px solid #F7D842;background:rgba(247,216,66,.07);
    color:#E4E4E4;font-size:.9rem;line-height:1.6;
  }
  /* Secondary to the yellow submit: an outline that fills yellow on hover. */
  .request{
    display:flex;align-items:center;justify-content:center;gap:.55rem;
    width:100%;margin-top:1rem;
    font-family:'Oswald',sans-serif;font-size:.82rem;font-weight:500;
    letter-spacing:.18em;text-transform:uppercase;text-decoration:none;
    padding:.95rem 2rem;
    background:transparent;color:#fff;border:1px solid #2E2E2E;
    transition:border-color .2s,color .2s,transform .2s;
  }
  .request:hover{border-color:#F7D842;color:#F7D842;transform:translateY(-2px)}
  .request svg{width:15px;height:15px;flex:none}
  .foot{margin-top:2.4rem;color:#5E5E5E;font-size:.82rem;line-height:1.7}
  .foot a{color:#9E9E9E}
</style>
</head><body><main>${body}</main></body></html>`;
}

function gate(next, wrong) {
  return shell(
    "Saiyed Abdal",
    `<span class="mark">Abdal</span>
    <div class="rule"></div>
    <h1>Do you have <em>access</em>?</h1>
    <p class="lede">This site is private for now. If you have been given a password,
       enter it below and it will stay open on this device for thirty days.</p>
    ${wrong ? '<p class="err">That password is not right. Have another go &mdash; check for capitals and stray spaces.</p>' : ""}
    <form method="POST" autocomplete="on">
      <label for="p">Password</label>
      <input id="p" name="password" type="password" required autofocus
             autocomplete="current-password" spellcheck="false" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;">
      <input type="hidden" name="next" value="${esc(next)}">
      <input type="hidden" name="stage" value="site">
      <button type="submit">Let me in</button>
    </form>
    <a class="request" href="${REQUEST_MAILTO}">
      Request access
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M3 7l9 6 9-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
    <p class="foot">The button opens your email with a note to me already written &mdash;
       just add a line and send.</p>`
  );
}

/** The inner door. Deliberately unlike the outer one, so it is obvious at a
 *  glance that this is the second lock and not the first one asking twice. */
function privateGate(next, wrong) {
  return shell(
    "Private",
    `<span class="mark">Abdal</span>
    <div class="rule"></div>
    <h1>The <em>private</em> room</h1>
    <p class="lede">This part is not the website. It is the workspace behind it,
       and it takes a different password.</p>
    ${wrong ? '<p class="err">Not that one. This door takes the private password, not the site password.</p>' : ""}
    <form method="POST" autocomplete="on">
      <label for="p">Private password</label>
      <input id="p" name="password" type="password" required autofocus
             autocomplete="current-password" spellcheck="false" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;">
      <input type="hidden" name="next" value="${esc(next)}">
      <input type="hidden" name="stage" value="private">
      <button type="submit">Open</button>
    </form>
    <p class="foot"><a href="/">&larr; Back to the site</a></p>`
  );
}

function misconfigured(which = "SITE_PASSWORD") {
  return shell(
    "Saiyed Abdal",
    `<span class="mark">Abdal</span>
    <div class="rule"></div>
    <h1>Locked</h1>
    <p class="lede">This gate has no password configured, so it is holding the
       door shut rather than letting everyone through.</p>
    <p class="err">Set <strong>${esc(which)}</strong> in the Netlify project
       environment variables, then redeploy.</p>`
  );
}

export const config = { path: "/*" };
