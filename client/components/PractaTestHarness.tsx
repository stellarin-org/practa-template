import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { PractaChromeProvider, usePractaChrome } from "@/context/PractaChromeContext";
import PractaSplashScreen from "@/components/PractaSplashScreen";
import { Spacing } from "@/constants/theme";
import type {
  PractaProps,
  PractaContext,
  PractaOutput,
  PreviousPractaContext,
  PractaStorage,
} from "@/types/flow";

interface PractaTestHarnessProps {
  PractaComponent: React.ComponentType<PractaProps>;
  assets?: Record<string, unknown>;
  previousContext?: PreviousPractaContext;
  storage?: PractaStorage;
  onComplete?: (output: PractaOutput) => void;
  onClose?: () => void;
  showSplash?: boolean;
  showClose?: boolean;
  splashDuration?: number;
}

const noopStorage: PractaStorage = {
  get: async () => null,
  set: async () => {},
  remove: async () => {},
  clear: async () => {},
};

function ChromeOverlay({ 
  showClose, 
  onClose 
}: { 
  showClose: boolean; 
  onClose?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { config } = usePractaChrome();

  return (
    <View 
      style={[styles.chromeOverlay, { paddingTop: insets.top + Spacing.sm }]} 
      pointerEvents="box-none"
    >
      <View style={styles.chromeRow} pointerEvents="box-none">
        {showClose ? (
          <View style={styles.closeButtonCircle}>
            <Pressable style={styles.closeButtonInner} onPress={onClose}>
              <Feather name="x" size={18} color="rgba(0, 0, 0, 0.8)" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.placeholder} />
        )}

        <View style={styles.placeholder} />

        {config.rightAction ? (
          <View>{config.rightAction}</View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

export function PractaTestHarness({
  PractaComponent,
  assets = {},
  previousContext,
  storage = noopStorage,
  onComplete,
  onClose,
  showSplash,
  showClose,
  splashDuration = 2000,
}: PractaTestHarnessProps) {
  const hasSplash = assets.splash != null;
  const shouldShowSplash = showSplash ?? hasSplash;
  const [splashComplete, setSplashComplete] = useState(!shouldShowSplash);

  const shouldShowClose = showClose ?? (onClose != null);

  const context = useMemo<PractaContext>(() => {
    const ctx: PractaContext = {
      flowId: "practa-harness",
      practaIndex: 0,
      assets,
      storage,
    };

    if (previousContext) {
      ctx.previous = previousContext;
    }

    return ctx;
  }, [assets, storage, previousContext]);

  const handleComplete = (output: PractaOutput) => {
    onComplete?.(output);
  };

  const handleClose = () => {
    onClose?.();
  };

  return (
    <PractaChromeProvider>
      <View style={styles.container}>
        {!splashComplete && hasSplash ? (
          <PractaSplashScreen
            splashImage={assets.splash as any}
            onComplete={() => setSplashComplete(true)}
            displayDuration={splashDuration}
          />
        ) : null}
        {splashComplete ? (
          <>
            <PractaComponent context={context} onComplete={handleComplete} />
            <ChromeOverlay showClose={shouldShowClose} onClose={handleClose} />
          </>
        ) : null}
      </View>
    </PractaChromeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chromeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Spacing.md,
  },
  chromeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    width: 32,
    height: 32,
  },
});
