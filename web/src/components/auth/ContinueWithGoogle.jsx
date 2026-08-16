"use client";

import { motion } from "framer-motion";

import { useGoogleIdentity } from "@/hooks/useGoogleIdentity";
import { useGoogleLogin } from "@/hooks/useSession";
import { SPRING_PRESS } from "@/lib/motion";
import { useTranslation } from "@/lib/i18n";

/**
 * "Continue with Google": the button, the popup, the exchange, and whatever
 * went wrong. Both places that offer sign-in — the landing page and `/auth` —
 * render this, so neither has to know how a credential becomes a session.
 *
 * The control is Google's own rendered button, not SYL's. That is not a
 * preference: on a real origin Google will not act on a click it thinks the
 * reader could not see, so the previous approach — Google's button held at
 * `opacity: 0` under SYL's pill — was completely inert in production while
 * working on localhost, which Google exempts from the check. A button that
 * cannot be clicked is not a design worth keeping.
 *
 * `theme: "outline"`, `shape: "pill"` and `text: "continue_with"` are the
 * closest GIS gets to what was here before: a white pill, the four-colour
 * mark, the same words. The surrounding shadow and hairline ring are SYL's,
 * applied to the wrapper rather than to Google's button, which must be left
 * alone — anything that transforms or covers it brings the check back.
 *
 * Nothing navigates on success. The mutation writes the user into the session
 * cache and the screens showing a signed-out view — the landing gate in
 * `home.jsx`, the redirect in `AuthPage` — react to that on their own.
 *
 * Failures are codes, mapped to a sentence here rather than shown raw, and the
 * button stays where it is: every failure in this flow is retryable.
 */
const ERROR_COPY = {
  invalid_credential: "auth.exchangeFailed",
  expired_credential: "auth.expiredCredential",
  email_unverified: "auth.emailUnverified",
  no_profile: "auth.noProfile",
  google_unreachable: "auth.googleUnreachable",
  user_creation_failed: "auth.serverError",
  token_generation_failed: "auth.serverError",
  server_error: "auth.serverError",
  unreachable: "auth.unreachable",
  unavailable: "auth.googleUnavailable",
  misconfigured: "auth.googleNotConfigured",
};

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

export function ContinueWithGoogle({ className = "" }) {
  const { t, language } = useTranslation();
  const { signIn, isPending, errorCode } = useGoogleLogin();
  const { slotRef, containerRef, status, retry } = useGoogleIdentity(signIn, language);

  const isReady = status === "ready";
  const isUnavailable = status === "unavailable" || status === "misconfigured";
  // Google's own trouble outranks a failed exchange: there is no point telling
  // someone their credential was rejected when no credential can be obtained.
  const code = isUnavailable ? status : errorCode;
  const message = code ? t(ERROR_COPY[code] ?? "auth.exchangeFailed") : null;

  return (
    <div className="flex w-full flex-col items-center gap-3">
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

        {/* Loading is the common first-visit case, and an empty space where the
            only call to action belongs reads as a broken page. SYL's button
            stands in until Google's is ready — laid over the slot so the swap
            moves nothing, and gone before Google's button is live, because
            covering that button is what makes Google refuse the click. */}
        {!isReady && (
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

      {/* Progress is said rather than shown on the button: the button is
          Google's, and covering or restyling it is what broke sign-in. */}
      {isPending ? (
        <p className="text-xs font-semibold text-muted">{t("auth.signingIn")}</p>
      ) : (
        message && (
          <p
            role="alert"
            className="mx-auto max-w-sm rounded-card bg-slap-wash px-4 py-3 text-xs leading-relaxed font-semibold text-slap-strong ring-1 ring-slap/15 ring-inset"
          >
            {message}
          </p>
        )
      )}
    </div>
  );
}
