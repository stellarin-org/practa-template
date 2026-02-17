import React, { createContext, useContext, useState, useCallback } from "react";
import { useColorScheme } from "react-native";

type ThemeOverride = "light" | "dark" | "system";

interface ThemeContextValue {
  override: ThemeOverride;
  setOverride: (value: ThemeOverride) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<ThemeOverride>("system");

  const isDark =
    override === "system" ? systemScheme === "dark" : override === "dark";

  const toggleTheme = useCallback(() => {
    setOverride((prev) => {
      if (prev === "system") return systemScheme === "dark" ? "light" : "dark";
      return prev === "dark" ? "light" : "dark";
    });
  }, [systemScheme]);

  return (
    <ThemeContext.Provider value={{ override, setOverride, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
