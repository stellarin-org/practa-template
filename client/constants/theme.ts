import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#2D3436",
    textSecondary: "#636E72",
    buttonText: "#FFFFFF",
    tabIconDefault: "#636E72",
    tabIconSelected: "#FC7D0F",
    link: "#FC7D0F",
    primary: "#FC7D0F",
    secondary: "#008ACA",
    accent: "#008ACA",
    jade: "#008ACA",
    jadeMuted: "#E0F4FF",
    amber: "#FC7D0F",
    amberMuted: "#FFF4E6",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#FFF8F3",
    backgroundTertiary: "#FFF0E6",
    border: "rgba(0,0,0,0.08)",
    success: "#4CAF50",
    error: "#E74C3C",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#FF9933",
    link: "#FF9933",
    primary: "#FF9933",
    secondary: "#33A8E0",
    accent: "#33A8E0",
    jade: "#33A8E0",
    jadeMuted: "#1A3A4A",
    amber: "#FF9933",
    amberMuted: "#3D3526",
    backgroundRoot: "#1A1A1A",
    backgroundDefault: "#242424",
    backgroundSecondary: "#2E2E2E",
    backgroundTertiary: "#383838",
    border: "rgba(255,255,255,0.1)",
    success: "#4CAF50",
    error: "#E74C3C",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
  inputHeight: 48,
  buttonHeight: 52,
  fabSize: 64,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  timer: {
    fontSize: 64,
    fontWeight: "300" as const,
  },
  stat: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
