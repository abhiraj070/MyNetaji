import { ImageResponse } from "next/og";

import { nameUsesAngryVerdict } from "@/lib/angryVerdict";
import { getCmByState, getMinisterByName, ministerPortfolio } from "@/lib/og-data";

import {
  CACHE_STATIC,
  OG_SIZE,
  Wordmark,
  fetchImageDataUrl,
  loadFonts,
  toJpegResponse,
} from "./_shared";

export const runtime = "nodejs";

// Charcoal/graphite system — warmer and more "consumer app" than the old navy.
/*
 * The card is off-white now, so every colour that existed to read against a
 * dark ground has been re-pointed at the app's own light-theme tokens
 * (`globals.css`): ink for the name, muted for the place, a hairline of ink
 * for edges. The amber CTA and the warm accents stay exactly as they were —
 * they read on both grounds, and they are what makes the card recognisable.
 */
const C = {
  ink: "#171633",
  place: "#67668C",
  amber: "#FFB020",
  orange: "#FF7A1A",
  teal: "#0E9C8B",
  frame: "#FFFFFF",
  hairline: "rgba(23,22,51,0.08)",
  ctaText: "#241606",
};

// Subtle film grain. A full-size grayscale fractal-noise SVG inlined as a data
// URL — resvg (behind ImageResponse) rasterises feTurbulence, so this reads as
// real texture rather than a flat tint. Kept faint via the overlay's opacity.
const NOISE_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>";
const NOISE_URL = `data:image/svg+xml;base64,${Buffer.from(NOISE_SVG).toString("base64")}`;

