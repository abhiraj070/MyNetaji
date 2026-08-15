import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

const LANGUAGE_STORAGE_KEY = "mynetaji:language";

/**
 * Reads the active language straight from storage rather than importing it
 * from the React context: this runs inside an axios interceptor, outside the
 * component tree, and storage is the same source of truth the context reads.
 * That avoids a second copy of the value that could drift out of sync.
 */
function activeLanguage() {
  if (typeof window === "undefined") return "en";
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en";
  } catch {
    return "en";
  }
}

/**
 * Attaches the active language to every request in one place, rather than
 * threading a `lang` argument through all eleven call sites.
 *
 * The backend takes `lang` as a query param on GET and a body field on POST,
 * and defaults to English when absent — so this is additive and an endpoint
 * that ignores it is unaffected.
 */
api.interceptors.request.use((config) => {
  const lang = activeLanguage();
  const method = (config.method ?? "get").toLowerCase();

  if (method === "get") {
    config.params = { ...(config.params ?? {}), lang };
  } else if (config.data && typeof config.data === "object") {
    config.data = { ...config.data, lang };
  }
  return config;
});

/**
 * Turns an axios failure into a sentence we're willing to show a user.
 * The FastAPI handlers wrap everything into `{ detail: "..." }`, so we prefer
 * that when present and fall back to the transport-level reason.
 */
export function toFriendlyError(error) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (error.code === "ECONNABORTED") {
      return "The server took too long to answer. Give it another go?";
    }
    if (!error.response) {
      return "Couldn't reach the server. Is the API running?";
    }
    return `Server responded with ${error.response.status}.`;
  }
  return "Something unexpected went wrong.";
}

/**
 * `POST /get-cm-location` — resolves a GPS point to the Chief Minister of
 * whichever state contains it (via the existing parliamentary-constituency
 * polygons, purely to read off `state_key` — no new boundary data). Returns
 * `{ cm }`; `cm` is null when the point falls outside every stored boundary.
 */
export async function fetchCmLocation({ latitude, longitude }) {
  const { data } = await api.post("/get-cm-location", { latitude, longitude });
  return data;
}

/**
 * `POST /get-location` — resolves a GPS point to the Member of Parliament for
 * whichever parliamentary constituency contains it. Returns `{ mp }`; `mp` is
 * null when the point falls outside every stored boundary.
 *
 * The CM equivalent (`/get-cm-location`) reads the same polygons purely for
 * their `state_key`; this one is the constituency lookup those polygons exist
 * for. The row carries the party's manifesto `points`, so an MP arrives with
 * their manifesto already attached — no second request.
 *
 * Called only when the reader actually asks for their MP: this endpoint also
 * increments the app's own visit counter, so firing it speculatively alongside
 * the CM lookup would inflate that number for people who never open the tab.
 */
export async function fetchMpLocation({ latitude, longitude }) {
  const { data } = await api.post("/get-location", { latitude, longitude });
  return data?.mp ?? null;
}

/**
 * `POST /get-mps-by-name` — one MP, by id or by (name, constituency_key).
 * Returns `{ mp_details }`, `null` when nothing matches. The single-record
 * modes are the ones that carry the party manifesto `points`.
 */
export async function fetchMpByName({ id, name, constituencyKey }) {
  const { data } = await api.post("/get-mps-by-name", {
    id: id ?? null,
    name: name ?? null,
    constituency_key: constituencyKey ?? null,
  });
  return data?.mp_details ?? null;
}

/**
 * `POST /get-mps-by-name` with a partial `name` — up to 25 matching MPs,
 * `{ mps: [...] }`.
 *
 * Searched on the server rather than filtered client-side like the CM and
 * ministry pickers: those hold 31 and 85 rows, this one is 543, and the full
 * list is ~190KB and several seconds to build. The rows come back slim (no
 * manifesto), which is all the result list renders — the chosen MP's full
 * record is fetched by id on selection.
 */
export async function searchMps(query) {
  const term = String(query ?? "").trim();
  if (!term) return [];
  const { data } = await api.post("/get-mps-by-name", { name: term });
  return Array.isArray(data?.mps) ? data.mps : [];
}

const LEADERBOARD_PATH = {
  cm: "/get-leaderboard-cm",
  minister: "/get-leaderboard-minister",
  mp: "/get-leaderboard-mp",
};

