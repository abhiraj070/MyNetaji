"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";
import { useId, useState } from "react";

import { useLeaderboard } from "@/hooks/useLeaderboard";
import { verdictGlyph } from "@/lib/angryVerdict";
import { SPRING_POP } from "@/lib/motion";
import { leaderboardShareUrl } from "@/lib/share";
import { useTranslation } from "@/lib/i18n";

import { ShareButton } from "./ShareButton";
import { monogramOf, titleCase } from "@/lib/text";
import { ErrorNote } from "@/components/ui/ErrorNote";

const TIER_COPY = {
  cm: { scope: "Chief Ministers across India's states" },
  minister: { scope: "India's Union Ministers" },
  mp: { scope: "India's Members of Parliament" },
};

// MLAs are deliberately absent: state assembly members are not part of this
// product, and there is no data source for them.
const TIERS = [
  { value: "cm", label: "Chief Ministers" },
  { value: "minister", label: "Union Ministers" },
  { value: "mp", label: "MPs" },
];

const BOARDS = [
  { value: "slap", emoji: "👋", label: "Slap toppers" },
  { value: "rose", emoji: "🌹", label: "Rose toppers" },
];

/**
 * The full leaderboard: two top-level sections — Chief Ministers and
 * Ministers — each with its own Slap/Rose sub-tabs underneath. That's four
 * independent, independently-paginated rankings in total; switching either tab swaps
 * which one is on screen, it doesn't merge or reset the others.
 *
 * `defaultTier` opens on whichever tier the current representative belongs
 * to. `highlightName` emphasises that representative's own row wherever it
 * appears — it simply won't match on the other tier's rows.
 *
 * `onSelectTopper(tier, topper)` — when provided, every row becomes tappable
 * and opens that person's full profile (handled by the caller). `pendingKey`
 * marks the one row currently being fetched, formatted `"${tier}:${name}"`.
 */
export function Leaderboard({
  defaultTier = "cm",
  highlightName = null,
  onSelectTopper,
  pendingKey,
  showToast,
}) {
  const { t } = useTranslation();
  const [tier, setTier] = useState(defaultTier);
  const [board, setBoard] = useState("slap");

  return (
    <div>
      {/* Shares the live top-3 preview for whichever tier is on screen. */}
      <div className="mb-3 flex justify-end">
        <ShareButton
          url={leaderboardShareUrl(tier)}
          title={t("leaderboard.shareTitle")}
          text={t("leaderboard.shareText")}
          label={t("nav.share")}
          variant="soft"
          showToast={showToast}
        />
      </div>

      <div className="flex justify-center">
        <div className="no-scrollbar max-w-full overflow-x-auto">
          <PillTabs
            options={TIERS}
            value={tier}
            onChange={setTier}
            ariaLabel="Leaderboard tier"
          />
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-muted">
        {TIER_COPY[tier]?.scope}
      </p>

      <div className="mt-4 flex justify-center">
        <PillTabs
          options={BOARDS}
          value={board}
          onChange={setBoard}
          ariaLabel="Leaderboard board"
        />
      </div>

      <div className="mt-4">
        <TierBoard
          tier={tier}
          board={board}
          highlightName={highlightName}
          onSelectTopper={onSelectTopper}
          pendingKey={pendingKey}
        />
      </div>
    </div>
  );
}

