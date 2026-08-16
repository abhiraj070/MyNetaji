"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, Newspaper } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BottomActions } from "@/components/BottomActions";
import { PillTabs } from "@/components/Leaderboard";
import { HOME_TOUR_STEPS } from "@/components/onboarding/homeTour";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useSession } from "@/hooks/useSession";
import { LocationPermission } from "@/components/auth/LocationPermission";
import { DataFreshnessLine } from "@/components/DataFreshness";
import { ProfileIdentityCard } from "@/components/profile/ProfileIdentityCard";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { LiveDot } from "@/components/brief/LiveDot";
import { FeedbackSheet } from "@/components/feedback/FeedbackSheet";
import { FeedbackSuccess } from "@/components/feedback/FeedbackSuccess";
import { Landing } from "@/components/Landing";
import { LanguageModal } from "@/components/LanguageModal";
import { Sidebar } from "@/components/Sidebar";
import { LeaderboardSheet } from "@/components/LeaderboardSheet";
import { SearchSheet } from "@/components/SearchSheet";
import { ErrorScreen } from "@/components/StatusScreens";
import { InfoPageSkeleton } from "@/components/skeletons/InfoPageSkeleton";
import { XDiscussionSheet } from "@/components/x/XDiscussionSheet";
import { useMinistries } from "@/hooks/useMinistries";
import { useTopperSelection } from "@/hooks/useTopperSelection";
import { useScrolled } from "@/hooks/useScrolled";
import { fetchCmByStateKey, fetchMpByName, toFriendlyError } from "@/lib/api";
import { GeolocationError, requestPosition } from "@/lib/geolocation";
import { useLocationState } from "@/lib/location";
import { useTranslation } from "@/lib/i18n";
import { rise } from "@/lib/motion";
import { useOnboarding, useOnboardingTarget } from "@/lib/onboarding";
import { buildShareMessage, buildShareUrl } from "@/lib/share";
import {
  buildMpSubject,
  subjectKeyOf,
  useResolvedSubject,
  useSubjectSelection,
} from "@/lib/subject";
import {
  NAV_CONTROL,
  NAV_CONTROL_SHAPE,
  NAV_MENU_BUTTON,
  NAV_SURFACE,
} from "@/lib/navStyles";
import { titleCase } from "@/lib/text";
import { Toast } from "@/components/ui/Toast";

/**
 * The two representatives a reader's own coordinates resolve to. MLAs are
 * deliberately absent — state assembly members are not part of this product.
 */
const HOME_TIERS = [
  { value: "cm", key: "card.yourCm" },
  { value: "mp", key: "card.yourMp" },
];

const RANK_ORDER = {
  "Prime Minister": 0,
  "Cabinet Minister": 1,
  "MoS (Independent Charge)": 2,
  "Minister of State": 3,
};

/**
 * Reads the incoming query string once. `?share=cm&lat=&lng=` opens the
 * Chief Minister page for those coordinates without prompting for location
 * again; `?share=minister&name=` seeds the pending minister name so we can
 * pick their entry once the ministries list loads.
 *
 * Fed by `useSearchParams()` rather than by reading `window.location` here.
 * Reading `window` used to make the first client render disagree with the
 * server-rendered HTML on any `?share=` URL (server: the landing screen,
 * client: the locating screen), which React reported as a hydration failure
 * and recovered from by throwing the whole tree away and re-rendering. The
 * hook has no server/client split to disagree about.
 */
function readDeepLink(params) {
  const share = params.get("share");
  if (share === "cm") {
    const lat = parseFloat(params.get("lat"));
    const lng = parseFloat(params.get("lng"));
    const coords =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? { latitude: lat, longitude: lng }
        : null;
    // `state` seeds the exact CM (e.g. a link shared from the leaderboard, which
    // carries no coordinates); `lat/lng` still seed from the sharer's location.
    return { coords, ministerName: null, cmStateKey: params.get("state") };
  } else if (share === "minister") {
    return { coords: null, ministerName: params.get("name"), cmStateKey: null };
  }
  return { coords: null, ministerName: null, cmStateKey: null };
}

