"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { SPRING_POP, SPRING_PRESS } from "@/lib/motion";
import { useTranslation } from "@/lib/i18n";
import { ANGRY_GLYPH, usesAngryVerdict } from "@/lib/angryVerdict";

/**
 * The two verdict controls — the loudest thing on the page after the
 * representative themselves.
 *
 * Each is a solid colour disc with a chunky same-hue edge underneath it
 * (`0 Npx 0` rather than a blur) so it reads as a physical key sitting proud
 * of the page; pressing drives the disc down onto its edge instead of just
 * shrinking it. The running tally now lives *inside* the disc, on a
 * translucent chip below the glyph, so the button is one object rather than a
 * control with a caption.
 *
 * Both sides stay live at all times: slapping does not lock the rose, and a
 * press during the send animation still records — it just doesn't launch a
 * second projectile. The picked side keeps a coloured glow so your last
 * verdict is still legible.
 *
 * Picking a side commits to it: once you slap (or rose) a representative, the
 * opposite disc is disabled and dimmed for the rest of that card's life, so a
 * verdict is one-directional. You can keep tapping the side you chose; the lock
 * is per-representative and clears when the card is swapped for another subject
 * (`RepresentativeCard` remounts, resetting `choice`).
 *
 * A few politicians show the negative disc as an angry face rather than a slap
 * (see `lib/angryVerdict`). Only the glyph and the word change — the disc is
 * the same control, sending the same `slap` choice to the same column.
 */
const OPTIONS = [
  {
    choice: "slap",
    emoji: "👋",
    labelKey: "vote.slap",
    face: "bg-[linear-gradient(160deg,#ff7a5c_0%,#ff4e3a_58%,#ef3320_100%)]",
    edge: "#c22b19",
    auraRgb: "255 78 58",
  },
  {
    choice: "rose",
    emoji: "🌹",
    labelKey: "vote.rose",
    face: "bg-[linear-gradient(160deg,#34d99b_0%,#12b981_58%,#0a9c69_100%)]",
    edge: "#0a7d55",
    auraRgb: "18 185 129",
  },
];

const EDGE_REST = 8;
const EDGE_PRESSED = 3;

export function VoteButtons({
  subject,
  choice,
  slapCount = 0,
  roseCount = 0,
  onVote,
  isError,
  buttonsRef,
}) {
  const { t } = useTranslation();
  const counts = { slap: slapCount, rose: roseCount };
  const isAngry = usesAngryVerdict(subject);

  // Resolved here rather than inside `VoteButton` so the disc stays a dumb
  // renderer and there is exactly one place that decides what the negative
  // side is called.
  const options = OPTIONS.map((option) =>
    option.choice === "slap" && isAngry
      ? { ...option, emoji: ANGRY_GLYPH, labelKey: "vote.angry" }
      : option,
  );

  return (
    <div>
      <div className="flex items-start justify-center gap-8 sm:gap-12">
        {options.map((option) => (
          <VoteButton
            key={option.choice}
            option={option}
            label={t(option.labelKey)}
            count={counts[option.choice]}
            isPicked={choice === option.choice}
            /* A side has been chosen and it isn't this one → lock this disc. */
            disabled={choice !== null && choice !== option.choice}
            onVote={onVote}
            buttonsRef={buttonsRef}
          />
        ))}
      </div>

      <p
        className="mt-3 min-h-4 text-center text-xs font-semibold"
        aria-live="polite"
      >
        {isError ? (
          <span className="text-slap-strong">{t("vote.saveFailed")}</span>
        ) : slapCount === 0 && roseCount === 0 && !choice ? (
          <span className="text-muted">{t("vote.noVerdicts")}</span>
        ) : null}
      </p>
    </div>
  );
}

/**
 * One disc, with its own ripple state — each tap spawns a short-lived ripple
 * that expands and fades, clipped to the disc by `overflow-hidden`. Kept local
 * to the button rather than lifted to `VoteButtons` since neither side needs
 * to know about the other's ripples.
 */
