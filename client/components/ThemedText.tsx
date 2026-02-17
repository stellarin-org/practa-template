import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "h1" | "h2" | "h3" | "h4" | "body" | "small" | "link";
};

const typeStyles: Record<string, (typeof Typography)[keyof typeof Typography]> =
  {
    h1: Typography.h1,
    h2: Typography.h2,
    h3: Typography.h3,
    h4: Typography.h4,
    body: Typography.body,
    small: Typography.small,
    link: Typography.link,
  };

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const color =
    (isDark ? darkColor : lightColor) ??
    (type === "link" ? theme.link : theme.text);

  return <Text style={[{ color }, typeStyles[type] ?? Typography.body, style]} {...rest} />;
}
