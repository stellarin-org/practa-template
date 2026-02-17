import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius } from "@/constants/theme";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  noPadding?: boolean;
}

export function GlassCard({
  children,
  style,
  intensity,
  tint,
  noPadding,
}: GlassCardProps) {
  const { theme, isDark } = useTheme();

  const resolvedTint = tint ?? (isDark ? "dark" : "light");
  const resolvedIntensity = intensity ?? (isDark ? 40 : 60);

  const containerStyle: ViewStyle = {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDark
      ? "rgba(255,255,255,0.12)"
      : "rgba(0,0,0,0.06)",
  };

  const innerStyle: ViewStyle = noPadding
    ? {}
    : { padding: 16 };

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          containerStyle,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(255,255,255,0.7)",
            backdropFilter: `blur(${resolvedIntensity}px)`,
          } as any,
          style,
        ]}
      >
        <View style={innerStyle}>{children}</View>
        <LinearGradient
          colors={
            isDark
              ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]
              : ["rgba(255,255,255,0.6)", "rgba(255,255,255,0.1)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <BlurView
        intensity={resolvedIntensity}
        tint={resolvedTint}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={
          isDark
            ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]
            : ["rgba(255,255,255,0.6)", "rgba(255,255,255,0.1)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={innerStyle}>{children}</View>
    </View>
  );
}
