/**
 * Server-only data helpers for the Open Graph image routes and the homepage's
 * `generateMetadata`. Never import this from a client component — it talks to
 * the backend directly and relies on Next's server `fetch` cache.
 *
 * Every call is cached with `next: { revalidate }` so a burst of crawler hits
 * (WhatsApp, X, LinkedIn, …) on the same share URL collapses to one backend
 * query rather than one per fetch.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiPost(path, body, revalidate = 3600) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

/** Full record for one Union Minister, by name. Null when nothing matches. */
export async function getMinisterByName(name) {
  if (!name) return null;
  const { minister_details } = await apiPost("/get-minister", { name });
  return minister_details ?? null;
}

/** Full record for one Chief Minister, by `state_key`. Null when nothing matches. */
export async function getCmByState(stateKey) {
  if (!stateKey) return null;
  const { cm_details } = await apiPost("/get-cm", { state_key: stateKey });
  return cm_details ?? null;
}

/**
 * A short, readable portfolio for a minister's card — the first fragment of the
 * semicolon-joined `ministry` string with the boilerplate "Minister of …"
 * prefixes stripped, mirroring the in-app leaderboard's `formatSecondary`.
 */
export function ministerPortfolio(ministry) {
  if (!ministry) return "";
  const first = String(ministry).split(";")[0].trim();
  const cleaned = first
    .replace(/^Minister of State \(Independent Charge\) of the Ministry of\s*/i, "")
    .replace(/^Minister of State in the Ministry of\s*/i, "")
    .replace(/^Minister of State\s*/i, "")
    .replace(/^Minister of\s*/i, "")
    .trim();
  return cleaned || first;
}
