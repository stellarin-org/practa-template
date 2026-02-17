import React, { useEffect } from "react";
import { ViewStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

const springConfig: WithSpringConfig = {
  damping: 20,
  mass: 0.8,
  stiffness: 120,
  overshootClamping: false,
};

interface AnimatedSectionProps {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedSection({
  children,
  index = 0,
  delay = 60,
  style,
}: AnimatedSectionProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    const stagger = index * delay;
    opacity.value = withDelay(stagger, withSpring(1, springConfig));
    translateY.value = withDelay(stagger, withSpring(0, springConfig));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
  );
}
