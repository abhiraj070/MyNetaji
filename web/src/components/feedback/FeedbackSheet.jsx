"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { sendFeedback } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { SPRING_POP } from "@/lib/motion";
import { Toast } from "@/components/ui/Toast";

/**
 * The feedback flow, wrapped in the shared `BottomSheet`. React first (slap or
 * rose), say why, send. Kept tight so the whole thing lands in well under 10
 * seconds.
 *
 * `onSubmitted(reaction)` fires after a successful send; the parent closes this
 * sheet and pops the celebratory modal.
 */
// Copy lives as keys so a reaction card relabels with the language; the
// colour tokens stay literal since they are not text.
const REACTIONS = [
  {
    value: "slap",
    emoji: "👋",
    titleKey: "feedback.slapTitle",
    subtitleKey: "feedback.slapSubtitle",
    placeholderKey: "feedback.slapPlaceholder",
    ring: "ring-slap",
    wash: "bg-slap-wash",
    text: "text-slap-strong",
  },
  {
    value: "rose",
    emoji: "🌹",
    titleKey: "feedback.roseTitle",
    subtitleKey: "feedback.roseSubtitle",
    placeholderKey: "feedback.rosePlaceholder",
    ring: "ring-laurel",
    wash: "bg-laurel-wash",
    text: "text-laurel-strong",
  },
];

export function FeedbackSheet({ open, onClose, onSubmitted }) {
  const { t } = useTranslation();
  const [reaction, setReaction] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Reset to a clean slate whenever the sheet fully closes, so re-opening never
  // shows the last person's draft.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setReaction(null);
      setMessage("");
      setSubmitting(false);
      setToast(null);
    }, 260);
    return () => clearTimeout(t);
  }, [open]);

  const active = REACTIONS.find((r) => r.value === reaction) ?? null;
  const canSend = Boolean(reaction) && message.trim().length > 0 && !submitting;

  async function handleSend() {
    if (!canSend) return;
    setSubmitting(true);
    setToast(null);
    try {
      await sendFeedback({ reaction, message: message.trim() });
      // Success: parent closes the sheet and pops the celebration. The reset
      // effect above wipes the form once the sheet is fully closed.
      onSubmitted?.(reaction);
    } catch {
      // Keep the sheet open and the draft intact; just surface a toast.
      setSubmitting(false);
      setToast(t("feedback.failed"));
      setTimeout(() => setToast(null), 3400);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("feedback.title")}
      subtitle={t("feedback.subtitle")}
    >
      {/* Reaction cards */}
      <div className="grid grid-cols-2 gap-3">
        {REACTIONS.map((r) => {
          const selected = reaction === r.value;
          return (
            <motion.button
              key={r.value}
              type="button"
              onClick={() => setReaction(r.value)}
              aria-pressed={selected}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              animate={{ scale: selected ? 1.02 : 1 }}
              transition={SPRING_POP}
              className={`flex flex-col items-center gap-1 rounded-[24px] px-4 py-5 text-center ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                selected
                  ? `${r.wash} ${r.ring} ring-2`
                  : "bg-surface-2 ring-ink/5 hover:bg-brand-wash/40"
              }`}
            >
              <span aria-hidden className="text-4xl leading-none">
                {r.emoji}
              </span>
              <span className={`mt-1 font-display text-base font-bold ${selected ? r.text : "text-ink"}`}>
                {t(r.titleKey)}
              </span>
              <span className="text-xs font-semibold text-muted">{t(r.subtitleKey)}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Tell us why */}
      <label className="mt-6 block">
        <span className="eyebrow">{t("feedback.tellUsWhy")}</span>
        <AutoTextarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            active ? t(active.placeholderKey) : t("feedback.pickFirst")
          }
          disabled={!reaction}
        />
      </label>

      {/* Send */}
      <motion.button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        whileHover={canSend ? { y: -2 } : undefined}
        whileTap={canSend ? { scaleX: 1.02, scaleY: 0.95, y: 2 } : undefined}
        transition={SPRING_POP}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-control bg-brand px-6 py-4 font-display text-lg font-semibold text-white shadow-[0_5px_0_var(--color-brand-strong)] transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
      >
        {submitting ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            {t("feedback.sending")}
          </>
        ) : (
          <>{t("feedback.send")}</>
        )}
      </motion.button>

      <Toast message={toast} className="bottom-24" />
    </BottomSheet>
  );
}

/** Multiline input that grows with its content, up to a scroll cap. */
function AutoTextarea({ value, onChange, placeholder, disabled }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={3}
      className="mt-1.5 w-full resize-none rounded-[18px] bg-surface-2 px-4 py-3 text-base text-ink ring-1 ring-ink/5 transition-colors placeholder:text-faint focus:bg-surface focus:ring-brand/40 focus-visible:outline-none disabled:opacity-60"
    />
  );
}
