"use client";

import { useEffect, useRef } from "react";

/**
 * Makes an open overlay the thing Back closes first.
 *
 * A bottom sheet reads as a place you can be — so leaving it should be the
 * ordinary way you leave a place. Without this, Android's system Back and
 * iOS's edge-swipe take the reader off the page entirely while a sheet is
 * still covering it, which loses their position for the sake of dismissing a
 * panel that a tap outside would have closed.
 *
 * So an open overlay is worth one history entry at the same URL: nothing is
 * navigated and nothing re-renders — Next.js integrates native `pushState`
 * calls with its router — but the platform now has something to pop, and Back
 * means "pop" on Android, iOS and the desktop alike. One mechanism, because
 * all three arrive here as `popstate`.
 *
 * What the hook does *not* do is push and pop per overlay as it opens and
 * closes. One click often closes one overlay and opens another — the sidebar's
 * Language and Feedback rows both do — and handled naively the closing sheet
 * gives an entry back at the same moment the opening one takes a new one. The
 * browser's `back()` is asynchronous, so it would land after the new push and
 * pop *that* instead, closing the sheet the reader had just opened. It looked
 * exactly like the button not working.
 *
 * So the overlays keep a plain stack, and history is reconciled against it
 * once per commit, in a microtask: open one and close another in the same
 * click and the count never changes, so the new overlay simply inherits the
 * entry the old one was using. Nothing is pushed, nothing is popped, and
 * nothing races.
 */
const STATE_KEY = "__sylOverlay";

/** Open overlays, oldest first. The last one is what Back closes. */
const stack = [];
/** History entries this module has pushed and still owns. */
let depth = 0;
/** `back()` calls we made ourselves, whose `popstate` is not a reader's Back. */
let pendingReleases = 0;
let scheduled = false;
let listening = false;
let token = 0;

function reconcile() {
  scheduled = false;

  if (stack.length > depth) {
    depth += 1;
    // Next's own state is carried across, not replaced: its router reads
    // `__NA` and its tree back out of this entry when the reader returns.
    window.history.pushState({ ...window.history.state, [STATE_KEY]: ++token }, "");
    // More than one overlay opened in a single commit: come back for the rest.
    if (stack.length > depth) schedule();
    return;
  }

  if (stack.length < depth) {
    // Only hand back an entry that is still the current one. If the reader
    // navigated to another route with an overlay open, ours is buried and
    // going back would undo their navigation rather than tidy up after us.
    if (window.history.state?.[STATE_KEY] === undefined) {
      depth = stack.length;
      return;
    }
    depth -= 1;
    pendingReleases += 1;
    window.history.back();
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  // After every effect in this commit has had its say, and before paint.
  queueMicrotask(reconcile);
}

function handlePopState() {
  // Our own tidying-up coming back around, not a reader pressing Back.
  if (pendingReleases > 0) {
    pendingReleases -= 1;
    return;
  }
  // Nothing of ours on the stack: a real navigation, which proceeds untouched.
  if (depth === 0) return;

  depth -= 1;
  stack.pop()?.close();
}

export function useDismissOnBack(open, onClose) {
  // Read through a ref so a close handler rebuilt on every render does not
  // take the overlay off the stack and put it back on with every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    if (!listening) {
      window.addEventListener("popstate", handlePopState);
      listening = true;
    }

    const entry = { close: () => onCloseRef.current?.() };
    stack.push(entry);
    schedule();

    return () => {
      const index = stack.indexOf(entry);
      if (index !== -1) stack.splice(index, 1);
      schedule();
    };
  }, [open]);
}