/**
 * `GET /get-leaderboard-{tier}?limit=&offset=` — rows by slap count and by
 * rose count, one page at a time.
 *
 * The backend filters counts > 0, so an empty response is a genuine "nobody's
 * been voted on yet" signal rather than sparse data. Note `offset` is
 * 1-indexed on this API — `offset=0` is rejected (422) — so the first page
 * must be requested with `offset: 1`, not 0.
 */
export async function fetchLeaderboard(tier, { limit = 10, offset = 1 } = {}) {
  const path = LEADERBOARD_PATH[tier];
  if (!path) throw new Error(`Unknown leaderboard tier: ${tier}`);
  const { data } = await api.get(path, { params: { limit, offset } });
  return {
    slapToppers: Array.isArray(data?.slap_toppers) ? data.slap_toppers : [],
    roseToppers: Array.isArray(data?.rose_toppers) ? data.rose_toppers : [],
  };
}

/**
 * `POST /get-minister` with no name — returns the whole council of ministers.
 *
 * Fetched once so the ministry picker can filter locally: 90 rows is a small
 * payload, and it keeps type-ahead instant with no request per keystroke.
 */
export async function fetchMinisters() {
  const { data } = await api.post("/get-minister", {});
  return Array.isArray(data?.ministers) ? data.ministers : [];
}

const COLUMN_FOR_CHOICE = { slap: "slap_count", rose: "rose_count" };

/**
 * `POST /get-cm` with no `state_key` — returns all 31 chief ministers.
 *
 * Fetched once so the CM picker can filter locally, the same way the ministry
 * picker already does — 31 rows is trivial to hold client-side.
 */
export async function fetchCms() {
  const { data } = await api.post("/get-cm", {});
  return Array.isArray(data?.cms) ? data.cms : [];
}

/**
 * `POST /get-cm` with a `state_key` — the full record for one Chief Minister.
 * Used both to open a leaderboard row as a full profile and by the CM picker
 * when a search result is chosen. Returns `{ cm_details }`, `null` when
 * nothing matches.
 */
export async function fetchCmByStateKey(stateKey) {
  const { data } = await api.post("/get-cm", { state_key: stateKey });
  return data?.cm_details ?? null;
}

/**
 * `PATCH /update-cm-count` — increments a Chief Minister's slap or rose
 * tally by one. The API identifies the row by (state_key, name) — exactly
 * one CM per state, so this is never ambiguous.
 */
export async function castCmVote({ name, stateKey, choice }) {
  const { data } = await api.patch("/update-cm-count", {
    name_field_to_update: name,
    state_key: stateKey,
    field_to_update: COLUMN_FOR_CHOICE[choice],
  });
  return data;
}

/**
 * `PATCH /update-member-count` — increments an MP's slap or rose tally by one,
 * identified by (constituency_key, name).
 *
 * KNOWN BACKEND FAULT (2026-08-08): this endpoint currently fails for every
 * request with `subject table for an INSERT, UPDATE or DELETE expected, got
 * 'mps'` — the handler passes the table *name* as a string where SQLAlchemy
 * needs the Table object. Verified against a deliberately non-matching row, so
 * nothing was written. The call is wired correctly here and will start working
 * the moment the handler is fixed; until then an MP verdict surfaces the same
 * error state any failed vote does. Not fixed here: this is frontend work.
 */
export async function castMpVote({ name, constituencyKey, choice }) {
  const { data } = await api.patch("/update-member-count", {
    table_to_update: "mps",
    name_field_to_update: name,
    constituency_key: constituencyKey,
    field_to_update: COLUMN_FOR_CHOICE[choice],
  });
  return data;
}

/**
 * `POST /feedback` — records app feedback: a reaction plus a short note. The UI
 * carries the reaction lowercase ("slap"/"rose"); the API's enum is uppercase,
 * so we normalise here.
 */
export async function sendFeedback({ reaction, message }) {
  const { data } = await api.post("/feedback", {
    reaction: String(reaction).toUpperCase(),
    message,
  });
  return data;
}

/**
 * `POST /get-ministers-by-name` — the full record for one minister, identified
 * by (name, ministry) — `ministry` must be the row's full original portfolio
 * string, same convention as `castMinistryVote`. Returns `{ minister_details }`,
 * `null` when nothing matches.
 */
export async function fetchMinisterByName({ name, ministry }) {
  const { data } = await api.post("/get-ministers-by-name", { name, ministry });
  return data?.minister_details ?? null;
}

