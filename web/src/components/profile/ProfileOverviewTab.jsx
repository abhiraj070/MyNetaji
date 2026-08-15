"use client";

import { motion } from "framer-motion";
import { ChevronRight, Gavel, GraduationCap, Scale, Sparkles, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";

import { DataFreshnessBlock } from "@/components/DataFreshness";
import { atAGlanceMetrics, quickInsights } from "@/lib/profile";
import { useTranslation } from "@/lib/i18n";
import { SPRING_POP } from "@/lib/motion";

const METRIC_ICON = {
  verdict: Scale,
  cases: Gavel,
  assets: Wallet,
  education: GraduationCap,
};

/**
 * Overview: just the fast-read stack — at-a-glance metrics and quick insights.
 * The Political Journey and Manifesto preview sections that used to live here
 * were cut; those tabs are one tap away on their own, and this tab is meant to
 * be readable in a glance, not a table of contents for the other two.
 *
 * The identity card that used to open this tab now sits above the tab row (see
 * `ProfileIdentityCard`) — it names the person all four tabs are about, so it
 * belongs to the page rather than to Overview.
 *
 * The metric grid is down to the two cards that say something the identity
 * card does not (see `atAGlanceMetrics`), which is what buys the extra air
 * between the sections here: fewer boxes, further apart, rather than the same
 * density with a hole in it.
 */
export function ProfileOverviewTab({ subject, onOpenAssets }) {
  const { t } = useTranslation();
  const router = useRouter();
  const metrics = atAGlanceMetrics(subject, t);
  const insights = quickInsights(subject, t);

  // Public Verdict is the tally this person's slaps and roses have produced, so
  // pressing it goes to the place that produces them.
  const openMetric = (metric) => {
    if (metric.key === "verdict") return () => router.push("/game");
    return metric.tappable ? onOpenAssets : undefined;
  };

  return (
    <div className="space-y-7 pb-7">
      <section>
        <h3 className="eyebrow">{t("profile.atAGlance")}</h3>
        {/* `items-stretch` keeps every card the same height whichever is
            taller — the verdict card carries a bar and the assets card a tap
            hint, so they rarely agree on their own. Three cards in a
            two-column grid means the third takes the next row at the same
            width, which keeps the card shape identical to the other two. */}
        <div className="mt-3 grid grid-cols-2 items-stretch gap-3.5">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.key}
              metric={metric}
              onClick={openMetric(metric)}
            />
          ))}
        </div>
      </section>

      {insights.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-brand-strong" strokeWidth={2.25} />
            <h3 className="eyebrow">{t("profile.quickInsights")}</h3>
          </div>
          <ul className="mt-3 space-y-2.5">
            {insights.map((line) => (
              <li
                key={line}
                className="rounded-card bg-surface-2 px-4 py-3.5 text-sm leading-relaxed font-medium text-ink ring-1 ring-ink/5"
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Where the figures above came from, and when they were last pulled.
          Last in the tab on purpose: a reader who has scrolled this far is
          asking about provenance, and leading with it would crowd the
          at-a-glance cards this tab exists for. */}
      <DataFreshnessBlock tier={subject.tier} />
    </div>
  );
}

function MetricCard({ metric, onClick }) {
  const Icon = METRIC_ICON[metric.key] ?? Scale;
  // Both branches are motion components (never a plain string tag) so
  // `whileHover`/`whileTap` are always valid props, even on the
  // non-interactive cards where they're passed as `undefined`.
  const Tag = onClick ? motion.button : motion.div;

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      whileHover={onClick ? { y: -2 } : undefined}
      transition={SPRING_POP}
      className={`flex flex-col gap-2.5 rounded-card bg-surface p-4 text-left shadow-card ring-1 ring-ink/5 ${
        onClick ? "transition-shadow hover:shadow-lift" : ""
      }`}
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-brand-wash text-brand-strong">
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
      <span>
        <span className="block text-[11px] leading-tight font-semibold text-muted">
          {metric.label}
        </span>
        {/* Wraps rather than truncates. The clip was here to protect the card
            from a full party name ("Bharatiya Janata Party"); with that metric
            gone, the only values left are short enough to wrap to a second
            line, and clipping them just produced "Tap to view break…". */}
        <span
          className={`mt-0.5 block font-display text-sm leading-snug font-bold text-balance ${
            metric.muted ? "text-faint" : "text-ink"
          }`}
        >
          {metric.value}
        </span>
      </span>
      {metric.key === "verdict" && (metric.slap > 0 || metric.rose > 0) && (
        <VerdictBar slap={metric.slap} rose={metric.rose} />
      )}
      {metric.tappable && <TapHint />}
    </Tag>
  );
}

/** The "this is interactive" affordance the Declared Assets card needs. */
function TapHint() {
  const { t } = useTranslation();

  return (
    <span className="mt-0.5 flex items-center gap-0.5 text-[11px] font-semibold text-brand-strong">
      {t("profile.tapForDetails")}
      <ChevronRight className="size-3" strokeWidth={2.5} />
    </span>
  );
}

function VerdictBar({ slap, rose }) {
  const total = slap + rose || 1;
  const slapShare = (slap / total) * 100;
  return (
    <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-rule">
      <motion.span
        className="h-full bg-slap"
        initial={{ width: 0 }}
        animate={{ width: `${slapShare}%` }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      />
      <motion.span
        className="h-full bg-laurel"
        initial={{ width: 0 }}
        animate={{ width: `${100 - slapShare}%` }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      />
    </span>
  );
}
