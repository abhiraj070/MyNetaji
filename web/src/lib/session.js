/**
 * Who is signed in, remembered on the device.
 *
 * There is no endpoint to ask any more: the session lives in httpOnly cookies
 * that JavaScript cannot read, so the only moment the app ever learns the
 * reader's name and picture is the response to `POST /auth/google`. That answer
 * is kept here so a reload does not present a signed-in reader with the landing
 * page.
 *
 * This is a display cache, not a credential. It grants nothing — every request
 * is still authorised by the cookie — and the moment the API answers 401 it is
 * cleared, so an expired session cannot leave the app pretending otherwise.
 */
const STORAGE_KEY = "mynetaji:user";

const listeners = new Set();

// The snapshot has to be reference-stable: `useSyncExternalStore` compares
// snapshots with `Object.is`, and parsing storage afresh on every read would
// hand it a new object every time and re-render forever.
let current = null;
let loaded = false;

function read() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Private mode, a full disk, or something else's key in our slot.
    return null;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

/** The signed-in user, or `null`. Reads storage once, then stays in sync. */
export function getUser() {
  if (typeof window === "undefined") return null;
  if (!loaded) {
    current = read();
    loaded = true;
  }
  return current;
}

/** What the server rendered: nobody, until the client says otherwise. */
export function getServerUser() {
  return undefined;
}

/** Remember the signed-in user, or forget them when passed `null`. */
export function setUser(user) {
  current = user ?? null;
  loaded = true;
  try {
    if (current) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* the in-memory copy still holds for this tab */
  }
  notify();
}

export function subscribe(listener) {
  listeners.add(listener);

  // Signing out in one tab signs out the others: `storage` fires in every tab
  // but the one that wrote, so the copy in memory is refreshed from disk.
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function onStorage(event) {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  current = read();
  loaded = true;
  notify();
}