/**
 * `PATCH /update-ministry-count` — the ministers table has its own endpoint.
 *
 * `ministryName` must be the row's full, original `ministry` string (the whole
 * semicolon-joined portfolio), not the single ministry label shown in the UI —
 * the handler matches on it exactly.
 */
export async function castMinistryVote({ name, ministryName, choice }) {
  const { data } = await api.patch("/update-ministry-count", {
    name_field_to_update: name,
    ministry_name: ministryName,
    field_to_update: COLUMN_FOR_CHOICE[choice],
  });
  return data;
}

const HIGHLIGHT_ENDPOINTS = [
  { slot: "slapped", path: "/most-slapped", key: "most_slapped" },
  { slot: "loved", path: "/most-roasted", key: "most_roasted" },
  { slot: "judged", path: "/most-judged", key: "most_judged" },
];

/**
 * `GET /most-slapped`, `/most-roasted`, `/most-judged` — today's leader for
 * each counter, across both tiers.
 *
 * Fetched with `allSettled` rather than `all` so one endpoint being down can
 * only empty its own tile; the other two still render their data. Each slot
 * comes back as `{ data, failed }`, where `data: null` is the server's honest
 * "nobody has been slapped yet today" answer and `failed: true` is a transport
 * or server error. The two stay distinct because they read very differently to
 * a user.
 *
 * A row carries `tier` ("cm" | "minister") and a normalised `count`. The name
 * is under `name` for a Chief Minister and `minister_name` for a Union
 * Minister, matching the rest of this API.
 */
export async function fetchHighlights() {
  const settled = await Promise.allSettled(
    HIGHLIGHT_ENDPOINTS.map(({ path }) => api.get(path)),
  );

  return HIGHLIGHT_ENDPOINTS.reduce((slots, { slot, key }, index) => {
    const result = settled[index];
    slots[slot] =
      result.status === "fulfilled"
        ? { data: result.value.data?.[key] ?? null, failed: false }
        : { data: null, failed: true };
    return slots;
  }, {});
}

/**
 * `GET /tweets` — recent X posts about one representative. The backend looks up
 * their stored `x_username`, queries the X API's recent-search endpoint, and
 * returns the raw v2 payload under `{ top_tweets }`.
 *
 * The endpoint identifies the subject by `(table, name)`, carried in the
 * request body — matching the backend's `TweetRequest`. `table` is the physical
 * table name, mapped here from the app-level `tier`.
 */
export async function fetchTweets({ tier, name }) {
  const table = tier === "cm" ? "chief_ministers" : "ministers";
  const { data } = await api.post("/tweets", { table, name });
  const payload = data?.top_tweets ?? {};

  // The endpoint forwards the X API's own body verbatim with a 200, so an X-side
  // failure (402 credits depleted, 401 auth, 429 rate limit) arrives as a
  // *payload*, not an HTTP error. Detect that shape — an X "problem" object or
  // `errors[]` with no `data`/`meta` — and throw, so the UI shows "couldn't
  // load" with Retry rather than a misleading "no posts yet". A genuinely empty
  // result (`data: []` or a `meta` with zero count) falls through to normalise.
  const hasData = Array.isArray(payload.data);
  const hasMeta = Boolean(payload.meta);
  const looksLikeError =
    !hasData &&
    !hasMeta &&
    (payload.status >= 400 ||
      typeof payload.type === "string" ||
      Array.isArray(payload.errors));
  if (looksLikeError) {
    throw new Error(payload.detail || payload.title || "Couldn't reach X");
  }

  return normalizeTweets(payload);
}

/** `[{id, ...}]` → `{ [id]: {...} }` for O(1) expansion lookups. */
function indexBy(list, key) {
  const map = {};
  for (const item of list ?? []) map[item[key]] = item;
  return map;
}

function normalizeAuthor(user) {
  if (!user) return null;
  return {
    name: user.name ?? null,
    username: user.username ?? null,
    // The `_normal` variant X returns is a 48px thumbnail; dropping the suffix
    // gives the full-resolution original for a crisp avatar.
    avatar: user.profile_image_url?.replace("_normal", "") ?? null,
    verified: Boolean(user.verified),
    verifiedType: user.verified_type ?? null,
  };
}

function normalizeMedia(m) {
  return {
    key: m.media_key,
    type: m.type, // "photo" | "video" | "animated_gif"
    url: m.url ?? m.preview_image_url ?? null,
    preview: m.preview_image_url ?? m.url ?? null,
    alt: m.alt_text ?? "",
    width: m.width ?? null,
    height: m.height ?? null,
  };
}

