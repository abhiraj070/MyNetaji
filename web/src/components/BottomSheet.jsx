"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { SPRING_ENTRANCE, SPRING_POP, SPRING_SHEET } from "@/lib/motion";
import { useDismissOnBack } from "@/hooks/useDismissOnBack";
import { useTranslation } from "@/lib/i18n";

/**
 * A modal that slides up from the bottom of the viewport.
 *
 * Reused for Information, Leaderboard, and Search — the trio of secondary
 * surfaces that keep the main representative card slim.
 *
 * Every sheet built on this is dismissed by the platform's Back action before
 * the page is: that lives in `useDismissOnBack`, wired here once so no sheet
 * has to remember to ask for it.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = "auto",
  autoFocus = false,
}) {
  const contentRef = useRef(null);
  const { t } = useTranslation();

  // Back / the iOS edge-swipe closes this sheet rather than leaving the page.
  useDismissOnBack(open, onClose);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Focus the first focusable element inside the sheet on open — the search
  // sheet uses this to land the caret in the combobox immediately.
  useEffect(() => {
    if (!open || !autoFocus) return;
    const t = setTimeout(() => {
      const target = contentRef.current?.querySelector(
        'input, textarea, [contenteditable="true"]',
      );
      target?.focus();
    }, 220);
    return () => clearTimeout(t);
  }, [open, autoFocus]);

  const sheetHeight = size === "tall" ? "h-[88vh] sm:h-[85vh]" : "max-h-[92vh]";

  return (
    // The frame is always mounted and goes inert the instant `open` flips
    // false. The backdrop outlives the close by the length of its exit
    // animation, and while it is still on screen it would otherwise swallow
    // the very next tap — reliably eating the first press on the bottom action
    // bar right after a sheet closes. Driving that from a plain class (rather
    // than an `exit` prop) matters: `pointerEvents` is not animatable, and
    // putting it in `exit` leaves AnimatePresence waiting for an animation
    // that never finishes, so sheets pile up in the DOM instead of unmounting.
    <div
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <AnimatePresence>
        {open && (
          <div className="absolute inset-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={onClose}
              className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              /* Springs in, but tweens out: a spring on exit drags the tail of
               the close out past the point where it still reads as responsive.
               No overshoot on the way in either — the sheet is anchored to the
               bottom edge, so any bounce past 0 would flash a gap beneath it. */
              exit={{
                y: "100%",
                transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
              }}
              transition={SPRING_SHEET}
              className={`absolute inset-x-0 bottom-0 flex ${sheetHeight} flex-col rounded-t-[36px] bg-surface shadow-lift sm:mx-auto sm:max-w-2xl sm:rounded-t-[40px] lg:max-w-3xl`}
            >
              <div
                aria-hidden
                className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-rule"
              />
              <header className="flex items-start justify-between gap-3 px-6 pt-4 pb-3">
                <div className="min-w-0">
                  <h2 className="font-display text-2xl leading-tight font-bold text-ink sm:text-3xl">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="mt-1 text-sm font-semibold text-muted">
                      {subtitle}
                    </p>
                  )}
                </div>
                <motion.button
                  type="button"
                  onClick={onClose}
                  aria-label={t("common.close")}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.92 }}
                  transition={SPRING_POP}
                  className="shrink-0 rounded-full bg-surface-2 p-2.5 text-muted ring-1 ring-ink/5 transition-colors hover:bg-brand-wash hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <X className="size-4" strokeWidth={2} />
                </motion.button>
              </header>
              {/* The body arrives a beat behind the sheet itself, so the panel
                lands first and its contents settle into it. */}
              <motion.div
                ref={contentRef}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING_ENTRANCE, delay: 0.08 }}
                className="min-h-0 flex-1 overflow-y-auto px-6 pb-8"
              >
                {children}
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
