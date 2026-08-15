/**
 * Google Identity Services, loaded on demand.
 *
 * GIS ships as a script from Google's own origin — it cannot be bundled, and
 * it is the only thing that can open the account-chooser popup. It is fetched
 * the first time a sign-in button mounts rather than from the root layout, so
 * a reader who is already signed in never pays for it.
 *
 * The client ID is public by design: it identifies this app to Google and is
 * visible in every request the popup makes. The client secret is not here, and
 * must not be — the popup flow never exchanges it, and `NEXT_PUBLIC_*` values
 * are compiled into the browser bundle.
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

const GIS_SRC = "https://accounts.google.com/gsi/client";

let pending = null;

/** Resolves with `google.accounts.id` once the GIS script is usable. */
export function loadGoogleIdentity() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services needs a browser"));
  }
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    const script = existing ?? document.createElement("script");

    const settle = () => {
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else fail();
    };
    const fail = () => {
      // Cleared so a later mount can try again: the usual causes — offline, a
      // blocker, a captive portal — are all things that stop being true.
      pending = null;
      reject(new Error("Could not load Google Identity Services"));
    };

    script.addEventListener("load", settle, { once: true });
    script.addEventListener("error", fail, { once: true });

    if (!existing) {
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return pending;
}

/**
 * `google.accounts.id.initialize` is global, and calling it twice throws the
 * first configuration away — which matters here because the landing page shows
 * the sign-in button twice. So it is called once, with a callback that hands
 * the credential to whichever button is currently listening.
 */
let initialized = false;
let credentialHandler = null;

export async function initGoogleIdentity() {
  const gis = await loadGoogleIdentity();
  if (!initialized) {
    gis.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response?.credential) credentialHandler?.(response.credential);
      },
      // The account chooser opens over the page. Nothing navigates away, so
      // there is no redirect URI and no callback route to come back to.
      ux_mode: "popup",
      // Signing someone in because their browser remembered them, without them
      // asking, is not a decision this app makes for them.
      auto_select: false,
      itp_support: true,
    });
    initialized = true;
  }
  return gis;
}

/** Route credentials to `handler`; pass the same handler back to unregister. */
export function setCredentialHandler(handler) {
  credentialHandler = handler;
  return () => {
    if (credentialHandler === handler) credentialHandler = null;
  };
}
