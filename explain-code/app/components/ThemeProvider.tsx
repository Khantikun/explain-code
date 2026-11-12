"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
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
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const applyTheme = useCallback((targetTheme: Theme) => {
    const root = document.documentElement;
    let actualTheme: ResolvedTheme;

    if (targetTheme === "system") {
      actualTheme = getSystemTheme();
    } else {
      actualTheme = targetTheme;
    }

    setResolvedTheme(actualTheme);

    if (actualTheme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }, []);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch {
        // ignore storage errors
      }
      applyTheme(newTheme);
      window.dispatchEvent(new Event("explain-code-theme-change"));
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    // If currently dark, switch to light; if light, switch to dark
    const nextTheme: Theme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

  // Initial load from localStorage
  useEffect(() => {
    setMounted(true);
    let stored: Theme | null = null;
    try {
      stored = (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || null;
    } catch {
      stored = null;
    }

    const initialTheme: Theme =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";

    setThemeState(initialTheme);
    applyTheme(initialTheme);

    // Media query listener for OS dark mode changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      const currentStored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!currentStored || currentStored === "system") {
        applyTheme("system");
      }
    };

    // Storage event for multi-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const val = e.newValue as Theme;
        setThemeState(val);
        applyTheme(val);
      }
    };

    const handleCustomChange = () => {
      try {
        const cur = (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || "system";
        setThemeState(cur);
        applyTheme(cur);
      } catch {
        // ignore
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("explain-code-theme-change", handleCustomChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("explain-code-theme-change", handleCustomChange);
    };
  }, [applyTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme: mounted ? resolvedTheme : "light",
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
      theme: "light" as Theme,
      resolvedTheme: "light" as ResolvedTheme,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
