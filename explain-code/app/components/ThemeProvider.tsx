"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "explain_code_theme";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const applyDarkTheme = useCallback(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
    } catch {
      // ignore storage errors
    }
  }, []);

  const setTheme = useCallback(
    (_newTheme: Theme) => {
      applyDarkTheme();
    },
    [applyDarkTheme]
  );

  const toggleTheme = useCallback(() => {
    applyDarkTheme();
  }, [applyDarkTheme]);

  useEffect(() => {
    applyDarkTheme();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue !== "dark") {
        applyDarkTheme();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [applyDarkTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme: "dark",
        resolvedTheme: "dark",
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "dark" as Theme,
      resolvedTheme: "dark" as ResolvedTheme,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
