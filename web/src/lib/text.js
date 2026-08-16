/**
 * Text the API hands over in whatever case it was typed in, made presentable.
 *
 * Both of these were copied into five files between them, and had drifted: one
 * `titleCase` capitalised after an opening bracket and the other did not, so
 * "MoS (independent charge)" read differently in the search list than on the
 * card next to it. One copy each, and the bracket-aware version wins because
 * the other is the same function with a case missing.
 */
export function titleCase(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/(?:^|[\s-(])\S/g, (character) => character.toUpperCase());
}

/** "Rekha Gupta" → "RG". The stand-in when a portrait is missing. */
export function monogramOf(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  return (
    parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")
  ).toUpperCase();
}
