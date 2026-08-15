"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { useSession } from "@/hooks/useSession";

/**
 * Someone already signed in has no business on the sign-in screen — send them
 * to the app. This is also the path back for anyone who bookmarked `/auth`.
 *
 * The redirect waits for the session query to settle: acting while it is still
 * pending would bounce a signed-in reader through this screen on every load.
 */
export function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAuthenticated, isPending } = useSession();

  useEffect(() => {
    if (!isPending && isAuthenticated) router.replace("/");
  }, [isAuthenticated, isPending, router]);

  return <AuthScreen error={params.get("auth_error")} />;
}
