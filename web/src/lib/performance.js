/**
 * Shared formatting and vocabulary for the Performance tab.
 *
 * Lives outside the components because the same three questions come up in
 * every one of them — how do we print a rupee figure, what do we call a work
 * status, and what do we show when a number is genuinely absent — and the
 * answer has to be the same everywhere for the tab to read as one dashboard.
 */

/**
 * "₹13.27 Cr" / "₹45.20 L" / "₹8,240".
 *
 * Indian crore/lakh rather than the browser's compact notation, which would
 * render ₹1,47,00,000 as "₹15M" — a unit nobody uses for public money here.
 * `null` returns `null`, never "₹0": a figure the source did not publish and a
 * figure of zero are different claims, and only the caller knows which
 * placeholder is right for its slot.
 */
export function formatInr(value) {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  if (Math.abs(amount) >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  if (Math.abs(amount) >= 100_000) return `₹${(amount / 100_000).toFixed(2)} L`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** "₹1,47,00,000" — the exact figure, for the source affordance. */
export function formatInrExact(value) {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** "72%" — trailing ".00" dropped, since most of these are whole numbers. */
export function formatPercent(value) {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return `${Number(amount.toFixed(2))}%`;
}

/** "1,234" in Indian digit grouping. */
export function formatCount(value) {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return amount.toLocaleString("en-IN");
}

/**
 * "12 Mar 2025". Pinned to en-IN in every language so digits stay Latin —
 * a Hindi locale would render Devanagari numerals, which is not wanted here
 * (the same decision `ProfileJourneyTab` already makes).
 */
export function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The work-status filter, in the order the chips appear. */
export const WORK_FILTERS = ["all", "completed", "ongoing", "pending"];

/**
 * Tone per status group, reusing the app's existing semantic colours rather
 * than introducing a Performance-only palette. Deliberately not a
 * good/bad scale: "pending" is grey because it is a stage, not a failure.
 */
export const STATUS_TONE = {
  completed: "laurel",
  ongoing: "brand",
  pending: "neutral",
};
