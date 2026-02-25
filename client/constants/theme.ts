import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#2D3436",
    textSecondary: "#636E72",
    buttonText: "#FFFFFF",
    tabIconDefault: "#3D4549",
    tabIconSelected: "#FC7D0F",
    link: "#FC7D0F",
    primary: "#FC7D0F",
    secondary: "#008ACA",
    accent: "#008ACA",
    jade: "#008ACA",
    jadeMuted: "#E0F4FF",
    amber: "#FC7D0F",
    amberMuted: "#FFF4E6",
    coral: "#FF6B6B",
    coralMuted: "#FFE8E8",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#FFF8F3",
    backgroundTertiary: "#FFF0E6",
    border: "rgba(0,0,0,0.18)",
    glassBorder: "rgba(0,0,0,0.18)",
    glassBg: "rgba(255,255,255,0.72)",
    glassOverlay: ["rgba(255,255,255,0.30)", "rgba(255,255,255,0.15)"] as [string, string],
    primaryInk: "#075B6B",
    accentSoft: "#FFF3E8",
    accentInk: "#3A1F06",
    success: "#16A34A",
    warning: "#F59E0B",
    error: "#EF4444",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    buttonText: "#FFFFFF",
    tabIconDefault: "#D0D5D9",
    tabIconSelected: "#FF9933",
    link: "#FF9933",
    primary: "#FF9933",
    secondary: "#33A8E0",
    accent: "#33A8E0",
    jade: "#33A8E0",
    jadeMuted: "#1A3A4A",
    amber: "#FF9933",
    amberMuted: "#3D3526",
    coral: "#FF7B7B",
    coralMuted: "#4A2626",
    backgroundRoot: "#1A1A1A",
    backgroundDefault: "#242424",
    backgroundSecondary: "#2E2E2E",
    backgroundTertiary: "#383838",
    border: "rgba(255,255,255,0.1)",
    glassBorder: "rgba(255,255,255,0.18)",
    glassBg: "rgba(30,30,30,0.82)",
    glassOverlay: ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.04)"] as [string, string],
    primaryInk: "#8FE7F2",
    accentSoft: "#2A1606",
    accentInk: "#0B1220",
    success: "#22C55E",
    warning: "#FBBF24",
    error: "#F87171",
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
