"use client";

import { Gamepad2, Search, Share2, Trophy } from "lucide-react";

import { IconAction } from "./ui/IconAction";
import { useTranslation } from "@/lib/i18n";
import { useOnboardingTarget } from "@/lib/onboarding";
import { XLogo } from "./x/XLogo";

/**
 * The four secondary actions, gathered into one bar at the foot of the page —
 * previously they were split across three places (Leaderboard in the top bar,
 * Information and Share in the card's corners, Search in a floating button).
 *
 * Icon-only, equal weight: none of these competes with the verdict buttons.
 * Sticky so they stay reachable once the page scrolls, and translucent so the
 * content passing underneath still reads as one page.
 */
export function BottomActions({
  onOpenSearch,
  onOpenLeaderboard,
  onOpenGame,
  onShare,
  onOpenX,
  shareHighlight = false,
}) {
  const { t } = useTranslation();

  // Registers each button with the onboarding layer so the first-run tour can
  // spotlight it. Nothing else changes: these are ref callbacks, so a button
  // that is never toured behaves exactly as before.
  const searchRef = useOnboardingTarget("nav-search");
  const leaderboardRef = useOnboardingTarget("nav-leaderboard");
  const gameRef = useOnboardingTarget("nav-game");
  const discussionRef = useOnboardingTarget("nav-x");

  return (
    // Not sticky itself — the page wraps this in the sticky, entrance-animated
    // container so the two concerns don't nest.
    <nav aria-label={t("nav.actions")} className="shrink-0 pt-1.5 pb-2.5">
      <div className="relative flex items-center justify-around gap-2 rounded-full bg-linear-to-b from-white/92 to-surface/80 px-3 py-2 shadow-lift ring-1 ring-ink/5 backdrop-blur-xl">
        {/* A hairline top rim catches the light and reads the bar as a piece of
            frosted glass floating over the page rather than a flat pill. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-px h-px rounded-full bg-white/70"
        />
        <IconAction
          label={t("nav.search")}
          onClick={onOpenSearch}
          icon={Search}
          anchorRef={searchRef}
        />
        <IconAction
          label={t("nav.leaderboard")}
          onClick={onOpenLeaderboard}
          icon={Trophy}
          anchorRef={leaderboardRef}
        />
        {/* Where Information used to sit. Information is the page now, so
            the slot goes to the thing that left it: the gamepad opens the
            Slap/Rose game on its own route. Same size, same position, same
            styling as every other action — only the destination changed. */}
        <IconAction
          label={t("nav.game")}
          onClick={onOpenGame}
          icon={Gamepad2}
          anchorRef={gameRef}
        />
        <IconAction
          label={t("nav.discussion")}
          onClick={onOpenX}
          icon={XLogo}
          anchorRef={discussionRef}
        />
        <IconAction
          label={t("nav.share")}
          onClick={onShare}
          icon={Share2}
          highlight={shareHighlight}
        />
      </div>
    </nav>
  );
}
