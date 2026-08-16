"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ContinueWithGoogle } from "@/components/auth/ContinueWithGoogle";
import { PaintedTricolour } from "@/components/landing/PaintedTricolour";
import { useSession } from "@/hooks/useSession";
import { useTranslation } from "@/lib/i18n";
import { rise } from "@/lib/motion";

/**
 * `/auth` — the sign-in screen: wordmark, one sentence about what SYL is, one
 * button.
 *
 * Deliberately not a login form. There is no password to type, no second
 * provider to weigh up and no "or" divider — the whole screen is a single
 * decision, which is what makes it feel like a door rather than a gate.
 *
 * Sign-in happens in a Google popup on this page, so nothing leaves and comes
 * back with a reason in the URL: whatever went wrong is reported by
 * `ContinueWithGoogle`, under the button that will try again.
 *
 * Someone already signed in has no business here — the effect sends them to
 * the app. That is also what carries a reader onward the moment the popup
 * succeeds, because the sign-in writes the session into the cache and this
 * sees it. It waits for the session to settle first: acting while it is still
 * pending would bounce a signed-in reader through this screen on every load.
 */
export function AuthPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, isPending } = useSession();

  useEffect(() => {
    if (!isPending && isAuthenticated) router.replace("/");
  }, [isAuthenticated, isPending, router]);

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

        <motion.div {...rise(0.2)} className="mt-8 flex flex-col items-center gap-3">
          <ContinueWithGoogle />
          <p className="text-[11px] font-medium text-faint">{t("auth.privacy")}</p>
        </motion.div>
      </div>
    </div>
  );
}
