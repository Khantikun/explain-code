"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";

export type UiLanguage = "th" | "en";

export const UI_LANGUAGE_STORAGE_KEY = "explain_code_ui_lang";

interface LanguageContextType {
  uiLang: UiLanguage;
  setUiLang: (lang: UiLanguage) => void;
  toggleUiLang: () => void;
  t: (th: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

function subscribeUiLang(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (e: StorageEvent) => {
    if (e.key === UI_LANGUAGE_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener("explain-code-ui-lang-change", callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("explain-code-ui-lang-change", callback);
  };
}

function getUiLangSnapshot(): UiLanguage {
  if (typeof window === "undefined") return "th";
  try {
    const stored = localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
    return stored === "en" ? "en" : "th";
  } catch {
    return "th";
  }
}

function getUiLangServerSnapshot(): UiLanguage {
  return "th";
}

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const uiLang = useSyncExternalStore(
    subscribeUiLang,
    getUiLangSnapshot,
    getUiLangServerSnapshot
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = uiLang;
      document.documentElement.setAttribute("data-ui-lang", uiLang);
    }
  }, [uiLang]);

  const setUiLang = useCallback((nextLang: UiLanguage) => {
    try {
      localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, nextLang);
    } catch {
      // ignore storage errors
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = nextLang;
      document.documentElement.setAttribute("data-ui-lang", nextLang);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("explain-code-ui-lang-change"));
    }
  }, []);

  const toggleUiLang = useCallback(() => {
    setUiLang(uiLang === "th" ? "en" : "th");
  }, [uiLang, setUiLang]);

  const t = useCallback(
    (th: string, en: string) => (uiLang === "en" ? en : th),
    [uiLang]
  );

  return (
    <LanguageContext.Provider
      value={{
        uiLang,
        setUiLang,
        toggleUiLang,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useUiLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      uiLang: "th",
      setUiLang: () => {},
      toggleUiLang: () => {},
      t: (th: string) => th,
    };
  }
  return ctx;
}

interface UiLanguageToggleProps {
  className?: string;
  variant?: "glass" | "dungeon" | "auto";
}

export function UiLanguageToggle({
  className = "",
  variant = "auto",
}: UiLanguageToggleProps) {
  const { uiLang, toggleUiLang, t } = useUiLanguage();

  const containerStyle =
    variant === "dungeon"
      ? "bg-[#120f1c] border border-[#4a4766] text-[#9a93ad] hover:border-[#ffe27a]/70"
      : "liquid-glass-btn border border-[#0f766e]/25 dark:border-white/20 text-[#14221e] dark:text-white";

  const activePillStyle =
    variant === "dungeon"
      ? "bg-[#ffe27a] text-[#120f1c] shadow-xs"
      : "bg-[#0f766e] text-white dark:bg-[#2dd4bf] dark:text-[#042f2e] shadow-xs";

  const inactivePillStyle =
    variant === "dungeon"
      ? "text-[#9a93ad] hover:text-[#f4efe6]"
      : "text-[#475b60] dark:text-[#cbd5e1]";

  return (
    <button
      type="button"
      onClick={toggleUiLang}
      aria-label={t(
        "สลับภาษาหน้าเว็บเป็นภาษาอังกฤษ (Switch to English)",
        "Switch UI language to Thai (เปลี่ยนเป็นภาษาไทย)"
      )}
      title={t(
        "สลับภาษา UI (ไทย / English)",
        "Toggle UI Language (TH / EN)"
      )}
      className={`liquid-press inline-flex items-center gap-0.5 rounded-full p-0.5 text-[11px] font-extrabold tracking-wide transition-all cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] ${containerStyle} ${className}`}
    >
      <span
        className={`rounded-full px-2 py-1 leading-none transition-colors ${
          uiLang === "th" ? activePillStyle : inactivePillStyle
        }`}
      >
        TH
      </span>
      <span
        className={`rounded-full px-2 py-1 leading-none transition-colors ${
          uiLang === "en" ? activePillStyle : inactivePillStyle
        }`}
      >
        EN
      </span>
    </button>
  );
}
