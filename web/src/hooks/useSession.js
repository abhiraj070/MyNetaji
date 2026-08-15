"use client";

import {
  useMutation,
  useMutationState,
  useQueryClient,
} from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { authErrorCode, googleSignIn, logoutSession } from "@/lib/api";
import { getServerUser, getUser, subscribe } from "@/lib/session";

const GOOGLE_LOGIN_KEY = ["google-login"];

/**
 * Who is signed in, if anyone.
 *
 * Answered from the device rather than the API: the session cookies are
 * httpOnly and there is no endpoint that reports back on them, so what the app
 * knows is what `POST /auth/google` told it, kept in `lib/session`. A 401 on
 * any call clears that, which is what makes an expired session show up here.
 *
 * `user === null` is a settled answer ("signed out"), distinct from
 * `isPending` ("we haven't looked yet") — the gate in `home.jsx` needs to tell
 * those apart, because showing an auth page to someone who turns out to be
 * signed in is a flash of the wrong screen on every load. The server cannot
 * read the device, so it renders the pending state and the first client render
 * settles it.
 */
export function useSession() {
  const stored = useSyncExternalStore(subscribe, getUser, getServerUser);
  const isPending = stored === undefined;

  return {
    user: isPending ? null : stored,
    isAuthenticated: Boolean(stored),
    isPending,
  };
}

/**
 * Exchange the credential from Google's popup for a session.
 *
 * Success stores the user (`googleSignIn` does it, so the one place that ever
 * hears the answer is the one place that records it): the whole app reads
 * `useSession`, so the sign-in screen falls away and the landing gate opens
 * without a navigation. That is the point of the popup flow — there is no
 * callback page to come back to any more.
 *
 * Progress and failure are read back out of the mutation cache rather than off
 * this instance, because a page can hold more than one sign-in button (the
 * landing page has two) and Google delivers the credential to whichever one is
 * listening — not necessarily the one that was pressed. Sharing the state means
 * the button under the reader's finger is the one that says "Signing you in…".
 */
export function useGoogleLogin() {
  const mutation = useMutation({
    mutationKey: GOOGLE_LOGIN_KEY,
    mutationFn: googleSignIn,
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
    // `logoutSession` forgets the user; this drops everything that was fetched
    // on their behalf, so the next reader does not see the last one's answers.
    onSettled: () => queryClient.clear(),
  });
}
