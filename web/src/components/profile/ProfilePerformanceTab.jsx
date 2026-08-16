"use client";

import { PerformanceDevelopment } from "./performance/PerformanceDevelopment";
import { PerformanceParliament } from "./performance/PerformanceParliament";
import { PerformancePromises } from "./performance/PerformancePromises";
import { PerformanceTransparency } from "./performance/PerformanceTransparency";
import { useMpPerformance } from "@/hooks/useMpPerformance";
import { useTranslation } from "@/lib/i18n";
import { ErrorNote } from "@/components/ui/ErrorNote";

/**
 * The Performance tab: an MP's record, section by section.
 *
 * Everything shown here comes from the database via `/get-mp-performance` —
 * nothing about any politician is written into this file. Sections whose
 * source has no data for this MP render their own "not on record" state rather
 * than disappearing, so the reader can tell a gap in the data from a gap in
 * the person's record.
 *
 * There is deliberately no overall score, grade or ranking. The tab presents
 * figures and says where each came from; drawing them together into one number
 * would be an opinion, and this is not the surface for one.
 *
 * The request fires when this tab mounts, which is when the reader selects it
 * — `ProfilePanel` renders tabs conditionally — so a profile page load costs
 * nothing extra.
 */
export function ProfilePerformanceTab({ subject, onOpenAssets }) {
  const { t } = useTranslation();
  const { performance, isPending, isError, error } = useMpPerformance({ subject });

  if (subject?.tier !== "mp") {
    return (
      <div className="pb-6">
        <p className="rounded-card bg-surface-2 px-4 py-3.5 text-xs leading-relaxed font-medium text-muted ring-1 ring-ink/5">
          {t("performance.mpOnly")}
        </p>
      </div>
    );
  }

  if (isPending) return <PerformanceSkeleton />;

  if (isError) {
    return (
      <div className="pb-6">
        <ErrorNote error={error} />
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="pb-6">
        <p className="rounded-card bg-surface-2 px-4 py-3.5 text-xs leading-relaxed font-medium text-muted ring-1 ring-ink/5">
          {t("performance.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-7">
      <PerformanceDevelopment
        mpId={subject.id}
        development={performance.development}
      />
      <PerformanceParliament mpId={subject.id} parliament={performance.parliament} />
      <PerformancePromises promises={performance.promises} />
      <PerformanceTransparency
        transparency={performance.transparency}
        onOpenAssets={onOpenAssets}
      />
      <p className="text-[11px] leading-relaxed font-medium text-faint">
        {t("performance.footnote")}
      </p>
    </div>
  );
}

/** Mirrors the real layout — two stat rows then a list — so the tab does not
 *  jump when the data lands. */
function PerformanceSkeleton() {
  return (
    <div className="animate-pulse space-y-6 pb-7">
      <span className="block h-2.5 w-24 rounded bg-rule" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="rounded-card bg-surface p-3.5 shadow-card ring-1 ring-ink/5"
          >
            <span className="block h-2.5 w-16 rounded bg-rule" />
            <span className="mt-2 block h-4 w-20 rounded bg-rule" />
          </div>
        ))}
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="rounded-card bg-surface px-4 py-3.5 shadow-card ring-1 ring-ink/5"
          >
            <span
              className="block h-3.5 rounded bg-rule"
              style={{ width: `${78 - index * 9}%` }}
            />
            <span className="mt-2 block h-2.5 w-24 rounded bg-rule" />
          </div>
        ))}
      </div>
    </div>
  );
}
