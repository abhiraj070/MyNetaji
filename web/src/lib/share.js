/**
 * Share-URL builders that live outside `home.jsx` so leaf components (the
 * leaderboard, its share prompt) can import them without pulling in — and
 * cycling through — the whole `Home` module.
 */

/**
 * `?share=leaderboard&tier=` opens the app with the leaderboard's tier
 * selected. It no longer carries a preview card of its own: the link takes the
 * site's standard Open Graph poster, like any other.
 */
import { usesAngryVerdict } from "./angryVerdict";

export function leaderboardShareUrl(tier = "cm") {
  if (typeof window === "undefined") return "";
  const t = tier === "minister" ? "minister" : "cm";
  return `${window.location.origin}/?share=leaderboard&tier=${t}`;
}

/**
 * What a shared politician link is: an invitation to read about someone.
 *
 * The information page shares this rather than a verdict. A link posted to a
 * group lands in front of people who have not seen the app, and what they need
 * from the preview is what they will find when they open it — not a prompt to
 * take a side before they have read anything.
 */
export function buildSubjectShareMessage(subject) {
  return `Know ${subject.name} beyond the headlines — their biography, work, promises and political record, all in one place.`;
}

/**
 * The verdict wording, for the game screen's own share button: there the share
 * *is* the verdict just cast, and it names the exact action taken rather than
 * generic "rated" language, since the product is an explicit Slap/Rose choice
 * and not a rating scale.
 */
export function buildShareMessage(subject, currentChoice) {
  // A few politicians carry an angry face in place of the slap everywhere in
  // the app (`lib/angryVerdict`); the shared sentence follows, so what a
  // reader posts matches the button they actually pressed.
  const angry = usesAngryVerdict(subject);

  if (currentChoice === "slap") {
    return angry
      ? `I'm angry at ${subject.name}. 😠 Now it's your turn.`
      : `I slapped ${subject.name}. 👋 Now it's your turn.`;
  }
  if (currentChoice === "rose") {
    return `I gave ${subject.name} a 🌹. What's your verdict?`;
  }
  return angry
    ? `Angry or Rose ${subject.name}? Decide for yourself.`
    : `Slap or Rose ${subject.name}? Decide for yourself.`;
}

/**
 * A link back to this subject. `coords` is passed only when the subject is the
 * reader's own location-resolved CM — sending someone else's coordinates would
 * silently open the wrong person's page for the recipient.
 */
export function buildShareUrl(subject, coords) {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const params = new URLSearchParams({ share: subject.tier });
  if (subject.tier === "cm") {
    // `state` drives the server-side share preview (`generateMetadata` fetches
    // the CM by this indexed key — no geo query). `lat/lng` stay for the
    // recipient's client, which still seeds the card from the sharer's spot.
    if (subject.state_key) params.set("state", subject.state_key);
    if (coords) {
      params.set("lat", String(coords.latitude));
      params.set("lng", String(coords.longitude));
    }
  } else if (subject.tier === "minister") {
    params.set("name", subject.name);
  }
  return `${origin}/?${params.toString()}`;
}
