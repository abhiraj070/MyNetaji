"use client";

import { motion } from "framer-motion";

import { Badge, BADGES } from "./ui/Badge";
import { useHighlights } from "@/hooks/useHighlights";
import { ANGRY_GLYPH, usesAngryVerdict } from "@/lib/angryVerdict";
import { useTranslation } from "@/lib/i18n";
import { SPRING_POP, SPRING_PRESS } from "@/lib/motion";

/**
 * Today's three leaders, one tile each, fed by `/most-slapped`,
 * `/most-roasted` and `/most-judged`.
 *
 * A tile holding a person is a real `<button>` that opens their full profile —
 * the same card, fetched the same way, as tapping their leaderboard row.
 * `onSelectSubject` is the leaderboard's own handler passed straight through,
 * so there is one code path for "open this person" rather than two. Tiles that
 * are loading, empty or failed stay inert: there is nothing to open.
 *
 * Every tile reserves the same height in all four of its states — loading,
 * loaded, empty, failed — so the row never reflows as data arrives or an
 * endpoint drops out. The states are kept distinct on purpose: "no verdicts
 * yet today" is a real answer about a quiet morning, while "unavailable" is
 * the app admitting it couldn't ask.
 */
const HIGHLIGHTS = [
  { slot: "slapped", emoji: "👋", labelKey: "highlight.mostSlapped", tone: "slap" },
  { slot: "loved", emoji: "🌹", labelKey: "highlight.mostLoved", tone: "laurel" },
  { slot: "judged", emoji: "🏆", labelKey: "highlight.mostJudged", tone: "sun" },
];

// Gradient icon chips rather than flat washes — the diagonal fade to white
// gives each glyph a small lit dome that matches the card's own lighting.
const TILE_ICON_TONE = {
  slap: "bg-linear-to-br from-slap-wash to-white ring-slap/15",
  laurel: "bg-linear-to-br from-laurel-wash to-white ring-laurel/15",
  sun: "bg-linear-to-br from-sun-wash to-white ring-sun/20",
};

// A tile that actually holds today's leader earns a faint tone-tinted rim and a
// wash lift, so a live result reads as more present than an empty/loading slot
// without adding any new element or number.
const TILE_ACCENT = {
  slap: "ring-slap/25 bg-linear-to-b from-slap-wash/40 to-surface",
  laurel: "ring-laurel/25 bg-linear-to-b from-laurel-wash/40 to-surface",
  sun: "ring-sun/30 bg-linear-to-b from-sun-wash/40 to-surface",
};

const TILE_BASE =
  "flex h-full w-full flex-col items-center gap-1.5 rounded-card px-2 py-3 text-center shadow-card ring-1 ring-inset";

/** CM rows carry `name`, Union Minister rows carry `minister_name`. */
function displayName(row) {
  return row?.name ?? row?.minister_name ?? null;
}

export function TodaysHighlight({ onSelectSubject, pendingKey }) {
  const { t } = useTranslation();
  const { slots, isPending } = useHighlights();

  return (
    <section aria-label={t("highlight.title")} className="shrink-0">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-sm font-bold text-ink">
          {t("highlight.title")}
        </h2>
        <Badge {...BADGES.trending} size="sm" />
      </div>

      <ul className="mt-2 grid grid-cols-3 gap-2">
        {HIGHLIGHTS.map((item, index) => {
          const slot = slots?.[item.slot];
          const row = slot?.data ?? null;
          const name = displayName(row);
          // The "most slapped" tile shows an angry face — and says so — when
          // today's leader happens to be one of the politicians
          // `lib/angryVerdict` covers. The tally itself is unchanged.
          const angry = item.slot === "slapped" && usesAngryVerdict(row);
          const emoji = angry ? ANGRY_GLYPH : item.emoji;
          const labelKey = angry ? "highlight.mostAngry" : item.labelKey;
          // Same key format the leaderboard uses, so the two share one
          // in-flight marker and can't both fetch at once.
          const isOpening = Boolean(name) && pendingKey === `${row.tier}:${name}`;
          const canOpen = Boolean(name) && Boolean(onSelectSubject);
          const tileTone = name
            ? TILE_ACCENT[item.tone]
            : "ring-ink/5 bg-surface";
          const tileClass = `${TILE_BASE} ${tileTone}`;

          const inner = (
            <>
              <motion.span
                aria-hidden
                whileHover={{ scale: 1.15, rotate: -8 }}
                transition={SPRING_POP}
                className={`flex size-9 items-center justify-center rounded-full text-base leading-none shadow-sm ring-1 ring-inset ${TILE_ICON_TONE[item.tone]}`}
              >
                {emoji}
              </motion.span>

              <p className="font-display text-[11px] leading-tight font-semibold text-ink">
                {t(labelKey)}
              </p>

              <TileValue isPending={isPending} slot={slot} emoji={emoji} />
            </>
          );

          return (
            <motion.li
              key={item.slot}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...SPRING_POP, delay: 0.22 + index * 0.05 }}
            >
              {canOpen ? (
                <motion.button
                  type="button"
                  onClick={() => onSelectSubject(row.tier, row)}
                  disabled={isOpening}
                  aria-label={`View ${name}'s profile`}
                  whileHover={{ y: -4, transition: SPRING_POP }}
                  whileTap={{
                    scaleX: 1.04,
                    scaleY: 0.94,
                    transition: SPRING_PRESS,
                  }}
                  className={`${tileClass} transition-shadow hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait ${
                    isOpening ? "opacity-60" : ""
                  }`}
                >
                  {inner}
                </motion.button>
              ) : (
                // Nothing to open, so it stays a plain surface — no pointer
                // cursor promising an interaction that isn't there.
                <div className={tileClass}>{inner}</div>
              )}
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The one line that changes. `min-h-8` is what holds the row steady: the
 * skeleton, a name and a dash all occupy the same two lines.
 */
function TileValue({ isPending, slot, emoji }) {
  const { t } = useTranslation();
  if (isPending) {
    return (
      <span
        aria-hidden
        className="flex min-h-8 w-full animate-pulse flex-col items-center justify-center gap-1"
      >
        <span className="block h-2.5 w-4/5 rounded-full bg-rule" />
        <span className="block h-2 w-1/2 rounded-full bg-rule/70" />
      </span>
    );
  }

  if (slot?.failed) {
    return (
      <span className="flex min-h-8 items-center text-[11px] leading-tight font-semibold text-faint">
        {t("highlight.unavailable")}
      </span>
    );
  }

  const name = displayName(slot?.data);

  if (!name) {
    return (
      <span className="flex min-h-8 items-center text-[11px] leading-tight font-medium text-faint">
        {t("highlight.empty")}
      </span>
    );
  }

  return (
    <span className="flex min-h-8 w-full flex-col items-center justify-center gap-1">
      <span
        title={name}
        className="w-full truncate text-[11px] leading-tight font-bold text-ink"
      >
        {name}
      </span>
      <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] leading-none font-bold text-muted tabular-nums ring-1 ring-inset ring-ink/5">
        {Number(slot.data.count ?? 0).toLocaleString("en-IN")}
        <span aria-hidden>{emoji}</span>
      </span>
    </span>
  );
}
