"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { SESSION_KEY } from "@/hooks/useSession";
import { fetchSession } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

/**
 * Where the backend returns the reader once Google has signed them in.
 *
 * The cookies are already set by the time this renders — the browser stored
 * them on the redirect that brought it here. This page exists to confirm that,
 * seed the session cache so the app does not have to ask again, and move on.
 *
 * The session is fetched directly rather than through `useSession` so the
 * result is awaited: a signed-in reader lands on the app, and anyone whose
 * cookies did not survive the round trip (third-party cookie blocking, a
 * mismatched `FRONTEND_URL`) goes back to `/auth` with a reason rather than
 * into an app that will 401 on its first call.
 */
export function AuthCallback() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  // Effects run twice in React's dev StrictMode; the guard keeps this to one
  // navigation.
  const settled = useRef(false);

  useEffect(() => {
    if (settled.current) return;
    settled.current = true;

    (async () => {
      try {
        const user = await fetchSession();
        if (user) {
          queryClient.setQueryData(SESSION_KEY, user);
          router.replace("/");
        } else {
          router.replace("/auth?auth_error=session_expired");
        }
      } catch {
        router.replace("/auth?auth_error=unreachable");
      }
    })();
  }, [queryClient, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <p className="text-sm font-semibold text-muted">{t("auth.signingIn")}</p>
    </main>
  );
}
