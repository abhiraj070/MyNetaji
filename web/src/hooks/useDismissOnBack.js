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
 * So opening a sheet pushes a history entry with the same URL: nothing is
 * navigated and nothing re-renders — Next.js integrates native `pushState`
 * calls with its router — but the platform now has something to pop, and both
 * gestures already mean "pop" on every platform. One mechanism covers Android,
 * iOS, and a desktop browser's Back button, because all three arrive here as
 * `popstate`.
 *
 * Entries are tracked in one shared stack with a single listener rather than a
 * listener per sheet: with two sheets open, a Back press must close the top one
 * only, and every sheet answering the same event would close both.
 *
 * The balance matters as much as the push. A sheet closed by its X, by the
 * backdrop or by Escape still has its entry on the stack, so that entry is
 * popped on the way out — otherwise Back would appear to do nothing on the
 * first press, having only spent the sheet's leftover entry.
 */
const STATE_KEY = "__sylOverlay";

const stack = [];
let counter = 0;
let listening = false;

function handlePopState() {
  const entry = stack.pop();
  // Nothing of ours on the stack: a real navigation, which proceeds untouched.
  if (!entry) return;
  entry.consumed = true;
  entry.close();
}

function pushEntry(entry) {
  if (!listening) {
    window.addEventListener("popstate", handlePopState);
    listening = true;
  }
  stack.push(entry);
  // Next's own state is carried across, not replaced: its router reads
  // `__NA` and its tree back out of this entry when the reader returns.
  window.history.pushState({ ...window.history.state, [STATE_KEY]: entry.id }, "");
}

function releaseEntry(entry) {
  const index = stack.indexOf(entry);
  if (index !== -1) stack.splice(index, 1);

  // Already spent by the Back press that closed this sheet.
  if (entry.consumed) return;

  // Only when the entry is still the current one. If the reader navigated to
  // another route with the sheet open, ours is buried and going back would
  // undo their navigation rather than tidy up after us.
  if (window.history.state?.[STATE_KEY] === entry.id) window.history.back();
}

export function useDismissOnBack(open, onClose) {
  // Read through a ref so a close handler rebuilt on every render does not
  // push and pop a history entry on every render with it.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const entry = {
      id: ++counter,
      consumed: false,
      close: () => onCloseRef.current?.(),
    };
    pushEntry(entry);

    return () => releaseEntry(entry);
  }, [open]);
}
