"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

import { useDismissOnBack } from "@/hooks/useDismissOnBack";
import { useTranslation } from "@/lib/i18n";
import { SPRING_SHEET } from "@/lib/motion";

/**
 * The panel a feature preview arrives in.
 *
 * Deliberately lighter than the shared `BottomSheet`: that one leads with a
 * large title and subtitle, which on a preview would state the feature's name
 * immediately above a hero that states it again. Here the chrome is a handle
 * and a close button, and the first thing the reader meets is the feature
 * itself.
 *
 * The behaviour is the same as every other sheet in the app — spring up, tween
 * out, Escape to close, body scroll locked while open, flick the header down to
 * dismiss — so a preview feels like part of the product rather than a page
 * bolted onto it.
 */
export function PreviewSheet({ open, onClose, label, header, children }) {
  // Back / the iOS edge-swipe closes this sheet rather than leaving the page,
  // the same as every sheet built on `BottomSheet`. This one is hand-rolled,
  // so it has to ask.
  useDismissOnBack(open, onClose);

  const { t } = useTranslation();
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            /* Springs in, tweens out — a spring on the way out drags the tail
               of the close past the point where it still reads as responsive. */
            exit={{ y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={SPRING_SHEET}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="absolute inset-x-0 bottom-0 flex h-[88vh] flex-col rounded-t-[32px] bg-surface shadow-lift sm:mx-auto sm:max-w-[760px]"
          >
            {/* The drag zone. Only the header initiates the flick-to-dismiss;
                the body below scrolls independently. */}
            <header
              onPointerDown={(event) => dragControls.start(event)}
              style={{ touchAction: "none" }}
              className="shrink-0 cursor-grab rounded-t-[32px] active:cursor-grabbing"
            >
              <div
                aria-hidden
                className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-rule"
              />

              <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-3">
                <div className="min-w-0">{header}</div>

                <motion.button
                  type="button"
                  onClick={onClose}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-label={t("common.close")}
                  whileHover={{ scale: 1.08, rotate: 90 }}
                  whileTap={{ scale: 0.92 }}
                  className="shrink-0 rounded-full bg-surface-2 p-2.5 text-muted ring-1 ring-ink/5 transition-colors hover:bg-brand-wash hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <X className="size-4" strokeWidth={2} />
                </motion.button>
              </div>

              <div className="h-px bg-rule" />
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-paper">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
