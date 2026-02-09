import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { usePractaChrome, HeaderMode } from "@/context/PractaChromeContext";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, Colors } from "@/constants/theme";

export const HEADER_BAR_HEIGHT = 44;

interface ProgressDotsProps {
  totalSteps: number;
  currentStep: number;
  activeColor: string;
  inactiveColor?: string;
}

function ProgressDots({ totalSteps, currentStep, activeColor, inactiveColor = "rgba(255,255,255,0.4)" }: ProgressDotsProps) {
  return (
    <View style={styles.progressIndicator}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            {
              backgroundColor: index < currentStep ? activeColor : inactiveColor,
            },
          ]}
        />
      ))}
    </View>
  );
}

interface PractaChromeHeaderProps {
  onClose?: () => void;
  showClose?: boolean;
  defaultMode?: HeaderMode;
  defaultTitle?: string;
  totalSteps?: number;
  currentStep?: number;
  progressActiveColor?: string;
}

function CloseButton({ onPress }: { onPress?: () => void }) {
  return (
    <View style={styles.closeButtonCircle}>
      <Pressable style={styles.closeButtonInner} onPress={onPress}>
        <Feather name="x" size={18} color="rgba(0, 0, 0, 0.8)" />
      </Pressable>
    </View>
  );
}

function SettingsButton({ onPress }: { onPress?: () => void }) {
  return (
    <View style={styles.closeButtonCircle}>
      <Pressable style={styles.closeButtonInner} onPress={onPress}>
        <Feather name="settings" size={18} color="rgba(0, 0, 0, 0.8)" />
      </Pressable>
    </View>
  );
}

function DefaultHeader({
  insetTop,
  onClose,
  showClose,
  title,
  showSettings,
  onSettings,
  rightAction,
}: {
  insetTop: number;
  onClose?: () => void;
  showClose: boolean;
  title: string;
  showSettings: boolean;
  onSettings?: () => void;
  rightAction?: React.ReactNode;
}) {
  const headerContent = (
    <View style={[styles.defaultHeaderContent, { paddingTop: insetTop }]}>
      <View style={styles.headerRow}>
        {showClose ? (
          <Pressable style={styles.headerButton} onPress={onClose}>
            <Feather name="x" size={22} color={Colors.dark.text} />
          </Pressable>
        ) : (
          <View style={styles.headerButton} />
        )}

        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {title}
        </ThemedText>

        {rightAction ? (
          <View style={styles.headerButton}>{rightAction}</View>
        ) : showSettings ? (
          <Pressable style={styles.headerButton} onPress={onSettings}>
            <Feather name="settings" size={20} color={Colors.dark.text} />
          </Pressable>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={80} tint="light" style={styles.defaultHeader}>
        {headerContent}
      </BlurView>
    );
  }

  return (
    <View style={[styles.defaultHeader, styles.defaultHeaderAndroid]}>
      {headerContent}
    </View>
  );
}

function MinimalHeader({
  insetTop,
  onClose,
  showClose,
  showSettings,
  onSettings,
  rightAction,
  showProgressDots,
  totalSteps,
  currentStep,
  progressActiveColor,
}: {
  insetTop: number;
  onClose?: () => void;
  showClose: boolean;
  showSettings: boolean;
  onSettings?: () => void;
  rightAction?: React.ReactNode;
  showProgressDots: boolean;
  totalSteps: number;
  currentStep: number;
  progressActiveColor: string;
}) {
  return (
    <View
      style={[styles.minimalHeader, { paddingTop: insetTop + Spacing.sm }]}
      pointerEvents="box-none"
    >
      <View style={styles.minimalRow} pointerEvents="box-none">
        {showClose ? (
          <CloseButton onPress={onClose} />
        ) : (
          <View style={styles.placeholder} />
        )}

        {showProgressDots && totalSteps > 1 ? (
          <ProgressDots
            totalSteps={totalSteps}
            currentStep={currentStep}
            activeColor={progressActiveColor}
          />
        ) : (
          <View style={styles.placeholder} />
        )}

        {rightAction ? (
          <View>{rightAction}</View>
        ) : showSettings ? (
          <SettingsButton onPress={onSettings} />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

export function PractaChromeHeader({
  onClose,
  showClose = true,
  defaultMode = "default",
  defaultTitle = "",
  totalSteps = 1,
  currentStep = 1,
  progressActiveColor = Colors.dark.primary,
}: PractaChromeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { config } = usePractaChrome();

  const headerMode = config.headerMode ?? defaultMode;
  const title = config.title ?? defaultTitle;
  const showSettings = config.showSettings ?? false;
  const onSettings = config.onSettings;
  const rightAction = config.rightAction;
  const showProgressDots = config.showProgressDots ?? false;

  if (headerMode === "none") {
    return null;
  }

  if (headerMode === "minimal") {
    return (
      <MinimalHeader
        insetTop={insets.top}
        onClose={onClose}
        showClose={showClose}
        showSettings={showSettings}
        onSettings={onSettings}
        rightAction={rightAction}
        showProgressDots={showProgressDots}
        totalSteps={totalSteps}
        currentStep={currentStep}
        progressActiveColor={progressActiveColor}
      />
    );
  }

  return (
    <DefaultHeader
      insetTop={insets.top}
      onClose={onClose}
      showClose={showClose}
      title={title}
      showSettings={showSettings}
      onSettings={onSettings}
      rightAction={rightAction}
    />
  );
}

export function useHeaderHeight(): number {
  const insets = useSafeAreaInsets();
  const { config } = usePractaChrome();
  
  if (config.headerMode === "none") {
    return 0;
  }
  
  return insets.top + HEADER_BAR_HEIGHT;
}

const styles = StyleSheet.create({
  defaultHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  defaultHeaderAndroid: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  defaultHeaderContent: {
    width: "100%",
  },
  headerRow: {
    height: HEADER_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
  },
  minimalHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Spacing.md,
  },
  minimalRow: {
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
  progressIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
