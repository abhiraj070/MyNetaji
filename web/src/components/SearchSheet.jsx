"use client";

import { useState } from "react";

import { BottomSheet } from "./BottomSheet";
import { CmCombobox } from "./CmCombobox";
import { MinistryCombobox } from "./MinistryCombobox";
import { MpCombobox } from "./MpCombobox";
import { PillTabs } from "./Leaderboard";
import { useChiefMinisters } from "@/hooks/useChiefMinisters";
import { useMinistries } from "@/hooks/useMinistries";
import { ErrorNote } from "@/components/ui/ErrorNote";

// MLAs are deliberately absent — out of scope, and no data source exists.
const TIERS = [
  { value: "cm", label: "Chief Ministers" },
  { value: "minister", label: "Union Ministers" },
  { value: "mp", label: "MPs" },
];

/**
 * The Search bottom sheet — a Chief Ministers / Ministers tier switcher over
 * the same picker pattern, in a modal so the main screen stays focused on
 * the current representative.
 *
 * `defaultTier` opens on whichever tier the current representative belongs
 * to. `selectedCm`/`selectedMinistry` highlight that pick in its own
 * combobox; `onSelectCm`/`onSelectMinister` fire (and close the sheet) when
 * a result is chosen.
 */
export function SearchSheet({
  open,
  onClose,
  defaultTier = "cm",
  selectedCm,
  selectedMinistry,
  selectedMp,
  onSelectCm,
  onSelectMinister,
  onSelectMp,
}) {
  const [tier, setTier] = useState(defaultTier);

  const { cms, isPending: cmsPending, isError: cmsError, error: cmsErrorObj } =
    useChiefMinisters();
  const {
    entries,
    ministryCount,
    isPending: ministriesPending,
    isError: ministriesError,
    error: ministriesErrorObj,
  } = useMinistries();

  const isCm = tier === "cm";
  const isMp = tier === "mp";
  // The MP picker fetches per query rather than up front, so it owns its own
  // loading and error states — there is nothing to wait for before showing it.
  const isPending = isMp ? false : isCm ? cmsPending : ministriesPending;
  const isError = isMp ? false : isCm ? cmsError : ministriesError;
  const error = isCm ? cmsErrorObj : ministriesErrorObj;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Search"
      size="tall"
      autoFocus
      subtitle={
        isMp
          ? "Any of India's 543 Lok Sabha members"
          : isCm
            ? `All ${cms.length || 31} states of India`
            : ministryCount
              ? `Any of ${ministryCount} ministries in the union council`
              : "India's Union Ministers"
      }
    >
      <div className="mb-4 flex justify-center">
        <PillTabs
          options={TIERS}
          value={tier}
          onChange={setTier}
          ariaLabel="Search tier"
        />
      </div>

      {isPending && (
        <div className="rounded-control border border-rule px-4 py-3 text-sm text-muted">
          {isCm ? "Loading the states…" : "Loading the council…"}
        </div>
      )}

      {isError && (
        <ErrorNote error={error} />
      )}

      {isMp && (
        <MpCombobox
          selected={selectedMp}
          onSelect={(mp) => {
            onSelectMp(mp);
            onClose();
          }}
          onClear={() => onSelectMp(null)}
        />
      )}

      {!isPending && !isError && isCm && (
        <CmCombobox
          cms={cms}
          selected={selectedCm}
          onSelect={(cm) => {
            onSelectCm(cm);
            onClose();
          }}
          onClear={() => onSelectCm(null)}
        />
      )}

      {!isPending && !isError && !isCm && !isMp && (
        <MinistryCombobox
          entries={entries}
          selected={selectedMinistry}
          onSelect={(entry) => {
            onSelectMinister(entry);
            onClose();
          }}
          onClear={() => onSelectMinister(null)}
        />
      )}

      <p className="mt-6 text-xs text-muted">
        {isMp
          ? "Search a name to open that MP's profile. Your own representative stays a tap away."
          : isCm
            ? "Pick a state to swap the card to that Chief Minister. Your CM stays a tap away."
            : "Pick a ministry to swap the card to that Union Minister. Your CM stays a tap away."}
      </p>
    </BottomSheet>
  );
}
