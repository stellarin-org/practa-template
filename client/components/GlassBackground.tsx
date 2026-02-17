import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";

interface GlassBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassBackground({ children, style }: GlassBackgroundProps) {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }, style]}>
      <LinearGradient
        colors={
          isDark
            ? [theme.backgroundRoot, theme.backgroundDefault, theme.backgroundRoot]
            : [theme.backgroundRoot, theme.backgroundSecondary, theme.backgroundRoot]
        }
        locations={[0, 0.5, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
