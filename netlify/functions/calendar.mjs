/**
 * The private workspace's data API.
 *
 * Entries live in a Netlify Blobs store, which is part of the existing
 * project — no third party holds this, and nothing here is ever rendered
 * on the public site.
 *
 * This checks the private cookie itself rather than trusting the edge gate
 * in front of it. Two independent checks means a future routing mistake
 * that lets a request past the gate still cannot read or write anything.
 */
import { getStore } from "@netlify/blobs";

const COOKIE = "abdal_private";
const KEY = "calendar";

const STATUSES = ["idea", "draft", "ready", "posted"];
const CHANNELS = ["linkedin", "instagram", "youtube", "substack", "poetry", "other"];

async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/** Keep only fields we know, so nothing unexpected is ever persisted. */
function clean(input, existing = {}) {
  const s = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const date = s(input.date, 10);
  return {
    id: existing.id,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : existing.date || "",
    channel: CHANNELS.includes(input.channel) ? input.channel : existing.channel || "other",
    status: STATUSES.includes(input.status) ? input.status : existing.status || "idea",
    title: s(input.title, 200) || existing.title || "",
    notes: s(input.notes, 4000),
    updated: new Date().toISOString(),
  };
}

export default async (request, context) => {
  const secret = Netlify.env.get("PRIVATE_PASSWORD");
  if (!secret) return json({ error: "PRIVATE_PASSWORD is not configured" }, 503);

  const token = await sha256(secret + "::abdal.in/private");
  const jar = request.headers.get("cookie") || "";
  const hit = jar.split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!hit || !safeEqual(hit.slice(COOKIE.length + 1), token)) {
    return json({ error: "not authorised" }, 401);
  }

  const store = getStore({ name: "private", consistency: "strong" });
  const load = async () => (await store.get(KEY, { type: "json" })) || [];
  const save = (rows) => store.setJSON(KEY, rows);

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      const rows = await load();
      rows.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      return json({ entries: rows });
    }

    if (request.method === "POST") {
      const body = await request.json();
      const rows = await load();
      const entry = clean(body);
      entry.id = crypto.randomUUID();
      if (!entry.title) return json({ error: "A title is required" }, 400);
      rows.push(entry);
      await save(rows);
      return json({ entry }, 201);
    }

    if (request.method === "PUT") {
      const body = await request.json();
      const rows = await load();
      const i = rows.findIndex((r) => r.id === id);
      if (i === -1) return json({ error: "No such entry" }, 404);
      rows[i] = clean(body, rows[i]);
      await save(rows);
      return json({ entry: rows[i] });
    }

    if (request.method === "DELETE") {
      const rows = await load();
      const next = rows.filter((r) => r.id !== id);
      if (next.length === rows.length) return json({ error: "No such entry" }, 404);
      await save(next);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) }, 500);
  }
};

export const config = { path: "/api/calendar" };