export function Home() {
  const deepLink = readDeepLink(useSearchParams());
  const { t, language, hasChosen, isHydrated } = useTranslation();

  // Held above the router (see `lib/location`) so leaving for `/brief` and
  // coming back doesn't discard it. A `?share=cm&lat=&lng=` link needs no such
  // help: those coordinates live in the URL, which the back navigation
  // restores along with the page.
  const { coords: storedCoords, setCoords, isRestoring: isRestoringLocation } =
    useLocationState();
  const router = useRouter();
  // Set when the reader taps the wordmark to start over. The URL is rewritten
  // at the same moment, but this is what the render actually keys off: clearing
  // the stored coordinates alone would fall straight back through to the ones
  // in a `?share=cm&lat=&lng=` link and put the card back on screen.
  const [deepLinkDropped, setDeepLinkDropped] = useState(false);
  const coords = storedCoords ?? (deepLinkDropped ? null : deepLink.coords);
  const [geoError, setGeoError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [openSheet, setOpenSheet] = useState(null); // "leaderboard" | "search" | "x" | null
  // Who the app is talking about. Held above the router (see `lib/subject`) so
  // a search or a leaderboard pick is still the subject after a trip to the
  // game route and back.
  const {
    selectedSearchResult,
    setSelectedSearchResult,
    leaderboardSubject,
    setLeaderboardSubject,
    lastVote,
    setLastVote,
    homeTier,
    setHomeTier,
  } = useSubjectSelection();
  const [toast, setToast] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Re-opening the picker from the sidebar is dismissible; the first-run
  // prompt is not (see LanguageModal).
  const [languageOpen, setLanguageOpen] = useState(false);
  const [feedbackReaction, setFeedbackReaction] = useState(null);

  // Pre-fetched here (not only when the Search sheet opens) so a
  // `?share=minister&name=` deep link can resolve on first render, before
  // the user ever opens Search themselves.
  const { entries: ministryEntries } = useMinistries();

  /*
   * Deep links resolve by derivation, not by seeding.
   *
   * `?share=minister&name=` and `?share=cm&state=` used to be copied into the
   * selection as soon as they resolved — during render while that state was
   * local, which React allows, and which stopped being allowed the moment the
   * selection moved into `SubjectProvider`. An effect would work but is the
   * pattern the "you might not need an effect" rule exists to catch: the link
   * is already a description of a subject, so it can simply *be* one, computed
   * from what the URL says and what has loaded so far.
   *
   * Nothing writes state on this path now, which also means there is no window
   * in which the seed has landed but the render hasn't caught up.
   */
  const cmStateKey = deepLinkDropped ? null : deepLink.cmStateKey;
  const linkedMinisterName = deepLinkDropped ? null : deepLink.ministerName;

  const { data: seededCm } = useQuery({
    queryKey: ["cm-by-state", language, cmStateKey],
    queryFn: () => fetchCmByStateKey(cmStateKey),
    enabled: Boolean(cmStateKey),
  });

  const deepLinkSelection = useMemo(() => {
    if (linkedMinisterName) {
      const target = linkedMinisterName.toLowerCase();
      const entry = ministryEntries.find(
        (e) => e.minister.minister_name?.toLowerCase() === target,
      );
      // A name that matches nothing resolves to nothing, and the page falls
      // through to the reader's own CM rather than waiting forever.
      return entry ? { tier: "minister", data: entry } : null;
    }
    if (cmStateKey && seededCm) return { tier: "cm", data: seededCm };
    return null;
  }, [linkedMinisterName, ministryEntries, cmStateKey, seededCm]);

  // The same hook the game route calls, so both views of a subject agree
  // without either of them re-deriving it. `selection` comes back out because
  // the Search sheet highlights whoever is currently picked — including one
  // arrived at by link.
  const {
    subject,
    selection,
    isPending: isLoadingSeats,
    isError,
    error,
    refetch,
  } = useResolvedSubject(coords, { fallbackSelection: deepLinkSelection });

  const handleAllowLocation = useCallback(async () => {
    setGeoError(null);
    setIsLocating(true);
    try {
      setCoords(await requestPosition());
    } catch (err) {
      setGeoError(err instanceof GeolocationError ? err.reason : "unavailable");
    } finally {
      setIsLocating(false);
    }
    // `setCoords` is a `useState` setter handed down by `LocationProvider`, so
    // it is stable — declared only to satisfy the exhaustive-deps rule.
  }, [setCoords]);

  // True while the page is showing one of the reader's own representatives —
  // nothing searched, nothing tapped in from the leaderboard, no `?share=` link.
  const isHomeSubject = !leaderboardSubject && !selection;

  const subjectKey = subjectKeyOf(subject);

  const lastChoice = lastVote?.key === subjectKey ? lastVote.choice : null;

  const closeSheet = useCallback(() => setOpenSheet(null), []);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const handleSelectCm = useCallback(
    (cm) => {
      setLeaderboardSubject(null);
      setSelectedSearchResult(cm ? { tier: "cm", data: cm } : null);
    },
    [setLeaderboardSubject, setSelectedSearchResult],
  );

  const handleSelectMinister = useCallback(
    (entry) => {
      setLeaderboardSubject(null);
      setSelectedSearchResult(entry ? { tier: "minister", data: entry } : null);
    },
    [setLeaderboardSubject, setSelectedSearchResult],
  );

  /**
   * A search result is a slim row — the list query leaves the manifesto behind
   * because attaching it to 543 MPs is megabytes. The full record is fetched by
   * id here, so the profile opens with its Manifestos tab populated.
   *
   * Routed through the leaderboard-subject slot rather than the search slot for
   * the same reason a leaderboard row is: both are "a fully-fetched person to
   * show", and `buildSubject` only knows how to build CMs and ministers.
   */
  const handleSelectMp = useCallback(
    async (row) => {
      if (!row) {
        setLeaderboardSubject(null);
        return;
      }
      setSelectedSearchResult(null);
      try {
        const details = await fetchMpByName({ id: row.id });
        setLeaderboardSubject(
          buildMpSubject(details ?? row, { isHome: false, t }),
        );
      } catch {
        showToast(t("common.profileFailed"));
      }
    },
    [setLeaderboardSubject, setSelectedSearchResult, showToast, t],
  );

  // Shared with the game page's highlight tiles, so "open this person" has one
  // implementation rather than one per surface.
  const { selectTopper: handleSelectTopper, pendingKey: pendingTopperKey } =
    useTopperSelection({
      onSelected: () => setOpenSheet(null),
      onError: () => showToast(t("common.profileFailed")),
    });

  const handleBackFromLeaderboardProfile = useCallback(() => {
    setLeaderboardSubject(null);
  }, [setLeaderboardSubject]);

  /**
   * "Back to your CM" for a subject that arrived by link rather than by a tap.
   * There is no selection to clear in that case — the link itself is what is
   * putting them on screen, so leaving means dropping it and tidying the URL to
   * match. With no location granted yet this lands on the landing screen, which
   * is the honest answer: we don't know their CM until they say where they are.
   */
  const handleLeaveDeepLink = useCallback(() => {
    setDeepLinkDropped(true);
    router.replace("/", { scroll: false });
  }, [router]);

  /**
   * The wordmark: back to the landing screen, which asks for location again.
   *
   * Everything that can put a subject on screen is cleared, not just the
   * coordinates — a searched minister, a leaderboard profile and a pending
   * deep-link seed each resolve to a card on their own, and leaving any of
   * them set would land the reader straight back where they started.
   *
   * The URL is replaced rather than pushed: "start over" is not a place in the
   * reader's history, and a Back press should return them to wherever they came
   * from rather than to the card they just dismissed.
   */
  const handleRestart = useCallback(() => {
    setCoords(null);
    setDeepLinkDropped(true);
    setSelectedSearchResult(null);
    setLeaderboardSubject(null);
    setGeoError(null);
    setOpenSheet(null);
    setLastVote(null);
    router.replace("/", { scroll: false });
  }, [
    setCoords,
    setSelectedSearchResult,
    setLeaderboardSubject,
    setLastVote,
    router,
  ]);

  const handleShare = useCallback(
    async (currentChoice) => {
      if (!subject || typeof window === "undefined") return;
      // A leaderboard-navigated CM isn't the one `coords` points at — sharing
      // the home location here would silently send the recipient to the
      // wrong person, so it's withheld rather than reused.
      const url = buildShareUrl(subject, leaderboardSubject ? null : coords);
      const text = buildShareMessage(subject, currentChoice);

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
    },
    [subject, coords, leaderboardSubject, showToast, t],
  );

  // Let the sheet finish sliding out before the celebration springs in, so
  // the two backdrops never stack for a frame.
  const handleFeedbackSubmitted = useCallback((reaction) => {
    setFeedbackOpen(false);
    setTimeout(() => setFeedbackReaction(reaction), 240);
  }, []);

  // Read before `resolveStage`, which branches on it — declaring it after the
  // call puts both names in the temporal dead zone.
  const { isAuthenticated, isPending: isSessionPending } = useSession();

  const stage = resolveStage({
    geoError,
    isLocating,
    coords,
    // A location saved on this device is read a tick after mount. Until then
    // there is no answer yet, and treating that as "no location" would flash
    // the permission screen at a reader who granted it long ago.
    isRestoringLocation,
    isLoadingSeats,
    isError,
    hasSubject: Boolean(subject),
    isAuthenticated,
    isSessionPending,
    // A linked CM shows the loading screen, not the location prompt, until
    // its fetch resolves into the page.
    isSeeding: Boolean(cmStateKey && !seededCm),
  });

  const { hasCompleted: tourCompleted, isTourOpen, startTour } = useOnboarding();

  /*
   * The first-run tutorial starts here and nowhere else: only once a
   * representative is actually on screen, never on the landing or locating
   * screens, and never for someone who has already been through it.
   *
   * It also waits on `hasChosen`, because the language prompt is the genuinely
   * first-run modal — a coach mark pointing at a nav button hidden behind that
   * modal's backdrop would be pointing at nothing. The delay lets the page's
   * own entrance stagger (the last section lands at 0.24s plus its spring)
   * finish, so the spotlight opens on a settled screen.
   */
  const tourCanStart =
    stage === "results" &&
    Boolean(subject) &&
    isHydrated &&
    hasChosen &&
    !tourCompleted &&
    !isTourOpen;

  useEffect(() => {
    if (!tourCanStart) return;
    const timer = setTimeout(startTour, 900);
    return () => clearTimeout(timer);
  }, [tourCanStart, startTour]);

  return (
    <main className="flex min-h-dvh flex-col">
      {/* Nothing at all until the session query answers — see `resolveStage`. */}
      {stage === "booting" && <div className="flex-1" />}

      {stage === "landing" && (
        // The landing page scrolls now, so it fills the column rather than
        // being centred in it — `items-center` would pin a tall page mid-screen.
        <div className="flex-1">
          <Landing />
        </div>
      )}

      {/* Asked only once signed in: the browser grants one permission prompt
          per origin in practice, and spending it before the reader has any
          reason to trust the app is how you earn a permanent refusal. */}
      {stage === "location" && (
        <LocationPermission
          onAllow={handleAllowLocation}
          isBusy={isLocating}
          error={geoError ? (GEO_ERROR_COPY[geoError] ?? "auth.locationFailed") : null}
        />
      )}

      {/* The wait between the landing screen and the main page: the main
          page's own skeleton, with the location step narrated inside it. */}
      {stage === "locating" && (
        <InfoPageSkeleton
          status={{
            label: t("status.locatingState"),
            detail: t("status.locatingDetail"),
          }}
          // Live, and pressable: this stage is also where a CM → MP switch
          // waits, and the reader must be able to change their mind (or switch
          // back) without the control vanishing under them.
          switcher={
            <HomeTierTabs value={homeTier} onChange={setHomeTier} />
          }
        />
      )}

      {stage === "fetch-error" && (
        <ErrorScreen
          overline={t("status.lookupFailedOverline")}
          title={t("status.lookupFailedTitle")}
          body={toFriendlyError(error)}
          onRetry={refetch}
        />
      )}

      {stage === "empty" && (
        <ErrorScreen
          overline={t("status.noMatchOverline")}
          title={t("status.noMatchTitle")}
          body={t("status.noMatchBody")}
          onRetry={handleAllowLocation}
        />
      )}

      {stage === "results" && subject && (
        <div
          className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-3 px-4 pt-2 sm:px-6 sm:pt-3"
        >
          <ResultsHeader
            subject={subject}
            onRestart={handleRestart}
            onResetToHome={
              leaderboardSubject
                ? handleBackFromLeaderboardProfile
                : selectedSearchResult
                  ? () => setSelectedSearchResult(null)
                  : deepLinkSelection
                    ? handleLeaveDeepLink
                    : null
            }
            backLabel={leaderboardSubject ? t("nav.back") : t("nav.backToCm")}
            onOpenMenu={() => setSidebarOpen(true)}
          />

          {/*
           * The information experience, inline — this is the main page now.
           *
           * Identity first (a compact portrait, the name, the office and the
           * party), then the four tabs, then whatever tab is open. Exactly the
           * order the Information sheet used, because that ordering was already
           * right; only its address changed.
           *
           * The panel writes into the page's own scroll rather than a container
           * of its own: one scrollbar for the whole page keeps the bottom bar
           * where the reader expects it and the tab content free of a nested
           * scroll region.
           */}
          {/*
           * Which of the reader's own representatives they are looking at.
           *
           * Above the identity card, and built from the same `PillTabs` the
           * information tabs use — one visual language for "switch what this
           * section is showing", whether that is a tab of a profile or the
           * person the profile is about.
           *
           * Only shown for the reader's own representatives: once they have
           * searched someone, or tapped into a leaderboard row, "Your CM /
           * Your MP" no longer describes what is on screen, and the header's
           * Back control is the way out of that instead.
           */}
          {isHomeSubject && (
            <HomeTierTabs value={homeTier} onChange={setHomeTier} />
          )}

          <motion.div {...rise(0.1)} className="shrink-0">
            <ProfileIdentityCard subject={subject} />
            {/* Sits under the card rather than inside it: this is a fact about
                the dataset, not about the person, and putting it in the card
                would read as another of their attributes. */}
            <DataFreshnessLine tier={subject.tier} className="mt-2.5" />
          </motion.div>

          {/* `flex-1` so the bottom bar still sits at the foot of a tall
              viewport when a tab's content is short, without ever clipping a
              long one — a flex item never shrinks below its content. */}
          <motion.div {...rise(0.16)} className="flex-1">
            <ProfilePanel
              subject={subject}
              bleedClass="-mx-4 sm:-mx-6"
              gutterClass="px-4 sm:px-6"
            />
          </motion.div>

          <motion.div {...rise(0.28)} className="sticky bottom-0 z-30">
            <BottomActions
              onOpenSearch={() => setOpenSheet("search")}
              onOpenLeaderboard={() => setOpenSheet("leaderboard")}
              onOpenGame={() => router.push("/game")}
              onOpenX={() => setOpenSheet("x")}
              onShare={() => handleShare(lastChoice)}
              shareHighlight={Boolean(lastChoice)}
            />
          </motion.div>

          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onOpenLanguage={() => {
              setSidebarOpen(false);
              setLanguageOpen(true);
            }}
            onOpenFeedback={() => {
              setSidebarOpen(false);
              setFeedbackOpen(true);
            }}
            onReplayTutorial={() => {
              // Close first: the tour dims the whole screen, and starting it
              // while the drawer is still sliding out would spotlight a nav bar
              // with a panel crossing it. The delay is the drawer's own exit
              // (220ms) plus a frame.
              setSidebarOpen(false);
              setTimeout(startTour, 260);
            }}
          />
          {/*
           * First-run language prompt: fires as soon as a representative has
           * resolved (i.e. immediately after the location step) and only while
           * no choice has ever been made. Not dismissible, because dismissing
           * would leave `hasChosen` false and re-prompt on the next load.
           */}
          <LanguageModal open={isHydrated && !hasChosen} onClose={() => {}} />
          <LanguageModal
            open={languageOpen}
            onClose={() => setLanguageOpen(false)}
            dismissible
          />

          <LeaderboardSheet
            open={openSheet === "leaderboard"}
            onClose={closeSheet}
            tier={subject.tier}
            currentIdentity={subject.name}
            onSelectTopper={handleSelectTopper}
            pendingKey={pendingTopperKey}
            showToast={showToast}
          />
          <SearchSheet
            open={openSheet === "search"}
            onClose={closeSheet}
            defaultTier={subject.tier === "minister" ? "minister" : "cm"}
            selectedCm={selection?.tier === "cm" ? selection.data : null}
            selectedMinistry={
              selection?.tier === "minister" ? selection.data : null
            }
            onSelectCm={handleSelectCm}
            onSelectMinister={handleSelectMinister}
            selectedMp={
              leaderboardSubject?.tier === "mp" ? leaderboardSubject : null
            }
            onSelectMp={handleSelectMp}
          />
          <XDiscussionSheet
            open={openSheet === "x"}
            onClose={closeSheet}
            subject={subject}
          />

          <Toast message={toast} className="bottom-24 whitespace-nowrap" />

          {/* The onboarding layer, mounted last so it is the topmost thing on
              the page and can dim everything else. It renders nothing until
              the tour is running. */}
          <OnboardingTour steps={HOME_TOUR_STEPS} />

          <FeedbackSheet
            open={feedbackOpen}
            onClose={() => setFeedbackOpen(false)}
            onSubmitted={handleFeedbackSubmitted}
          />
          <FeedbackSuccess
            reaction={feedbackReaction}
            onClose={() => setFeedbackReaction(null)}
          />
        </div>
      )}
    </main>
  );
}

/**
 * Which of the reader's own representatives the page is about.
 *
 * Its own component because it appears twice: on the page, and inside the
 * skeleton while the other one is being fetched — the same live control in
 * both, so pressing it never disappears mid-switch.
 */
function HomeTierTabs({ value, onChange }) {
  const { t } = useTranslation();

  return (
    // Centred in the content column. Unlike the four information tabs — which
    // can outgrow a phone and so have to scroll from the left edge — this row
    // is two short labels that fit at every width, so it is simply centred and
    // needs no scroller. `PillTabs` itself is untouched: same type, spacing,
    // pill, active state and spring.
    <motion.div {...rise(0.06)} className="flex shrink-0 justify-center">
      <PillTabs
        options={HOME_TIERS.map((entry) => ({ ...entry, label: t(entry.key) }))}
        value={value}
        onChange={onChange}
        ariaLabel={t("card.homeTierAria")}
      />
    </motion.div>
  );
}

/**
 * A single-line app bar, not a masthead. The old header carried a 3xl/4xl
 * headline, an ornament and a subtitle — roughly the top 40% of the first
 * screen — which pushed the representative (the actual subject of the page)
 * below the fold. Everything here now fits on one row so the card can be the
 * first thing seen.
 *
 * Leaderboard moved out of this bar and into the bottom action row, alongside
 * the other three secondary actions.
 */
function ResultsHeader({
  subject,
  onResetToHome,
  onRestart,
  backLabel,
  onOpenMenu,
}) {
  const { t } = useTranslation();
  const scrolled = useScrolled();
  // The place chip only ever applies to the reader's own representative — a
  // minister, a searched-in CM or MP, or a leaderboard-navigated one all show
  // the back button in this slot instead.
  //
  // Which place depends on who: a Chief Minister governs a state, an MP holds a
  // constituency. Showing "Delhi" beside an MP would name the wrong unit — the
  // seat is what they were elected to.
  const location = !subject.isHome
    ? null
    : subject.tier === "cm"
      ? titleCase(subject.state ?? "")
      : subject.tier === "mp"
        ? titleCase(subject.constituency ?? "")
        : null;

  return (
    // The extra bottom margin sits on the header alone, so the gap to the
    // politician card opens up without touching the rhythm of anything below it.
    // The hamburger is a sibling of the bar, not a child of it: the bar gives
    // up that much width so the button sits clear of the glass surface, which
    // is what makes it read as a separate control rather than a nav item.
    //
    // `sticky` rather than `fixed`: the header keeps its place in the flex
    // column, so the card below it needs no compensating offset and can never
    // end up hidden underneath it.
    //
    // `z-30` is the app's chrome layer, shared with the bottom action bar —
    // the two are the same kind of object and never overlap each other. The
    // scale it sits in is: page content up to `z-20` (the vote flight is the
    // highest of those), chrome at `z-30`, sheets at `z-40`, modals at `z-50`.
    // Anything higher here would only break the sheets: `BottomSheet` is
    // `z-40`, so a `z-40` header would tie with it and be settled by DOM order
    // alone — leaving the nav one refactor away from floating on top of its
    // own dimmed backdrop.
    <motion.header
      {...rise(0)}
      className="sticky top-0 z-30 flex shrink-0 items-center gap-2.5 pt-1 pb-3 sm:pb-4"
    >
      <StickyScrim scrolled={scrolled} />

      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t("nav.menu")}
        className={`${NAV_MENU_BUTTON} ${NAV_SURFACE}`}
      >
        <Menu className="size-5" strokeWidth={2.25} />
      </button>

      <div className={`flex min-w-0 flex-1 items-center gap-3 py-2 pr-2 pl-4 ${NAV_SURFACE}`}>
        {/* shrink-0: the wordmark never compresses, however long the state name
            gets — it is the one fixed anchor the bar is balanced around.

            It is also the way back to the start: tapping it drops the resolved
            location and returns to the landing screen, which asks for it again.
            `aria-label` carries that meaning, since the visible word alone
            ("MyNetaji") says where you are, not what pressing it does. */}
        <button
          type="button"
          onClick={onRestart}
          aria-label={t("nav.startOver")}
          className="shrink-0 rounded-full font-display text-lg leading-none font-bold tracking-tight text-ink transition-opacity hover:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand active:opacity-50"
        >
          MyNetaji
        </button>

        {/* min-w-0 lets this group absorb the remaining width and, only when a
            very long name genuinely runs out of room, allows the pill inside
            it to ellipsise rather than push the wordmark off-screen. */}
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <BriefLink />

          {location ? (
            <LocationPill label={location} />
          ) : onResetToHome ? (
            <button
              type="button"
              onClick={onResetToHome}
              className={`${NAV_CONTROL_SHAPE} inline-flex min-w-0 items-center gap-1 bg-surface px-3.5 font-display text-xs font-semibold text-muted transition-colors hover:text-ink`}
            >
              <span className="truncate">{backLabel ?? t("nav.backToCm")}</span>
            </button>
          ) : null}
        </div>
      </div>
    </motion.header>
  );
}

