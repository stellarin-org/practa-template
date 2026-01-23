import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView, VideoPlayer } from "expo-video";
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
  splashImage?: ImageSourcePropType;
  splashVideo?: number | { uri: string };
  onComplete: () => void;
  displayDuration?: number;
  startWithOverlay?: boolean;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function PractaSplashScreen({
  splashImage,
  splashVideo,
  onComplete,
  displayDuration = 2000,
}: PractaSplashScreenProps) {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const overlayOpacity = useSharedValue(1);
  const mediaOpacity = useSharedValue(0);
  const isVideo = !!splashVideo;

  const videoPlayer = useVideoPlayer(splashVideo ?? null, (player: VideoPlayer) => {
    if (splashVideo) {
      player.loop = false;
      player.muted = false;
    }
  });

  const handleAnimationComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!isVideo || !videoPlayer) return;

    const subscription = videoPlayer.addListener("statusChange", (status: { status: string }) => {
      if (status.status === "readyToPlay") {
        setMediaLoaded(true);
        videoPlayer.play();
      }
    });

    const endSubscription = videoPlayer.addListener("playToEnd", () => {
      setVideoEnded(true);
    });

    return () => {
      subscription.remove();
      endSubscription.remove();
    };
  }, [videoPlayer, isVideo]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!mediaLoaded) {
        console.warn("[PractaSplash] Media failed to load, skipping");
        onComplete();
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [mediaLoaded, onComplete]);

  useEffect(() => {
    if (!mediaLoaded) return;

    if (isVideo) {
      mediaOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    } else {
      mediaOpacity.value = withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
        withDelay(displayDuration, withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }))
      );

      const totalImageTime = 400 + displayDuration + 400;

      overlayOpacity.value = withDelay(totalImageTime,
        withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }, (finished) => {
          if (finished) {
            runOnJS(handleAnimationComplete)();
          }
        })
      );
    }
  }, [mediaLoaded, displayDuration, overlayOpacity, mediaOpacity, handleAnimationComplete, isVideo]);

  useEffect(() => {
    if (!isVideo || !videoEnded) return;

    mediaOpacity.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) });
    overlayOpacity.value = withDelay(400,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(handleAnimationComplete)();
        }
      })
    );
  }, [videoEnded, isVideo, mediaOpacity, overlayOpacity, handleAnimationComplete]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const mediaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mediaOpacity.value,
  }));

  const handleImageLoad = () => {
    setMediaLoaded(true);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        {isVideo && splashVideo ? (
          <Animated.View style={[styles.videoContainer, mediaAnimatedStyle]}>
            <VideoView
              player={videoPlayer}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
            />
          </Animated.View>
        ) : splashImage ? (
          <AnimatedImage
            source={splashImage}
            style={[styles.image, mediaAnimatedStyle]}
            contentFit="cover"
            onLoad={handleImageLoad}
          />
        ) : null}
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
  videoContainer: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
  },
  video: {
    width: "100%",
    height: "100%",
  },
});
