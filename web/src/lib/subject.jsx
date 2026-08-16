"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useState } from "react";

import { fetchCmLocation, fetchMpLocation } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { titleCase } from "./text";

/**
 * Who the app is currently talking about, held above the router.
 *
 * This used to be three `useState`s inside the home page, which was fine while
 * everything lived on one route. It doesn't survive the split: pressing Game
 * unmounts the page, and with it any memory that the reader had searched their
 * way to a Union Minister or tapped into someone from the leaderboard — they'd
 * arrive at the game holding a verdict on the wrong person. Parked here (the
 * same reasoning as `lib/location`), the selection outlives the navigation.
 *
 * Deliberately in memory only, like the coordinates it sits beside: a reload is
 * a fresh start, not a restored session.
 */

const SubjectContext = createContext(null);

export function SubjectProvider({ children }) {
  // A search-picked result, either tier — `{ tier: "cm" | "minister", data }`.
  // One variable rather than two, so a cm pick and a minister pick can never
  // both be "selected" at once.
  const [selectedSearchResult, setSelectedSearchResult] = useState(null);
  // A fully-fetched subject tapped in from the leaderboard or a highlight tile.
  // Overrides whatever else is on screen until the reader backs out of it.
  const [leaderboardSubject, setLeaderboardSubject] = useState(null);
  // The last verdict cast, tagged with the subject it was cast on:
  // `{ key, choice }`. Shared so a verdict cast on the game route still lights
  // up Share back on the information page.
  const [lastVote, setLastVote] = useState(null);
  // Which of the reader's own representatives the home page is showing. Held
  // here rather than in the page so the game route judges whichever one they
  // were looking at.
  const [homeTier, setHomeTier] = useState("cm");

  const value = useMemo(
    () => ({
      selectedSearchResult,
      setSelectedSearchResult,
      leaderboardSubject,
      setLeaderboardSubject,
      lastVote,
      setLastVote,
      homeTier,
      setHomeTier,
    }),
    [selectedSearchResult, leaderboardSubject, lastVote, homeTier],
  );

  return <SubjectContext.Provider value={value}>{children}</SubjectContext.Provider>;
}

export function useSubjectSelection() {
  const context = useContext(SubjectContext);
  if (!context) {
    throw new Error("useSubjectSelection must be used inside <SubjectProvider>");
  }
  return context;
}

/**
 * The one place that answers "whose page is this?".
 *
 * Both routes call it and both get the same answer: the information page and
 * the game are two views of a single subject, not two features that each work
 * it out for themselves. The query key is unchanged from when this lived in
 * `home.jsx`, so the cache carries straight across a navigation and the game
 * route resolves its subject without a second round trip.
 */
export function useResolvedSubject(coords, { fallbackSelection = null } = {}) {
  const { language, t } = useTranslation();
  const { selectedSearchResult, leaderboardSubject, homeTier } =
    useSubjectSelection();

  const wantsMp = homeTier === "mp";

  const cmQuery = useQuery({
    queryKey: ["cm-location", language, coords?.latitude, coords?.longitude],
    queryFn: () => fetchCmLocation(coords),
    enabled: coords !== null && !wantsMp,
  });

  /*
   * The reader's MP, from the constituency their coordinates fall in.
   *
   * Enabled only while the MP tab is the one selected — not alongside the CM
   * lookup. `/get-location` increments the app's own visit counter as a side
   * effect, so firing it for everyone who never opens the tab would quietly
   * inflate that number. The trade is one short wait the first time the tab is
   * used; React Query serves every switch after that from cache.
   */
  const mpQuery = useQuery({
    queryKey: ["mp-location", language, coords?.latitude, coords?.longitude],
    queryFn: () => fetchMpLocation(coords),
    enabled: coords !== null && wantsMp,
  });

  const query = wantsMp ? mpQuery : cmQuery;

  // The reader's own representative, whichever tab is showing. Chosen by the
  // tab rather than by "whatever resolved first": the CM query keeps its cached
  // answer after the reader switches to MP, and falling through to it would put
  // the CM straight back on screen.
  const homeSubject = wantsMp
    ? buildMpSubject(mpQuery.data, { t })
    : buildSubject(null, cmQuery.data?.cm);

  // `fallbackSelection` is what a `?share=` link resolves to. It sits *below* an
  // explicit pick so that searching, or tapping a leaderboard row, replaces the
  // linked subject — and above the home representative so the link wins on
  // arrival. Passing it in (rather than copying it into the selection) is what
  // keeps this whole path derived: no seeding, so nothing to write during a
  // render or an effect.
  const selection = selectedSearchResult ?? fallbackSelection;
  const subject =
    leaderboardSubject ?? buildSubject(selection, null) ?? homeSubject;

  return { ...query, subject, selection };
}

