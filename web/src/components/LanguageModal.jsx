"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Globe } from "lucide-react";

import { useDismissOnBack } from "@/hooks/useDismissOnBack";
import { useTranslation } from "@/lib/i18n";
import { SPRING_POP } from "@/lib/motion";

/**
 * Language chooser. Shown once, immediately after the location resolves, and
 * never again — `hasChosen` on the language context is what gates it, and that
 * is distinct from "currently using English". Someone who picks English is
 * therefore not asked a second time on their next visit.
 *
 * Deliberately not dismissible by backdrop or Escape when it is the first-run
 * prompt: it is a two-option choice with an obvious default, and letting it be
 * dismissed leaves `hasChosen` false so it would reappear on the next load.
 * Re-opened from the sidebar, it *is* dismissible, since a choice already
 * exists to fall back on.
 */
export function LanguageModal({ open, onClose, dismissible = false }) {
  const { t, language, languages, setLanguage } = useTranslation();

  // Only when it can actually be dismissed. The first-run prompt has no way
  // out but choosing, so giving Back an entry to spend there would swallow the
  // press and leave the modal exactly where it was.
  useDismissOnBack(dismissible && open, onClose);

  function choose(code) {
    setLanguage(code);
    onClose?.();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={dismissible ? onClose : undefined}
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("language.title")}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={SPRING_POP}
            className="relative w-full max-w-sm rounded-card bg-surface p-6 shadow-lift ring-1 ring-ink/5"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-wash text-brand-strong">
              <Globe className="size-5" strokeWidth={2.25} />
            </span>

            <h2 className="mt-3 font-display text-xl font-bold text-ink">
              {t("language.title")}
            </h2>
            <p className="mt-1 text-sm font-medium text-muted">
              {t("language.subtitle")}
            </p>

            <div className="mt-5 space-y-2.5">
              {languages.map((option) => {
                const selected = option.code === language;
                return (
                  <motion.button
                    key={option.code}
                    type="button"
                    onClick={() => choose(option.code)}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_POP}
                    className={`flex w-full items-center justify-between rounded-control px-4 py-3.5 text-left ring-1 transition-colors ${
                      selected
                        ? "bg-brand-wash text-brand-strong ring-brand/40"
                        : "bg-surface-2 text-ink ring-ink/5 hover:bg-brand-wash/40"
                    }`}
                  >
                    {/* The label is written in its own language — that is what a
                        speaker scans for, not the English exonym. */}
                    <span className="font-display text-base font-bold">
                      {option.label}
                    </span>
                    {selected && <Check className="size-4" strokeWidth={2.5} />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
