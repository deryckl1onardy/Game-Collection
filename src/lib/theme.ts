"use client";

import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export const THEME_KEY = "shelf-theme";

/**
 * Runs before first paint, inlined into <head>, so the page never renders in
 * the wrong theme and then snaps. Stored choice wins; otherwise follow the
 * system. Kept as a string because it has to be injected, not imported.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})()`;

export function currentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/**
 * Flips the theme.
 *
 * Wrapped in a view transition so the room changes light rather than cutting
 * — the same mechanism the shelf-to-detail morph uses (ADR-0014). Only the
 * root crossfades here: React applies its `<ViewTransition>` names during
 * React-driven transitions, and this is a plain DOM attribute change.
 */
export function toggleTheme() {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";

  const apply = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private browsing or blocked storage — the theme still applies for
      // this page view, it just will not be remembered.
    }
  };

  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(apply);
  } else {
    apply();
  }
}

/**
 * The live value of a CSS custom property, re-read whenever the theme
 * changes. Exists for the WebGL case, which cannot reference a CSS variable
 * and would otherwise keep clearing to the dark page colour in light mode.
 */
export function useThemeColor(varName: string, fallback: string) {
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();
      if (v) setColor(v);
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [varName]);

  return color;
}
