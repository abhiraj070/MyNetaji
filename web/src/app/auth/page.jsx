import { Suspense } from "react";

import { AuthPage } from "./auth-page";

export const metadata = {
  title: "Sign in — MyNetaji",
  description: "Sign in to find your MP, MLA and Chief Minister.",
};

/**
 * `/auth` — the sign-in screen.
 *
 * Wrapped in `Suspense` because the client component reads `useSearchParams`
 * (for the `?auth_error=` the backend callback sends back), which opts the
 * route into client-side rendering and needs a boundary above it.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthPage />
    </Suspense>
  );
}
