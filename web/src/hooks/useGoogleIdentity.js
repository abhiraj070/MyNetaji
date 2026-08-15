"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  GOOGLE_CLIENT_ID,
  initGoogleIdentity,
  setCredentialHandler,
} from "@/lib/googleIdentity";

/**
 * Google's own Sign in with Google button, rendered visibly.
 *
 * It has to be Google's button and it has to be genuinely visible. Only a
 * button GIS rendered can open the account chooser, and on a real origin
 * Google refuses to act on a click it believes the reader could not see — an
 * anti-clickjacking check. An earlier version of this hid Google's button at
 * `opacity: 0` underneath SYL's own; that worked on localhost, which Google
 * exempts, and was completely inert in production: no popup, no request, no
 * error. Nothing about that is worth a second attempt.
 *
 * So the visible control is Google's, sized to the slot it is given. Width is
 * the one dimension GIS accepts, and it clamps to 200–400px, which is why the
 * measurement is clamped to the same range rather than passed on raw.
 */
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 320;

export function useGoogleIdentity(onCredential, locale) {
  const slotRef = useRef(null);
  const containerRef = useRef(null);
  // A build with no client ID can never get to "ready", so it starts settled
  // rather than showing a spinner-shaped promise it cannot keep. It is a
  // separate state from "the script would not load": one is the deployment
  // missing a variable, the other is the reader's network — and telling a
  // reader to check their ad blocker when the site was built without a client
  // ID sends them looking for a fault that is not theirs.
  const [status, setStatus] = useState(() =>
    GOOGLE_CLIENT_ID ? "loading" : "misconfigured",
  );
  const [attempt, setAttempt] = useState(0);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  // Claim the credential callback while mounted. GIS has exactly one, so with
  // two buttons on the page the last mounted wins — which is harmless, because
  // the sign-in state they all read is shared.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    return setCredentialHandler((credential) => onCredential?.(credential));
  }, [onCredential]);

  const retry = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) return;
    setStatus("loading");
    setAttempt((n) => n + 1);
  }, []);

  // Google's button is laid out in pixels, so it has to be told how wide the
  // slot is — and told again when that changes, which on this app means a
  // breakpoint or a language switch rather than anything continuous.
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const measure = () => {
      const measured = Math.round(slot.getBoundingClientRect().width);
      if (!measured) return;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, measured)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      // Nothing to load, and nothing the reader can do about it — but whoever
      // deployed it should not have to guess why the button is inert.
      console.error(
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set, so Google sign-in is disabled. " +
          "It is inlined at build time: set it in the build environment and rebuild — " +
          "setting it only at runtime will not reach the browser bundle.",
      );
      return;
    }

    let cancelled = false;

    initGoogleIdentity()
      .then((gis) => {
        const container = containerRef.current;
        if (cancelled || !container) return;

        // StrictMode mounts effects twice in dev, and a width change re-renders
        // the button; without this the replacements stack up in the same box.
        container.replaceChildren();
        gis.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
          width,
          // Google's own wording, in the language the rest of the page is in.
          locale,
        });

        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, locale, width]);

  return {
    /** The box Google's button is sized to fill. */
    slotRef,
    /** Where GIS renders. Nothing else may style or transform it. */
    containerRef,
    isReady: status === "ready",
    isUnavailable: status === "unavailable" || status === "misconfigured",
    /** Why sign-in is unavailable, for the screen to phrase it honestly. */
    unavailableReason:
      status === "misconfigured"
        ? "gis_misconfigured"
        : status === "unavailable"
          ? "gis_unavailable"
          : null,
    retry,
  };
}
