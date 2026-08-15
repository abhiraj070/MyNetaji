"use client";

import { ExternalLink } from "lucide-react";

import { EmptyNote, SectionHeading, StatTile } from "./PerformanceParts";
import { Badge } from "../../ui/Badge";
import { useTranslation } from "@/lib/i18n";
import { formatCount, formatDate } from "@/lib/performance";

/**
 * Promises: the counts, then each promise with the evidence for its status.
 *
 * The empty state is the normal state, and is written to be read as such.
 * Whether a politician kept a promise is the one claim on this tab that cannot
 * be scraped — it needs a human to find and cite evidence — so nothing is
 * shown until someone has. "Nothing recorded yet" is the honest answer, and it
 * is a different sentence from "this MP has kept no promises".
 */
const STATUS_TONE = {
  completed: "laurel",
  in_progress: "brand",
  not_started: "neutral",
  unverified: "neutral",
};

export function PerformancePromises({ promises }) {
  const { t } = useTranslation();
  const summary = promises?.summary ?? null;
  const items = promises?.items ?? [];

  if (!summary || summary.total === 0) {
    return (
      <section className="space-y-3">
        <SectionHeading title={t("performance.promises")} />
        <EmptyNote>{t("performance.noPromises")}</EmptyNote>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SectionHeading
        title={t("performance.promises")}
        hint={t("performance.promisesHint")}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatTile label={t("performance.promisesTotal")} display={formatCount(summary.total)} />
        <StatTile
          label={t("performance.completed")}
          display={formatCount(summary.completed)}
          tone="laurel"
        />
        <StatTile
          label={t("performance.inProgress")}
          display={formatCount(summary.inProgress)}
          tone="brand"
        />
        <StatTile
          label={t("performance.notStarted")}
          display={formatCount(summary.notStarted)}
          tone="muted"
        />
      </div>

      {summary.unverified > 0 && (
        <p className="text-[11px] leading-relaxed font-medium text-faint">
          {t("performance.unverifiedPromises", { count: summary.unverified })}
        </p>
      )}

      <ul className="space-y-2.5">
        {items.map((promise) => (
          <li
            key={promise.id}
            className="rounded-card bg-surface px-4 py-3.5 shadow-card ring-1 ring-ink/5"
          >
            <p className="text-sm leading-relaxed font-semibold text-ink">
              {promise.text}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {promise.status && (
                <Badge tone={STATUS_TONE[promise.status] ?? "neutral"} size="sm">
                  {t(`performance.promiseStatus.${promise.status}`)}
                </Badge>
              )}
              {promise.category && (
                <span className="text-[11px] font-medium text-muted">
                  {promise.category}
                </span>
              )}
              {formatDate(promise.madeOn) && (
                <span className="text-[11px] font-medium text-faint">
                  {formatDate(promise.madeOn)}
                </span>
              )}
            </div>

            {promise.evidence && (
              <p className="mt-2 text-xs leading-relaxed font-medium text-muted">
                {promise.evidence}
              </p>
            )}

            {/* The link is the point: a status without evidence behind it is a
                claim, and the schema refuses to store one. */}
            {promise.evidenceUrl && (
              <a
                href={promise.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-strong underline underline-offset-2"
              >
                {t("performance.viewEvidence")}
                <ExternalLink className="size-3" strokeWidth={2.5} />
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
