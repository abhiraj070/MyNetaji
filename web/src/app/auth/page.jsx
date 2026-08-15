import { Suspense } from "react";

import { AuthPage } from "./auth-page";

export const metadata = {
  title: "Sign in — MyNetaji",
  description: "Sign in to find your MP, MLA and Chief Minister.",
};

/**
 * `/auth` — the sign-in screen.
 *
 * Wrapped in `Suspense` because everything below it is client-rendered: the
 * screen has to know whether there is already a session before it can decide
 * between showing the button and redirecting to the app.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthPage />
    </Suspense>
  );
}
