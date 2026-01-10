import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "ai-frontend-theme";

/**
 * Get the effective theme (resolving "system" to actual light/dark)
 */
function getEffectiveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

/**
 * Hook for managing theme state with localStorage persistence
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    // SSR-safe: only access localStorage on client
    if (typeof window === "undefined") return "system";

    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    return stored || "system";
  });

  // Apply theme to document
  useEffect(() => {
    const effectiveTheme = getEffectiveTheme(theme);
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(effectiveTheme);
  }, [theme]);

  // Listen to system theme changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      const effectiveTheme = getEffectiveTheme("system");
      const root = window.document.documentElement;

      root.classList.remove("light", "dark");
      root.classList.add(effectiveTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Set theme and persist to localStorage
  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setThemeState(newTheme);
  };

  return {
    theme,
    setTheme,
    effectiveTheme: getEffectiveTheme(theme),
  };
}
