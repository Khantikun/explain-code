"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { Icon } from "./Icons";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({
  className = "",
  showLabel = false,
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
      title={
        isDark
          ? "เปลี่ยนเป็นธีมสว่าง (Light Mode)"
          : "เปลี่ยนเป็นธีมมืด (Dark Mode)"
      }
      className={`liquid-glass-btn liquid-press group relative inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] ${
        showLabel ? "px-3 py-1.5 gap-2 text-xs font-bold" : "h-9 w-9 p-0"
      } ${className}`}
    >
      <span className="relative flex items-center justify-center">
        {mounted ? (
          isDark ? (
            <Icon
              name="sun"
              size={18}
              className="text-[#f6b73c] transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110"
            />
          ) : (
            <Icon
              name="moon"
              size={18}
              className="text-[#0b4f49] dark:text-[#5eead4] transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110"
            />
          )
        ) : (
          <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin opacity-30" />
        )}
      </span>

      {showLabel && (
        <span className="truncate">
          {mounted ? (isDark ? "ธีมสว่าง" : "ธีมมืด") : "ธีม"}
        </span>
      )}
    </button>
  );
}
