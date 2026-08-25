import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "growshop-theme";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setThemeState] = useState<Theme>(
    () => getStoredTheme() ?? (systemPrefersDark() ? "dark" : "light"),
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage no disponible (modo privado, etc.): el tema no persiste entre visitas
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, toggleTheme };
}
