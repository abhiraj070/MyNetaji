/*
 * Shared geometry for the top navigation bar.
 *
 * Lives here rather than in `home.jsx` because the loading skeleton in
 * `StatusScreens` has to render the same bar — when these were a private
 * constant in `home.jsx`, the skeleton kept the old flat header and the bar
 * visibly changed shape the moment the real screen loaded.
 */

/**
 * The bar itself: a floating glass card rather than a full-bleed strip.
 * Translucent white over the page's own blue/pink ambient gradient, so it
 * picks up a faint tint without introducing a gradient of its own.
 */
export const NAV_SURFACE =
  "rounded-[26px] bg-surface/72 shadow-card ring-1 ring-white/70 backdrop-blur-xl backdrop-saturate-150";

/**
 * The shape of a control inside the bar, with no colour of its own.
 *
 * Separate from `NAV_CONTROL` because a control that changes colour with state
 * has to choose its whole colour set at once. Adding `bg-slap text-white` on
 * top of a base `bg-surface text-ink` does not override it: both land in the
 * class list and the winner is decided by the order Tailwind emits them, which
 * here meant the background stayed white while the icon turned white with it —
 * an invisible icon on a button that still worked.
 */
export const NAV_CONTROL_SHAPE = "h-9 rounded-full shadow-card ring-1 ring-ink/5";

/**
 * Controls inside the bar — the location pill and the Live News button — so
 * they read as one set: identical height, radius, surface, ring and elevation.
 * `h-9` is the single source of truth for that height; the circular button is
 * `size-9`, the same number, so the two can never drift apart.
 */
export const NAV_CONTROL = `${NAV_CONTROL_SHAPE} bg-surface text-ink`;

/** The hamburger, a sibling of the bar rather than a child of it. */
export const NAV_MENU_BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-[18px] text-ink";
