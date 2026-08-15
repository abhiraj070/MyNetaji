"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";
import { rise } from "@/lib/motion";

/**
 * The step between signing in and seeing anything: asking for location.
 *
 * Shown only once the reader is authenticated — the browser's own permission
 * prompt is a limited resource, and spending it before they have any reason to
 * trust the app is how you get a permanent "denied".
 *
 * `error` covers every way this can fail — denied, unsupported browser, a
 * lookup that broke, a point outside the constituencies we hold — and each one
 * leaves the same button in place, because all of them are worth retrying
 * (even "denied": the reader may go and change it in settings).
 */
export function LocationPermission({ onAllow, isBusy = false, error = null }) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12 text-center">
      <motion.span
        {...rise(0)}
        className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-wash text-brand-strong ring-1 ring-brand/15 ring-inset"
      >
        <MapPin className="size-6" strokeWidth={2.25} />
      </motion.span>

      <motion.h1
        {...rise(0.06)}
        className="mt-6 font-display text-2xl leading-tight font-bold text-balance text-ink sm:text-3xl"
      >
        {t("auth.locationTitle")}
      </motion.h1>

      <motion.p
        {...rise(0.12)}
        className="mx-auto mt-3 max-w-sm text-sm leading-relaxed font-medium text-pretty text-muted"
      >
        {t("auth.locationBody")}
      </motion.p>

      {error && (
        <motion.p
          {...rise(0.16)}
          role="alert"
          className="mx-auto mt-5 max-w-sm rounded-card bg-slap-wash px-4 py-3 text-xs leading-relaxed font-semibold text-slap-strong ring-1 ring-slap/15 ring-inset"
        >
          {t(error)}
        </motion.p>
      )}

      <motion.div {...rise(0.2)} className="mt-7 flex flex-col items-center gap-3">
        <Button onClick={onAllow} disabled={isBusy} className="w-full sm:w-auto">
          {isBusy ? t("auth.locating") : t("auth.allowLocation")}
        </Button>
        <p className="text-[11px] font-medium text-faint">
          {t("auth.locationPrivacy")}
        </p>
      </motion.div>
    </div>
  );
}
