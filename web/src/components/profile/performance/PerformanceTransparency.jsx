"use client";

import { ChevronRight } from "lucide-react";

import { EmptyNote, SectionHeading, SourceLine } from "./PerformanceParts";
import { useTranslation } from "@/lib/i18n";
import { formatInr } from "@/lib/performance";

/**
 * Transparency: the affidavit facts, read from where they already live.
 *
 * `mps` and `mp_wealth_declaration` are joined by the API rather than copied
 * into the performance tables, so this is the same declaration the Overview
 * and Journey tabs show — one record, one set of numbers, one place to correct
 * if it is ever wrong. The full breakdown stays in the Declared Assets sheet
 * this links to, rather than being rebuilt here.
 */
export function PerformanceTransparency({ transparency, onOpenAssets }) {
  const { t } = useTranslation();

  if (!transparency) {
    return (
      <section className="space-y-3">
        <SectionHeading title={t("performance.transparency")} />
        <EmptyNote>{t("performance.noTransparencyData")}</EmptyNote>
      </section>
    );
  }

  // Education moved to the profile Overview, where the rest of the
  // who-this-person-is facts live; criminal cases are shown there too, so
  // repeating either here was the same fact twice on one screen. What stays is
  // the money — the part the Performance sections are actually about.
  const rows = [
    [t("profile.declaredAssets"), formatInr(transparency.declaredAssets)],
    [t("performance.declaredLiabilities"), formatInr(transparency.declaredLiabilities)],
    [
      t("performance.affidavit"),
      transparency.electionName ??
        (transparency.electionYear ? String(transparency.electionYear) : null),
    ],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  return (
    <section className="space-y-3">
      <SectionHeading
        title={t("performance.transparency")}
        hint={t("performance.transparencyHint")}
      />

      {rows.length > 0 ? (
        <div className="rounded-card bg-surface px-4 py-2 shadow-card ring-1 ring-ink/5">
          <dl className="divide-y divide-rule">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-xs font-medium text-muted">{label}</dt>
                <dd className="font-display text-sm font-bold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <EmptyNote>{t("performance.noTransparencyData")}</EmptyNote>
      )}

      {onOpenAssets && transparency.declaredAssets !== null && (
        <button
          type="button"
          onClick={onOpenAssets}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-strong"
        >
          {t("performance.viewAssetBreakdown")}
          <ChevronRight className="size-3.5" strokeWidth={2.5} />
        </button>
      )}

      {/* Localised, with the API's wording as the fallback — same reasoning as
          the MPLADS note in the Development section. */}
      {transparency.note && (
        <p className="text-[11px] leading-relaxed font-medium text-faint">
          {t("performance.affidavitNote") === "performance.affidavitNote"
            ? transparency.note
            : t("performance.affidavitNote")}
        </p>
      )}

      <SourceLine
        name={transparency.source?.name}
        url={transparency.source?.url}
      />
    </section>
  );
}
