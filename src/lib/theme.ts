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
 * The transition currently animating the room, if any.
 *
 * Starting a second one while the first is live aborts the first, and an
 * aborted transition *rejects* its `ready`/`finished` promises. Nothing was
 * attached to them, so the rejection escaped as an unhandled
 * "InvalidStateError: Transition was aborted because of invalid state" and,
 * worse, could leave the page stuck on a half-composited frame.
 */
let inFlight: { finished: Promise<void> } | null = null;

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

  // Mid-flight, or unsupported: switch outright. Interrupting a running
  // crossfade to start another one looks worse than not animating at all.
  if (inFlight || typeof document.startViewTransition !== "function") {
    apply();
    return;
  }

  const transition = document.startViewTransition(apply);
  inFlight = transition;

  // An abort is a normal outcome of a fast second toggle, not a fault — but
  // both promises still have to be handled or they surface as unhandled
  // rejections.
  transition.ready.catch(() => {});
  transition.finished
    .catch(() => {})
    .finally(() => {
      if (inFlight === transition) inFlight = null;
    });
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
