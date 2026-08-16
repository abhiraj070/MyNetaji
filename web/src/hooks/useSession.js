"use client";

import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useEffect } from "react";

import {
  SESSION_ENDED_EVENT,
  authErrorCode,
  fetchMe,
  fetchSession,
  googleSignIn,
  logoutSession,
  rememberUser,
} from "@/lib/api";

export const SESSION_KEY = ["session"];
const GOOGLE_LOGIN_KEY = ["google-login"];

// The remembered reader is confirmed against the server once per page load,
// not once per component: `useSession` is read by the page, the sidebar and
// the sign-in screen at the same time, and a request each is three too many.
let confirmed = false;

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
 *
 * The first answer comes off the device, so a returning reader is never shown
 * the sign-in screen while a request is in flight. It is then checked against
 * the server once per load, because a remembered reader is a claim about a
 * session that may have ended since — believed immediately, verified promptly.
 */
export function useSession() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: fetchSession,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Confirm the remembered reader against `/auth/me`. A session that ended
  // while they were away is corrected here rather than surfacing later as a
  // page of failed requests.
  useEffect(() => {
    if (confirmed) return;
    confirmed = true;

    let cancelled = false;
    fetchMe()
      .then((user) => {
        if (cancelled) return;
        rememberUser(user);
        queryClient.setQueryData(SESSION_KEY, user);
      })
      // A network fault is not an answer about the session: leave what is
      // remembered in place rather than signing the reader out on a hiccup,
      // and let the next load ask again.
      .catch(() => {
        confirmed = false;
      });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  // A 401 on any ordinary call means the cookies are gone; `api` forgets the
  // reader and says so here, which moves every screen to signed out at once.
  useEffect(() => {
    const onEnded = () => queryClient.setQueryData(SESSION_KEY, null);
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, [queryClient]);

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
