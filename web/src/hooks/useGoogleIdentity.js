"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  GOOGLE_CLIENT_ID,
  initGoogleIdentity,
  setCredentialHandler,
} from "@/lib/googleIdentity";

/**
 * Google's own button, rendered invisibly on top of SYL's.
 *
 * Only a button GIS itself rendered can open the account-chooser popup — a
 * plain `onClick` cannot, and One Tap (`prompt()`) is a different, unreliable
 * surface that the browser may decline to show at all. So Google's button is
 * real and receives the click; it is just transparent, stretched over the
 * visible button, which stays SYL's design.
 *
 * GIS renders at a fixed pixel size (it caps `width` at 400), hence the
 * transform: the overlay is scaled to whatever the visible button measures, so
 * the hit area matches the thing the reader is aiming at.
 */
const GIS_WIDTH = 400;
const GIS_HEIGHT = 44;

export function useGoogleIdentity(onCredential, locale) {
  const frameRef = useRef(null);
  const containerRef = useRef(null);
  // A build with no client ID can never get to "ready", so it starts settled
  // rather than showing a spinner-shaped promise it cannot keep.
  const [status, setStatus] = useState(() => (GOOGLE_CLIENT_ID ? "loading" : "unavailable"));
  const [attempt, setAttempt] = useState(0);

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

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      // Nothing to load, and nothing the reader can do about it — but whoever
      // deployed it should not have to guess why the button is inert.
      console.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — Google sign-in is disabled.");
      return;
    }

    let cancelled = false;

    initGoogleIdentity()
      .then((gis) => {
        const container = containerRef.current;
        if (cancelled || !container) return;

        // StrictMode mounts effects twice in dev; without this the second pass
        // stacks a second Google button inside the same box.
        container.replaceChildren();
        gis.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
          width: GIS_WIDTH,
          // Invisible, but not silent: this is the button a screen reader
          // announces, so it says "Continue with Google" in the language the
          // rest of the page is in. Google's popup follows the same locale.
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
  }, [attempt, locale]);

  // Match the invisible button's box to the visible one, and keep matching it
  // through language switches, font loading and rotation.
  useEffect(() => {
    const frame = frameRef.current;
    const container = containerRef.current;
    if (!frame || !container) return;

    const fit = () => {
      const { width, height } = frame.getBoundingClientRect();
      if (!width || !height) return;
      // Measured unscaled, and from Google's button rather than the box it was
      // asked to fill: it renders a little shorter than the height it is given,
      // and the difference is a dead strip along the bottom of the visible
      // button if the scale is computed from the wrong number.
      container.style.transform = "none";
      const natural = container.firstElementChild?.getBoundingClientRect();
      const naturalWidth = natural?.width || GIS_WIDTH;
      const naturalHeight = natural?.height || GIS_HEIGHT;
      container.style.transform = `scale(${width / naturalWidth}, ${height / naturalHeight})`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
    // `locale` re-renders Google's button, and the replacement is measured
    // again — its own size can change even when the visible button's does not.
  }, [status, locale]);

  return {
    frameRef,
    containerRef,
    /** The overlay is live and clicks will reach Google. */
    isReady: status === "ready",
    isUnavailable: status === "unavailable",
    retry,
    gisSize: { width: GIS_WIDTH, height: GIS_HEIGHT },
  };
}
