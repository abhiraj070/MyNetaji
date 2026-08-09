"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Gavel,
  IdCard,
  Newspaper,
  ScrollText,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { PaintedTricolour } from "./landing/PaintedTricolour";
import { Button } from "./ui/Button";
import { XLogo } from "./x/XLogo";
import { SPRING_ENTRANCE } from "@/lib/motion";

/**
 * The landing page.
 *
 * MyNetaji is a civic-information product first: the question it answers is
 * "who represents me, and what is their record?". The verdict game is a way to
 * take part once you are here, not the reason to arrive — so it appears late
 * and quietly, and nothing above it competes with the primary action.
 *
 * Everything below is built from the same vocabulary as the inside of the app —
 * `rounded-card`, `shadow-card`, `ring-ink/5`, the display face for headings,
 * `muted` for body — so arriving at the real product feels like the same place
 * rather than a different one.
 *
 * Copy is intentionally literal and English-only for now; the rest of the app
 * is translated and this page still needs its Hindi pass.
 */

const enter = (order = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { ...SPRING_ENTRANCE, delay: order * 0.05 },
});

/** What the profile actually holds — the core of the product. */
const CAPABILITIES = [
  {
    icon: IdCard,
    title: "Who they are",
    body: "Name, party, constituency and current office.",
  },
  {
    icon: CalendarClock,
    title: "Their political journey",
    body: "See where they've been and the positions they've held over the years.",
  },
  {
    icon: ScrollText,
    title: "What their party promised",
    body: "Explore manifesto commitments made by their party.",
  },
  {
    icon: TrendingUp,
    title: "Their record",
    body: "See their work, activity and performance in office.",
  },
  {
    icon: Newspaper,
    title: "What's happening now",
    body: "Follow the latest news and updates about them.",
  },
];

/** Secondary features — deliberately smaller cards than the five above. */
const EXTRAS = [
  {
    icon: Newspaper,
    title: "Live news",
    body: "Stay updated with the latest news about your politicians.",
  },
  {
    icon: XLogo,
    title: "X feed",
    body: "See what they're saying and sharing on X.",
  },
  {
    icon: Gavel,
    title: "Public verdict",
    body: "Give your verdict and see how people across India are voting.",
  },
];

/** The shape of a real journey, used only to illustrate the preview. */
const PREVIEW_TIMELINE = [
  { year: "2024", label: "Member of Parliament", current: true },
  { year: "2019", label: "Member of Parliament" },
  { year: "2014", label: "Minister of State" },
];

