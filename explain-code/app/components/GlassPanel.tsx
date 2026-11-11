"use client";

import React from "react";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  elevated?: boolean;
  rounded?: "pill" | "2xl" | "3xl";
  children: React.ReactNode;
}

/**
 * Reusable Liquid Glass surface component for navbar, dropdowns, cards, and modals.
 * Uses CSS backdrop-filter with specular gradient borders and dual-layer shadows.
 */
export function GlassPanel({
  as: Component = "div",
  elevated = false,
  rounded = "2xl",
  className = "",
  children,
  ...rest
}: GlassPanelProps) {
  const radiusClass =
    rounded === "pill"
      ? "rounded-full"
      : rounded === "3xl"
      ? "rounded-3xl"
      : "rounded-2xl";

  return (
    <Component
      className={`liquid-glass ${
        elevated ? "liquid-glass-scrolled" : ""
      } ${radiusClass} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}
