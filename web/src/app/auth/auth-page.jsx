"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { useSession } from "@/hooks/useSession";

/**
 * Someone already signed in has no business on the sign-in screen — send them
 * to the app. This is also the path back for anyone who bookmarked `/auth`,
 * and what carries a reader onward the moment the Google popup succeeds: the
 * sign-in writes the session into the cache, and this effect sees it.
 *
 * The redirect waits for the session query to settle: acting while it is still
 * pending would bounce a signed-in reader through this screen on every load.
 */
export function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, isPending } = useSession();

  useEffect(() => {
    if (!isPending && isAuthenticated) router.replace("/");
  }, [isAuthenticated, isPending, router]);

  return <AuthScreen />;
}