/**
 * Flattens X's `data` + `includes` (users/media/referenced tweets) into a
 * self-contained tweet object the UI can render without cross-referencing.
 * Every expansion is optional: a payload without `includes` (the backend
 * currently requests none) degrades to text-only tweets rather than throwing.
 */
export function normalizeTweets(payload) {
  const raw = payload ?? {};
  const users = indexBy(raw.includes?.users, "id");
  const media = indexBy(raw.includes?.media, "media_key");
  const tweets = indexBy(raw.includes?.tweets, "id");
  const list = Array.isArray(raw.data) ? raw.data : [];

  const resolveMedia = (keys) =>
    (keys ?? []).map((k) => media[k]).filter(Boolean).map(normalizeMedia);

  return list.map((t) => {
    const metrics = t.public_metrics ?? {};
    const quotedRef = (t.referenced_tweets ?? []).find(
      (r) => r.type === "quoted",
    );
    const quotedRaw = quotedRef ? tweets[quotedRef.id] : null;

    return {
      id: t.id,
      text: t.text ?? "",
      createdAt: t.created_at ?? null,
      author: normalizeAuthor(users[t.author_id]),
      urls: t.entities?.urls ?? [],
      media: resolveMedia(t.attachments?.media_keys),
      metrics: {
        replies: metrics.reply_count ?? 0,
        // X's repost affordance folds retweets and quotes into one count.
        reposts: (metrics.retweet_count ?? 0) + (metrics.quote_count ?? 0),
        likes: metrics.like_count ?? 0,
        bookmarks: metrics.bookmark_count ?? 0,
        views: metrics.impression_count ?? 0,
      },
      quoted: quotedRaw
        ? {
            id: quotedRaw.id,
            text: quotedRaw.text ?? "",
            createdAt: quotedRaw.created_at ?? null,
            author: normalizeAuthor(users[quotedRaw.author_id]),
            urls: quotedRaw.entities?.urls ?? [],
            media: resolveMedia(quotedRaw.attachments?.media_keys),
          }
        : null,
    };
  });
}

/**
 * The identity payload both journey endpoints take, matching the backend's
 * `GetAssetsRequest`. The task specifies name + designation; `party` is also
 * declared required on that Pydantic model, so omitting it fails validation
 * with a 422 before the handler runs — it is sent for that reason alone.
 *
 * `designation` mirrors the label the profile sheet already shows: a minister's
 * rank title, a Chief Minister's designation.
 */
function identityPayload(subject) {
  // `designation` is matched against `politicians.subject_type` on the backend,
  // so it carries that column's values rather than a human-readable title —
  // sending "Chief Minister of Maharashtra" matches nothing and returns an
  // empty list rather than an error.
  //
  // An MP must send its own value, not fall through to "cm": the table is
  // matched on (canonical_name, subject_type, party), and a shared name would
  // otherwise hand an MP a Chief Minister's timeline. Today `politicians` holds
  // no MP rows at all, so this correctly returns nothing rather than something
  // belonging to someone else.
  const SUBJECT_TYPE = { minister: "union_minister", mp: "mp", cm: "cm" };
  const designation = SUBJECT_TYPE[subject?.tier] ?? "cm";

  return {
    // The ENGLISH name, never the displayed one. `politicians.canonical_name`
    // is English, so sending the Hindi label a Hindi user sees would match no
    // row and silently return an empty timeline / asset sheet. Endpoints carry
    // `name_en` / `minister_name_en` for exactly this.
    name:
      subject?.name_en ?? subject?.minister_name_en ?? subject?.name ?? "",
    designation,
    party: subject?.party ?? "",
  };
}

/** Rupee figures arrive as numbers or numeric strings; `null` must survive. */
function toAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * `POST /get-timeline` — the politician's career milestones, newest first.
 * Returns `{ timeline: [...] }` with snake_case rows; normalised here into the
 * shape `ProfileJourneyTab` renders.
 *
 * The endpoint returns no constituency, so `place` is deliberately absent —
 * the timeline card already hides that line when it has nothing to show.
 */
