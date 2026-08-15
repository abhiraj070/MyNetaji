"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchSession, logoutSession, startGoogleLogin } from "@/lib/api";

export const SESSION_KEY = ["session"];

/**
 * Who is signed in, if anyone.
 *
 * `user === null` is a settled answer ("signed out"), distinct from
 * `isPending` ("we haven't asked yet") — the gate in `home.jsx` needs to tell
 * those apart, because showing an auth page to someone who turns out to be
 * signed in is a flash of the wrong screen on every load.
 *
 * `isError` is kept separate again: the API being unreachable is not the same
 * as being signed out, and offering "Continue with Google" to someone whose
 * network is down would just fail a second time.
 */
export function useSession() {
  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: fetchSession,
    staleTime: 5 * 60_000,
    retry: false,
  });

  return {
    user: query.data ?? null,
    isAuthenticated: Boolean(query.data),
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Sign out, then drop every cached answer that belonged to that session. */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutSession,
    onSuccess: () => {
      queryClient.setQueryData(SESSION_KEY, null);
      queryClient.clear();
    },
  });
}

export { startGoogleLogin };
