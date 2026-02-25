import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp, Platform, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius } from "@/constants/theme";

const pressSpring: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  noPadding?: boolean;
  onPress?: () => void;
}

export function GlassCard({
  children,
  style,
  intensity,
  tint,
  noPadding,
  onPress,
}: GlassCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const resolvedTint = tint ?? (isDark ? "dark" : "light");
  const resolvedIntensity = intensity ?? (isDark ? 40 : 30);

  const containerStyle: ViewStyle = {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glassBorder,
  };

  const innerStyle: ViewStyle = noPadding ? {} : { padding: 16 };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) scale.value = withSpring(0.98, pressSpring);
  };

  const handlePressOut = () => {
    if (onPress) scale.value = withSpring(1, pressSpring);
  };

  const Wrapper = onPress ? AnimatedPressable : Animated.View;
  const wrapperProps = onPress
    ? {
        onPress,
        onPressIn: handlePressIn,
        onPressOut: handlePressOut,
        style: [containerStyle, animatedStyle, style],
      }
    : { style: [containerStyle, animatedStyle, style] };

  if (Platform.OS === "web") {
    return (
      <Wrapper {...(wrapperProps as any)}>
        <View style={{ backgroundColor: theme.glassBg, ...StyleSheet.absoluteFillObject }} />
        <View style={innerStyle}>{children}</View>
      </Wrapper>
    );
  }

  return (
    <Wrapper {...(wrapperProps as any)}>
      <BlurView
        intensity={resolvedIntensity}
        tint={resolvedTint}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={theme.glassOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={innerStyle}>{children}</View>
    </Wrapper>
  );
}
