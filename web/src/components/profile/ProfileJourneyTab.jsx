"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, MapPin, Sparkle, Vote } from "lucide-react";
import { useState } from "react";

import { Badge } from "../ui/Badge";
import { useTimeline } from "@/hooks/useTimeline";
import { useTranslation } from "@/lib/i18n";
import { placeOf } from "@/lib/profile";
import { ErrorNote } from "@/components/ui/ErrorNote";

/**
 * The Political Journey tab: one chronological timeline combining career and
 * wealth, per milestone.
 *
 * Milestones come from `POST /get-timeline`, keyed on the politician's name and
 * designation. The request is made when this tab mounts — which only happens
 * once the user selects it, since `ProfilePanel` renders tabs conditionally —
 * so nothing is fetched on page load.
 */
export function ProfileJourneyTab({ subject, onOpenAssets }) {
  const { t } = useTranslation();
  // MPs read from their own table via their own endpoint; `useTimeline` picks
  // the right one. Everything below is shared.
  const { entries, isPending, isError, error } = useTimeline({ subject });

  // The Declared Assets sheet always shows the LATEST declaration, so exactly
  // one card may link to it: the newest one carrying a figure. `isCurrent`
  // can't be used for this — a politician holds several offices at once
  // (Fadnavis is simultaneously Chief Minister and a sitting MLA), so more
  // than one entry is legitimately "current". Entries arrive newest-first.
  const latestAssetIndex = entries.findIndex((entry) => entry.totalAssets !== null);

  if (isPending) return <TimelineSkeleton />;

  if (isError) {
    return (
      <div className="pb-6">
        <ErrorNote error={error} />
      </div>
    );
  }

  return (
    <div className="pb-6">
      {entries.length > 0 && (
        <ol className="relative space-y-4 pl-5">
          {/* The rail. It and every node are centred on the same axis with
              `-translate-x-1/2`, so the line meets each circle's middle no
              matter how tall a card grows or how the text wraps — the two used
              to state their own left edges and sat 3.5px apart. `left-1` here
              and `left-[-1rem]` on the node are the same x: the node is inside
              the list item, which starts at the list's `pl-5`. */}
          <span
            aria-hidden
            className="absolute top-2 bottom-2 left-1 w-px -translate-x-1/2 bg-rule"
          />
          {entries.map((entry, index) => (
            <TimelineCard
              key={`${entry.year}-${entry.role}-${index}`}
              entry={entry}
              subject={subject}
              // Only the newest declaration links through — see below.
              onOpenAssets={index === latestAssetIndex ? onOpenAssets : undefined}
            />
          ))}
        </ol>
      )}

      {entries.length > 0 && <SourceNote entries={entries} />}

      {entries.length === 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-card bg-surface-2 px-4 py-3.5 ring-1 ring-ink/5">
          <Sparkle className="mt-0.5 size-4 shrink-0 text-faint" strokeWidth={2} />
          <p className="text-xs leading-relaxed font-medium text-muted">
            {t("profile.journeyEmpty")}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Where these milestones came from, one link per distinct source site.
 * Grouped by host rather than listed per entry — a ten-milestone timeline
 * carries a dozen source links, and the point is attribution, not a bibliography.
 */
function SourceNote({ entries }) {
  const { t } = useTranslation();
  const byHost = new Map();
  for (const entry of entries) {
    for (const source of entry.sources ?? []) {
      const host = hostLabel(source.url);
      if (host && !byHost.has(host)) byHost.set(host, source.url);
    }
  }
  if (byHost.size === 0) return null;

  return (
    <p className="mt-5 text-[11px] leading-relaxed font-medium text-faint">
      {t("profile.source")}{" "}
      {[...byHost.entries()].map(([label, url], index) => (
        <span key={label}>
          {index > 0 && " · "}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted underline underline-offset-2"
          >
            {label}
          </a>
        </span>
      ))}
    </p>
  );
}

/** "myneta.info" → "MyNeta", "en.wikipedia.org" → "Wikipedia". */
function hostLabel(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("myneta")) return "MyNeta (ADR)";
    if (host.includes("wikipedia")) return "Wikipedia";
    return host;
  } catch {
    return null;
  }
}

function TimelineCard({ entry, subject, onOpenAssets }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // The endpoint returns no constituency, so a place is only shown for the
  // current position, where the subject already carries one.
  const place = entry.isCurrent ? placeOf(subject) : null;
  const period = formatPeriod(entry, t);
  const hasAssets = entry.totalAssets !== null;
  // `onOpenAssets` is only passed down to the newest declaration; every other
  // card renders its figure as plain text, since the sheet would otherwise
  // show 2024 numbers under a 2004 heading.
  const assetsClickable = hasAssets && Boolean(onOpenAssets);

  return (
    <li className="relative">
      <span
        aria-hidden
        className="absolute top-1.5 left-[-1rem] size-3 -translate-x-1/2 rounded-full bg-laurel ring-4 ring-laurel-wash"
      />

      <div className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-ink/5">
        {/* A row of siblings, not one button: the assets chip is its own tap
            target, and an interactive element cannot be nested inside another. */}
        <div className="flex w-full items-center gap-2 px-4 py-3.5">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="min-w-0 flex-1 text-left"
          >
            <span className="eyebrow">
              {entry.isCurrent ? t("profile.current") : (entry.year ?? "")}
            </span>
            <p className="mt-0.5 font-display text-base font-bold text-ink">
              {entry.role}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {entry.party && (
                <Badge tone="brand" size="sm">
                  {entry.party}
                </Badge>
              )}
              {place && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                  <MapPin className="size-3" strokeWidth={2.5} />
                  {place}
                </span>
              )}
            </div>
          </button>

          {hasAssets &&
            (assetsClickable ? (
              <button
                type="button"
                onClick={onOpenAssets}
                aria-label={t("profile.assetsChipAria", {
                  amount: formatCompactInr(entry.totalAssets),
                })}
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-brand-wash px-2.5 py-1 text-xs font-bold text-brand-strong"
              >
                {formatCompactInr(entry.totalAssets)}
                <ChevronRight className="size-3" strokeWidth={2.5} />
              </button>
            ) : (
              // Static: no chevron and a neutral fill, so it doesn't read as
              // tappable when it isn't.
              <span className="inline-flex shrink-0 items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-muted">
                {formatCompactInr(entry.totalAssets)}
              </span>
            ))}

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? t("profile.collapse") : t("profile.expand")}
            className="shrink-0 text-muted"
          >
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.18 }}
              className="block"
            >
              <ChevronDown className="size-4" strokeWidth={2.5} />
            </motion.span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-1.5 border-t border-rule px-4 py-3.5 text-xs leading-relaxed font-medium text-muted">
                <p>{period ?? t("profile.noFinancials")}</p>
                {/* How the seat was won, where the record says so. Absent on
                    an appointment, and on every milestone from the older
                    `politicians` source, which stores neither. */}
                {entry.electionType && (
                  <p className="flex items-center gap-1.5">
                    <Vote className="size-3 shrink-0" strokeWidth={2.5} />
                    {entry.electionType}
                  </p>
                )}
                {entry.entryMode && (
                  <p className="flex items-center gap-1.5">
                    <Sparkle className="size-3 shrink-0" strokeWidth={2.5} />
                    {entry.entryMode}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  );
}