export async function fetchTimeline(subject) {
  const { data } = await api.post("/get-timeline", identityPayload(subject));
  const rows = Array.isArray(data?.timeline) ? data.timeline : [];

  return rows
    .map((row) => ({
      year: row.year ?? null,
      startDate: row.start_date ?? null,
      endDate: row.end_date ?? null,
      role: row.position_title ?? null,
      rank: row.position_rank ?? null,
      party: row.party ?? null,
      entryMode: row.entry_mode ?? null,
      isCurrent: Boolean(row.is_current),
      // The column is `sources` (plural) and holds an array of {url, label}.
      sources: Array.isArray(row.sources) ? row.sources.filter((s) => s?.url) : [],
      // Present only for milestones that carry an affidavit — roughly half do,
      // so `null` here is normal and means "no declaration for this term",
      // not a failure.
      totalAssets: toAmount(row.total_assets),
    }))
    .filter((entry) => entry.role)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

/**
 * `POST /get-mp-timeline` — one MP's political journey, by their `mps.id`.
 *
 * Normalised into the exact shape `fetchTimeline` returns, so `ProfileJourneyTab`
 * renders an MP's journey with the same component, the same timeline and the
 * same cards it already draws for Chief Ministers and Union Ministers.
 *
 * Two fields are legitimately absent for an MP and stay null rather than being
 * faked: `party` (the milestone table deliberately holds no copy of the MP's
 * details) and `totalAssets` (affidavit data, which belongs to the assets
 * source, not to a career milestone).
 */
export async function fetchMpTimeline(id) {
  const { data } = await api.post("/get-mp-timeline", { id });
  const rows = Array.isArray(data?.timeline) ? data.timeline : [];

  return rows.map((row) => ({
    year: row.start_date ? Number(String(row.start_date).slice(0, 4)) : null,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    role: row.position_title ?? null,
    rank: row.position_rank ?? null,
    electionType: row.election_type ?? null,
    entryMode: row.entry_mode ?? null,
    isCurrent: Boolean(row.is_current),
    // The table stores one verified URL per milestone; the timeline's source
    // note takes a list.
    sources: row.source ? [{ url: row.source }] : [],
    party: null,
    totalAssets: null,
  }));
}

/**
 * `POST /get-assets` — every declared-wealth record on file, as
 * `{ top_assets: [...] }`. The Declared Assets sheet shows one breakdown, so
 * the most recent record wins; the rest are returned for callers that want the
 * progression.
 */
export async function fetchAssets(subject) {
  const { data } = await api.post("/get-assets", identityPayload(subject));
  const rows = Array.isArray(data?.top_assets) ? data.top_assets : [];

  return rows
    .map((row) => ({
      electionYear: row.election_year ?? null,
      electionName: row.election_name ?? null,
      sourceUrl: row.source_url ?? null,
      totalAssets: toAmount(row.total_assets),
      totalLiabilities: toAmount(row.total_liabilities),
      movableAssets: toAmount(row.movable_assets),
      immovableAssets: toAmount(row.immovable_assets),
      cash: toAmount(row.cash),
      bankDeposits: toAmount(row.bank_deposits),
      sharesInvestments: toAmount(row.shares_investments),
      mutualFunds: toAmount(row.mutual_funds),
      jewellery: toAmount(row.jewellery),
      vehicles: toAmount(row.vehicles),
      residentialProperty: toAmount(row.residential_property),
      commercialProperty: toAmount(row.commercial_property),
      agriculturalLand: toAmount(row.agricultural_land),
      otherAssets: toAmount(row.other_assets),
    }))
    .sort((a, b) => (b.electionYear ?? 0) - (a.electionYear ?? 0));
}

/**
 * `GET /get-news?lang=…` — the day's political stories, as cached by the
 * six-hourly scheduler. `lang` rides along on the axios interceptor.
 *
 * The endpoint hands back whatever sits in Redis, so this tolerates both an
 * already-decoded array and a JSON string that was never parsed, and maps the
 * provider's field names onto the four things the brief actually renders.
 * Anything without a headline is dropped rather than shown as an empty card.
 */
export async function fetchNews() {
  const { data } = await api.get("/get-news");

  const raw = Array.isArray(data) ? data : data?.news;
  let items = raw;
  if (typeof raw === "string") {
    try {
      items = JSON.parse(raw);
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items)) return [];

  return items
    .map((article, index) => {
      const described = trimTruncationArtifact(clean(article?.description));
      const contented = trimTruncationArtifact(clean(article?.content));
      const description = described.text;
      const content = contented.text;
      // GNews nests the newsroom in an object rather than sending the flat
      // `source_name`/`source_id` pair the previous provider used.
      const source = article?.source;
      return {
        id: article?.id ?? article?.url ?? `story-${index}`,
        title: clean(article?.title),
        // The preview is deliberately the short field; the detail sheet
        // prefers the longer one and falls back to the same text.
        preview: description || content,
        summary: content || description,
        source: clean(source?.name),
        // GNews sends no per-newsroom icon, so the card's lettered plate is
        // the permanent path rather than a fallback.
        sourceIcon: null,
        image: url(article?.image),
        // Kept as the raw string: the card formats it against the reader's
        // language, which this layer knows nothing about.
        publishedAt: clean(article?.publishedAt) || null,
        // Neither field exists on a GNews article — it sends no category, and
        // its only country is the newsroom's own two-letter code, which would
        // read as "IN" on every card in a feed that is Indian by definition.
        // Left null so the card's chip slot stays empty rather than labelled
        // with something the provider never said.
        category: null,
        country: null,
        url: url(article?.url),
        // The story was cut short by the provider's plan, not by us. The
        // reader panel says so in words and points at the publisher rather
        // than letting the text simply stop mid-sentence.
        isPartial: described.truncated || contented.truncated,
      };
    })
    .filter((story) => story.title);
}

/** Trims a possibly-absent string down to something safe to render. */
function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Free-tier feeds pad truncated bodies with their own bookkeeping — GNews
 * signs off with `... [2772 chars]`, NewsAPI with `[+1234 chars]`. That is
 * metadata about the response, not part of the story, and a reader should
 * never see it.
 *
 * Stripped here at the boundary so no component has to know the provider's
 * habits, and reported back as `truncated` so the reader panel can say the
 * story continues at the publisher instead of just stopping mid-sentence.
 * Whatever dangling punctuation the cut leaves behind is replaced with a
 * single ellipsis, so the text ends deliberately rather than raggedly.
 */
const TRUNCATION_ARTIFACT = /[\s.…]*\[\s*\+?\s*[\d,]+\s*chars?\s*\]\s*$/i;

function trimTruncationArtifact(value) {
  if (!TRUNCATION_ARTIFACT.test(value)) return { text: value, truncated: false };
  const body = value.replace(TRUNCATION_ARTIFACT, "").replace(/[\s.,;:—–-]+$/u, "");
  return { text: body ? `${body}…` : "", truncated: true };
}

/** A URL we're willing to hand to `src`/`href`, or null. */
function url(value) {
  const trimmed = clean(value);
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/**
 * The metric envelope every headline figure on the Performance tab arrives in:
 * `{ value, source, derived, formula }`. Normalised here so a component never
 * has to guess whether a number came back bare or wrapped, and so "no data" is
 * a single shape rather than three (`null`, `undefined`, `{value: null}`).
 *
 * `derived` marks a figure this project calculated rather than read from the
 * source, and `formula` says how — both are shown in the metric's source
 * affordance, so a reader can always tell a published number from a computed
 * one.
 */
function toMetric(raw) {
  if (!raw || typeof raw !== "object") return null;
  const value = toAmount(raw.value);
  if (value === null && !raw.source) return null;
  return {
    value,
    derived: Boolean(raw.derived),
    formula: raw.formula ?? null,
    source: raw.source?.name
      ? {
          name: raw.source.name,
          url: raw.source.url ?? null,
          asOf: raw.source.asOf ?? null,
        }
      : null,
  };
}

function toComparisons(list) {
  return (Array.isArray(list) ? list : []).map((row) => ({
    scope: row.scope ?? null,
    scopeValue: row.scopeValue ?? null,
    average: toAmount(row.average),
    periodStart: row.periodStart ?? null,
    periodEnd: row.periodEnd ?? null,
    source: row.source?.name
      ? { name: row.source.name, url: row.source.url ?? null }
      : null,
  }));
}

function toPage(raw, mapRow) {
  const page = raw ?? {};
  return {
    items: (Array.isArray(page.items) ? page.items : []).map(mapRow),
    page: page.page ?? 1,
    pageSize: page.pageSize ?? 20,
    total: page.total ?? 0,
    hasMore: Boolean(page.hasMore),
  };
}

/** One MPLADS work, as the project list renders it. */
function toWork(row) {
  return {
    id: row.id,
    name: row.work_name ?? null,
    description: row.description ?? null,
    sector: row.sector ?? null,
    subSector: row.sub_sector ?? null,
    // MPLADS publishes nothing finer than the implementing district, so
    // `location` is usually null and the district stands in for it.
    location: row.location ?? row.district ?? null,
    district: row.district ?? null,
    constituency: row.constituency ?? null,
    state: row.state ?? null,
    implementingAgency: row.implementing_agency ?? null,
    recommendedAmount: toAmount(row.recommended_amount),
    sanctionedAmount: toAmount(row.sanctioned_amount),
    expenditureAmount: toAmount(row.expenditure_amount),
    remainingAmount: toAmount(row.remaining_amount),
    // The scheme's own wording, kept for display; `statusGroup` is the
    // three-way reduction the filter uses.
    status: row.work_status ?? null,
    statusGroup: row.status_group ?? null,
    recommendedDate: row.recommended_date ?? null,
    sanctionDate: row.sanction_date ?? null,
    startDate: row.work_start_date ?? null,
    completionDate: row.completion_date ?? null,
    financialYear: row.financial_year ?? null,
    source: row.source_name
      ? { name: row.source_name, url: row.source_url ?? null }
      : null,
  };
}

function toQuestion(row) {
  return {
    id: row.id,
    askedOn: row.asked_on ?? null,
    title: row.title ?? null,
    type: row.question_type ?? null,
    ministry: row.ministry ?? null,
    session: row.session_name ?? null,
    source: row.source_name
      ? { name: row.source_name, url: row.source_url ?? null }
      : null,
  };
}

function toDebate(row) {
  return {
    id: row.id,
    date: row.debate_date ?? null,
    title: row.title ?? null,
    type: row.debate_type ?? null,
    isBill: Boolean(row.is_bill),
    isPrivateMemberBill: Boolean(row.is_private_member_bill),
    session: row.session_name ?? null,
    source: row.source_name
      ? { name: row.source_name, url: row.source_url ?? null }
      : null,
  };
}

/**
 * `POST /get-mp-performance` — the whole Performance tab for one MP, by
 * `mps.id`: MPLADS development work, parliamentary activity, promises and the
 * affidavit facts the other tabs already show.
 *
 * Every section can legitimately be absent. An MP whose seat the MPLADS portal
 * has not attributed has no `development.funds`, and one whose page PRS has not
 * published has no `parliament`. Those come back null and the tab says so —
 * they are not errors, and nothing here substitutes a zero for them.
 */
export async function fetchMpPerformance(id) {
  const { data } = await api.post("/get-mp-performance", { id });
  const payload = data?.performance;
  if (!payload) return null;

  const development = payload.development ?? {};
  const funds = development.funds ?? null;
  const summary = development.summary ?? {};
  const parliament = payload.parliament ?? {};
  const attendance = parliament.attendance ?? {};
  const questions = parliament.questions ?? {};
  const debates = parliament.debates ?? {};
  const bills = parliament.bills ?? {};
  const committees = parliament.committees ?? {};
  const promises = payload.promises ?? {};
  const transparency = payload.transparency ?? null;

  return {
    mp: payload.mp ?? null,
    development: {
      funds: funds
        ? {
            period: funds.period ?? null,
            financialYear: funds.financialYear ?? null,
            tenure: funds.tenure ?? null,
            allocated: toMetric(funds.allocated),
            released: toMetric(funds.released),
            sanctioned: toMetric(funds.sanctioned),
            utilised: toMetric(funds.utilised),
            recommended: toMetric(funds.recommended),
            unspent: toMetric(funds.unspent),
            utilisationRate: toMetric(funds.utilisationRate),
            note: funds.note ?? null,
          }
        : null,
      summary: {
        totalWorks: summary.totalWorks ?? 0,
        completed: summary.completed ?? 0,
        ongoing: summary.ongoing ?? 0,
        pending: summary.pending ?? 0,
        unclassified: summary.unclassified ?? 0,
        completionRate: toMetric(summary.completionRate),
        recommendedAmount: toAmount(summary.recommendedAmount),
        sanctionedAmount: toAmount(summary.sanctionedAmount),
        expenditureAmount: toAmount(summary.expenditureAmount),
        note: summary.note ?? null,
      },
      works: toPage(development.works, toWork),
    },
    parliament: {
      term: parliament.term ?? null,
      house: parliament.house ?? null,
      periodStart: parliament.periodStart ?? null,
      periodEnd: parliament.periodEnd ?? null,
      attendance: {
        overall: toMetric(attendance.overall),
        comparisons: toComparisons(attendance.comparisons),
        sessions: (Array.isArray(attendance.sessions) ? attendance.sessions : [])
          .map((row) => ({
            name: row.session_name ?? null,
            order: row.session_order ?? null,
            attendance: toAmount(row.attendance_pct),
            questions: row.questions_count ?? null,
            debates: row.debates_count ?? null,
            source: row.source_name
              ? { name: row.source_name, url: row.source_url ?? null }
              : null,
          }))
          .filter((row) => row.name),
      },
      questions: {
        total: toMetric(questions.total),
        starred: toMetric(questions.starred),
        unstarred: toMetric(questions.unstarred),
        comparisons: toComparisons(questions.comparisons),
        items: toPage(questions.items, toQuestion),
      },
      debates: {
        total: toMetric(debates.total),
        comparisons: toComparisons(debates.comparisons),
        items: toPage(debates.items, toDebate),
      },
      bills: {
        privateMemberBills: toMetric(bills.privateMemberBills),
        participated: toMetric(bills.participated),
        comparisons: toComparisons(bills.comparisons),
      },
      committees: {
        count: toMetric(committees.count),
        items: (Array.isArray(committees.items) ? committees.items : []).map(
          (row) => ({
            name: row.committee_name ?? null,
            type: row.committee_type ?? null,
            role: row.role ?? null,
            startDate: row.start_date ?? null,
            endDate: row.end_date ?? null,
            isCurrent: Boolean(row.is_current),
            source: row.source_name
              ? { name: row.source_name, url: row.source_url ?? null }
              : null,
          }),
        ),
      },
    },
    promises: {
      summary: {
        total: promises.summary?.total ?? 0,
        completed: promises.summary?.completed ?? 0,
        inProgress: promises.summary?.inProgress ?? 0,
        notStarted: promises.summary?.notStarted ?? 0,
        unverified: promises.summary?.unverified ?? 0,
      },
      items: (Array.isArray(promises.items) ? promises.items : []).map((row) => ({
        id: row.id,
        text: row.promise_text ?? null,
        category: row.category ?? null,
        status: row.status ?? null,
        madeOn: row.made_on ?? null,
        context: row.context ?? null,
        targetDate: row.target_date ?? null,
        evidence: row.evidence ?? null,
        evidenceUrl: row.evidence_url ?? null,
        verifiedOn: row.verified_on ?? null,
        verifiedBy: row.verified_by ?? null,
        source: row.source_name
          ? { name: row.source_name, url: row.source_url ?? null }
          : null,
      })),
    },
    transparency: transparency
      ? {
          criminalCases: transparency.criminalCases ?? null,
          education: transparency.education ?? null,
          declaredAssets: toAmount(transparency.declaredAssets),
          declaredLiabilities: toAmount(transparency.declaredLiabilities),
          movableAssets: toAmount(transparency.movableAssets),
          immovableAssets: toAmount(transparency.immovableAssets),
          electionYear: transparency.electionYear ?? null,
          electionName: transparency.electionName ?? null,
          source: transparency.source?.name ? transparency.source : null,
          note: transparency.note ?? null,
        }
      : null,
  };
}

/**
 * `POST /get-mp-performance-works` — one page of MPLADS works, optionally
 * narrowed to `completed` / `ongoing` / `pending`.
 *
 * Paged on the server because a single MP can carry several hundred: the tab
 * opens with the first page from `fetchMpPerformance` and calls this for the
 * rest and for every filter change.
 */
export async function fetchMpPerformanceWorks({ id, status, page = 1, pageSize = 20 }) {
  const { data } = await api.post("/get-mp-performance-works", {
    id,
    status: status ?? null,
    page,
    page_size: pageSize,
  });
  return toPage(data?.works, toWork);
}

/** `POST /get-mp-performance-questions` — one page of questions asked. */
export async function fetchMpPerformanceQuestions({
  id,
  questionType,
  page = 1,
  pageSize = 20,
}) {
  const { data } = await api.post("/get-mp-performance-questions", {
    id,
    question_type: questionType ?? null,
    page,
    page_size: pageSize,
  });
  return toPage(data?.questions, toQuestion);
}

/** `POST /get-mp-performance-debates` — one page of debates participated in. */
export async function fetchMpPerformanceDebates({ id, page = 1, pageSize = 20 }) {
  const { data } = await api.post("/get-mp-performance-debates", {
    id,
    page,
    page_size: pageSize,
  });
  return toPage(data?.debates, toDebate);
}
