/**
 * Practa Splash Screen
 * 
 * Optional splash screen that shows when a Practa opens.
 * 
 * Usage:
 * 1. Add a splash.png image to my-practa/assets/ folder
 * 2. Register it in assets.ts: splash: require("./assets/splash.png")
 * 3. Wrap your Practa content with <PractaSplash>
 * 
 * The splash will:
 * - Fade screen to white
 * - Fade in the splash image
 * - Display for 2 seconds
 * - Fade out revealing your Practa
 */

import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { splashImage } from "./assets";

const SPLASH_DISPLAY_DURATION = 2000;
const FADE_DURATION = 400;

interface PractaSplashProps {
  children: React.ReactNode;
  onSplashComplete?: () => void;
}

export function PractaSplash({ children, onSplashComplete }: PractaSplashProps) {
  const [splashPhase, setSplashPhase] = useState<"loading" | "showing" | "complete">("loading");
  const splashUri = splashImage();
  const hasSplash = Boolean(splashUri);
  
  const overlayOpacity = useSharedValue(hasSplash ? 1 : 0);
  const imageOpacity = useSharedValue(0);
  
  const setComplete = () => {
    setSplashPhase("complete");
    onSplashComplete?.();
  };

  useEffect(() => {
    if (!hasSplash) {
      setSplashPhase("complete");
      return;
    }

    setSplashPhase("showing");
    
    imageOpacity.value = withSequence(
      withTiming(1, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }),
      withDelay(SPLASH_DISPLAY_DURATION, 
        withTiming(0, { duration: FADE_DURATION, easing: Easing.in(Easing.ease) })
      )
    );
    
    overlayOpacity.value = withDelay(
      FADE_DURATION + SPLASH_DISPLAY_DURATION + FADE_DURATION - 100,
      withTiming(0, { duration: FADE_DURATION, easing: Easing.in(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(setComplete)();
        }
      })
    );
  }, [hasSplash]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: splashPhase === "complete" ? "none" : "auto",
  }));

  const imageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  if (!hasSplash) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {children}
      
      {splashPhase !== "complete" ? (
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Animated.View style={[styles.imageContainer, imageStyle]}>
            <ExpoImage
              source={{ uri: splashUri }}
              style={styles.splashImage}
              contentFit="cover"
              transition={0}
            />
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  imageContainer: {
    width,
    height,
  },
  splashImage: {
    width: "100%",
    height: "100%",
  },
});
