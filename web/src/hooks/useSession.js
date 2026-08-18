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
  googleSignIn,
  logoutSession,
  rememberUser,
} from "@/lib/api";

export const SESSION_KEY = ["session"];
const GOOGLE_LOGIN_KEY = ["google-login"];

/**
 * Who is signed in, if anyone.
 *
 * Authentication is always confirmed by the server. localStorage is only a
 * convenience copy for UI, never proof of authentication. The previous
 * implementation used the remembered user as the query's initial answer and
 * therefore could keep RouteGuard open even when the API cookies were missing
 * or invalid; every protected feature then correctly returned 401.
 */
export function useSession() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: async () => {
      const user = await fetchMe();
      rememberUser(user);
      return user;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    const onEnded = () => {
      queryClient.setQueryData(SESSION_KEY, null);
    };
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

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutSession,
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(SESSION_KEY, null);
    },
  });
}
