import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Image, ImageSourcePropType } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
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

    whiteOverlayOpacity.value = withTiming(1, { duration: 300, easing: Easing.ease });

    imageOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 400, easing: Easing.ease })
    );

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
