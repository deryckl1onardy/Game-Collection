"use client";

import { toggleTheme } from "@/lib/theme";

/**
 * Switches the archive between night and day.
 *
 * The label is chosen in CSS from `data-theme` rather than from React state,
 * so there is nothing theme-dependent in the server-rendered markup to
 * mismatch during hydration — the boot script has already set the attribute
 * by the time this paints.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  return (
    <button
      onClick={toggleTheme}
      className={`catalog text-paper-ghost transition-colors hover:text-amber ${className}`}
      aria-label="Switch between the dark and light theme"
    >
      <span className="when-dark">day</span>
      <span className="when-light">night</span>
    </button>
  );
}
