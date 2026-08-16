"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";

import { useGoogleIdentity } from "@/hooks/useGoogleIdentity";
import { SPRING_PRESS } from "@/lib/motion";
import { useTranslation } from "@/lib/i18n";

/**
 * "Continue with Google".
 *
 * The control is Google's own rendered button, not SYL's. That is not a
 * preference: on a real origin Google will not act on a click it thinks the
 * reader could not see, so the previous approach — Google's button held at
 * `opacity: 0` over SYL's pill — was completely inert in production while
 * working on localhost, which Google exempts from the check. A button that
 * cannot be clicked is not a design worth keeping.
 *
 * `theme: "outline"`, `shape: "pill"` and `text: "continue_with"` are the
 * closest GIS gets to what was here before: a white pill, the four-colour
 * mark, the same words. The surrounding shadow and hairline ring are SYL's,
 * applied to the wrapper rather than to Google's button, which must be left
 * alone — anything that transforms or covers it brings the check back.
 *
 * The hand-built button below is the fallback for when GIS never loads. It is
 * real then, because nothing of Google's is present to take the click, and it
 * retries the load when pressed.
 */
function GoogleMark({ className = "size-5" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function GoogleButton({
  onCredential,
  onUnavailable,
  className = "",
}) {
  const { t, language } = useTranslation();
  const { slotRef, containerRef, isReady, isUnavailable, unavailableReason, retry } =
    useGoogleIdentity(onCredential, language);

  useEffect(() => {
    onUnavailable?.(unavailableReason);
  }, [unavailableReason, onUnavailable]);

  // Loading is the common first-visit case, and an empty space where the only
  // call to action belongs reads as a broken page. SYL's button stands in
  // until Google's is ready — laid over the slot rather than beside it, so the
  // swap does not move anything, and never over Google's button once it is
  // live, because covering that button is what makes Google refuse the click.
  const isPlaceholder = !isReady;

  return (
    <div
      ref={slotRef}
      className={`relative flex min-h-12 w-full items-center justify-center ${className}`}
    >
      {/* Google's button. The ring and shadow sit on this wrapper; the button
          itself is untouched, which is what keeps it clickable. */}
      <div
        ref={containerRef}
        className={
          isReady ? "overflow-hidden rounded-full shadow-card ring-1 ring-ink/10 ring-inset" : ""
        }
      />

      {isPlaceholder && (
        <motion.button
          type="button"
          // Inert while GIS is still loading; the retry once it has given up.
          onClick={isUnavailable ? retry : undefined}
          disabled={!isUnavailable}
          whileTap={isUnavailable ? { scale: 0.975 } : undefined}
          transition={SPRING_PRESS}
          className="absolute inset-0 inline-flex w-full items-center justify-center gap-3 rounded-full bg-surface px-6 py-3.5 font-display text-sm font-bold text-ink shadow-card ring-1 ring-ink/10 ring-inset transition-shadow hover:shadow-lift disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <GoogleMark />
          {t("auth.continueWithGoogle")}
        </motion.button>
      )}
    </div>
  );
}
