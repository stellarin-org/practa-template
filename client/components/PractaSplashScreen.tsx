import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { View, StyleSheet, ImageSourcePropType, Platform } from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";

type SplashSource = ImageSourcePropType | string;

const AnimatedImage = Animated.createAnimatedComponent(Image);

function isVideoSource(source: SplashSource): boolean {
  const uri = getUri(source);
  if (!uri) return false;
  const lower = uri.toLowerCase();
  return lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm");
}

function getUri(source: SplashSource): string | null {
  if (typeof source === "string") return source;
  if (source && typeof source === "object" && "uri" in source) {
    const uri = (source as { uri: string }).uri;
    return typeof uri === "string" ? uri : null;
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
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

function NativeVideoSplash({
  videoUri,
  onComplete,
  displayDuration,
  backgroundColor,
}: {
  videoUri: string;
  onComplete: () => void;
  displayDuration: number;
  backgroundColor: string;
}) {
  const completedRef = useRef(false);
  const containerOpacity = useSharedValue(1);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    containerOpacity.value = withTiming(0, {
      duration: 500,
      easing: Easing.in(Easing.ease),
    }, (finished) => {
      if (finished) runOnJS(onComplete)();
    });
  }, [onComplete, containerOpacity]);

  useEffect(() => {
    const timeout = setTimeout(finish, displayDuration + 2000);
    return () => clearTimeout(timeout);
  }, [finish, displayDuration]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    const msg = event.nativeEvent.data;
    if (msg === "video_ended") {
      setTimeout(finish, 300);
    } else if (msg === "video_error") {
      finish();
    }
  }, [finish]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const html = useMemo(() => `
    <!DOCTYPE html>
    <html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
    <style>
      *{margin:0;padding:0}
      html,body{width:100%;height:100%;overflow:hidden;background:${backgroundColor}}
      video{width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.4s ease-out}
      video.ready{opacity:1}
    </style>
    </head><body>
    <video id="v" muted playsinline autoplay>
      <source src="${videoUri}" type="video/mp4">
    </video>
    <script>
      var v=document.getElementById('v');
      v.addEventListener('canplay',function(){v.classList.add('ready')});
      v.addEventListener('ended',function(){window.ReactNativeWebView.postMessage('video_ended')});
      v.addEventListener('error',function(){window.ReactNativeWebView.postMessage('video_error')});
      v.play().catch(function(){window.ReactNativeWebView.postMessage('video_error')});
    </script>
    </body></html>
  `, [videoUri, backgroundColor]);

  return (
    <Animated.View style={[nativeStyles.container, { backgroundColor }, containerAnimStyle]}>
      <WebView
        source={{ html }}
        style={[nativeStyles.webview, { backgroundColor }]}
        scrollEnabled={false}
        bounces={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        onMessage={handleMessage}
        onError={() => finish()}
        allowsBackForwardNavigationGestures={false}
      />
    </Animated.View>
  );
}

function ImageOrWebVideoSplash({
  splashImage,
  onComplete,
  displayDuration,
  isVideo,
  videoUri,
}: {
  splashImage: SplashSource;
  onComplete: () => void;
  displayDuration: number;
  isVideo: boolean;
  videoUri: string | null;
}) {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const mediaLoadedRef = useRef(false);
  const overlayOpacity = useSharedValue(1);
  const mediaOpacity = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!mediaLoadedRef.current) onComplete();
    }, 5000);
    return () => clearTimeout(timeout);
  }, [onComplete]);

  useEffect(() => {
    if (!mediaLoaded) return;

    const effectiveDuration = isVideo ? Math.min(displayDuration, 4000) : displayDuration;

    mediaOpacity.value = withSequence(
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
      withDelay(effectiveDuration, withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }))
    );

    const totalTime = 400 + effectiveDuration + 400;

    overlayOpacity.value = withDelay(totalTime,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }, (finished) => {
        if (finished) runOnJS(onComplete)();
      })
    );
  }, [mediaLoaded, displayDuration, isVideo, overlayOpacity, mediaOpacity, onComplete]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const mediaAnimatedStyle = useAnimatedStyle(() => ({ opacity: mediaOpacity.value }));

  const markLoaded = useCallback(() => {
    if (!mediaLoadedRef.current) {
      mediaLoadedRef.current = true;
      setMediaLoaded(true);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        {isVideo && videoUri ? (
          <Animated.View style={[styles.mediaFill, mediaAnimatedStyle]}>
            <WebVideo uri={videoUri} onLoad={markLoaded} />
          </Animated.View>
        ) : (
          <AnimatedImage
            source={splashImage as ImageSourcePropType}
            style={[styles.mediaFill, mediaAnimatedStyle]}
            contentFit="cover"
            onLoad={markLoaded}
          />
        )}
      </Animated.View>
    </View>
  );
}

export default function PractaSplashScreen({
  splashImage,
  onComplete,
  displayDuration = 2000,
}: {
  splashImage: SplashSource;
  onComplete: () => void;
  displayDuration?: number;
}) {
  const { theme } = useTheme();
  const isVideo = useMemo(() => isVideoSource(splashImage), [splashImage]);
  const videoUri = useMemo(() => (isVideo ? getUri(splashImage) : null), [isVideo, splashImage]);

  if (isVideo && videoUri && Platform.OS !== "web") {
    return (
      <NativeVideoSplash
        videoUri={videoUri}
        onComplete={onComplete}
        displayDuration={Math.min(displayDuration, 4000)}
        backgroundColor={theme.backgroundRoot}
      />
    );
  }

  return (
    <ImageOrWebVideoSplash
      splashImage={splashImage}
      onComplete={onComplete}
      displayDuration={displayDuration}
      isVideo={isVideo}
      videoUri={videoUri}
    />
  );
}

const nativeStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  webview: {
    flex: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "white",
  },
  mediaFill: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
  },
});
