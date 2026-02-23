import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { usePractaChrome, HeaderMode } from "@/context/PractaChromeContext";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
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

function CloseButton({ onPress, icon = "x", isDark = false }: { onPress?: () => void; icon?: string; isDark?: boolean }) {
  return (
    <View style={[
      styles.closeButtonCircle,
      { backgroundColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.9)" },
    ]}>
      <Pressable style={styles.closeButtonInner} onPress={onPress}>
        <Feather name={icon as any} size={18} color={isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.8)"} />
      </Pressable>
    </View>
  );
}

function SettingsButton({ onPress, isDark = false }: { onPress?: () => void; isDark?: boolean }) {
  return (
    <View style={[
      styles.closeButtonCircle,
      { backgroundColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.9)" },
    ]}>
      <Pressable style={styles.closeButtonInner} onPress={onPress}>
        <Feather name="settings" size={18} color={isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.8)"} />
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
  isDark,
  theme,
}: {
  insetTop: number;
  onClose?: () => void;
  showClose: boolean;
  title: string;
  showSettings: boolean;
  onSettings?: () => void;
  rightAction?: React.ReactNode;
  isDark: boolean;
  theme: any;
}) {
  const iconColor = theme.text;

  const headerContent = (
    <View style={[styles.defaultHeaderContent, { paddingTop: insetTop }]}>
      <View style={styles.headerRow}>
        {showClose ? (
          <Pressable style={styles.headerButton} onPress={onClose}>
            <Feather name="x" size={22} color={iconColor} />
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
            <Feather name="settings" size={20} color={iconColor} />
          </Pressable>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.defaultHeader}>
        {headerContent}
      </BlurView>
    );
  }

  return (
    <View style={[
      styles.defaultHeader,
      {
        backgroundColor: isDark ? "rgba(26, 26, 26, 0.95)" : "rgba(255, 255, 255, 0.95)",
      },
    ]}>
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
  closeIcon,
  isDark,
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
  closeIcon?: string;
  isDark: boolean;
}) {
  return (
    <View
      style={[styles.minimalHeader, { paddingTop: insetTop + Spacing.sm }]}
      pointerEvents="box-none"
    >
      <View style={styles.minimalRow} pointerEvents="box-none">
        {showClose ? (
          <CloseButton onPress={onClose} icon={closeIcon} isDark={isDark} />
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
          <SettingsButton onPress={onSettings} isDark={isDark} />
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
  const { theme, isDark } = useTheme();

  const headerMode = config.headerMode ?? defaultMode;
  const title = config.title ?? defaultTitle;
  const showSettings = config.showSettings ?? false;
  const onSettings = config.onSettings;
  const rightAction = config.rightAction;
  const showProgressDots = config.showProgressDots ?? false;
  const closeIcon = config.closeIcon;
  const effectiveOnClose = config.onCloseOverride ?? onClose;
  const effectiveShowClose = config.onCloseOverride ? true : showClose;

  if (headerMode === "none") {
    return null;
  }

  if (headerMode === "minimal") {
    return (
      <MinimalHeader
        insetTop={insets.top}
        onClose={effectiveOnClose}
        showClose={effectiveShowClose}
        showSettings={showSettings}
        onSettings={onSettings}
        rightAction={rightAction}
        showProgressDots={showProgressDots}
        totalSteps={totalSteps}
        currentStep={currentStep}
        progressActiveColor={progressActiveColor}
        closeIcon={closeIcon}
        isDark={isDark}
      />
    );
  }

  return (
    <DefaultHeader
      insetTop={insets.top}
      onClose={effectiveOnClose}
      showClose={effectiveShowClose}
      title={title}
      showSettings={showSettings}
      onSettings={onSettings}
      rightAction={rightAction}
      isDark={isDark}
      theme={theme}
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
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
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
