"use client";

import { useCallback, useState } from "react";

import { GoogleButton } from "./GoogleButton";
import { useGoogleLogin } from "@/hooks/useSession";
import { useTranslation } from "@/lib/i18n";

/**
 * "Continue with Google", wired up: the popup, the exchange, and whatever went
 * wrong. Both places that offer sign-in (the landing page and `/auth`) render
 * this, so neither has to know how the credential gets turned into a session.
 *
 * Nothing navigates on success. The mutation writes the user into the session
 * cache, and the screens that were showing a signed-out view — the landing
 * gate in `home.jsx`, the redirect in `AuthPage` — react to that on their own.
 * That is the same state the old redirect flow ended up in, reached without
 * leaving the page.
 *
 * Failures are codes from the backend, mapped to a sentence here rather than
 * shown raw, and the button stays where it is: every failure in this flow is
 * retryable.
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
  gis_unavailable: "auth.googleUnavailable",
  gis_misconfigured: "auth.googleNotConfigured",
};

export function ContinueWithGoogle({ className = "" }) {
  const { t } = useTranslation();
  const { signIn, isPending, errorCode } = useGoogleLogin();
  const [gisReason, setGisReason] = useState(null);

  // Stable identity: `GoogleButton` reports availability from an effect, and a
  // new function every render would loop it.
  const handleUnavailable = useCallback((reason) => {
    setGisReason(reason);
  }, []);

  const code = gisReason ?? errorCode;
  const message = code ? t(ERROR_COPY[code] ?? "auth.exchangeFailed") : null;

  // Progress is said rather than shown on the button: the button is Google's
  // now, and covering or restyling it is what broke sign-in in production.
  const status = isPending ? t("auth.signingIn") : null;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <GoogleButton
        onCredential={signIn}
        onUnavailable={handleUnavailable}
        className={className}
      />

      {status && (
        <p className="text-xs font-semibold text-muted">{status}</p>
      )}

      {!status && message && (
        <p
          role="alert"
          className="mx-auto max-w-sm rounded-card bg-slap-wash px-4 py-3 text-xs leading-relaxed font-semibold text-slap-strong ring-1 ring-slap/15 ring-inset"
        >
          {message}
        </p>
      )}
    </div>
  );
}
