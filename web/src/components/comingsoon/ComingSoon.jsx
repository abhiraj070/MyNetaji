"use client";

import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";

import { useTranslation } from "@/lib/i18n";
import { SPRING_ENTRANCE, SPRING_POP } from "@/lib/motion";

/**
 * The shared vocabulary for a feature preview: a hero, a roadmap of what is
 * being built, a note about why it matters, and one button out.
 *
 * Both previews are assembled from these rather than each inventing its own
 * spacing and tone, so a reader who has seen one recognises the second
 * immediately — and a third can be built without any new design decisions.
 *
 * Everything enters on the same stagger. `order` is the item's place in the
 * sequence, not its position on screen, so a caller can hand successive
 * indices to a hero, a list and a card and have them arrive in reading order.
 */

/** Seconds between one element's entrance and the next. */
const STEP = 0.045;

export function enter(order = 0) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { ...SPRING_ENTRANCE, delay: order * STEP },
  };
}

/**
 * The opening statement: a lit tile carrying the feature's mark, its name, and
 * one sentence on what it will do. Centred, because there is nothing to compare
 * it against yet — this is the whole subject of the screen.
 */
export function PreviewHero({ icon, title, body, order = 0 }) {
  return (
    <motion.div {...enter(order)} className="flex flex-col items-center px-6 pt-7 text-center">
      <span
        aria-hidden
        className="flex size-[68px] items-center justify-center rounded-[24px] bg-linear-to-br from-brand-wash to-white text-[30px] leading-none shadow-hero ring-1 ring-inset ring-brand/15"
      >
        {icon}
      </span>

      <h3 className="mt-4 font-display text-[22px] leading-tight font-bold text-ink">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed font-medium text-muted">
        {body}
      </p>
    </motion.div>
  );
}

/**
 * The roadmap.
 *
 * A locked row is a promise, not a failure: it keeps the same surface, ring and
 * elevation as any live row in the app and differs only in that its label sits
 * at `muted` behind a lock. Nothing here is greyed to the point of looking
 * broken, and no row is `disabled` — there is simply nothing to press yet.
 *
 * `items` are `{ key, label, unlocked }`. An unlocked row is the same object
 * with a laurel check, which is what lets the reader see the line between what
 * they already have and what is on its way.
 */
export function RoadmapList({ title, items, order = 0 }) {
  return (
    <section className="px-5 pt-7">
      {title && (
        <motion.h4
          {...enter(order)}
          className="px-1 pb-2.5 font-display text-sm font-bold text-ink"
        >
          {title}
        </motion.h4>
      )}

      <ul className="space-y-2">
        {items.map((item, index) => (
          <motion.li
            key={item.key}
            {...enter(order + 1 + index)}
            className={`flex items-center gap-3 rounded-control px-3.5 py-3 ring-1 ring-inset ${
              item.unlocked
                ? "bg-linear-to-r from-laurel-wash/60 to-surface ring-laurel/20"
                : "bg-surface ring-ink/5"
            }`}
          >
            <span
              aria-hidden
              className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                item.unlocked
                  ? "bg-laurel-wash text-laurel-strong"
                  : "bg-surface-2 text-faint ring-1 ring-inset ring-ink/5"
              }`}
            >
              {item.unlocked ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : (
                <Lock className="size-3.5" strokeWidth={2.5} />
              )}
            </span>

            <span
              className={`min-w-0 flex-1 font-display text-sm font-semibold ${
                item.unlocked ? "text-ink" : "text-muted"
              }`}
            >
              {item.label}
            </span>

            {item.unlocked && (
              <span className="shrink-0 rounded-full bg-laurel-wash px-2 py-0.5 font-display text-[10px] leading-none font-bold text-laurel-strong uppercase">
                {item.badge}
              </span>
            )}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The closing card — why the feature is being built, in the product's own
 * voice. Tinted rather than white so it lifts off the list above it without
 * needing a heavier border or a louder colour.
 */
export function PreviewNote({ title, body, bullets, order = 0 }) {
  return (
    <motion.section
      {...enter(order)}
      className="mx-5 mt-7 rounded-card bg-linear-to-br from-brand-wash via-surface to-surface p-5 shadow-card ring-1 ring-inset ring-brand/15"
    >
      <h4 className="font-display text-base leading-tight font-bold text-ink">
        {title}
      </h4>

      {body && (
        <p className="mt-2 text-sm leading-relaxed font-medium text-muted">{body}</p>
      )}

      {bullets && (
        <ul className="mt-3 space-y-1.5">
          {bullets.map((bullet) => (
            <li
              key={bullet.key}
              className="flex items-start gap-2.5 text-sm leading-relaxed font-medium text-muted"
            >
              <span
                aria-hidden
                className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand/60"
              />
              {bullet.label}
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}

export function InlineComingSoon({ icon, title, body, order = 0 }) {
  return (
    <motion.div
      {...enter(order)}
      className="flex flex-col items-center rounded-card bg-linear-to-br from-brand-wash via-surface to-surface px-6 py-8 text-center shadow-card ring-1 ring-inset ring-brand/15"
    >
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-[18px] bg-surface text-2xl leading-none shadow-card ring-1 ring-inset ring-brand/15"
      >
        {icon}
      </span>
      <h4 className="mt-3 font-display text-base leading-tight font-bold text-ink">
        {title}
      </h4>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed font-medium text-muted">
        {body}
      </p>
    </motion.div>
  );
}

/**
 * The one action. It closes the preview and nothing else — there is nothing to
 * sign up for and nothing to be notified about, so the button says only what it
 * honestly does.
 */
export function LookingForwardButton({ onClick, order = 0 }) {
  const { t } = useTranslation();

  return (
    <motion.div {...enter(order)} className="px-5 pt-7 pb-8">
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
        transition={SPRING_POP}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-display text-sm font-bold text-white shadow-card transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {t("comingSoon.cta")}
        <span aria-hidden>✨</span>
      </motion.button>
    </motion.div>
  );
}
