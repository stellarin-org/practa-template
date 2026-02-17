import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeContext } from "@/context/ThemeContext";

export function useTheme() {
  const ctx = useThemeContext();
  const systemScheme = useColorScheme();

  const isDark = ctx ? ctx.isDark : systemScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return {
    theme,
    isDark,
    toggleTheme: ctx?.toggleTheme,
  };
}
