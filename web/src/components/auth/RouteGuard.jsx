"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/hooks/useSession";

/**
 * Keeps signed-out readers out of the app's inner pages.
 *
 * One check, above the router, rather than the same three lines in every page:
 * a route added tomorrow is protected by default, which is the way round that
 * fails safe. It reads the app's existing session — the httpOnly cookies, as
 * reported by `useSession` — and adds no state of its own.
 *
 * `/` and `/auth` are public, and both already handle a signed-out reader:
 * `/auth` is the sign-in screen itself, and `/` is the landing page whose only
 * offer is to sign in. Redirecting either would be a loop.
 *
 * Nothing protected renders while the answer is unknown. `useSession` settles
 * from the remembered reader on the first render when there is one, so this
 * costs a signed-in reader nothing on a refresh — and a signed-out one never
 * sees a flash of a page they are about to be sent away from.
 */
const PUBLIC_ROUTES = new Set(["/", "/auth"]);

export function RouteGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isPending } = useSession();

  const isPublic = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    if (isPublic || isPending || isAuthenticated) return;
    router.replace("/auth");
  }, [isPublic, isPending, isAuthenticated, router]);

  if (isPublic) return children;
  // Unknown, or known to be signed out and on the way to `/auth`.
  if (isPending || !isAuthenticated) return null;
  return children;
}
