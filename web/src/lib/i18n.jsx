"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import en from "@/translations/en.json";
import hi from "@/translations/hi.json";

/**
 * Localisation for the app.
 *
 * Adding a language is one import plus one `LANGUAGES` entry — no component
 * changes. The `label` is deliberately written in the language itself, since
 * that is what a speaker looking for their own language scans for.
 */
const LANGUAGES = [
  { code: "en", label: "English", messages: en },
  { code: "hi", label: "हिन्दी", messages: hi },
];

const DEFAULT_LANGUAGE = "en";
const STORAGE_KEY = "mynetaji:language";

const MESSAGES = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.messages]));

const LanguageContext = createContext(null);

/** "profile.atAGlance" -> the string at that path, or undefined. */
function lookup(messages, path) {
  return path
    .split(".")
    .reduce((node, key) => (node && typeof node === "object" ? node[key] : undefined), messages);
}

/** Fills `{{name}}` placeholders. */
function interpolate(template, values) {
  if (!values) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    values[key] === undefined || values[key] === null ? match : String(values[key]),
  );
}

/*
 * The saved choice is browser state, not React state, so it is read through
 * `useSyncExternalStore` — the one API that is correct across SSR.
 *
 * `getServerSnapshot` returns null on the server (no localStorage there), and
 * React uses it for the hydrating render too, so the first client tree matches
 * the server tree exactly. Reading storage during render instead produced a
 * hydration mismatch; reading it in an effect meant calling setState from an
 * effect, which the lint rules rightly reject.
 */
const listeners = new Set();

function subscribe(onChange) {
  listeners.add(onChange);
  // `storage` fires for other tabs; the local set dispatches to `listeners`.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readStoredLanguage() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved && MESSAGES[saved] ? saved : null;
  } catch {
    // Private mode / storage disabled — fall back to the default rather than
    // breaking the whole app over a preference.
    return null;
  }
}

const serverLanguage = () => null;
const clientMounted = () => true;
const serverMounted = () => false;

export function LanguageProvider({ children }) {
  // `null` means "not chosen yet", which is what the language modal keys off.
  // It is distinct from "chose English", so someone who picks English is never
  // asked twice.
  const language = useSyncExternalStore(
    subscribe,
    readStoredLanguage,
    serverLanguage,
  );
  const isHydrated = useSyncExternalStore(subscribe, clientMounted, serverMounted);

  const setLanguage = useCallback((code) => {
    if (!MESSAGES[code]) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* preference just won't persist; the notify below still re-renders */
    }
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(() => {
    const active = language ?? DEFAULT_LANGUAGE;
    const messages = MESSAGES[active];

    /**
     * `t("profile.overview")`, optionally `t("share.slapped", { name })`.
     *
     * Missing keys fall back to English and then to the key itself, so a gap
     * in a translation file shows the English wording rather than a blank or a
     * crash — the whole point of having a reference language.
     */
    const t = (path, values) => {
      const hit = lookup(messages, path) ?? lookup(MESSAGES[DEFAULT_LANGUAGE], path);
      return typeof hit === "string" ? interpolate(hit, values) : path;
    };

    return {
      language: active,
      // Whether a choice has actually been made, as opposed to defaulting.
      hasChosen: language !== null,
      isHydrated,
      setLanguage,
      languages: LANGUAGES,
      t,
    };
  }, [language, isHydrated, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** The hook every component uses: `const { t } = useTranslation();` */
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used inside <LanguageProvider>");
  }
  return context;
}
