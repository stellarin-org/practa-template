import type { Colors } from "@/constants/theme";

export type ThemeColors = (typeof Colors)["light"];

export interface WidgetProps {
  data: Record<string, unknown>;
  theme: ThemeColors;
  isDark: boolean;
  practaName: string;
}

export type ShouldDisplayFn = (data: Record<string, unknown>) => boolean;

export interface WidgetModule {
  default: React.ComponentType<WidgetProps>;
  shouldDisplay: ShouldDisplayFn;
}
