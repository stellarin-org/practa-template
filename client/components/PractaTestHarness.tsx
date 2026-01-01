import React, { useState, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { PractaChromeProvider, HeaderMode } from "@/context/PractaChromeContext";
import { PractaChromeHeader } from "@/components/PractaChromeHeader";
import PractaSplashScreen from "@/components/PractaSplashScreen";
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
  headerMode?: HeaderMode;
  title?: string;
  splashDuration?: number;
}

const noopStorage: PractaStorage = {
  get: async () => null,
  set: async () => {},
  remove: async () => {},
  clear: async () => {},
};

export function PractaTestHarness({
  PractaComponent,
  assets = {},
  previousContext,
  storage = noopStorage,
  onComplete,
  onClose,
  showSplash,
  showClose,
  headerMode = "minimal",
  title = "",
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
            <PractaChromeHeader
              onClose={handleClose}
              showClose={shouldShowClose}
              defaultMode={headerMode}
              defaultTitle={title}
            />
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
});
