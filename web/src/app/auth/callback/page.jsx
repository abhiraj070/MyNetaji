import { Suspense } from "react";

import { AuthCallback } from "./auth-callback";

export const metadata = { title: "Signing in — MyNetaji" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthCallback />
    </Suspense>
  );
}
