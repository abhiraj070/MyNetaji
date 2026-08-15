"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";
import { useId, useState } from "react";

import { useTranslation } from "@/lib/i18n";
import { SPRING_POP } from "@/lib/motion";

/**
 * The shared furniture of the Performance tab.
 *
 * The piece that matters here is `StatTile`'s info affordance. The brief for
 * this feature is that every headline figure must be able to say where it came
 * from — and, when this project calculated it, show its arithmetic. Building
 * that into the tile rather than leaving it to each section is what makes it
 * true of all of them: a tile handed a metric envelope gets the button, and one
 * handed a bare number does not, so a figure without provenance is visibly a
 * figure without provenance.
 */

export function SectionHeading({ title, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="eyebrow">{title}</h3>
        {hint && (
          <p className="mt-1 text-[11px] leading-relaxed font-medium text-faint">
            {hint}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * One figure, its label, and — when it arrived with provenance — a button that
 * opens that provenance in place.
 *
 * `metric` is the envelope the API returns (`{value, source, derived,
 * formula}`); `display` is the already-formatted string, because only the
 * caller knows whether the number is rupees, a percentage or a count.
 */
export function StatTile({ label, display, metric, sub, tone = "default", emphasis = false }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const hasSource = Boolean(metric?.source || metric?.formula);

  const TONES = {
    default: "text-ink",
    laurel: "text-laurel-strong",
    brand: "text-brand-strong",
    muted: "text-muted",
  };

  return (
    <div className="rounded-card bg-surface p-3.5 shadow-card ring-1 ring-ink/5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] leading-tight font-semibold text-muted">
          {label}
        </span>
        {hasSource && (
          <button
            type="button"
            onClick={() => setOpen((previous) => !previous)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={t("performance.sourceFor", { metric: label })}
            className="-m-1 shrink-0 rounded-full p-1 text-faint transition-colors hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Info className="size-3.5" strokeWidth={2.25} />
          </button>
        )}
      </div>

      <p
        className={`mt-1 font-display font-bold ${
          emphasis ? "text-2xl" : "text-lg"
        } leading-tight ${
          display === null ? "text-faint" : (TONES[tone] ?? TONES.default)
        }`}
      >
        {display ?? t("performance.notPublished")}
      </p>

      {sub && (
        <p className="mt-0.5 text-[11px] leading-relaxed font-medium text-faint">
          {sub}
        </p>
      )}

      {/* Opacity only, with no height animation and no `overflow-hidden`.
          Tiles sit in a two-column grid, so opening one restretches the row
          and changes this card's width — and framer measures `height: "auto"`
          before that reflow lands, freezing the panel at the pre-reflow height
          and clipping the last line of the source note. Letting the browser
          lay the panel out normally cannot mismeasure. */}
      <AnimatePresence initial={false}>
        {open && hasSource && (
          <motion.div
            id={panelId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            <div className="mt-2.5 space-y-1.5 border-t border-rule pt-2.5 text-[11px] leading-relaxed font-medium text-muted">
              {metric.derived && (
                <p className="font-semibold text-ink">
                  {t("performance.calculatedHere")}
                </p>
              )}
              {metric.formula && <p>{metric.formula}</p>}
              {metric.source && (
                <p>
                  {t("profile.source")}{" "}
                  {metric.source.url ? (
                    <a
                      href={metric.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {metric.source.name}
                    </a>
                  ) : (
                    metric.source.name
                  )}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The MP's figure against the averages a source published.
 *
 * Rendered as plain numbers side by side rather than as a bar or a rank: this
 * is a factual comparison, and drawing the MP's bar shorter than the national
 * one turns "28% attendance" into a verdict, which this tab does not issue.
 * Nothing renders at all when no benchmark was published — an absent average
 * is absent, not zero.
 */
export function ComparisonRow({ value, comparisons, format }) {
  const { t } = useTranslation();
  const published = (comparisons ?? []).filter((row) => row.average !== null);
  if (published.length === 0 || value === null || value === undefined) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-muted">
      {published.map((row) => (
        <span key={`${row.scope}-${row.scopeValue}`} className="whitespace-nowrap">
          {row.scope === "national"
            ? t("performance.nationalAverage")
            : t("performance.stateAverage")}
          {": "}
          <span className="font-semibold text-ink">{format(row.average)}</span>
        </span>
      ))}
    </div>
  );
}

/** The All / Completed / Ongoing / Pending row. */
export function FilterChips({ options, value, onChange, ariaLabel }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <motion.button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            whileTap={{ scale: 0.96 }}
            transition={SPRING_POP}
            className={`shrink-0 rounded-full px-3 py-1.5 font-display text-xs font-semibold whitespace-nowrap ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              isActive
                ? "bg-brand-wash text-brand-strong ring-brand/15"
                : "bg-surface-2 text-muted ring-ink/5"
            }`}
          >
            {option.label}
            {option.count !== undefined && option.count !== null && (
              <span className="ml-1.5 font-semibold opacity-70">{option.count}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/** What a section shows when the source has nothing for this MP. */
export function EmptyNote({ children }) {
  return (
    <p className="rounded-card bg-surface-2 px-4 py-3.5 text-xs leading-relaxed font-medium text-muted ring-1 ring-ink/5">
      {children}
    </p>
  );
}

/** The bottom-of-list pager for works, questions and debates. */
export function Pager({ page, pageSize, total, hasMore, onChange, isPending }) {
  const { t } = useTranslation();
  if (total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium text-faint">
        {t("performance.showingRange", { from, to, total })}
      </span>
      <div className="flex gap-2">
        <PagerButton
          disabled={page <= 1 || isPending}
          onClick={() => onChange(page - 1)}
        >
          {t("performance.previous")}
        </PagerButton>
        <PagerButton disabled={!hasMore || isPending} onClick={() => onChange(page + 1)}>
          {t("performance.next")}
        </PagerButton>
      </div>
    </div>
  );
}

function PagerButton({ disabled, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full bg-surface-2 px-3 py-1.5 font-display text-xs font-semibold text-ink ring-1 ring-ink/5 ring-inset transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {children}
    </button>
  );
}

/** The one-line attribution under a list, linking the source it all came from. */
export function SourceLine({ name, url }) {
  const { t } = useTranslation();
  if (!name) return null;
  return (
    <p className="mt-3 text-[11px] leading-relaxed font-medium text-faint">
      {t("profile.source")}{" "}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted underline underline-offset-2"
        >
          {name}
        </a>
      ) : (
        name
      )}
    </p>
  );
}