/**
 * Political Brief launcher, as a broadcast indicator rather than a plain icon.
 *
 * The newspaper glyph alone said "there is a news page"; the pulsing red dot
 * says "there is something on it right now", which is the whole reason to tap
 * it. It shares the `LiveDot` component with the brief's own masthead and card
 * badges, so every live mark in the product breathes on identical timing.
 *
 * The wordmark is held back until `sm`: at 375px the bar already carries the
 * app name and the state pill, and a third label there would push the state
 * name into an ellipsis. Below that breakpoint the dot and glyph carry it,
 * and `aria-label` names the destination at every width.
 *
 * A real link rather than a button that pushes: `/brief` is a page of its own,
 * so it should be openable in a new tab and prefetched like any other route.
 * The lift on hover is CSS here for the same reason — a `motion.a` would buy
 * nothing that a transform transition doesn't already give.
 */
function BriefLink() {
  const { t } = useTranslation();
  // News is the one toured control that lives in the app bar rather than the
  // bottom row, so its coach mark hangs below it instead of above.
  const newsRef = useOnboardingTarget("nav-news");
  return (
    <Link
      ref={newsRef}
      href="/brief"
      aria-label={`${t("brief.liveNews")} — ${t("brief.title")}`}
      className={`${NAV_CONTROL_SHAPE} flex h-9 shrink-0 items-center gap-1.5 bg-surface px-2.5 text-muted transition-[color,transform] duration-200 hover:-translate-y-px hover:text-ink active:scale-95 sm:gap-2 sm:px-3`}
    >
      <LiveDot />
      <Newspaper className="size-4 shrink-0" strokeWidth={2.2} />
      <span className="hidden font-display text-[11px] leading-none font-bold tracking-[0.08em] text-ink uppercase sm:inline">
        {t("brief.liveNews")}
      </span>
    </Link>
  );
}