/**
 * `GET /api/og?name=&sub=&place=&photo=` — a dedicated, premium 1200×630 social
 * card for one politician. Reads only its query string (no DB query): the
 * homepage's `generateMetadata` resolves the politician once and passes the
 * display fields through here, so a crawler hit renders straight from the URL.
 *
 * Visual language is "consumer app, not campaign poster": charcoal atmosphere,
 * warm ambient light, an elevated portrait as the hero, and a pill-button CTA
 * as the second focal point. Layout (logo + info left, portrait right) is fixed.
 *
 * Satori note: every gradient value stays on ONE line — Satori silently fails
 * to parse gradients that contain line breaks.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get("tier") || "cm";

  // Preferred short form (`?tier=cm&state=GOA` / `?tier=minister&name=X`): look
  // the record up here — cached, and de-duped with the same fetch `generateMetadata`
  // already made — so the og:image URL stays tiny and scraper-safe. Falls back to
  // explicit `name/sub/place/photo` params for any older, long-form links.
  let name = searchParams.get("name") || "";
  let sub = searchParams.get("sub") || "";
  let place = searchParams.get("place") || "";
  let photo = searchParams.get("photo") || "";

  if (!photo) {
    try {
      if (tier === "cm") {
        const c = await getCmByState(searchParams.get("state"));
        if (c) {
          name = c.name;
          sub = c.designation || "Chief Minister";
          place = c.state || "";
          photo = c.photo_url || "";
        }
      } else if (tier === "minister") {
        const m = await getMinisterByName(searchParams.get("name"));
        if (m) {
          name = m.minister_name;
          sub = "Union Minister";
          place = ministerPortfolio(m.ministry);
          photo = m.photo_url || "";
        }
      }
    } catch {
      /* fall through — the crash-guard below still returns a valid image */
    }
  }

  name = (name || "This leader").slice(0, 60);
  sub = sub.slice(0, 48);
  place = place.slice(0, 48);

  const [fonts, img] = await Promise.all([loadFonts(), fetchImageDataUrl(photo)]);

  // Long names would overflow the fixed-width text column — step the display
  // size down so the name always fits on at most two lines.
  const nameSize = name.length > 24 ? 48 : name.length > 16 ? 58 : 68;

  const element = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Nunito",
          padding: "54px 58px",
          backgroundColor: "#F7F8FD",
          backgroundImage:
            "radial-gradient(circle at 82% 40%, rgba(255,150,40,0.16) 0%, transparent 44%), radial-gradient(circle at 10% 88%, rgba(31,181,163,0.10) 0%, transparent 40%), radial-gradient(circle at 50% -12%, rgba(255,255,255,0.9) 0%, transparent 42%), linear-gradient(140deg, #FFFFFF 0%, #F7F8FD 46%, #F1F3FB 72%, #FFFFFF 100%)",
        }}
      >
        {/* blurred colored blobs — ambient depth, never brighter than the face */}
        <div style={{ position: "absolute", top: -110, right: -60, width: 340, height: 340, borderRadius: "50%", backgroundColor: "rgba(255,140,30,0.14)", filter: "blur(85px)" }} />
        <div style={{ position: "absolute", bottom: -120, left: -70, width: 300, height: 300, borderRadius: "50%", backgroundColor: "rgba(31,181,163,0.10)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", top: 150, right: 150, width: 380, height: 380, borderRadius: "50%", backgroundColor: "rgba(255,110,20,0.12)", filter: "blur(95px)" }} />

        {/* soft vignette (behind content so the hero never dims) */}
        <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 200px 70px rgba(23,22,51,0.05)" }} />

        {/* subtle grain */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={NOISE_URL} width={1200} height={630} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.03 }} />

        {/* LEFT — logo + info on an ultra-subtle translucent surface */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 560,
            height: "100%",
            padding: "44px",
            borderRadius: 34,
            backgroundColor: "rgba(255,255,255,0.72)",
            border: `1px solid ${C.hairline}`,
            boxShadow: "0 1px 0 rgba(255,255,255,0.9) inset",
          }}
        >
          <Wordmark size={34} />

          {sub ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                marginTop: 28,
                padding: "10px 22px",
                borderRadius: 999,
                backgroundColor: "rgba(34,195,174,0.14)",
                border: "1px solid rgba(14,156,139,0.45)",
                color: C.teal,
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 0.4,
              }}
            >
              {sub}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontFamily: "Fredoka",
              fontSize: nameSize,
              color: C.ink,
              lineHeight: 1.02,
            }}
          >
            {name}
          </div>

          {place ? (
            <div style={{ display: "flex", marginTop: 14, fontSize: 28, color: C.place }}>
              {place}
            </div>
          ) : null}

          {/* CTA — a real clickable-looking pill, the second focal point */}
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              alignItems: "center",
              marginTop: 32,
              padding: "16px 28px",
              borderRadius: 999,
              backgroundImage: "linear-gradient(135deg, #FFC24A 0%, #FF8A1E 55%, #FF6A1A 100%)",
              color: C.ctaText,
              fontSize: 26,
              fontWeight: 800,
              boxShadow: "0 14px 34px rgba(255,138,30,0.38), inset 0 1px 0 rgba(255,255,255,0.45)",
            }}
          >
            {nameUsesAngryVerdict(name)
              ? "🌹 Rose or 😠 Angry? You decide."
              : "🌹 Rose or 👋 Slap? You decide."}
          </div>
        </div>

        {/* RIGHT — elevated portrait hero */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", position: "relative" }}>
          {/* glow behind the portrait */}
          <div style={{ position: "absolute", width: 430, height: 430, borderRadius: "50%", backgroundImage: "radial-gradient(circle, rgba(255,168,40,0.42) 0%, transparent 68%)", filter: "blur(30px)" }} />

          {/* layered accent card */}
          <div style={{ position: "absolute", width: 470, height: 480, borderRadius: 42, backgroundImage: "linear-gradient(135deg, #FFB020 0%, #FF7A1A 100%)", transform: "rotate(2deg) translate(14px, 16px)", opacity: 0.9 }} />

          {/* framed image */}
          <div
            style={{
              display: "flex",
              width: 470,
              height: 480,
              borderRadius: 42,
              overflow: "hidden",
              position: "relative",
              border: `8px solid ${C.frame}`,
              backgroundColor: "#E8EAF4",
              boxShadow: `0 44px 90px -22px rgba(23,22,51,0.28), 0 0 0 1px ${C.hairline}`,
            }}
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} width={470} height={480} alt="" style={{ width: 470, height: 480, objectFit: "cover" }} />
            ) : (
              <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 150 }}>
                🧑‍⚖️
              </div>
            )}

            {/* elegant top highlight */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 150, backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)" }} />
          </div>
        </div>
      </div>
  );

  try {
    const image = new ImageResponse(element, { ...OG_SIZE, fonts });
    return toJpegResponse(image, CACHE_STATIC);
  } catch {
    // Never 500 for a crawler — fall back to the static poster so a preview
    // still renders on every platform instead of breaking the embed.
    return Response.redirect(new URL("/opengraph-image.jpg", request.url), 302);
  }
}
