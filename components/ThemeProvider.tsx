"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { usePremiumStatus } from "@/lib/premium";

export type PartyTheme =
  | "default"
  | "neon"
  | "midnight-gold"
  | "candy-party";

type ThemeContextValue = {
  theme: PartyTheme;
  setTheme: (theme: PartyTheme) => void;
};

const STORAGE_KEY = "party-games-theme";

const ThemeContext = createContext<ThemeContextValue>({
  theme: "default",
  setTheme: () => undefined,
});

function isPartyTheme(value: string | null): value is PartyTheme {
  return (
    value === "default" ||
    value === "neon" ||
    value === "midnight-gold" ||
    value === "candy-party"
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const premium = usePremiumStatus();
  const [theme, setThemeState] = useState<PartyTheme>("default");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (isPartyTheme(saved)) {
      setThemeState(saved);
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || premium.loading) return;

    const allowedTheme =
      theme === "default" || premium.is_premium
        ? theme
        : "default";

    if (allowedTheme !== theme) {
      setThemeState("default");
      window.localStorage.setItem(STORAGE_KEY, "default");
    }

    document.documentElement.dataset.theme = allowedTheme;
  }, [ready, premium.loading, premium.is_premium, theme]);

  function setTheme(nextTheme: PartyTheme) {
    if (nextTheme !== "default" && !premium.is_premium) return;

    setThemeState(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function usePartyTheme() {
  return useContext(ThemeContext);
}