/** One of the four independent (tier, board) rankings. */
function TierBoard({ tier, board, highlightName, onSelectTopper, pendingKey }) {
  const query = useLeaderboard(tier, board, true);

  return (
    <div>
      {query.isPending && <SkeletonRows />}

      {query.isError && (
        <ErrorNote error={query.error} />
      )}

      {!query.isPending && !query.isError && (
        <>
          <TopperList
            toppers={query.toppers}
            tier={tier}
            board={board}
            highlightName={highlightName}
            onSelectTopper={onSelectTopper}
            pendingKey={pendingKey}
          />
          {query.hasNextPage && (
            <button
              type="button"
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
              className="mt-3 w-full rounded-full bg-surface-2 py-3 font-display text-sm font-semibold text-brand-strong ring-1 ring-ink/5 transition-colors hover:bg-brand-wash disabled:cursor-not-allowed disabled:opacity-60"
            >
              {query.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * A pill-switcher, reused for the tier tabs, the board sub-tabs and the profile
 * sheet's sections.
 *
 * An option may be `locked`: it still reports its press to `onChange`, but it
 * never takes the pill and never reads as selected. What that press means is
 * the caller's to decide — the profile sheet opens a preview of the feature
 * instead of switching to it — which keeps "what a locked tab does" out of a
 * component whose job is only to draw the row.
 */
export function PillTabs({ options, value, onChange, ariaLabel }) {
  const instanceId = useId();
  const pillId = `lb-pill-${instanceId}`;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative inline-flex shrink-0 rounded-full bg-surface-2 p-1 ring-1 ring-ink/5"
    >
      {options.map((option) => {
        const isLocked = Boolean(option.locked);
        const isActive = !isLocked && value === option.value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`relative z-10 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-display text-xs font-semibold whitespace-nowrap transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              // Held back rather than switched off: it is a real destination,
              // just not one that has opened yet.
              isLocked ? "opacity-60 hover:opacity-80" : ""
            }`}
            style={{ color: isActive ? "var(--color-ink)" : "var(--color-muted)" }}
          >
            {option.emoji && <span aria-hidden>{option.emoji}</span>}
            {option.label}
            {isLocked && <Lock className="size-3" strokeWidth={2.75} aria-hidden />}
            {isActive && (
              <motion.span
                layoutId={pillId}
                aria-hidden
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
                className="absolute inset-0 -z-10 rounded-full bg-surface shadow-card"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

const RANK_BADGES = ["🥇", "🥈", "🥉"];

function TopperList({ toppers, tier, board, highlightName, onSelectTopper, pendingKey }) {
  if (!toppers || toppers.length === 0) {
    return (
      <p className="rounded-control border border-dashed border-rule px-4 py-8 text-center text-sm text-muted">
        {board === "slap"
          ? "No slaps recorded yet — be the first to weigh in."
          : "No roses recorded yet — be the first to weigh in."}
      </p>
    );
  }

  const highlight = String(highlightName ?? "").trim().toLowerCase();

  return (
    <ol className="space-y-1.5">
      <AnimatePresence initial={false}>
        {toppers.map((topper, index) => {
          const name = topper.minister_name ?? topper.name;
          const secondary = formatSecondary(tier, topper);
          const rank = index + 1;
          const badge = RANK_BADGES[index] ?? null;
          const isCurrent =
            highlight && String(name ?? "").trim().toLowerCase() === highlight;
          const rowKey = `${tier}:${name}`;
          const isPending = pendingKey === rowKey;

          return (
            <motion.li
              key={`${board}-${name}-${index}`}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.24,
                delay: index * 0.03,
                ease: [0.2, 0, 0, 1],
              }}
            >
              <button
                type="button"
                onClick={() => onSelectTopper?.(tier, topper)}
                disabled={!onSelectTopper || isPending}
                aria-label={`View ${name}'s profile`}
                className={`flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left ring-1 transition-colors disabled:cursor-wait ${
                  isCurrent
                    ? "bg-brand-wash ring-brand/25"
                    : "ring-transparent hover:bg-surface-2 hover:ring-ink/5"
                } ${isPending ? "opacity-60" : ""}`}
              >
                <span
                  aria-label={`Rank ${rank}`}
                  className="flex w-9 shrink-0 items-center justify-center text-lg tabular-nums"
                >
                  {isPending ? (
                    <Loader2
                      aria-hidden
                      className="size-4 animate-spin text-muted"
                    />
                  ) : badge ? (
                    <span aria-hidden className="text-2xl leading-none">
                      {badge}
                    </span>
                  ) : (
                    <span className="font-display text-sm font-bold text-faint">
                      {String(rank).padStart(2, "0")}
                    </span>
                  )}
                </span>

                <CompactAvatar src={topper.photo_url} name={name} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {name}
                  </p>
                  {secondary && (
                    <p className="truncate text-xs text-muted">{secondary}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Metric
                    value={topper.slap_count ?? 0}
                    /* Same column, same sort — only the glyph differs for the
                       politicians `lib/angryVerdict` covers. */
                    emoji={verdictGlyph(topper)}
                    emphasize={board === "slap"}
                    accentClass="text-slap"
                  />
                  <Metric
                    value={topper.rose_count ?? 0}
                    emoji="🌹"
                    emphasize={board === "rose"}
                    accentClass="text-laurel"
                  />
                </div>
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

/**
 * One count with its glyph. Both metrics show on every row now — the board
 * that's currently active gets the bigger, coloured treatment; the other
 * stays small and muted rather than disappearing, so a leader's overall
 * standing reads at a glance without switching tabs.
 */
function Metric({ value, emoji, emphasize, accentClass }) {
  return (
    <span
      className={`flex items-baseline gap-1 ${emphasize ? accentClass : "text-muted"}`}
    >
      <AnimatedCount
        value={value}
        className={
          emphasize
            ? "text-base font-semibold tabular-nums"
            : "text-xs font-medium tabular-nums"
        }
      />
      <span aria-hidden className={emphasize ? "text-sm" : "text-[10px]"}>
        {emoji}
      </span>
    </span>
  );
}

function AnimatedCount({ value, className }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -6, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING_POP}
      className={className}
    >
      {Number(value).toLocaleString("en-IN")}
    </motion.span>
  );
}

function CompactAvatar({ src, name }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className="size-11 shrink-0 overflow-hidden rounded-full bg-surface-2 ring-1 ring-ink/5">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover object-top"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-full items-center justify-center font-display text-sm font-bold text-faint"
        >
          {monogramOf(name)}
        </span>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <ol className="animate-pulse space-y-2">
      {Array.from({ length: 5 }, (_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-card px-3 py-2.5"
        >
          <span className="w-9 shrink-0" />
          <span className="size-11 shrink-0 rounded-full bg-rule" />
          <span className="flex-1 space-y-1.5">
            <span
              className="block h-3 rounded bg-rule"
              style={{ width: `${70 - i * 6}%` }}
            />
            <span
              className="block h-2.5 rounded bg-rule/60"
              style={{ width: `${45 - i * 3}%` }}
            />
          </span>
          <span className="h-3 w-12 rounded bg-rule" />
        </li>
      ))}
    </ol>
  );
}

function formatSecondary(tier, topper) {
  const party = topper.party?.trim();
  if (tier === "minister") {
    const portfolio = String(topper.ministry ?? "")
      .split(";")[0]
      .trim();
    const cleaned = portfolio
      .replace(
        /^Minister of State \(Independent Charge\) of the Ministry of\s*/i,
        "",
      )
      .replace(/^Minister of State in the Ministry of\s*/i, "")
      .replace(/^Minister of State\s*/i, "")
      .replace(/^Minister of\s*/i, "")
      .trim();
    return [party, cleaned || portfolio].filter(Boolean).join(" · ");
  }
  if (tier === "mp") {
    return [party, titleCase(topper.constituency)].filter(Boolean).join(" · ");
  }
  const state = titleCase(topper.state);
  return [party, state].filter(Boolean).join(" · ");
}
