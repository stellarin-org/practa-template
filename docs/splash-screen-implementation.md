# Splash Screen Implementation Guide

This document describes how to add splash screen support for Practas in the main Stellarin app.

## Overview

When a Practa includes a `splash.png` file, the app displays a branded splash screen with fade animations before revealing the Practa content.

**Behavior:**
1. Screen fades to white (300ms)
2. Splash image fades in (400ms)
3. Image displays for 2 seconds
4. Everything fades out (400ms), revealing the Practa

## Files to Add/Modify

### 1. New Component: `PractaSplashScreen.tsx`

Create a new component for handling the splash screen animations:

```typescript
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Image, ImageSourcePropType } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";

interface PractaSplashScreenProps {
  splashImage: ImageSourcePropType;
  onComplete: () => void;
  displayDuration?: number;
}

export default function PractaSplashScreen({
  splashImage,
  onComplete,
  displayDuration = 2000,
}: PractaSplashScreenProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const whiteOverlayOpacity = useSharedValue(0);
  const imageOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  const handleAnimationComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!imageLoaded) return;

    // Fade in white overlay
    whiteOverlayOpacity.value = withTiming(1, { duration: 300, easing: Easing.ease });

    // Fade in image after white overlay
    imageOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 400, easing: Easing.ease })
    );

    // Calculate total time and fade out
    const totalFadeInTime = 300 + 400;
    const fadeOutStartTime = totalFadeInTime + displayDuration;

    containerOpacity.value = withDelay(
      fadeOutStartTime,
      withTiming(0, { duration: 400, easing: Easing.ease }, (finished) => {
        if (finished) {
          runOnJS(handleAnimationComplete)();
        }
      })
    );
  }, [imageLoaded, displayDuration, whiteOverlayOpacity, imageOpacity, containerOpacity, handleAnimationComplete]);

  const whiteOverlayStyle = useAnimatedStyle(() => ({
    opacity: whiteOverlayOpacity.value,
  }));

  const imageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.whiteOverlay, whiteOverlayStyle]} />
      <Animated.View style={[styles.imageContainer, imageStyle]}>
        <Image
          source={splashImage}
          style={styles.image}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  whiteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "white",
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
```

### 2. Asset Detection in Practa Bundle

When loading a Practa bundle, check for splash image:

```typescript
// In your Practa loader/assets resolver
let splashImageSource: number | null = null;

try {
  // Try root folder first
  splashImageSource = require("./splash.png");
} catch {
  try {
    // Fall back to assets folder
    splashImageSource = require("./assets/splash.png");
  } catch {
    splashImageSource = null;
  }
}

export const splashImage = splashImageSource;
export const hasSplashImage = splashImageSource !== null;
```

### 3. Integration in Flow/Practa Screen

Modify your flow screen to conditionally render the splash:

```typescript
import PractaSplashScreen from "@/components/PractaSplashScreen";
import { hasSplashImage, splashImage } from "@/practa/assets";

export default function FlowScreen() {
  const [showSplash, setShowSplash] = useState(true);
  
  // Reset splash state when a new flow starts
  useEffect(() => {
    setShowSplash(true);
    // ... rest of flow initialization
  }, [flow]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Only show splash on first practa in flow
  const shouldShowSplash = showSplash && hasSplashImage && currentIndex === 0;

  return (
    <View style={styles.container}>
      {shouldShowSplash && splashImage ? (
        <PractaSplashScreen
          splashImage={splashImage}
          onComplete={handleSplashComplete}
        />
      ) : null}
      
      {/* Rest of your flow/practa content */}
    </View>
  );
}
```

## Key Implementation Details

| Aspect | Detail |
|--------|--------|
| Image dimensions | 1:2 aspect ratio recommended (e.g., 1080x2160) |
| Display mode | Full-screen edge-to-edge with `resizeMode="cover"` |
| File locations | `splash.png` in Practa root or `assets/` folder |
| Animation timing | 300ms white fade + 400ms image fade + 2000ms display + 400ms fade out |
| Z-index | 1000 (renders above all other content) |

## Checklist

- [ ] Add `PractaSplashScreen` component
- [ ] Update Practa asset loader to detect `splash.png`
- [ ] Export `hasSplashImage` and `splashImage` from asset resolver
- [ ] Modify flow screen to render splash conditionally
- [ ] Reset `showSplash` state when new flow starts (critical for repeat opens)
- [ ] Test with and without splash image present

## Dependencies

- `react-native-reanimated` (for smooth animations)
- Standard React Native `Image` component
