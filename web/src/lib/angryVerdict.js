/**
 * A presentation-only override: three politicians show an angry face where
 * everyone else shows a slap.
 *
 * Nothing about the vote changes. The control still records to `slap_count`,
 * the leaderboard still sorts on the same column, and the daily tiles still
 * count the same thing — this module only decides which glyph and which word
 * the reader sees. The backend has no idea it exists.
 *
 * Matching is on the ENGLISH name. Every endpoint that returns a politician
 * also returns an untranslated `name_en` / `minister_name_en` beside the
 * localised one, precisely so client-side identity checks like this one do not
 * break when the reader switches to Hindi. The Hindi spellings are listed as a
 * fallback anyway, for any caller holding only a localised row.
 *
 * All three hold more than one office — Modi and Shah are each a Union
 * Minister *and* a sitting MP, Adityanath a Chief Minister — so the match is on
 * the person, not on a tier or an id, and applies wherever they appear.
 */

/** Normalised English names, plus their Hindi spellings as a safety net. */
const ANGRY_NAMES = new Set([
  "narendra modi",
  "yogi adityanath",
  "amit shah",
  "नरेंद्र मोदी",
  "योगी आदित्यनाथ",
  "अमित शाह",
]);

export const SLAP_GLYPH = "👋";
export const ANGRY_GLYPH = "😠";

function normalise(value) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

/**
 * The English name on a politician-shaped object, whatever shape it is.
 *
 * Subjects, leaderboard rows and highlight rows all name the field slightly
 * differently, and a minister carries `minister_name` where everyone else
 * carries `name`. The localised `name` is checked last, so a Hindi row still
 * matches via the fallback spellings above.
 */
function candidateNames(subject) {
  if (!subject || typeof subject !== "object") return [];
  return [
    subject.name_en,
    subject.minister_name_en,
    subject.name,
    subject.minister_name,
  ];
}

/** Does this politician get the angry treatment? */
export function usesAngryVerdict(subject) {
  return candidateNames(subject).some((name) => ANGRY_NAMES.has(normalise(name)));
}

/** Same question, when all you have is a name string. */
export function nameUsesAngryVerdict(name) {
  return ANGRY_NAMES.has(normalise(name));
}

/** The glyph to show for the negative verdict on this politician. */
export function verdictGlyph(subject) {
  return usesAngryVerdict(subject) ? ANGRY_GLYPH : SLAP_GLYPH;
}