/**
 * Resolves the subject to display, highest priority first: a search-picked
 * minister, a search-picked CM, then the home CM (resolved from location).
 * A CM's designation ("Chief Minister of X") is already a plain stored
 * string — unlike an MP, there's no cross-referencing needed to work out
 * whether this person also holds another office.
 */
export function buildSubject(selectedSearchResult, homeCm) {
  if (selectedSearchResult?.tier === "minister") {
    const entry = selectedSearchResult.data;
    const m = entry.minister;
    return {
      tier: "minister",
      name: m.minister_name,
      minister_name: m.minister_name,
      party: m.party,
      photo_url: m.photo_url,
      slap_count: m.slap_count,
      rose_count: m.rose_count,
      points: m.manifesto_points,
      manifesto_points: m.manifesto_points,
      ministry: entry.ministry,
      portfolio: entry.portfolio || entry.label,
      rank_title: entry.rank,
      designation: entry.portfolio || entry.label,
    };
  }
  if (selectedSearchResult?.tier === "cm") {
    return { tier: "cm", ...selectedSearchResult.data, isHome: false };
  }
  if (homeCm) {
    return { tier: "cm", ...homeCm, isHome: true };
  }
  return null;
}

/**
 * A Member of Parliament, from `/get-location` or `/get-mps-by-name` — both
 * return the same columns.
 *
 * Mapped onto the shape every other subject already uses, so the identity card,
 * the tabs, the game and the share text need no MP-specific branches:
 *
 *   `designation` carries the constituency, exactly as a CM's carries the state
 *   ("Chief Minister of Maharashtra" → "Member of Parliament, New Delhi"), so
 *   the header line that already exists says which seat this is.
 *
 *   `points` is the party manifesto the row arrives with, under the same name
 *   the CM record uses, so the Manifestos tab reads it unchanged.
 */
export function buildMpSubject(mp, { isHome = true, t } = {}) {
  if (!mp) return null;
  const place = titleCase(mp.constituency);
  return {
    tier: "mp",
    // The MP's own primary key. Their political journey is fetched by it, so a
    // subject built without it would render an empty timeline.
    id: mp.id ?? null,
    name: mp.name,
    designation: t ? t("card.mpOf", { place }) : `Member of Parliament, ${place}`,
    party: mp.party,
    photo_url: mp.photo_url,
    slap_count: mp.slap_count,
    rose_count: mp.rose_count,
    constituency: mp.constituency,
    constituency_key: mp.constituency_key,
    points: mp.points,
    manifesto_points: mp.points,
    criminalCases: mp.criminal_cases ?? null,
    education: mp.education ?? null,
    isHome,
  };
}

/** The identity a vote, a share and a card remount are all keyed on. */
export function subjectKeyOf(subject) {
  if (!subject) return "none";
  if (subject.tier === "minister") {
    return `minister:${subject.ministry}|${subject.name}`;
  }
  if (subject.tier === "mp") {
    return `mp:${subject.constituency_key}|${subject.name}`;
  }
  return `cm:${subject.state_key}|${subject.name}`;
}
