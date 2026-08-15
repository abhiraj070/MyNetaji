"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchDataFreshness } from "@/lib/api";

/**
 * When the data behind a tier was last refreshed.
 *
 * Fetched once for the whole app and held for an hour: the answer only changes
 * when an importer runs, which is a manual, occasional thing. Passing a `tier`
 * narrows the shared result to that tier's entry.
 *
 * Returns `null` rather than a placeholder when the tier has no data — every
 * caller then renders nothing, so a screen never shows "Data updated —" or an
 * invented date.
 */
export function useDataFreshness(tier) {
  const query = useQuery({
    queryKey: ["data-freshness"],
    queryFn: fetchDataFreshness,
    staleTime: 60 * 60_000,
    gcTime: 2 * 60 * 60_000,
    retry: 1,
  });

  const datasets = query.data ?? null;
  return {
    // No tier asked for → the whole map, for callers showing several at once.
    freshness: tier ? (datasets?.[tier] ?? null) : datasets,
    isPending: query.isPending,
    isError: query.isError,
  };
}
