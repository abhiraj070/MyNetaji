"use client";

import {
  Banknote,
  Building2,
  Car,
  FileWarning,
  Gem,
  Home,
  Landmark,
  LineChart,
  MoreHorizontal,
  PieChart,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wheat,
} from "lucide-react";

import { BottomSheet } from "../BottomSheet";
import { useAssets } from "@/hooks/useAssets";
import { useTranslation } from "@/lib/i18n";
import { ASSET_FIELD_GROUPS } from "@/lib/profile";
import { ErrorNote } from "@/components/ui/ErrorNote";

const GROUP_ICON = {
  movable: Wallet,
  immovable: Building2,
  other: MoreHorizontal,
};

const FIELD_ICON = {
  cash: Banknote,
  bankDeposits: Landmark,
  sharesInvestments: LineChart,
  mutualFunds: PieChart,
  jewellery: Gem,
  vehicles: Car,
  residentialProperty: Home,
  commercialProperty: Building2,
  agriculturalLand: Wheat,
  otherAssets: MoreHorizontal,
};

function formatInr(value, notAvailable) {
  if (value === null || value === undefined) return notAvailable;
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

/**
 * The Declared Assets breakdown — opened from the Overview tab's "Declared
 * Assets" card. A `BottomSheet` (not a separate modal primitive) so it shares
 * the exact visual language — and stacks visually — with the Politician
 * Profile sheet it's opened from.
 *
 * Figures come from `POST /get-assets`, keyed on the politician's name and
 * designation. This sheet is always mounted (as a sibling of the profile
 * sheet, so it positions correctly), so the request is gated on `open` — it
 * fires when the user taps the card, never on page load.
 *
 * When no record is on file the full grouped layout still renders, with an
 * honest "not available" per field and a banner explaining why. Nothing here
 * is estimated or invented.
 */
export function AssetBreakdownSheet({ open, onClose, subject }) {
  const { t } = useTranslation();
  const { latest, isPending, isError, error } = useAssets({
    subject,
    enabled: open,
  });

  if (!subject) return null;

  const data = latest ?? {};
  const loading = open && isPending;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("assets.title")}
      subtitle={subject.name}
    >
      {isError ? (
        <ErrorNote error={error} />
      ) : loading ? (
        <AssetsSkeleton />
      ) : (
        <>
          {!latest && (
            <div className="flex items-start gap-3 rounded-card bg-surface-2 px-4 py-3.5 ring-1 ring-ink/5">
              <FileWarning
                className="mt-0.5 size-4 shrink-0 text-faint"
                strokeWidth={2}
              />
              <p className="text-xs leading-relaxed font-medium text-muted">
                {t("assets.noAffidavit")}
              </p>
            </div>
          )}

          <div className={`grid grid-cols-2 gap-3 ${latest ? "" : "mt-4"}`}>
            <SummaryStat
              icon={TrendingUp}
              label={t("assets.totalAssets")}
              value={data.totalAssets ?? null}
              tone="laurel"
            />
            <SummaryStat
              icon={TrendingDown}
              label={t("assets.totalLiabilities")}
              value={data.totalLiabilities ?? null}
              tone="slap"
            />
          </div>

          <div className="mt-5 space-y-4">
            {ASSET_FIELD_GROUPS.map((group) => (
              <FieldGroup key={group.key} group={group} data={data} />
            ))}
          </div>

          {latest && <SourceNote record={latest} />}
        </>
      )}
    </BottomSheet>
  );
}

/**
 * Which filing these figures come from. Named precisely — the sheet shows one
 * declaration, so this points at that exact affidavit rather than the source
 * site in general.
 */
function SourceNote({ record }) {
  const { t } = useTranslation();
  const label = record.electionName
    ? `MyNeta — ${record.electionName}`
    : "MyNeta (ADR)";

  return (
    <p className="mt-5 text-[11px] leading-relaxed font-medium text-faint">
      {t("profile.source")}{" "}
      {record.sourceUrl ? (
        <a
          href={record.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted underline underline-offset-2"
        >
          {label}
        </a>
      ) : (
        label
      )}
      , {t("assets.sourceNote")}
    </p>
  );
}

function AssetsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }, (_, i) => (
          <div
            key={i}
            className="rounded-card bg-surface p-3.5 shadow-card ring-1 ring-ink/5"
          >
            <span className="block size-8 rounded-full bg-rule" />
            <span className="mt-2 block h-2.5 w-20 rounded bg-rule" />
            <span className="mt-1.5 block h-3.5 w-24 rounded bg-rule" />
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-4">
        {Array.from({ length: 3 }, (_, group) => (
          <div
            key={group}
            className="overflow-hidden rounded-card bg-surface-2 ring-1 ring-ink/5"
          >
            <div className="border-b border-rule px-4 py-3">
              <span className="block h-3 w-32 rounded bg-rule" />
            </div>
            <ul className="divide-y divide-rule">
              {Array.from({ length: 3 }, (_, row) => (
                <li key={row} className="flex items-center gap-3 px-4 py-3">
                  <span className="size-4 shrink-0 rounded bg-rule" />
                  <span className="h-3 flex-1 rounded bg-rule" />
                  <span className="h-3 w-16 shrink-0 rounded bg-rule" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value, tone }) {
  const { t } = useTranslation();
  const toneClass =
    tone === "laurel"
      ? "bg-laurel-wash text-laurel-strong"
      : "bg-slap-wash text-slap-strong";

  return (
    <div className="rounded-card bg-surface p-3.5 shadow-card ring-1 ring-ink/5">
      <span
        className={`flex size-8 items-center justify-center rounded-full ${toneClass}`}
      >
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
      <p className="mt-2 text-[11px] leading-tight font-semibold text-muted">
        {label}
      </p>
      <p className="mt-0.5 font-display text-base font-bold text-ink">
        {formatInr(value, t("assets.notAvailable"))}
      </p>
    </div>
  );
}

function FieldGroup({ group, data }) {
  const { t } = useTranslation();
  const GroupIcon = GROUP_ICON[group.key] ?? Wallet;
  const total = group.totalKey ? data[group.totalKey] : null;

  return (
    <div className="overflow-hidden rounded-card bg-surface-2 ring-1 ring-ink/5">
      <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <div className="flex items-center gap-2">
          <GroupIcon className="size-4 text-muted" strokeWidth={2.25} />
          <h4 className="font-display text-sm font-bold text-ink">
            {t(group.labelKey)}
          </h4>
        </div>
        {group.totalKey && (
          <span className="font-display text-sm font-bold text-ink">
            {formatInr(total, t("assets.notAvailable"))}
          </span>
        )}
      </div>
      <ul className="divide-y divide-rule">
        {group.fields.map((field) => {
          const FieldIcon = FIELD_ICON[field.key] ?? MoreHorizontal;
          return (
            <li key={field.key} className="flex items-center gap-3 px-4 py-3">
              <FieldIcon
                className="size-4 shrink-0 text-faint"
                strokeWidth={2}
              />
              <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                {t(field.labelKey)}
              </span>
              <span className="shrink-0 text-sm font-semibold text-muted">
                {formatInr(data[field.key], t("assets.notAvailable"))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
