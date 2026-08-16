"use client";

import { useState } from "react";
import { monogramOf } from "@/lib/text";

/**
 * Rectangular 3:4 portrait with a serif monogram fallback.
 *
 * Deliberately a plain <img> rather than next/image: `photo_url` is scraped
 * from upload.wikimedia.org, myneta.info and sansad.in, so the host set isn't
 * fixed enough to allowlist. `no-referrer` matters because MyNeta and
 * sansad.in refuse hotlinked requests that carry an outside Referer.
 */
export function Portrait({ src, name, className = "" }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={`aspect-[3/4] shrink-0 overflow-hidden rounded-photo bg-surface-2 shadow-card ring-1 ring-ink/5 ${className}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- see note above
        <img
          src={src}
          alt={`Portrait of ${name}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover object-top"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-full items-center justify-center font-display text-3xl font-bold text-faint"
        >
          {monogramOf(name)}
        </span>
      )}
    </div>
  );
}
