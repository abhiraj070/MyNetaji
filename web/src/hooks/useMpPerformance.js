"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchMpPerformance,
  fetchMpPerformanceDebates,
  fetchMpPerformanceQuestions,
  fetchMpPerformanceWorks,
} from "@/lib/api";

/**
 * One MP's Performance tab.
 *
 * Only MPs have this data — it is keyed on `mps.id`, and the MPLADS and
 * parliamentary sources are Lok Sabha sources — so the query stays disabled
 * for a Chief Minister or a Union Minister rather than firing a request that
 * could only come back empty.
 *
 * Not keyed by language: every figure here is a number, a date or a
 * government-issued label, none of which is translated server-side. Adding
 * `language` to the key would refetch several hundred rows on a language
 * switch to receive the identical payload.
 */
export function useMpPerformance({ subject, enabled = true }) {
  const isMp = subject?.tier === "mp";
  const id = subject?.id;

  const query = useQuery({
    queryKey: ["mp-performance", id],
    queryFn: () => fetchMpPerformance(id),
    enabled: Boolean(enabled && isMp && id),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return {
    performance: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * The paged-list pattern the three hooks below share.
 *
 * The first page of each list already arrives inside the main
 * `/get-mp-performance` response, so it is seeded into the query cache as
 * `initialData` rather than kept beside it. That matters for more than saving
 * a request: `placeholderData` can only hand back the previous *cached* result
 * when the key changes, so a first page that lived outside the cache left the
 * first filter change with nothing to show. The list would unmount for a beat,
 * taking its parent's open/closed state with it — pressing "Starred" collapsed
 * the whole questions section.
 *
 * With the first page cached, every key change keeps the previous page on
 * screen (dimmed by `isPending` at the call site) until the new one lands.
 */
function usePagedList({ queryKey, queryFn, isInitial, initialPage, enabled }) {
  const query = useQuery({
    queryKey,
    queryFn,
    enabled: Boolean(enabled),
    initialData: isInitial ? initialPage : undefined,
    placeholderData: (previous) => previous,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return {
    page: query.data ?? initialPage ?? null,
    // `isFetching`, not `isPending`: with placeholder data in hand the query is
    // never "pending", but the list on screen is still the previous one.
    isPending: query.isFetching && !isInitial,
    isError: query.isError,
  };
}

/**
 * One page of MPLADS works, for the status filter and "show more".
 */
export function useMpWorks({ id, status, page, initialPage, enabled = true }) {
  const normalised = status === "all" || !status ? null : status;
  const result = usePagedList({
    queryKey: ["mp-performance-works", id, normalised ?? "all", page],
    queryFn: () => fetchMpPerformanceWorks({ id, status: normalised, page }),
    isInitial: !normalised && page === 1,
    initialPage,
    enabled: enabled && id,
  });

  return { works: result.page, isPending: result.isPending, isError: result.isError };
}

/** One page of questions asked, optionally narrowed to starred/unstarred. */
export function useMpQuestions({ id, questionType, page, initialPage, enabled = true }) {
  const result = usePagedList({
    queryKey: ["mp-performance-questions", id, questionType ?? "all", page],
    queryFn: () => fetchMpPerformanceQuestions({ id, questionType, page }),
    isInitial: !questionType && page === 1,
    initialPage,
    enabled: enabled && id,
  });

  return {
    questions: result.page,
    isPending: result.isPending,
    isError: result.isError,
  };
}

/** One page of debates participated in. */
export function useMpDebates({ id, page, initialPage, enabled = true }) {
  const result = usePagedList({
    queryKey: ["mp-performance-debates", id, page],
    queryFn: () => fetchMpPerformanceDebates({ id, page }),
    isInitial: page === 1,
    initialPage,
    enabled: enabled && id,
  });

  return { debates: result.page, isPending: result.isPending, isError: result.isError };
}