/** "₹13.27 Cr" / "₹45.20 L" — compact, since this sits inline on a card. */
function formatCompactInr(value) {
  if (value === null || value === undefined) return "";
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`;
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

/** "Mar 1997 – Feb 1999", or "Since Dec 2024" while still held. */
function formatPeriod(entry, t) {
  const start = formatDate(entry.startDate);
  const end = formatDate(entry.endDate);
  if (!start && !end) return null;
  if (start && !end)
    return entry.isCurrent
      ? `${t("profile.since")} ${start}`
      : `${t("profile.from")} ${start}`;
  if (!start && end) return `${t("profile.until")} ${end}`;
  return `${start} – ${end}`;
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // Pinned to en-IN in every language: digits stay Latin (1,23,456 / "Mar
  // 1997") rather than becoming Devanagari numerals, which is what a Hindi
  // locale would produce and is not wanted here.
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function TimelineSkeleton() {
  return (
    <div className="pb-6">
      <ol className="relative animate-pulse space-y-4 pl-5">
        <span
          aria-hidden
          className="absolute top-2 bottom-2 left-1 w-px -translate-x-1/2 bg-rule"
        />
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="relative">
            <span
              aria-hidden
              className="absolute top-1.5 left-[-1rem] size-3 -translate-x-1/2 rounded-full bg-rule"
            />
            <div className="rounded-card bg-surface px-4 py-3.5 shadow-card ring-1 ring-ink/5">
              <span className="block h-2.5 w-12 rounded bg-rule" />
              <span
                className="mt-2 block h-3.5 rounded bg-rule"
                style={{ width: `${72 - i * 8}%` }}
              />
              <span className="mt-2 block h-3 w-16 rounded bg-rule" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
