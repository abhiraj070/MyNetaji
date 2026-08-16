"use client";

import { toFriendlyError } from "@/lib/api";

/**
 * "That didn't load" — the bordered line a panel shows in place of content
 * when its request failed.
 *
 * The same five lines of markup were written out at five call sites: the
 * leaderboard, search, the journey and performance tabs, and the assets
 * sheet. Each turned an axios failure into a sentence the same way, so the
 * translation lives here too and the caller passes the error it has.
 *
 * Deliberately not a full error screen. These sit inside a panel that keeps
 * its heading and its way out, so the reader can retry or leave without the
 * page changing under them — `StatusScreens` is what covers a whole route
 * failing.
 */
export function ErrorNote({ error, className = "" }) {
  return (
    <p
      role="alert"
      className={`rounded-control border border-rule px-4 py-3 text-sm text-slap ${className}`}
    >
      {toFriendlyError(error)}
    </p>
  );
}