/**
 * The plate that slides in behind the nav once the page moves.
 *
 * At rest there is nothing here: the bar is a floating glass card over the
 * page's ambient gradient, and that is the look the screen opens on. Once
 * content starts passing underneath, this fades in to give the bar something
 * opaque to sit on, so a photograph scrolling behind the wordmark doesn't turn
 * it to mush.
 *
 * Full-bleed by negative inset rather than `w-screen`: `100vw` includes the
 * desktop scrollbar and would hand the page a horizontal scroll of its own.
 * The insets match the container's own padding exactly (`px-4` / `sm:px-6`),
 * which on a phone reaches the screen edges and on a wide window reaches the
 * edges of the content column — and nothing scrolls outside that column.
 *
 * One transition on `opacity` alone: the border and the shadow are always set
 * and simply fade in with the plate, so the three cannot drift out of step,
 * and the browser animates a single compositor-friendly property. An element
 * at `opacity: 0` also contributes no `backdrop-filter`, so the blur genuinely
 * switches off at rest instead of blurring the gradient for nothing.
 */
function StickyScrim({ scrolled }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute -top-2 -right-4 -bottom-0 -left-4 -z-10 border-b border-ink/[0.07] bg-paper/72 shadow-[0_8px_24px_-16px_rgb(23_22_51_/_0.45)] backdrop-blur-xl backdrop-saturate-150 transition-opacity duration-[240ms] ease-out sm:-top-3 sm:-right-6 sm:-left-6 ${
        scrolled ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

/**
 * The state pill. Width is entirely content-driven — no fixed or percentage
 * width — so "Goa" and "Dadra & Nagar Haveli and Daman & Diu" both sit with
 * the same left/right padding and only the longest names ever ellipsise, and
 * then only once the row has genuinely run out of space.
 *
 * `min-w` keeps a three-letter state from collapsing into a cramped nub, and
 * `justify-center` means the label sits centred inside that minimum rather
 * than hugging the left edge with dead space after it.
 *
 * No chevron: the pill displays the resolved state, it does not open a picker,
 * and an affordance for an interaction that doesn't exist is worse than none.
 */
function LocationPill({ label }) {
  return (
    <span
      title={label}
      className={`${NAV_CONTROL} inline-flex min-w-[5.5rem] items-center justify-center px-3.5 font-display text-xs font-semibold`}
    >
      {/* min-w-0 on the label, not the pill: the pill keeps its comfortable
          floor while the text inside is what actually gives way. */}
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

// Silence unused warning if RANK_ORDER isn't referenced.
void RANK_ORDER;

// Every way locating can fail, in the words the reader sees. `unavailable`
// and `timeout` share a line: both mean "we asked and got nothing back", and
// splitting them would be a distinction without a difference to anyone.
const GEO_ERROR_COPY = {
  denied: "auth.locationDenied",
  unsupported: "auth.locationUnsupported",
  timeout: "auth.locationFailed",
  unavailable: "auth.locationFailed",
};

function resolveStage({
  geoError,
  isLocating,
  coords,
  isRestoringLocation,
  isLoadingSeats,
  isError,
  hasSubject,
  isSeeding,
  isAuthenticated,
  isSessionPending,
}) {
  // A resolved subject wins outright: a shared `?share=` link points at one
  // named politician and carries everything needed to render them, so it is
  // its own entry point and reaches the card without waiting on location. It
  // asks for no location either, which is what the auth-first rule is there to
  // protect.
  if (hasSubject) return "results";

  // Nothing is decided until the session query settles. Rendering the landing
  // screen first would flash a sign-in prompt at somebody who is already
  // signed in, on every single load.
  if (isSessionPending) return "booting";
  if (!isAuthenticated) return "landing";

  if (isRestoringLocation) return "booting";
  if (isSeeding) return "locating";
  if (isLocating) return "locating";
  // Location trouble keeps the reader on the permission screen, which carries
  // the reason and the retry, rather than sending them to a separate error
  // page they then have to navigate back from.
  if (geoError) return "location";
  if (!coords) return "location";
  if (isLoadingSeats) return "locating";
  if (isError) return "fetch-error";
  return "empty";
}
