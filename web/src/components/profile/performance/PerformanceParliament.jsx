"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import {
  ComparisonRow,
  EmptyNote,
  FilterChips,
  Pager,
  SectionHeading,
  SourceLine,
  StatTile,
} from "./PerformanceParts";
import { Badge } from "../../ui/Badge";
import { useMpDebates, useMpQuestions } from "@/hooks/useMpPerformance";
import { useTranslation } from "@/lib/i18n";
import { formatCount, formatDate, formatPercent } from "@/lib/performance";

/**
 * Parliament: attendance, questions, debates, bills and committees.
 *
 * Every headline here is shown beside the national and state averages the
 * source published, and never beside an average computed from whatever rows
 * this database happens to hold — a number that would read as official and
 * would not be. Where a source published no average, the comparison line is
 * simply absent.
 *
 * The session and list sections start collapsed. A sitting MP can carry a
 * hundred-odd questions, and the tab's job on open is the summary; the detail
 * is one tap away for the reader who wants it.
 */
const QUESTION_FILTERS = [
  { value: null, key: "all" },
  { value: "Starred", key: "starred" },
  { value: "Unstarred", key: "unstarred" },
];

export function PerformanceParliament({ mpId, parliament }) {
  const { t } = useTranslation();
  const [questionType, setQuestionType] = useState(null);
  const [questionPage, setQuestionPage] = useState(1);
  const [debatePage, setDebatePage] = useState(1);

  const attendance = parliament?.attendance ?? null;
  const questions = parliament?.questions ?? null;
  const debates = parliament?.debates ?? null;
  const bills = parliament?.bills ?? null;
  const committees = parliament?.committees ?? null;

  const { questions: questionPageData, isPending: questionsPending } = useMpQuestions({
    id: mpId,
    questionType,
    page: questionPage,
    initialPage: questions?.items,
  });
  const { debates: debatePageData, isPending: debatesPending } = useMpDebates({
    id: mpId,
    page: debatePage,
    initialPage: debates?.items,
  });

  const hasAnything =
    attendance?.overall || questions?.total || debates?.total || bills?.privateMemberBills;

  if (!hasAnything) {
    return (
      <section className="space-y-3">
        <SectionHeading title={t("performance.parliament")} />
        <EmptyNote>{t("performance.noParliamentData")}</EmptyNote>
      </section>
    );
  }

  const changeQuestionFilter = (next) => {
    setQuestionType(next);
    setQuestionPage(1);
  };

  return (
    <section className="space-y-4">
      <SectionHeading
        title={t("performance.parliament")}
        hint={
          parliament.term && parliament.periodEnd
            ? t("performance.termThrough", {
                term: parliament.term,
                date: formatDate(parliament.periodEnd),
              })
            : parliament.term
        }
      />

      <div className="rounded-card bg-surface p-3.5 shadow-card ring-1 ring-ink/5">
        <StatShell
          label={t("performance.attendance")}
          display={formatPercent(attendance?.overall?.value)}
          metric={attendance?.overall}
        />
        <ComparisonRow
          value={attendance?.overall?.value}
          comparisons={attendance?.comparisons}
          format={formatPercent}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricWithComparison
          label={t("performance.questions")}
          metric={questions?.total}
          comparisons={questions?.comparisons}
        />
        <MetricWithComparison
          label={t("performance.debates")}
          metric={debates?.total}
          comparisons={debates?.comparisons}
        />
        <MetricWithComparison
          label={t("performance.privateMemberBills")}
          metric={bills?.privateMemberBills}
          comparisons={bills?.comparisons}
        />
        <StatTile
          label={t("performance.billDebates")}
          display={formatCount(bills?.participated?.value)}
          metric={bills?.participated}
        />
      </div>

      {(questions?.starred || questions?.unstarred) && (
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label={t("performance.starred")}
            display={formatCount(questions?.starred?.value)}
            metric={questions?.starred}
          />
          <StatTile
            label={t("performance.unstarred")}
            display={formatCount(questions?.unstarred?.value)}
            metric={questions?.unstarred}
          />
        </div>
      )}

      {attendance?.sessions?.length > 0 && (
        <Collapsible title={t("performance.sessionAttendance")}>
          <ul className="space-y-2">
            {attendance.sessions.map((session) => (
              <li
                key={session.name}
                className="flex items-center justify-between gap-3 rounded-control bg-surface-2 px-3.5 py-2.5"
              >
                <span className="min-w-0 text-xs font-medium text-ink">
                  {session.name}
                </span>
                <span className="shrink-0 font-display text-sm font-bold text-brand-strong">
                  {formatPercent(session.attendance) ?? t("performance.notPublished")}
                </span>
              </li>
            ))}
          </ul>
          <SourceLine
            name={attendance.sessions[0]?.source?.name}
            url={attendance.sessions[0]?.source?.url}
          />
        </Collapsible>
      )}

      {questionPageData?.items?.length > 0 && (
        <Collapsible
          title={t("performance.questionsAsked")}
          count={questions?.total?.value}
        >
          <FilterChips
            ariaLabel={t("performance.questionFilterAria")}
            value={questionType}
            onChange={changeQuestionFilter}
            options={QUESTION_FILTERS.map((option) => ({
              value: option.value,
              label: t(`performance.questionFilter.${option.key}`),
            }))}
          />
          <ul className={`mt-3 space-y-2 ${questionsPending ? "opacity-60" : ""}`}>
            {questionPageData.items.map((question) => (
              <li
                key={question.id}
                className="rounded-control bg-surface-2 px-3.5 py-3"
              >
                <p className="text-xs leading-relaxed font-semibold text-ink">
                  {question.title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted">
                  {question.type && (
                    <Badge tone="neutral" size="sm">
                      {question.type}
                    </Badge>
                  )}
                  {question.ministry && <span>{question.ministry}</span>}
                  {formatDate(question.askedOn) && (
                    <span className="text-faint">{formatDate(question.askedOn)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pager
            page={questionPageData.page}
            pageSize={questionPageData.pageSize}
            total={questionPageData.total}
            hasMore={questionPageData.hasMore}
            onChange={setQuestionPage}
            isPending={questionsPending}
          />
          <SourceLine
            name={questionPageData.items[0]?.source?.name}
            url={questionPageData.items[0]?.source?.url}
          />
        </Collapsible>
      )}

      {debatePageData?.items?.length > 0 && (
        <Collapsible title={t("performance.debatesTaken")} count={debates?.total?.value}>
          <ul className={`space-y-2 ${debatesPending ? "opacity-60" : ""}`}>
            {debatePageData.items.map((debate) => (
              <li key={debate.id} className="rounded-control bg-surface-2 px-3.5 py-3">
                <p className="text-xs leading-relaxed font-semibold text-ink">
                  {debate.title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted">
                  {debate.type && (
                    <Badge tone={debate.isBill ? "brand" : "neutral"} size="sm">
                      {debate.type}
                    </Badge>
                  )}
                  {formatDate(debate.date) && (
                    <span className="text-faint">{formatDate(debate.date)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pager
            page={debatePageData.page}
            pageSize={debatePageData.pageSize}
            total={debatePageData.total}
            hasMore={debatePageData.hasMore}
            onChange={setDebatePage}
            isPending={debatesPending}
          />
          <SourceLine
            name={debatePageData.items[0]?.source?.name}
            url={debatePageData.items[0]?.source?.url}
          />
        </Collapsible>
      )}

      <div>
        <SectionHeading title={t("performance.committees")} />
        <div className="mt-2">
          {committees?.items?.length > 0 ? (
            <ul className="space-y-2">
              {committees.items.map((committee) => (
                <li
                  key={committee.name}
                  className="rounded-control bg-surface-2 px-3.5 py-3"
                >
                  <p className="text-xs font-semibold text-ink">{committee.name}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-muted">
                    {[committee.role, committee.type].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>{t("performance.noCommitteeData")}</EmptyNote>
          )}
        </div>
      </div>
    </section>
  );
}

/** A `StatTile`'s innards without its card, for use inside a wider card. */
function StatShell({ label, display, metric }) {
  return (
    <StatTile label={label} display={display} metric={metric} emphasis tone="brand" />
  );
}

function MetricWithComparison({ label, metric, comparisons }) {
  return (
    <div>
      <StatTile label={label} display={formatCount(metric?.value)} metric={metric} />
      <ComparisonRow
        value={metric?.value}
        comparisons={comparisons}
        format={formatCount}
      />
    </div>
  );
}

/** A titled section that opens on tap, for the long lists. */
function Collapsible({ title, count, children }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-card bg-surface p-1 shadow-card ring-1 ring-ink/5">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="font-display text-sm font-bold text-ink">
          {title}
          {count !== null && count !== undefined && (
            <span className="ml-1.5 text-xs font-semibold text-faint">
              {formatCount(count)}
            </span>
          )}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          className="shrink-0 text-muted"
        >
          <ChevronDown className="size-4" strokeWidth={2.5} />
        </motion.span>
      </button>
      <span className="sr-only">{open ? t("profile.collapse") : t("profile.expand")}</span>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pt-1 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
