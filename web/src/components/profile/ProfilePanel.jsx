"use client";

import { useState } from "react";

import { PillTabs } from "../Leaderboard";
import { AssetBreakdownSheet } from "./AssetBreakdownSheet";
import { PerformancePreviewSheet } from "./PerformancePreviewSheet";
import { ProfileOverviewTab } from "./ProfileOverviewTab";
import { ProfileJourneyTab } from "./ProfileJourneyTab";
import { ProfileManifestosTab } from "./ProfileManifestosTab";
import { ProfilePerformanceTab } from "./ProfilePerformanceTab";
import { useTranslation } from "@/lib/i18n";
import { subjectKeyOf } from "@/lib/subject";

/**
 * The information experience itself: the tab row and whatever tab is open.
 *
 * `stickyTabs` exists for hosts that render this inside a scrolling sheet,
 * where the row should pin to the top of the panel. The page leaves it off:
 * the app bar already owns `top: 0`, and a second sticky element competing for
 * it is how you get two bars overlapping at different breakpoints.
 */

// No emoji here (unlike `PillTabs`'s other uses in Leaderboard.jsx): with
// "Political Journey" already the longest label PillTabs has ever carried,
// an icon on all three would push the row wider than a phone screen.
// Keys, not labels — resolved per render so switching language relabels the
// tabs without remounting anything.
const TABS = [
  { value: "overview", key: "profile.overview" },
  // Performance sits second: it is the substantive record, and burying it
  // behind the party manifesto made the least personal tab the most prominent.
  // Still locked for anyone who is not an MP: Performance is built on MPLADS
  // and Lok Sabha activity, neither of which has a counterpart for a Chief
  // Minister or a Union Minister, so the preview sheet is the honest answer
  // for them rather than an empty dashboard.
  { value: "performance", key: "profile.performance" },
  { value: "journey", key: "profile.journey" },
  { value: "manifestos", key: "profile.manifestos" },
];

export function ProfilePanel({
  subject,
  stickyTabs = false,
  // The tab row scrolls edge to edge, which means cancelling the host's
  // horizontal padding and re-applying it inside the scroller. The two differ
  // (the sheet is `px-6`, the page `px-4 sm:px-6`), so the host states its own
  // rather than the panel assuming one and overflowing in the other.
  bleedClass = "-mx-6",
  gutterClass = "px-6",
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("overview");
  const performanceUnlocked = subject?.tier === "mp";
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);

  // Back to Overview whenever the subject changes — via the React-endorsed
  // "adjust state during render" pattern rather than an effect, so there is no
  // extra render before it applies. Landing on someone new while still holding
  // the previous person's open tab (and their expanded cards) is disorienting.
  const key = subjectKeyOf(subject);
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setTab("overview");
    setAssetsOpen(false);
    setPerformanceOpen(false);
  }

  // While Performance is still locked (everyone who is not an MP), the tab is
  // a door to a preview rather than a section: pressing it leaves the current
  // tab exactly where it was.
  const handleTabChange = (next) => {
    if (next === "performance" && !performanceUnlocked) {
      setPerformanceOpen(true);
      return;
    }
    setTab(next);
  };

  if (!subject) return null;

  return (
    <>
      {/* Four tabs no longer fit across a 375px phone, so the row scrolls
          sideways rather than wrapping to two lines or squeezing the labels.
          `no-scrollbar` hides the bar it would otherwise introduce on desktop. */}
      <div
        className={`${bleedClass} mb-5 pt-1 pb-3 ${
          stickyTabs ? "sticky top-0 z-10 bg-surface" : ""
        }`}
      >
        <div className={`no-scrollbar overflow-x-auto ${gutterClass}`}>
          <PillTabs
            options={TABS.map((entry) => ({
              ...entry,
              label: t(entry.key),
              locked: entry.value === "performance" && !performanceUnlocked,
            }))}
            value={tab}
            onChange={handleTabChange}
            ariaLabel={t("profile.sectionAria")}
          />
        </div>
      </div>

      {tab === "overview" && (
        <ProfileOverviewTab
          subject={subject}
          onOpenAssets={() => setAssetsOpen(true)}
        />
      )}
      {tab === "manifestos" && <ProfileManifestosTab subject={subject} />}
      {tab === "journey" && (
        <ProfileJourneyTab
          subject={subject}
          onOpenAssets={() => setAssetsOpen(true)}
        />
      )}
      {tab === "performance" && performanceUnlocked && (
        <ProfilePerformanceTab
          subject={subject}
          onOpenAssets={() => setAssetsOpen(true)}
        />
      )}

      {/* Both sheets are rendered here as siblings of the tab content rather
          than inside it: `BottomSheet` is `position: fixed`, and an ancestor
          carrying a transform (framer leaves one at rest) would become its
          containing block and mis-position it entirely. */}
      <AssetBreakdownSheet
        open={assetsOpen}
        onClose={() => setAssetsOpen(false)}
        subject={subject}
      />
      <PerformancePreviewSheet
        open={performanceOpen}
        onClose={() => setPerformanceOpen(false)}
      />
    </>
  );
}
