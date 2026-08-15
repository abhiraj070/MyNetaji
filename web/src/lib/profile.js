import { manifestoPoints } from "./manifesto";

/**
 * Derives everything the Politician Profile sheet needs from a `subject`
 * (the same shape `RepresentativeCard` renders) — purely computed from
 * fields the API actually returns. There is currently no affidavit data
 * (assets, liabilities, criminal cases) or multi-election history anywhere
 * in the backend, so nothing here invents numbers for those: callers get an
 * explicit `null`/empty result and render an honest "not available" state
 * instead of a fabricated one.
 */

function titleCase(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/(?:^|[\s-])\S/g, (character) => character.toUpperCase());
}

/**
 * The one real "place" fact a subject has: a CM's state, a minister's
 * portfolio, an MP's constituency.
 */
export function placeOf(subject) {
  if (!subject) return null;
  if (subject.tier === "minister") return subject.portfolio || subject.ministry || null;
  if (subject.tier === "mp") {
    return subject.constituency ? titleCase(subject.constituency) : null;
  }
  return subject.state ? titleCase(subject.state) : null;
}

export function atAGlanceMetrics(subject, t) {
  if (!subject) return [];

  /*
   * Declared criminal cases.
   *
   * Only the `mps` table carries this column — `chief_ministers` and
   * `ministers` have no equivalent field, so for those two the card says the
   * figure is on its way rather than showing a zero. A zero here would be a
   * claim ("no cases declared") that the data does not actually make, and it
   * is the worst possible number to get wrong on a politician.
   */
  const cases = subject.criminalCases;
  const hasCases = typeof cases === "number";

  return [
    {
      key: "verdict",
      label: t("profile.publicVerdict"),
      value: `${Number(subject.slap_count ?? 0).toLocaleString("en-IN")} 👋 · ${Number(subject.rose_count ?? 0).toLocaleString("en-IN")} 🌹`,
      slap: Number(subject.slap_count ?? 0),
      rose: Number(subject.rose_count ?? 0),
    },
    {
      key: "cases",
      label: t("profile.criminalCases"),
      value: hasCases
        ? cases.toLocaleString("en-IN")
        : t("comingSoon.badge"),
      muted: !hasCases,
    },
    {
      key: "assets",
      label: t("profile.declaredAssets"),
      value: t("profile.tapToView"),
      tappable: true,
    },
  ];
}

/**
 * Field groups for the asset breakdown sheet, mirroring the two top-level
 * totals a real election affidavit reports (Movable / Immovable) with their
 * usual sub-items, plus the summary pair and a catch-all "Other" bucket.
 * Every value is `null` today — see `assetBreakdown` below — but the shape
 * is exactly what a future affidavit record will populate, so wiring in
 * real data later is a matter of filling these fields, not redesigning them.
 */
export const ASSET_FIELD_GROUPS = [
  {
    key: "movable",
    labelKey: "assets.movable",
    totalKey: "movableAssets",
    fields: [
      { key: "cash", labelKey: "assets.cash" },
      { key: "bankDeposits", labelKey: "assets.bankDeposits" },
      { key: "sharesInvestments", labelKey: "assets.sharesInvestments" },
      { key: "mutualFunds", labelKey: "assets.mutualFunds" },
      { key: "jewellery", labelKey: "assets.jewellery" },
      { key: "vehicles", labelKey: "assets.vehicles" },
    ],
  },
  {
    key: "immovable",
    labelKey: "assets.immovable",
    totalKey: "immovableAssets",
    fields: [
      { key: "residentialProperty", labelKey: "assets.residentialProperty" },
      { key: "commercialProperty", labelKey: "assets.commercialProperty" },
      { key: "agriculturalLand", labelKey: "assets.agriculturalLand" },
    ],
  },
  {
    key: "other",
    labelKey: "assets.other",
    fields: [{ key: "otherAssets", labelKey: "assets.otherAssets" }],
  },
];

export function quickInsights(subject, t) {
  if (!subject) return [];
  const insights = [];
  const slaps = Number(subject.slap_count ?? 0);
  const roses = Number(subject.rose_count ?? 0);

  if (slaps > 0 || roses > 0) {
    if (roses > slaps) {
      insights.push(t("profile.insightMoreRoses"));
    } else if (slaps > roses) {
      insights.push(t("profile.insightMoreSlaps"));
    } else {
      insights.push(t("profile.insightEven"));
    }
  }

  const points = manifestoPoints(subject);
  if (points.length > 0) {
    insights.push(
      t(
        points.length === 1
          ? "profile.insightManifestoOne"
          : "profile.insightManifesto",
        { party: subject.party || t("profile.theirParty"), count: points.length },
      ),
    );
  }

  const place = placeOf(subject);
  if (place && subject.tier === "mp") {
    insights.push(t("profile.insightMp", { place }));
  } else if (place && subject.tier === "cm") {
    insights.push(t("profile.insightCm", { place }));
  } else if (place && subject.tier === "minister") {
    insights.push(t("profile.insightMinister", { place }));
  }

  return insights.slice(0, 3);
}
