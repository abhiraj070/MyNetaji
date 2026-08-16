"use client";

import { BottomSheet } from "./BottomSheet";
import { Leaderboard } from "./Leaderboard";
import { Badge, BADGES } from "./ui/Badge";

export function LeaderboardSheet({
  open,
  onClose,
  tier,
  currentIdentity,
  onSelectTopper,
  pendingKey,
  showToast,
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Leaderboard"
      subtitle="How they stack up nationally"
      // The same fixed height the Search sheet uses. Without it the sheet is
      // sized by its contents: it opens at the height of a few skeleton rows
      // and then jumps to whatever the loaded board measures, which is the
      // resize that made opening the leaderboard feel broken.
      size="tall"
    >
      <div className="mb-4">
        <Badge {...BADGES.hallOfFame} size="sm" tilt />
      </div>

      <Leaderboard
        defaultTier={tier}
        highlightName={currentIdentity}
        onSelectTopper={onSelectTopper}
        pendingKey={pendingKey}
        showToast={showToast}
      />
    </BottomSheet>
  );
}
