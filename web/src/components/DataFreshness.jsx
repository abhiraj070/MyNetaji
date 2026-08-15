"use client";

import { useDataFreshness } from "@/hooks/useDataFreshness";
import { useTranslation } from "@/lib/i18n";

/**
 * "Data updated Aug 12, 2026" — the two ways this app states its own freshness.
 *
 * `DataFreshnessLine` is the compact one for the home page: a single quiet
 * line under the representative card, with only the date carrying colour. It
 * is deliberately the least prominent thing in that column — the portrait and
 * the two verdict discs are what the screen is for, and a metadata line that
 * competed with them would be a worse screen, not a more transparent one.
 *
 * `DataFreshnessBlock` is the fuller one for the information panel, where a
 * reader has already chosen to look at detail: it names the source as well as
 * the date, and links out to it.
 *
 * Both render nothing at all when the tier has no ingested data. There is no
 * "unknown" state and no placeholder date — saying nothing is the honest
 * answer, and it keeps a half-loaded screen from flashing a wrong claim.
 */

/**
 * "Aug 12, 2026" — month-name form, so 08/12 can never be read as the 8th of
 * December.
 *
 * Locale is pinned rather than left to the reader's, for the same reason every
 * other date in this app is: a Hindi locale renders Devanagari digits, which is
 * not what anyone wants in a date stamp. `en-US` rather than the `en-IN` used
 * elsewhere purely for the month-first order this label is specified in — both
 * give Latin digits.
 */
function formatUpdated(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DataFreshnessLine({ tier, className = "" }) {
  const { t } = useTranslation();
  const { freshness } = useDataFreshness(tier);
  const updated = formatUpdated(freshness?.updatedAt);
  if (!updated) return null;

  return (
    <p
      className={`text-center text-[11px] leading-none font-medium text-faint ${className}`}
    >
      {t("data.updated")}{" "}
      {/* Green sits on the date alone: it is the freshness signal, and
          tinting the whole line would make a footnote look like a status
          banner. `text-laurel-strong` is the app's existing positive tone —
          no new colour is introduced for this. */}
      <span className="font-semibold text-laurel-strong">{updated}</span>
    </p>
  );
}

export function DataFreshnessBlock({ tier }) {
  const { t } = useTranslation();
  const { freshness } = useDataFreshness(tier);
  const updated = formatUpdated(freshness?.updatedAt);
  if (!updated) return null;

  return (
    <section className="rounded-card bg-surface-2 px-4 py-3.5 ring-1 ring-ink/5">
      <dl className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[11px] font-medium text-muted">
            {t("data.source")}
          </dt>
          <dd className="text-xs font-semibold text-ink">
            {freshness.sourceUrl ? (
              <a
                href={freshness.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {freshness.source}
              </a>
            ) : (
              freshness.source
            )}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[11px] font-medium text-muted">
            {t("data.lastUpdated")}
          </dt>
          <dd className="text-xs font-semibold text-laurel-strong">{updated}</dd>
        </div>
      </dl>

      {freshness.sourceDetail && (
        <p className="mt-2.5 border-t border-rule pt-2.5 text-[11px] leading-relaxed font-medium text-faint">
          {t("data.note", { source: freshness.sourceDetail })}
        </p>
      )}
    </section>
  );
}