function VoteButton({ option, label, count, isPicked, disabled, onVote, buttonsRef }) {
  const [ripples, setRipples] = useState([]);

  const handleClick = () => {
    if (disabled) return;
    setRipples((prev) => [...prev, Date.now() + Math.random()]);
    onVote(option.choice);
  };

  const edgeShadow = (depth) =>
    `0 ${depth}px 0 ${option.edge}, 0 ${depth + 6}px 18px -6px rgb(23 22 51 / 0.28)`;

  return (
    <div className="relative flex flex-col items-center">
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-[-10px] rounded-full blur-lg"
        style={{ backgroundColor: `rgb(${option.auraRgb})` }}
        animate={{ opacity: isPicked ? 0.3 : 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
      />

      <motion.button
        ref={(element) => {
          if (buttonsRef) buttonsRef.current[option.choice] = element;
        }}
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={isPicked}
        aria-label={`${label} this representative`}
        initial={false}
        /* Dimming (opacity/grayscale) lives on the className below rather than
           here: framer holds an inline `opacity` that would override a Tailwind
           opacity class, so keeping opacity out of `animate` lets the disabled
           class win. Picking a side disables the other — see `disabled` in
           `VoteButtons` — so the greyed-out state means "you committed to the
           other verdict," and the picked side keeps its glow. */
        animate={{
          scaleX: 1,
          scaleY: 1,
          y: 0,
          boxShadow: edgeShadow(EDGE_REST),
        }}
        /* No hover/press motion once locked — a disc you can't use shouldn't
           invite the press. */
        whileHover={
          disabled
            ? undefined
            : {
                y: -4,
                scaleX: 1.03,
                scaleY: 1.03,
                boxShadow: edgeShadow(EDGE_REST + 4),
                transition: SPRING_POP,
              }
        }
        /* The squish: the disc flattens as it drives down onto its edge, then
           springs back through a slight overshoot on release. */
        whileTap={
          disabled
            ? undefined
            : {
                y: EDGE_REST - EDGE_PRESSED,
                scaleX: 1.06,
                scaleY: 0.92,
                boxShadow: edgeShadow(EDGE_PRESSED),
                transition: SPRING_PRESS,
              }
        }
        transition={SPRING_POP}
        className={`relative flex size-28 flex-col items-center justify-center gap-1 overflow-hidden rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink sm:size-32 ${option.face} ${disabled ? "cursor-not-allowed opacity-40 grayscale-[0.4]" : ""}`}
      >
        <AnimatePresence>
          {ripples.map((id) => (
            <motion.span
              key={id}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full bg-white/35"
              initial={{ scale: 0.3, opacity: 0.4 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
              onAnimationComplete={() =>
                setRipples((prev) => prev.filter((r) => r !== id))
              }
            />
          ))}
        </AnimatePresence>

        {/* Layered lighting that sells the disc as a moulded key rather than a
            flat circle: a broad top sheen, a tight specular catch-light off to
            one side, an inner rim highlight, and a soft floor shadow inside the
            lower edge. All static overlays — none of them animate. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-linear-to-b from-white/30 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-[13%] left-[24%] h-4 w-7 -rotate-12 rounded-full bg-white/40 blur-md sm:h-5 sm:w-9"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/25"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 rounded-b-full bg-linear-to-t from-black/20 to-transparent"
        />

        <span aria-hidden className="relative text-4xl leading-none sm:text-5xl">
          {option.emoji}
        </span>

        {/* The chip itself gives a single squash-and-pop on every tick, while
            the digits swap underneath it — so a rising tally reads as the
            counter reacting, not just text changing. `min-w` keeps its width
            stable so nothing beside it shifts. */}
        <motion.span
          key={`chip-${count}`}
          initial={{ scale: 0.82 }}
          animate={{ scale: 1 }}
          transition={SPRING_POP}
          className="relative flex min-w-11 items-center justify-center rounded-full bg-black/25 px-2.5 py-0.5 ring-1 ring-inset ring-white/25 shadow-[inset_0_1px_0_rgb(255_255_255/0.28),inset_0_-1px_2px_rgb(0_0_0/0.25)] backdrop-blur-[2px]"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={count}
              initial={{ opacity: 0, y: -10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={SPRING_POP}
              className="font-display text-sm leading-none font-bold tabular-nums"
            >
              {Number(count).toLocaleString("en-IN")}
            </motion.span>
          </AnimatePresence>
        </motion.span>
      </motion.button>
    </div>
  );
}
