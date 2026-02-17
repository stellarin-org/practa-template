import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export function useHaptics() {
  const isNative = Platform.OS !== "web";

  return {
    light: () => {
      if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    medium: () => {
      if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    heavy: () => {
      if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },
    success: () => {
      if (isNative)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    warning: () => {
      if (isNative)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    error: () => {
      if (isNative)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
    selection: () => {
      if (isNative) Haptics.selectionAsync();
    },
  };
}
