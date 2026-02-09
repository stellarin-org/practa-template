import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { View, StyleSheet, ImageSourcePropType, Platform } from "react-native";
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

type SplashSource = ImageSourcePropType | string;

interface PractaSplashScreenProps {
  splashImage: SplashSource;
  onComplete: () => void;
  displayDuration?: number;
  startWithOverlay?: boolean;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

function isVideoSource(source: SplashSource): boolean {
  if (typeof source === "string") {
    const lower = source.toLowerCase();
    return lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm");
  }
  if (source && typeof source === "object" && "uri" in source) {
    const uri = (source as { uri: string }).uri;
    if (typeof uri === "string") {
      const lower = uri.toLowerCase();
      return lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm");
    }
  }
  return false;
}

function getVideoUri(source: SplashSource): string | null {
  if (typeof source === "string") {
    return source;
  }
  if (source && typeof source === "object" && "uri" in source) {
    return (source as { uri: string }).uri;
  }
  return null;
}

function WebVideo({ uri, onLoad }: { uri: string; onLoad: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      onLoad();
      video.play().catch(() => {});
    };

    video.addEventListener("canplaythrough", handleCanPlay);
    video.load();

    return () => {
      video.removeEventListener("canplaythrough", handleCanPlay);
    };
  }, [uri, onLoad]);

  return (
    <video
      ref={videoRef}
      src={uri}
      muted
      playsInline
      autoPlay
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
}

export default function PractaSplashScreen({
  splashImage,
  onComplete,
  displayDuration = 2000,
}: PractaSplashScreenProps) {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const overlayOpacity = useSharedValue(1);
  const mediaOpacity = useSharedValue(0);

  const isVideo = useMemo(() => isVideoSource(splashImage), [splashImage]);
  const videoUri = useMemo(() => (isVideo ? getVideoUri(splashImage) : null), [isVideo, splashImage]);

  const player = useVideoPlayer(videoUri, (p: VideoPlayer) => {
    if (videoUri && Platform.OS !== "web") {
      p.loop = false;
      p.muted = true;
      p.play();
    }
  });

  const handleAnimationComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!player || !isVideo) return;

    const handleStatusChange = (status: { status: string }) => {
      if (status.status === "readyToPlay") {
        setMediaLoaded(true);
      }
    };

    const subscription = player.addListener("statusChange", handleStatusChange);
    
    if (player.status === "readyToPlay") {
      setMediaLoaded(true);
    }

    return () => {
      subscription?.remove();
    };
  }, [player, isVideo]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!mediaLoaded) {
        console.warn("[PractaSplash] Media failed to load, skipping");
        onComplete();
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [mediaLoaded, onComplete]);

  useEffect(() => {
    if (!mediaLoaded) return;

    const effectiveDuration = isVideo ? Math.min(displayDuration, 4000) : displayDuration;

    mediaOpacity.value = withSequence(
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
      withDelay(effectiveDuration, withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }))
    );

    const totalMediaTime = 400 + effectiveDuration + 400;

    overlayOpacity.value = withDelay(totalMediaTime,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(handleAnimationComplete)();
        }
      })
    );
  }, [mediaLoaded, displayDuration, isVideo, overlayOpacity, mediaOpacity, handleAnimationComplete]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const mediaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mediaOpacity.value,
  }));

  const handleImageLoad = () => {
    setMediaLoaded(true);
  };

  const handleVideoReady = useCallback(() => {
    setMediaLoaded(true);
  }, []);


  const handleWebVideoLoad = useCallback(() => {
    setMediaLoaded(true);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        {isVideo && videoUri ? (
          <Animated.View style={[styles.videoContainer, mediaAnimatedStyle]}>
            {Platform.OS === "web" ? (
              <WebVideo uri={videoUri} onLoad={handleWebVideoLoad} />
            ) : (
              <VideoView
                style={styles.video}
                player={player}
                contentFit="cover"
                nativeControls={false}
              />
            )}
          </Animated.View>
        ) : (
          <AnimatedImage
            source={splashImage as ImageSourcePropType}
            style={[styles.image, mediaAnimatedStyle]}
            contentFit="cover"
            onLoad={handleImageLoad}
          />
        )}
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
