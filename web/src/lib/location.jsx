"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

/**
 * The reader's resolved coordinates.
 *
 * This lives in a provider mounted by the root layout rather than in the page
 * that uses it, because a page is unmounted the moment the router leaves it:
 * `/` -> `/brief` -> back threw the coordinates away and dropped the reader
 * back onto the landing screen, having to ask for location all over again.
 * Layouts survive navigation, so state parked here survives with them.
 *
 * They are also kept on the device, so a return visit does not re-ask. That is
 * a change of promise, not just of storage: the permission screen used to say
 * the location was read once and never stored, and it now says it is saved on
 * the device — the copy and the behaviour have to agree. Nothing is sent
 * anywhere new; the coordinates go to the same lookup they always did, and
 * signing out forgets them along with the session.
 */
const STORAGE_KEY = "mynetaji:location";

export function readStoredLocation() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Anything that is not a usable pair is treated as absent rather than
    // trusted into the lookup, which would fail further downstream.
    return typeof parsed?.latitude === "number" && typeof parsed?.longitude === "number"
      ? { latitude: parsed.latitude, longitude: parsed.longitude }
      : null;
  } catch {
    return null;
  }
}

export function forgetLocation() {
  // Goes through the store so anything already on screen hears about it, not
  // just the next visit.
  setLocation(null);
}

function storeLocation(coords) {
  try {
    if (coords) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* the in-memory copy still serves this visit */
  }
}

/*
 * Read through `useSyncExternalStore`, the same way the language choice and
 * the onboarding flag are: it is the one API that gets device-held state right
 * across SSR. The server snapshot is `undefined` — "we have not looked yet" —
 * and the client's real answer arrives on the first render after hydration,
 * without a state update inside an effect.
 */
let current = null;
let loaded = false;
const listeners = new Set();

function clientSnapshot() {
  if (!loaded) {
    // Cached, because the snapshot has to be reference-stable: parsing storage
    // afresh on every read would hand React a new object each time.
    current = readStoredLocation();
    loaded = true;
  }
  return current;
}

function serverSnapshot() {
  return undefined;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setLocation(next) {
  current = next ?? null;
  loaded = true;
  storeLocation(current);
  listeners.forEach((listener) => listener());
}

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const stored = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  // `undefined` is the pre-hydration answer; `null` is a settled "no location".
  const isRestoring = stored === undefined;
  const coords = isRestoring ? null : stored;

  const value = useMemo(
    () => ({ coords, setCoords: setLocation, isRestoring }),
    [coords, isRestoring],
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useLocationState() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocationState must be used inside <LocationProvider>");
  }
  return context;
}
