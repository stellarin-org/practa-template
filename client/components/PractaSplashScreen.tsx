import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from "react-native-reanimated";

interface PractaSplashScreenProps {
  splashImage: ImageSourcePropType;
  onComplete: () => void;
  displayDuration?: number;
  startWithOverlay?: boolean;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function PractaSplashScreen({
  splashImage,
  onComplete,
  displayDuration = 2000,
}: PractaSplashScreenProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const overlayOpacity = useSharedValue(1);
  const imageOpacity = useSharedValue(0);

  const handleAnimationComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!imageLoaded) {
        console.warn("[PractaSplash] Image failed to load, skipping");
        onComplete();
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [imageLoaded, onComplete]);

  useEffect(() => {
    if (!imageLoaded) return;

    imageOpacity.value = withSequence(
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
      withDelay(
        displayDuration,
        withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }),
      ),
    );

    const totalImageTime = 400 + displayDuration + 400;

    overlayOpacity.value = withDelay(
      totalImageTime,
      withTiming(
        0,
        { duration: 400, easing: Easing.in(Easing.ease) },
        (finished) => {
          if (finished) {
            runOnJS(handleAnimationComplete)();
          }
        },
      ),
    );
  }, [
    imageLoaded,
    displayDuration,
    overlayOpacity,
    imageOpacity,
    handleAnimationComplete,
  ]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        <AnimatedImage
          source={splashImage}
          style={[styles.image, imageAnimatedStyle]}
          contentFit="cover"
          onLoad={handleImageLoad}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "white",
  },
  image: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
  },
});
