"use client";

import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { authErrorCode, fetchSession, googleSignIn, logoutSession } from "@/lib/api";

export const SESSION_KEY = ["session"];
const GOOGLE_LOGIN_KEY = ["google-login"];

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

/**
 * Exchange the credential from Google's popup for a session.
 *
 * Success writes the user straight into the session cache: the whole app
 * already reads `useSession`, so the sign-in screen falls away and the landing
 * gate opens without a navigation. That is the point of the popup flow — there
 * is no callback page to come back to any more.
 *
 * Progress and failure are read back out of the mutation cache rather than off
 * this instance, because a page can hold more than one sign-in button (the
 * landing page has two) and Google delivers the credential to whichever one is
 * listening — not necessarily the one that was pressed. Sharing the state means
 * the button under the reader's finger is the one that says "Signing you in…".
 */
export function useGoogleLogin() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: GOOGLE_LOGIN_KEY,
    mutationFn: googleSignIn,
    onSuccess: (user) => {
      if (user) queryClient.setQueryData(SESSION_KEY, user);
    },
  });

  const attempts = useMutationState({
    filters: { mutationKey: GOOGLE_LOGIN_KEY },
    select: (entry) => entry.state,
  });
  const latest = attempts[attempts.length - 1];

  return {
    signIn: mutation.mutate,
    isPending: latest?.status === "pending",
    errorCode: authErrorCode(latest?.error),
  };
}

/** Sign out, then drop every cached answer that belonged to that session. */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutSession,
    onSuccess: () => {
      // Cleared first, then marked signed out: `clear()` drops every cached
      // answer including the session, and writing the null afterwards is what
      // stops the sign-in screen from re-asking and bouncing a just-signed-out
      // reader back into the app.
      queryClient.clear();
      queryClient.setQueryData(SESSION_KEY, null);
    },
  });
}
