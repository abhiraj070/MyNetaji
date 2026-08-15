"use client";

import { motion } from "framer-motion";

import { GoogleButton } from "./GoogleButton";
import { PaintedTricolour } from "@/components/landing/PaintedTricolour";
import { startGoogleLogin } from "@/hooks/useSession";
import { useTranslation } from "@/lib/i18n";
import { rise } from "@/lib/motion";

/**
 * The sign-in screen: wordmark, one sentence about what SYL is, one button.
 *
 * Deliberately not a login form. There is no password to type, no second
 * provider to weigh up and no "or" divider — the whole screen is a single
 * decision, which is what makes it feel like a door rather than a gate.
 *
 * `error` is a code from the backend's callback (`?auth_error=…`), mapped to a
 * sentence here rather than shown raw. Each one says what happened and leaves
 * the same button in place to try again, because every failure in this flow is
 * retryable.
 */
const ERROR_COPY = {
  access_denied: "auth.cancelled",
  state_mismatch: "auth.stateMismatch",
  exchange_failed: "auth.exchangeFailed",
  no_profile: "auth.noProfile",
  session_expired: "auth.sessionExpired",
  unreachable: "auth.unreachable",
};

export function AuthScreen({ error = null }) {
  const { t } = useTranslation();
  const message = error ? t(ERROR_COPY[error] ?? "auth.exchangeFailed") : null;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <PaintedTricolour />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12 text-center">
        <motion.p
          {...rise(0)}
          className="font-display text-2xl font-bold tracking-tight text-ink"
        >
          My<span className="text-brand-strong">Neta</span>ji
        </motion.p>

        <motion.h1
          {...rise(0.06)}
          className="mt-8 font-display text-3xl leading-[1.1] font-bold text-balance text-ink sm:text-4xl"
        >
          {t("auth.welcome")}
        </motion.h1>

        <motion.p
          {...rise(0.12)}
          className="mx-auto mt-4 max-w-sm text-sm leading-relaxed font-medium text-pretty text-muted sm:text-base"
        >
          {t("auth.blurb")}
        </motion.p>

        {message && (
          <motion.p
            {...rise(0.16)}
            role="alert"
            className="mx-auto mt-6 max-w-sm rounded-card bg-slap-wash px-4 py-3 text-xs leading-relaxed font-semibold text-slap-strong ring-1 ring-slap/15 ring-inset"
          >
            {message}
          </motion.p>
        )}

        <motion.div {...rise(0.2)} className="mt-8 flex flex-col items-center gap-3">
          <GoogleButton onClick={startGoogleLogin} className="w-full" />
          <p className="text-[11px] font-medium text-faint">{t("auth.privacy")}</p>
        </motion.div>
      </div>
    </div>
  );
}