export function Landing({ onAllowLocation, isBusy }) {
  const cta = (
    <Button onClick={onAllowLocation} disabled={isBusy} className="w-full sm:w-auto">
      {isBusy ? "Finding you…" : "Find Your CM & MP →"}
    </Button>
  );

  return (
    <div className="w-full">
      {/* ---------------------------------------------------------------- 1 */}
      <section className="relative overflow-hidden">
        <PaintedTricolour />

        <div className="relative mx-auto w-full max-w-3xl px-5 py-16 text-center sm:px-8 sm:py-24">
          <motion.p
            {...enter(0)}
            className="font-display text-xs font-bold tracking-wide text-muted sm:text-sm"
          >
            🇮🇳 Built for India. Made for its people.
          </motion.p>

          <motion.h1
            {...enter(1)}
            className="mt-4 font-display text-4xl leading-[1.05] font-bold text-balance text-ink sm:text-5xl lg:text-6xl"
          >
            Understand your politicians.
            <br />
            <span className="text-brand-strong">Know their record.</span>
          </motion.h1>

          <motion.p
            {...enter(2)}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed font-medium text-pretty text-muted sm:text-lg"
          >
            Their history, promises, work and more — all brought together in one
            simple place.
          </motion.p>

          <motion.div
            {...enter(3)}
            className="mt-8 flex flex-col items-center gap-3"
          >
            {cta}
            <p className="text-xs font-medium text-faint sm:text-sm">
              Start with the politicians representing your area.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- 2 */}
      <Section
        title="Everything about your politician."
        subtitle="One profile, organised into the things people actually want to know."
      >
        {/* Five cards: the two-column grid lets the last one run full width on
            a phone rather than leaving a ragged half-row. */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, body }, index) => (
            <motion.article
              key={title}
              {...enter(index)}
              className="rounded-card bg-surface p-5 shadow-card ring-1 ring-ink/5 transition-shadow hover:shadow-lift"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-wash text-brand-strong">
                <Icon className="size-5" strokeWidth={2.25} />
              </span>
              <h3 className="mt-3.5 font-display text-base font-bold text-ink">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed font-medium text-muted">
                {body}
              </p>
            </motion.article>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- 3 */}
      <Section
        title="One politician. One place."
        subtitle="History, promises, performance and more — organised so you can actually understand it."
      >
        <motion.div
          {...enter(0)}
          className="mx-auto max-w-md rounded-card bg-surface p-4 shadow-lift ring-1 ring-ink/5 sm:p-5"
        >
          {/* A miniature of the real profile: identity card, then the tab row,
              then a slice of the journey — the same order the app uses. */}
          <div className="flex items-center gap-3.5 rounded-card bg-surface-2 p-3.5 ring-1 ring-ink/5">
            <span className="size-12 shrink-0 rounded-2xl bg-linear-to-br from-brand-wash to-white ring-1 ring-ink/5" />
            <span className="min-w-0 flex-1 space-y-1.5">
              <span className="block h-3 w-2/5 rounded-full bg-rule" />
              <span className="block h-2.5 w-3/5 rounded-full bg-rule/70" />
              <span className="block h-4 w-16 rounded-full bg-brand-wash" />
            </span>
          </div>

          <div className="no-scrollbar mt-3.5 flex gap-1 overflow-x-auto rounded-full bg-surface-2 p-1 ring-1 ring-ink/5">
            {["Overview", "Manifestos", "Journey", "Performance"].map((tab, i) => (
              <span
                key={tab}
                className={`shrink-0 rounded-full px-3 py-1.5 font-display text-[11px] font-semibold whitespace-nowrap ${
                  i === 2 ? "bg-surface text-ink shadow-card" : "text-muted"
                }`}
              >
                {tab}
              </span>
            ))}
          </div>

          <ol className="relative mt-4 space-y-2.5 pl-5">
            <span
              aria-hidden
              className="absolute top-2 bottom-2 left-[7px] w-px bg-rule"
            />
            {PREVIEW_TIMELINE.map((row) => (
              <li key={row.year} className="relative">
                <span
                  aria-hidden
                  className={`absolute top-3 left-[-1.375rem] size-3 rounded-full ${
                    row.current ? "bg-brand ring-4 ring-brand-wash" : "bg-rule"
                  }`}
                />
                <div className="rounded-control bg-surface-2 px-3.5 py-2.5 ring-1 ring-ink/5">
                  <p className="text-[10px] font-bold tracking-wide text-muted uppercase">
                    {row.current ? "Current" : row.year}
                  </p>
                  <p className="mt-0.5 font-display text-sm font-bold text-ink">
                    {row.label}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </motion.div>
      </Section>

      {/* ---------------------------------------------------------------- 4 */}
      <Section title="And there's more.">
        <div className="grid gap-3 sm:grid-cols-3">
          {EXTRAS.map(({ icon: Icon, title, body }, index) => (
            <motion.article
              key={title}
              {...enter(index)}
              className="rounded-card bg-surface p-4 shadow-card ring-1 ring-ink/5"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-muted ring-1 ring-ink/5">
                <Icon className="size-4" strokeWidth={2.25} />
              </span>
              <h3 className="mt-3 font-display text-sm font-bold text-ink">
                {title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed font-medium text-muted">
                {body}
              </p>
            </motion.article>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- 5 */}
      <Section title="Have your say.">
        <motion.div
          {...enter(0)}
          className="rounded-card bg-linear-to-br from-brand-wash via-surface to-surface p-5 shadow-card ring-1 ring-inset ring-brand/15 sm:p-6"
        >
          <p className="max-w-xl text-sm leading-relaxed font-medium text-muted sm:text-base">
            Think your politician deserves a{" "}
            <span aria-hidden>👋</span> or <span aria-hidden>🌹</span>? Give your
            verdict and see how people across India are voting.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 font-display text-xs font-bold text-ink shadow-card ring-1 ring-ink/5">
              <span aria-hidden>👋</span> Slap
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 font-display text-xs font-bold text-ink shadow-card ring-1 ring-ink/5">
              <span aria-hidden>🌹</span> Rose
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 font-display text-xs font-semibold text-muted shadow-card ring-1 ring-ink/5">
              <Trophy className="size-3.5" strokeWidth={2.25} />
              National leaderboard
            </span>
          </div>
        </motion.div>
      </Section>

      {/* ---------------------------------------------------------------- 6 */}
      <section className="mx-auto w-full max-w-3xl px-5 pt-4 pb-20 text-center sm:px-8">
        <motion.h2
          {...enter(0)}
          className="font-display text-2xl font-bold text-balance text-ink sm:text-3xl"
        >
          Ready to meet your representatives?
        </motion.h2>
        <motion.div {...enter(1)} className="mt-6 flex justify-center">
          {cta}
        </motion.div>
      </section>
    </div>
  );
}

/** One band of the page — heading, optional standfirst, then its content. */
function Section({ title, subtitle, children }) {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <motion.h2
        {...enter(0)}
        className="font-display text-2xl font-bold text-balance text-ink sm:text-3xl"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          {...enter(1)}
          className="mt-2 max-w-2xl text-sm leading-relaxed font-medium text-pretty text-muted sm:text-base"
        >
          {subtitle}
        </motion.p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}
