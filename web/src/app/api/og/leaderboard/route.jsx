import { ImageResponse } from "next/og";

import { ANGRY_GLYPH, nameUsesAngryVerdict } from "@/lib/angryVerdict";
import { getLeaderboardTop } from "@/lib/og-data";

import {
  BRAND,
  CACHE_LIVE,
  OG_SIZE,
  Wordmark,
  fetchImageDataUrl,
  loadFonts,
  toJpegResponse,
} from "../_shared";

export const runtime = "nodejs";

const MEDALS = ["🥇", "🥈", "🥉"];

function clamp(text, n) {
  const s = String(text || "");
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/**
 * `GET /api/og/leaderboard?tier=cm|minister&board=slap|rose` — a live podium of
 * the current top 3, generated dynamically so a shared leaderboard preview
 * reflects the latest standings. One cached top-3 query (see `getLeaderboardTop`)
 * feeds the render; a short CDN cache keeps it fresh without hammering the API.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get("tier") === "minister" ? "minister" : "cm";
  const board = searchParams.get("board") === "rose" ? "rose" : "slap";

  const fonts = await loadFonts();
  let top = [];
  try {
    top = await getLeaderboardTop(tier, board, 3);
  } catch {
    top = [];
  }
  const photos = await Promise.all(top.map((r) => fetchImageDataUrl(r.photo_url)));

  const boardEmoji = board === "rose" ? "🌹" : "👋";
  const boardLabel = board === "rose" ? "Most Rosed" : "Most Slapped";
  const tierLabel = tier === "minister" ? "Union Ministers" : "Chief Ministers";
  const countKey = board === "rose" ? "rose_count" : "slap_count";

  const element = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Nunito",
          padding: "36px 56px",
          backgroundColor: BRAND.navy,
          backgroundImage: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.navy2} 60%, ${BRAND.navy} 100%)`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Wordmark size={28} />
          <div
            style={{
              display: "flex",
              padding: "8px 18px",
              borderRadius: 999,
              border: `2px solid ${BRAND.teal}`,
              color: BRAND.cream,
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            {tierLabel}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "Fredoka",
            fontSize: 50,
            lineHeight: 1.1,
            color: BRAND.cream,
            marginTop: 8,
          }}
        >
          {boardEmoji} {boardLabel}
        </div>

        {/* Podium */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            gap: 24,
            marginTop: 22,
          }}
        >
          {top.slice(0, 3).map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 330,
                padding: "16px 16px 20px",
                borderRadius: 28,
                backgroundColor: "rgba(247,239,224,0.07)",
                border: "1px solid rgba(247,239,224,0.16)",
              }}
            >
              <div style={{ display: "flex", fontSize: 40 }}>{MEDALS[i]}</div>
              <div
                style={{
                  display: "flex",
                  width: 140,
                  height: 140,
                  borderRadius: 999,
                  overflow: "hidden",
                  border: `5px solid ${BRAND.cream}`,
                  backgroundColor: BRAND.navy2,
                  marginTop: 8,
                }}
              >
                {photos[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photos[i]} width={140} height={140} style={{ width: 140, height: 140, objectFit: "cover" }} alt="" />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      height: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 60,
                    }}
                  >
                    🧑‍⚖️
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  fontFamily: "Fredoka",
                  fontSize: 26,
                  color: BRAND.cream,
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                {clamp(row.name, 20)}
              </div>
              {row.place ? (
                <div style={{ display: "flex", fontSize: 19, color: BRAND.muted, marginTop: 4 }}>
                  {clamp(row.place, 24)}
                </div>
              ) : null}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                  fontFamily: "Fredoka",
                  fontSize: 32,
                  color: board === "rose" ? BRAND.green : BRAND.coral,
                }}
              >
                {board === "slap" && nameUsesAngryVerdict(row.name ?? row.minister_name)
                  ? ANGRY_GLYPH
                  : boardEmoji}{" "}
                {Number(row[countKey] ?? 0).toLocaleString("en-IN")}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "auto",
            paddingTop: 16,
            fontSize: 23,
            fontWeight: 800,
            color: BRAND.saffron,
          }}
        >
          Cast your verdict → mynetaji.up.railway.app
        </div>
      </div>
  );

  try {
    const image = new ImageResponse(element, { ...OG_SIZE, fonts });
    return toJpegResponse(image, CACHE_LIVE);
  } catch {
    // Never 500 for a crawler — fall back to the static poster.
    return Response.redirect(new URL("/opengraph-image.jpg", request.url), 302);
  }
}
