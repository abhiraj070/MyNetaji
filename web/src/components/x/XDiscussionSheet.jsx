"use client";

import { PreviewSheet } from "@/components/comingsoon/PreviewSheet";
import { XPulsePreview } from "./XPulsePreview";
import { XLogo } from "./XLogo";
import { useTranslation } from "@/lib/i18n";

/**
 * The X section.
 *
 * Live X integration is still being built, so the sheet carries a preview of
 * what is coming rather than a feed (see `XPulsePreview`). It keeps its props
 * and its place in the bottom bar, so restoring the feed later means putting a
 * list back inside this shell. The previous feed implementation — this file,
 * `TweetCard` and the `useTweets` hook — is in the git history rather than
 * commented out beneath here.
 *
 * Nothing is fetched while the preview is up: a request whose result can't be
 * shown is a request worth not making.
 */
export function XDiscussionSheet({ open, onClose }) {
  const { t } = useTranslation();

  return (
    <PreviewSheet
      open={open}
      onClose={onClose}
      label={t("comingSoon.x.headerTitle")}
      header={
        <>
          <h2 className="flex items-center gap-2 font-display text-2xl leading-tight font-bold text-ink">
            <XLogo className="size-5" />
            {t("comingSoon.x.headerTitle")}
          </h2>
          <p className="mt-0.5 text-sm font-semibold text-muted">
            {t("comingSoon.x.headerSubtitle")}
          </p>
          {/* The badge the live "Trending about …" pill used to occupy. Same
              shape and colour, so the header keeps its rhythm — but it states
              the section's real status instead of promising fresh posts. */}
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-2.5 py-1 font-display text-[11px] font-semibold text-brand-strong ring-1 ring-brand/15 ring-inset">
            <span aria-hidden>✨</span>
            {t("comingSoon.badge")}
          </span>
        </>
      }
    >
      <XPulsePreview onClose={onClose} />
    </PreviewSheet>
  );
}


// ---------------------------------------------------------------------------
// PRESERVED: the live X feed, exactly as it stood before the preview replaced
// it (commit c23ef85). Kept here rather than left to git history because this
// comes back the moment X integration lands.
//
// To restore: delete the `PreviewSheet` version above, strip the `// ` prefix
// from every line below, and put the file back to what it was. Nothing it
// depends on has moved — `TweetCard`, `TweetSkeleton` and the `useTweets` hook
// are all still on disk, untouched.
//
// Line comments rather than one block comment: the code below contains its own
// `/* … */` comments, which would close an enclosing block early.
// ---------------------------------------------------------------------------

// "use client";
//
// import { AnimatePresence, motion, useDragControls } from "framer-motion";
// import { RefreshCw, X } from "lucide-react";
// import { useEffect } from "react";
//
// import { TweetCard, TweetSkeleton } from "./TweetCard";
// import { XLogo } from "./XLogo";
// import { useTweets } from "@/hooks/useTweets";
// import { SPRING_SHEET } from "@/lib/motion";
//
