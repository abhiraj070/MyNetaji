"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";

import {
  EmptyNote,
  FilterChips,
  Pager,
  SectionHeading,
  SourceLine,
  StatTile,
} from "./PerformanceParts";
import { Badge } from "../../ui/Badge";
import { useMpWorks } from "@/hooks/useMpPerformance";
import { useTranslation } from "@/lib/i18n";
import {
  STATUS_TONE,
  WORK_FILTERS,
  formatCount,
  formatDate,
  formatInr,
  formatInrExact,
  formatPercent,
} from "@/lib/performance";

/**
 * Development: MPLADS funds, the works they paid for, and the works themselves.
 *
 * The note under the fund figures is not decoration. MPLADS is the single most
 * misread number on an Indian MP's record — it is a constituency budget the
 * district authority spends, not the MP's money — so the distinction is stated
 * where the money is shown rather than buried in a footer.
 */
export function PerformanceDevelopment({ mpId, development }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const funds = development?.funds ?? null;
  const summary = development?.summary ?? null;
  const { works, isPending } = useMpWorks({
    id: mpId,
    status: filter,
    page,
    initialPage: development?.works,
  });

  const changeFilter = (next) => {
    setFilter(next);
    // A page number belongs to a list, and this is a different list.
    setPage(1);
  };

  if (!summary || (summary.totalWorks === 0 && !funds)) {
    return (
      <section className="space-y-3">
        <SectionHeading title={t("performance.development")} />
        <EmptyNote>{t("performance.noDevelopmentData")}</EmptyNote>
      </section>
    );
  }

  const counts = {
    all: summary.totalWorks,
    completed: summary.completed,
    ongoing: summary.ongoing,
    pending: summary.pending,
  };

  return (
    <section className="space-y-4">
      <SectionHeading
        title={t("performance.development")}
        hint={funds?.period ? t("performance.forTenure", { tenure: funds.period }) : null}
      />

      {funds && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label={t("performance.fundsAllocated")}
              display={formatInr(funds.allocated?.value)}
              metric={funds.allocated}
              sub={formatInrExact(funds.allocated?.value)}
            />
            <StatTile
              label={t("performance.fundsUtilised")}
              display={formatInr(funds.utilised?.value)}
              metric={funds.utilised}
              sub={formatInrExact(funds.utilised?.value)}
            />
            <StatTile
              label={t("performance.fundsUnspent")}
              display={formatInr(funds.unspent?.value)}
              metric={funds.unspent}
            />
            <StatTile
              label={t("performance.utilisationRate")}
              display={formatPercent(funds.utilisationRate?.value)}
              metric={funds.utilisationRate}
              tone="brand"
            />
          </div>

          {/* `released` comes back as a real metric with a null value: the
              eSAKSHI portal publishes no per-MP released figure, and saying so
              is more honest than omitting the row and letting the reader
              assume utilisation is the whole story. */}
          {funds.released && funds.released.value === null && (
            <p className="text-[11px] leading-relaxed font-medium text-faint">
              {t("performance.releasedNotPublished")}
            </p>
          )}

          {/* The API sends this note so the caveat travels with the money it
              qualifies; it is rendered from the translation file so it reaches
              a Hindi reader in Hindi, with the API's own wording as the
              fallback. It is UI copy about how the scheme works, not a fact
              about this politician — nothing here is hardcoded political data. */}
          {funds.note && (
            <p className="rounded-card bg-sun-wash px-4 py-3 text-[11px] leading-relaxed font-medium text-sun-strong ring-1 ring-sun/20 ring-inset">
              {t("performance.mpladsNote") === "performance.mpladsNote"
                ? funds.note
                : t("performance.mpladsNote")}
            </p>
          )}
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label={t("performance.totalWorks")}
          display={formatCount(summary.totalWorks)}
        />
        <StatTile
          label={t("performance.completionRate")}
          display={formatPercent(summary.completionRate?.value)}
          metric={summary.completionRate}
          tone="laurel"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          label={t("performance.completed")}
          display={formatCount(summary.completed)}
          tone="laurel"
        />
        <StatTile
          label={t("performance.ongoing")}
          display={formatCount(summary.ongoing)}
          tone="brand"
        />
        <StatTile
          label={t("performance.pending")}
          display={formatCount(summary.pending)}
          tone="muted"
        />
      </div>

      {/* Works whose stage the scheme did not name, or that this pipeline has
          not classified. Counted in the total, never quietly filed as ongoing. */}
      {summary.unclassified > 0 && (
        <p className="text-[11px] leading-relaxed font-medium text-faint">
          {t("performance.unclassifiedWorks", { count: summary.unclassified })}
        </p>
      )}

      <div>
        <SectionHeading title={t("performance.projects")} />
        <div className="mt-2">
          <FilterChips
            ariaLabel={t("performance.filterAria")}
            value={filter}
            onChange={changeFilter}
            options={WORK_FILTERS.map((key) => ({
              value: key,
              label: t(`performance.filter.${key}`),
              count: counts[key],
            }))}
          />
        </div>

        {works && works.items.length > 0 ? (
          <>
            <ul className={`mt-3 space-y-2.5 ${isPending ? "opacity-60" : ""}`}>
              {works.items.map((work) => (
                <WorkCard key={work.id} work={work} />
              ))}
            </ul>
            <Pager
              page={works.page}
              pageSize={works.pageSize}
              total={works.total}
              hasMore={works.hasMore}
              onChange={setPage}
              isPending={isPending}
            />
            <SourceLine
              name={works.items[0]?.source?.name}
              url={works.items[0]?.source?.url}
            />
          </>
        ) : (
          <div className="mt-3">
            <EmptyNote>
              {filter === "all"
                ? t("performance.noWorks")
                : t("performance.noWorksForFilter")}
            </EmptyNote>
          </div>
        )}
      </div>
    </section>
  );
}

function WorkCard({ work }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const place = [work.location, work.constituency].filter(Boolean).join(" · ");
  const amount = formatInr(work.sanctionedAmount ?? work.recommendedAmount);

  return (
    <li className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-ink/5">
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-2.5 px-4 py-3.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm leading-snug font-bold text-balance text-ink">
            {work.name}
          </span>

          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            {work.statusGroup && (
              <Badge tone={STATUS_TONE[work.statusGroup] ?? "neutral"} size="sm">
                {/* The scheme's own wording, not our bucket name: "Physical
                    Inspection/Account Closure" says more than "ongoing". */}
                {work.status ?? t(`performance.filter.${work.statusGroup}`)}
              </Badge>
            )}
            {place && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                <MapPin className="size-3" strokeWidth={2.5} />
                {place}
              </span>
            )}
          </span>
        </span>

        {amount && (
          <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-muted">
            {amount}
          </span>
        )}

        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          className="mt-0.5 block shrink-0 text-muted"
        >
          <ChevronDown className="size-4" strokeWidth={2.5} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-rule px-4 py-3.5 text-xs leading-relaxed font-medium text-muted">
              {work.description && <p className="text-ink">{work.description}</p>}

              <DetailGrid
                rows={[
                  [t("performance.sector"), work.sector],
                  // MPLADS's activity classification is what names the work,
                  // so it is the card's title already; repeated here only on
                  // the rows where the two actually differ.
                  [
                    t("performance.activity"),
                    work.subSector === work.name ? null : work.subSector,
                  ],
                  [t("performance.district"), work.district],
                  [t("performance.implementingAgency"), work.implementingAgency],
                  [t("performance.financialYear"), work.financialYear],
                  [t("performance.recommendedAmount"), formatInrExact(work.recommendedAmount)],
                  [t("performance.sanctionedAmount"), formatInrExact(work.sanctionedAmount)],
                  [t("performance.expenditure"), formatInrExact(work.expenditureAmount)],
                  [t("performance.remaining"), formatInrExact(work.remainingAmount)],
                  [t("performance.recommendedOn"), formatDate(work.recommendedDate)],
                  [t("performance.sanctionedOn"), formatDate(work.sanctionDate)],
                  [t("performance.startedOn"), formatDate(work.startDate)],
                  [t("performance.completedOn"), formatDate(work.completionDate)],
                ]}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/**
 * Label/value pairs, skipping anything the source did not publish.
 *
 * Rows are dropped rather than shown with a dash: a work still awaiting
 * sanction has no sanction date, and printing eight empty rows would bury the
 * four that say something.
 */
function DetailGrid({ rows }) {
  const present = rows.filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (present.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
      {present.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-faint">{label}</dt>
          <dd className="text-right font-semibold text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
