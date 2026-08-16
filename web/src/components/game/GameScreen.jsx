"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowLeft, Share2 } from "lucide-react";

import { RepresentativeCard } from "@/components/RepresentativeCard";
import { GamePageSkeleton } from "@/components/skeletons/GamePageSkeleton";
import { TodaysHighlight } from "@/components/TodaysHighlight";
import { useTopperSelection } from "@/hooks/useTopperSelection";
import { usesAngryVerdict } from "@/lib/angryVerdict";
import { useTranslation } from "@/lib/i18n";
import { useLocationState } from "@/lib/location";
import { rise, SPRING_POP } from "@/lib/motion";
import { NAV_CONTROL_SHAPE, NAV_MENU_BUTTON, NAV_SURFACE } from "@/lib/navStyles";
import { buildShareMessage, buildShareUrl } from "@/lib/share";
import { subjectKeyOf, useResolvedSubject, useSubjectSelection } from "@/lib/subject";
import { Toast } from "@/components/ui/Toast";

/**
 * The Slap/Rose game — a page of its own at `/game`, reached by a real
 * navigation and left by one.
 *
 * A page, not a sheet: it has the app's own page frame (the same column width,
 * the same gutters, the same floating glass bar at the top) rather than a panel
 * over a backdrop. The card, the verdict buttons and the whole vote
 * choreography are the originals, unchanged.
 *
 * Today's Highlights lives here rather than on the information page, which is
 * where it belongs — most slapped, most loved and most judged are all outcomes
 * of this screen, and tapping one swaps the game to that person.
 */
export function GameScreen() {
  const { t } = useTranslation();
  const { coords } = useLocationState();
  const { subject, isPending } = useResolvedSubject(coords);
  const { lastVote, setLastVote } = useSubjectSelection();

  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }, []);

  // A highlight tile swaps the subject in place — the reader stays on the game
  // and is now judging whoever they tapped.
  const { selectTopper, pendingKey } = useTopperSelection({
    onError: () => showToast(t("common.profileFailed")),
  });

  const key = subjectKeyOf(subject);
  const lastChoice = lastVote?.key === key ? lastVote.choice : null;

  // The lightweight reward beat after a verdict commits.
  const handleVoteCast = useCallback(
    (next) => {
      setLastVote({ key, choice: next });
      // The negative toast follows whichever disc the reader actually saw.
      const negative = usesAngryVerdict(subject)
        ? "vote.angryRecorded"
        : "vote.slapRecorded";
      showToast(t(next === "slap" ? negative : "vote.roseRecorded"));
    },
    [key, subject, setLastVote, showToast, t],
  );

  const handleShare = useCallback(async () => {
    if (!subject || typeof window === "undefined") return;
    // Withheld for a subject the coordinates don't point at — sharing the home
    // location there would send the recipient to the wrong person.
    const url = buildShareUrl(subject, subject.isHome ? coords : null);
    const text = buildShareMessage(subject, lastChoice);

    try {
      if (navigator.share) {
        await navigator.share({ title: "MyNetaji", text, url });
        return;
      }
    } catch {
      /* user cancelled the native sheet — fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      showToast(t("share.copied"));
    } catch {
      showToast(t("share.failed"));
    }
  }, [subject, coords, lastChoice, showToast, t]);

  // The same skeleton the route boundary shows, so the hand-off from the
  // router's loading state to the page's own is invisible.
  if (!subject && isPending && coords) {
    return (
      <GamePageSkeleton
        status={{
          label: t("status.locatingState"),
          detail: t("status.locatingDetail"),
        }}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-3 px-4 pt-2 sm:px-6 sm:pt-3">
      <motion.header
        {...rise(0)}
        className="flex shrink-0 items-center gap-2.5 pt-1 pb-3 sm:pb-4"
      >
        {/* Back to the information page. A link, not a history pop: the reader
            may have arrived here from anywhere, and "back" on this page means
            the page this one is about. */}
        <Link
          href="/"
          aria-label={t("nav.back")}
          className={`${NAV_MENU_BUTTON} ${NAV_SURFACE} text-ink transition-colors hover:text-brand-strong`}
        >
          <ArrowLeft className="size-5" strokeWidth={2.25} />
        </Link>

        <div
          className={`flex min-w-0 flex-1 items-center gap-3 py-2 pr-2 pl-4 ${NAV_SURFACE}`}
        >
          <p className="shrink-0 font-display text-lg leading-none font-bold tracking-tight text-ink">
            {t("game.title")}
          </p>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <motion.button
              type="button"
              onClick={handleShare}
              aria-label={t("nav.share")}
              whileTap={{ scale: 0.95 }}
              transition={SPRING_POP}
              // Both colours come from the same branch: see `NAV_CONTROL_SHAPE`.
              className={`${NAV_CONTROL_SHAPE} flex size-9 shrink-0 items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                lastChoice
                  ? "bg-slap text-white"
                  : "bg-surface text-muted hover:text-ink"
              }`}
            >
              <Share2 className="size-4" strokeWidth={2.2} />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {subject ? (
        <RepresentativeCard
          key={key}
          subject={subject}
          keySeed={key}
          onFirstVote={handleVoteCast}
        />
      ) : (
        <NoSubject />
      )}

      <motion.div {...rise(0.18)} className="pb-4">
        <TodaysHighlight onSelectSubject={selectTopper} pendingKey={pendingKey} />
      </motion.div>

      <Toast message={toast} className="bottom-10 whitespace-nowrap" />
    </main>
  );
}

/**
 * Reached by opening `/game` cold — no coordinates have been granted in this
 * tab, so there is nobody to judge yet. It points back at the page that asks.
 */
function NoSubject() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[46dvh] flex-1 flex-col items-center justify-center gap-3 rounded-card bg-surface px-8 py-10 text-center shadow-card ring-1 ring-ink/5">
      <span className="text-4xl" aria-hidden>
        🧭
      </span>
      <h2 className="font-display text-lg font-bold text-ink">
        {t("game.noSubjectTitle")}
      </h2>
      <p className="max-w-xs text-sm leading-relaxed font-medium text-muted">
        {t("game.noSubjectBody")}
      </p>
      <Link
        href="/"
        className="mt-1 rounded-full bg-brand px-5 py-2.5 font-display text-sm font-bold text-white shadow-card transition-colors hover:bg-brand-strong"
      >
        {t("game.noSubjectCta")}
      </Link>
    </div>
  );
}

