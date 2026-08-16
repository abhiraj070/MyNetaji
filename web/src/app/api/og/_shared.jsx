import { readFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

/**
 * Shared building blocks for the OG image route (`/api/og`).
 * Underscore-prefixed so the App Router never treats it as a route.
 */

/**
 * `ImageResponse` only emits PNG, and a photo-plus-grain card weighs ~1 MB — too
 * heavy for WhatsApp (and slow for any crawler to fetch). Re-encode to JPEG so
 * previews land around ~200 KB while looking identical. `sharp` ships with Next.
 */
export async function toJpegResponse(imageResponse, cacheControl) {
  const png = Buffer.from(await imageResponse.arrayBuffer());
  const jpeg = await sharp(png)
    .flatten({ background: "#0E0F13" })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
  return new Response(jpeg, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": cacheControl,
    },
  });
}

/** The app's palette, matching `globals.css` — keeps social cards on-brand. */
export const BRAND = {
  // The card is light, so the wordmark is set in the app's ink.
  ink: "#171633",
  navy: "#0e1a3a",
  navy2: "#182a54",
  cream: "#f7efe0",
  saffron: "#ffb020",
  coral: "#ff5b47",
  teal: "#1fb5a3",
  green: "#39c07a",
  muted: "rgba(247,239,224,0.82)",
};

export const OG_SIZE = { width: 1200, height: 630 };

// Cache: politician cards are stable, so long; leaderboard moves, so short.
export const CACHE_STATIC =
  "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";

let fontsCache = null;

/** Fredoka (display) + Nunito (body) — the same faces the app uses. */
export async function loadFonts() {
  if (fontsCache) return fontsCache;
  const dir = join(process.cwd(), "src/app/api/og/_fonts");
  const [fredoka, nunitoXBold, nunito] = await Promise.all([
    readFile(join(dir, "Fredoka-SemiBold.ttf")),
    readFile(join(dir, "Nunito-ExtraBold.ttf")),
    readFile(join(dir, "Nunito-Regular.ttf")),
  ]);
  fontsCache = [
    { name: "Fredoka", data: fredoka, weight: 600, style: "normal" },
    { name: "Nunito", data: nunitoXBold, weight: 800, style: "normal" },
    { name: "Nunito", data: nunito, weight: 400, style: "normal" },
  ];
  return fontsCache;
}

/**
 * Fetch a remote politician photo and inline it as a data URL, so Satori never
 * makes its own (unguarded, un-timed-out) request. Returns null on any failure
 * — the caller then renders a branded placeholder instead of throwing.
 */
export async function fetchImageDataUrl(url) {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 5_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Fredoka wordmark used on every card. */
export function Wordmark({ size = 30 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: size + 4 }}>👋</div>
      <div style={{ display: "flex", fontFamily: "Fredoka", fontSize: size, color: BRAND.ink }}>
        <span>My</span>
        <span style={{ color: BRAND.saffron }}>Neta</span>
        <span>ji</span>
      </div>
    </div>
  );
}
