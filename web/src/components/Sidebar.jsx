"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Globe, LogOut, MessageCircle, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useLogout, useSession } from "@/hooks/useSession";
import { useTranslation } from "@/lib/i18n";
import { SPRING_SHEET } from "@/lib/motion";

/**
 * The app drawer, slid in from the left by the hamburger that sits outside the
 * nav bar.
 *
 * Three entries today — Language, Feedback and Replay tutorial — built as a
 * list of rows rather than bespoke buttons, so adding an item later is one
 * array entry. Feedback lives here rather than in the header, where Live News
 * took its place; the tutorial replay moved here from the foot of the
 * information tabs, where it repeated under all four of them.
 *
 * Sign-out sits apart from that list, at the foot of the drawer: it is the one
 * control here that ends the session rather than adjusting it, and putting it
 * in the row stack would make it a fourth setting. It reads the session itself
 * rather than taking it as a prop — the account is the drawer's own business,
 * and threading user/handler/pending through the page for one button is more
 * wiring than it saves.
 */
export function Sidebar({
  open,
  onClose,
  onOpenLanguage,
  onOpenFeedback,
  onReplayTutorial,
}) {
  const { t, language, languages } = useTranslation();
  const router = useRouter();
  const { user, isAuthenticated } = useSession();
  const logout = useLogout();

  // Lock body scroll and wire Escape while open — mirrors BottomSheet so every
  // overlay in the app behaves the same way.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const activeLanguage =
    languages.find((l) => l.code === language)?.label ?? language;

  const items = [
    {
      key: "language",
      icon: Globe,
      label: t("nav.language"),
      // The current choice reads as a value, so the row states what it is set
      // to rather than only what it does.
      value: activeLanguage,
      onClick: onOpenLanguage,
    },
    {
      key: "feedback",
      icon: MessageCircle,
      label: t("nav.feedback"),
      value: null,
      onClick: onOpenFeedback,
    },
    {
      key: "replay",
      icon: Sparkles,
      label: t("onboarding.replay"),
      value: null,
      onClick: onReplayTutorial,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.menu")}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={SPRING_SHEET}
            className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col rounded-r-card bg-surface shadow-lift"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <p className="font-display text-lg leading-none font-bold tracking-tight text-ink">
                {t("app.name")}
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("nav.closeMenu")}
                className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-muted ring-1 ring-ink/5 transition-colors hover:text-ink"
              >
                <X className="size-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* `flex-1` so the account block below is pushed to the foot of
                the drawer rather than sitting directly under the last row. */}
            <nav className="flex-1 px-4">
              <ul className="space-y-2">
                {items.map(({ key, icon: Icon, label, value, onClick }) => (
                  <li key={key}>
                    <motion.button
                      type="button"
                      onClick={onClick}
                      whileTap={{ scale: 0.98 }}
                      className="flex w-full items-center gap-3 rounded-control bg-surface-2 px-4 py-3.5 text-left ring-1 ring-ink/5 transition-colors hover:bg-brand-wash/40"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-wash text-brand-strong">
                        <Icon className="size-4" strokeWidth={2.25} />
                      </span>
                      <span className="min-w-0 flex-1 font-display text-sm font-bold text-ink">
                        {label}
                      </span>
                      {value && (
                        <span className="shrink-0 text-xs font-semibold text-muted">
                          {value}
                        </span>
                      )}
                      <ChevronRight
                        className="size-4 shrink-0 text-faint"
                        strokeWidth={2.5}
                      />
                    </motion.button>
                  </li>
                ))}
              </ul>
            </nav>

            {isAuthenticated && (
              <div className="border-t border-rule px-4 pt-4 pb-6">
                {/* Whose account this is. Sign-out with no name attached is a
                    button you have to think about; with one, it is obvious. */}
                <p className="px-1 pb-2 text-[11px] leading-tight font-medium text-faint">
                  {t("nav.signedInAs")}{" "}
                  <span className="font-semibold text-muted">
                    {user?.email ?? user?.name}
                  </span>
                </p>

                <motion.button
                  type="button"
                  disabled={logout.isPending}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    try {
                      await logout.mutateAsync();
                    } catch {
                      // The row shows the failure and stays put; the drawer
                      // does not close, so the reader can simply press again.
                      return;
                    }
                    onClose();
                    // `replace`, not `push`: the app they just left should not
                    // be one Back press away from a signed-out session.
                    router.replace("/auth");
                  }}
                  className="flex w-full items-center gap-3 rounded-control bg-surface-2 px-4 py-3.5 text-left ring-1 ring-ink/5 transition-colors hover:bg-slap-wash/50 disabled:opacity-60"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slap-wash text-slap-strong">
                    <LogOut className="size-4" strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0 flex-1 font-display text-sm font-bold text-ink">
                    {logout.isPending ? t("nav.loggingOut") : t("nav.logout")}
                  </span>
                </motion.button>

                {logout.isError && (
                  <p
                    role="alert"
                    className="mt-2 px-1 text-[11px] font-semibold text-slap-strong"
                  >
                    {t("nav.logoutFailed")}
                  </p>
                )}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
