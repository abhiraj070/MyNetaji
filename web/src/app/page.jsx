import { Suspense } from "react";

import { getCmByState, getMinisterByName } from "@/lib/og-data";

import { Home } from "./home";

const SITE = "Meet Your Leader";

/**
 * Builds the metadata block for a politician share card. `image` is a relative
 * path; `metadataBase` (set in `layout.jsx`) turns
 * it into the absolute HTTPS URL crawlers require. Includes the OpenGraph
 * `type`/`siteName` explicitly so the page's block doesn't drop them.
 */
function buildMeta({ title, description, image, url, alt }) {
  // Declare `type` explicitly: the `/api/og` URL has no file extension, so this
  // tells crawlers it's a JPEG without them having to sniff the URL. `alt`
  // rounds out the tags Twitter/X and Discord look for.
  const altText = alt || title;
  const ogImage = { url: image, width: 1200, height: 630, alt: altText, type: "image/jpeg" };
  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: SITE,
      url,
      title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: altText }],
    },
  };
}

/**
 * Bump when the card's artwork changes.
 *
 * The image URL is otherwise stable for a given politician, which is what lets
 * scrapers cache it — and what makes a redesign invisible: WhatsApp, X and any
 * CDN in between keep serving the picture they already have for that exact
 * URL, for days. Changing the URL is the only thing they all treat as a new
 * image. `/api/og` ignores the parameter; it exists purely as a cache key.
 */
const OG_CARD_VERSION = "2";

/**
 * Short, clean OG image URL — just the identity (`tier` + state/name). The
 * `/api/og` route looks the record up itself (cached), so the URL stays under
 * ~60 chars instead of embedding a long, double-encoded photo URL that strict
 * scrapers (Reddit especially) truncate or reject.
 */
function ogImageUrl(tier, id) {
  const p = new URLSearchParams({ tier });
  p.set(tier === "cm" ? "state" : "name", id);
  p.set("v", OG_CARD_VERSION);
  return `/api/og?${p.toString()}`;
}

/**
 * Per-share metadata for crawlers. The app deep-links via `/?share=…`, so a
 * shared politician link is server-rendered here with its own
 * `og:image`/`twitter:image` instead of the global poster.
 *
 * A shared leaderboard link takes no branch here on purpose: it used to point
 * at a generated top-3 card, and now falls through to the same
 * `opengraph-image.jpg` poster every other link uses. The share URL itself is
 * unchanged.
 *
 * Reading `searchParams` opts this route into dynamic rendering — deliberate,
 * and cheap: the default (no `share`) returns `{}` immediately so the root
 * `opengraph-image.jpg` poster still applies. Any missing photo or lookup
 * failure also falls back to that poster, so a preview is never broken.
 */
export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const share = sp.share;

  try {
    if (share === "minister" && sp.name) {
      const m = await getMinisterByName(sp.name);
      if (m?.photo_url) {
        const image = ogImageUrl("minister", m.minister_name);
        return buildMeta({
          title: `${m.minister_name} — Union Minister | ${SITE}`,
          description: `Know ${m.minister_name} beyond the headlines — their history, work, promises and political record, all in one place.`,
          image,
          url: `/?share=minister&name=${encodeURIComponent(m.minister_name)}`,
        });
      }
    } else if (share === "cm" && sp.state) {
      const c = await getCmByState(sp.state);
      if (c?.photo_url) {
        const image = ogImageUrl("cm", c.state_key);
        return buildMeta({
          title: `${c.name} — ${c.designation || "Chief Minister"} · ${c.state} | ${SITE}`,
          description: `Know ${c.name} beyond the headlines — their biography, work, promises and political record, all in one place.`,
          image,
          url: `/?share=cm&state=${encodeURIComponent(c.state_key)}`,
        });
      }
    }
  } catch {
    // fall through to the default poster
  }

  return {};
}

/**
 * A server shell whose only job is to render the client app.
 *
 * `Home` reads the `?share=` deep link through `useSearchParams()`, which
 * requires a Suspense boundary: everything inside it renders on the client.
 * (This route is now dynamically rendered because `generateMetadata` above
 * reads `searchParams` to build per-share previews — see that comment.)
 */
export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
