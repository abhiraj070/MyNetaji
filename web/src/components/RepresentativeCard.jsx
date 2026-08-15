"use client";

import { motion } from "framer-motion";
import { useRef } from "react";

import { VoteAnnouncement } from "./vote/VoteAnnouncement";
import { VoteFlight } from "./vote/VoteFlight";
import { VotePortrait } from "./vote/VotePortrait";
import { VoteButtons } from "./VoteButtons";
import { Badge, BADGES } from "./ui/Badge";
import { useTranslation } from "@/lib/i18n";
import { useVote } from "@/hooks/useVote";
import { useVoteChoreography } from "@/hooks/useVoteChoreography";
import { rise, SPRING_ENTRANCE, SPRING_POP } from "@/lib/motion";

const ROLE_LABEL = {
  // Only the home CM (resolved from the user's own location) is "yours" —
  // one tapped in from the leaderboard or search is someone else's, so it
  // falls back to the plain title rather than misrepresenting whose seat it is.
  cm: (subject, t) =>
    subject?.isHome ? t("card.yourCm") : t("card.chiefMinister"),
  // `rank_title` is server data (already localised upstream when available),
  // so it wins over the generic fallback.
  minister: (subject, t) => subject?.rank_title || t("card.unionMinister"),
  // Same rule as the CM: "yours" only when this is the seat the reader's own
  // coordinates fall in.
  mp: (subject, t) =>
    subject?.isHome ? t("card.yourMpRole") : t("card.memberOfParliament"),
};

/**
 * The hero block: the representative's card, with the verdict controls sitting
 * directly beneath it as their own section rather than inside the card — so the
 * card is one clear object and the buttons read as the page's primary action.
 *
 * The outer element is still the choreography *stage*: it's the positioning
 * context for the projectile flight, and `measure()` reads the portrait and
 * button rects relative to it. Both therefore have to stay inside this wrapper,
 * whatever the layout does around them.
 *
 * Information and Share moved out to the page's bottom action bar; everything
 * that isn't identity still lives behind the Information bottom sheet.
 */
export function RepresentativeCard({ subject, keySeed, onFirstVote }) {
  const { t } = useTranslation();
  const stageRef = useRef(null);
  const portraitRef = useRef(null);
  const buttonsRef = useRef({});

  const { choice, slaps, roses, vote, isError } = useVote(subject.tier, subject);
  const choreo = useVoteChoreography({ stageRef, portraitRef, buttonsRef, subject });

  const role = ROLE_LABEL[subject.tier]?.(subject, t);

  return (
    <div ref={stageRef} className="relative flex min-h-0 flex-1 flex-col gap-3">
      {/*
       * Two layers, each owning exactly one transform: this wrapper carries the
       * CSS idle float (see `.hero-float` in globals.css) and never remounts,
       * while the `article` inside owns the entrance and the hover lift and is
       * keyed on the subject so it re-plays whenever the card swaps. Stacking
       * both on one element means two animations fighting over the same
       * `transform`, and the loser is always the loop.
       *
       * The drift keeps running through a verdict. The choreography measures
       * the portrait at launch and the projectile is positioned against the
       * stage, so a flight can land up to ~3px off where the card has drifted
       * to by impact — well inside the visual noise of a 1.8x-scaled glyph.
       */}
      <div className="hero-float flex min-h-0 flex-1 flex-col">
        {/* `min-h-[56dvh]` is what makes the representative the hero: it holds
            the card at roughly 55% of the first screen no matter how short the
            name or designation runs, and `flex-1` lets it take any space left
            over on a taller viewport rather than leaving a gap. */}
        <motion.article
          key={keySeed}
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ ...SPRING_ENTRANCE, delay: 0.05 }}
          whileHover={{ y: -7, transition: SPRING_POP }}
          className="relative flex min-h-[56dvh] flex-1 flex-col items-center justify-center overflow-visible rounded-card bg-surface px-5 py-6 text-center shadow-hero sm:px-8 sm:py-8"
        >
          {/* Featured framing, all decoration — these sit behind/above the
              content, never in its flow, so the card's measured height is
              unchanged. Three layers build the "lit" look: a brand wash
              bleeding down from the top, a faint warm counter-glow from the
              top-right so the light reads as coming from one side, and a soft
              vignette at the foot that seats the name on slightly richer
              ground. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-2/5 rounded-t-card bg-linear-to-b from-brand-wash/70 via-brand-wash/20 to-transparent"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute top-2 right-2 size-32 rounded-full bg-slap/10 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 rounded-b-card bg-linear-to-t from-surface-2/70 to-transparent"
          />

          <Badge
            {...BADGES.featured}
            tilt
            shimmer
            size="sm"
            className="absolute -top-2.5 left-4 shadow-lift sm:left-6"
          />

          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING_POP}
            className="relative"
          >
            {/* Halo behind the portrait — the "lit from behind" cue that makes
                the person read as the subject of the page, not an illustration
                of one. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-[-14%] rounded-full bg-brand/20 blur-2xl"
            />

            {/* A crisp light-to-brand gradient frame, one step wider than the
                portrait, so the image sits in a subtle bezel rather than
                floating with a plain hairline. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-[3px] rounded-[29px] bg-linear-to-b from-white to-brand/25 shadow-card"
            />

            <VotePortrait
              src={subject.photo_url}
              name={subject.name}
              className="relative w-[46vw] max-w-[12.5rem] sm:w-52"
              portraitRef={portraitRef}
              controls={choreo.portraitControls}
              showSlapMark={choreo.showSlapMark}
              showBloom={choreo.showBloom}
              direction={choreo.impactDirection}
            />
          </motion.div>

          <Badge tone="brand" size="sm" className="relative mt-5">
            {role}
          </Badge>

          <h2 className="relative mt-2 font-display text-[1.75rem] leading-[1.1] font-bold text-balance text-ink sm:text-4xl">
            {subject.name}
          </h2>

          {subject.designation && (
            <p className="relative mt-1.5 max-w-sm text-sm font-semibold text-balance text-muted sm:text-base">
              {subject.designation}
            </p>
          )}
        </motion.article>
      </div>

      <motion.section
        aria-label={t("vote.yourVerdict")}
        {...rise(0.12)}
        className="mx-auto w-full max-w-md shrink-0"
      >
        <VoteButtons
          subject={subject}
          choice={choice}
          slapCount={slaps}
          roseCount={roses}
          /*
           * The verdict is sent the moment it's cast, not when the animation
           * finishes. Holding the PATCH back until the end of the sequence
           * meant the server — and therefore the Today's Highlight tiles,
           * which are refetched off the back of that same mutation — spent the
           * whole ~2s flight still describing the world before this vote, so a
           * tile read exactly one behind the count the user had just produced.
           *
           * `play` keeps the flourish and still fires the reward toast at
           * impact; only the network write moved earlier.
           */
          onVote={(next) => {
            vote(next);
            choreo.play(next, () => onFirstVote?.(next));
          }}
          isError={isError}
          buttonsRef={buttonsRef}
        />
      </motion.section>

      <VoteFlight flight={choreo.flight} subject={subject} />
      <VoteAnnouncement message={choreo.message} />
    </div>
  );
}
