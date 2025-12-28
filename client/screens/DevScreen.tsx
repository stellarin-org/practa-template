import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Modal, Platform } from "react-native";
import { reloadAppAsync } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface SyncStatus {
  isInSync: boolean;
  localVersion: string | null;
  latestVersion: string;
  localTemplateVersion?: string;
  latestTemplateVersion?: string;
  hasNewerVersion?: boolean;
  repoUrl: string;
  isMasterTemplate?: boolean;
}

function ConfirmModal({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDestructive,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
          <ThemedText style={styles.modalTitle}>{title}</ThemedText>
          <ThemedText style={[styles.modalMessage, { color: theme.textSecondary }]}>
            {message}
          </ThemedText>
          <View style={styles.modalButtons}>
            <Pressable
              onPress={onCancel}
              style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <ThemedText style={styles.modalButtonText}>{cancelText}</ThemedText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[
                styles.modalButton,
                { backgroundColor: isDestructive ? "#EF4444" : theme.primary },
              ]}
            >
              <ThemedText style={[styles.modalButtonText, { color: "white" }]}>
                {confirmText}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AlertModal({
  visible,
  title,
  message,
  onClose,
  buttonText = "OK",
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
}) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
          <ThemedText style={styles.modalTitle}>{title}</ThemedText>
          <ThemedText style={[styles.modalMessage, { color: theme.textSecondary }]}>
            {message}
          </ThemedText>
          <View style={styles.modalButtons}>
            <Pressable
              onPress={onClose}
              style={[styles.modalButton, { backgroundColor: theme.primary, flex: 1 }]}
            >
              <ThemedText style={[styles.modalButtonText, { color: "white" }]}>{buttonText}</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function DevScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const queryClient = useQueryClient();
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [enableSyncCheck, setEnableSyncCheck] = useState(false);
  const [alertModal, setAlertModal] = useState<{ visible: boolean; title: string; message: string; onClose?: () => void; buttonText?: string }>({
    visible: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setEnableSyncCheck(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/template/sync-status"],
    staleTime: 1000 * 60 * 5,
    enabled: enableSyncCheck,
  });

  const showAlert = (title: string, message: string, options?: { onClose?: () => void; buttonText?: string }) => {
    setAlertModal({ visible: true, title, message, onClose: options?.onClose, buttonText: options?.buttonText });
  };

  const updateTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/template/update");
      return response.json();
    },
    onSuccess: (data) => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      queryClient.invalidateQueries();
      showAlert(
        "Template Updated",
        `Successfully updated to the latest template (${data.filesUpdated || 0} files). Tap to reload the app.`,
        {
          buttonText: "Reload App",
          onClose: async () => {
            if (Platform.OS === "web") {
              window.location.reload();
            } else {
              await reloadAppAsync();
            }
          },
        }
      );
    },
    onError: (error: Error) => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      showAlert("Update Failed", error.message || "Failed to update template");
    },
    onSettled: () => {
      setIsUpdatingTemplate(false);
    },
  });

  const handleUpdateTemplate = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowUpdateModal(true);
  };

  const handleConfirmUpdate = () => {
    setShowUpdateModal(false);
    setIsUpdatingTemplate(true);
    updateTemplateMutation.mutate();
  };

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/practa/reset-to-demo");
      return response.json();
    },
    onSuccess: () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/practa/metadata"] });
      showAlert(
        "Reset Complete",
        "Your Practa has been reset to the demo state. Tap to reload the app.",
        {
          buttonText: "Reload App",
          onClose: async () => {
            if (Platform.OS === "web") {
              window.location.reload();
            } else {
              await reloadAppAsync();
            }
          },
        }
      );
    },
    onError: (error: Error) => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      showAlert("Reset Failed", error.message || "Failed to reset Practa");
    },
    onSettled: () => {
      setIsResetting(false);
    },
  });

  const handleResetToDemo = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowConfirmModal(true);
  };

  const handleConfirmReset = () => {
    setShowConfirmModal(false);
    setIsResetting(true);
    resetMutation.mutate();
  };

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
    >
      <View style={styles.header}>
        <ThemedText style={styles.title}>Developer Options</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Tools for development and testing
        </ThemedText>
      </View>

      <View style={styles.content}>
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="download" size={20} color={theme.primary} />
            <ThemedText style={styles.sectionTitle}>Template</ThemedText>
            {syncStatus ? (
              <View style={[
                styles.versionBadge, 
                { backgroundColor: (syncStatus.isInSync || !syncStatus.hasNewerVersion) ? theme.primary + "20" : "#D97706" + "20" }
              ]}>
                <ThemedText style={[
                  styles.versionBadgeText, 
                  { color: (syncStatus.isInSync || !syncStatus.hasNewerVersion) ? theme.primary : "#D97706" }
                ]}>
                  v{syncStatus.localTemplateVersion || "?"}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {syncStatus ? (
            <View style={styles.versionInfo}>
              <View style={styles.versionRow}>
                <ThemedText style={[styles.versionLabel, { color: theme.textSecondary }]}>
                  Your Template
                </ThemedText>
                <ThemedText style={styles.versionValue}>
                  v{syncStatus.localTemplateVersion || "?"}
                </ThemedText>
              </View>
              <View style={styles.versionRow}>
                <ThemedText style={[styles.versionLabel, { color: theme.textSecondary }]}>
                  Latest Template
                </ThemedText>
                <ThemedText style={[
                  styles.versionValue,
                  syncStatus.hasNewerVersion && { color: "#D97706" }
                ]}>
                  v{syncStatus.latestTemplateVersion || "?"}
                  {syncStatus.hasNewerVersion ? " (newer)" : ""}
                </ThemedText>
              </View>
              <View style={styles.versionRow}>
                <ThemedText style={[styles.versionLabel, { color: theme.textSecondary }]}>
                  Your Git
                </ThemedText>
                <ThemedText style={[styles.versionValue, { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12 }]}>
                  {syncStatus.localVersion ? syncStatus.localVersion.substring(0, 7) : "—"}
                </ThemedText>
              </View>
              <View style={styles.versionRow}>
                <ThemedText style={[styles.versionLabel, { color: theme.textSecondary }]}>
                  Latest Git
                </ThemedText>
                <ThemedText style={[styles.versionValue, { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12 }]}>
                  {syncStatus.latestVersion ? syncStatus.latestVersion.substring(0, 7) : "—"}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {syncStatus && !syncStatus.isInSync && !syncStatus.isMasterTemplate && syncStatus.hasNewerVersion ? (
            <View style={styles.updateBanner}>
              <Feather name="download-cloud" size={16} color="#D97706" />
              <ThemedText style={styles.updateBannerText}>
                Update available: {syncStatus.localTemplateVersion} → {syncStatus.latestTemplateVersion}
              </ThemedText>
            </View>
          ) : null}

          <Pressable
            onPress={handleUpdateTemplate}
            disabled={isUpdatingTemplate}
            style={({ pressed }) => [
              styles.optionButton,
              {
                backgroundColor: pressed
                  ? theme.backgroundSecondary
                  : "transparent",
              },
            ]}
          >
            <View style={styles.optionContent}>
              <Feather
                name="download-cloud"
                size={20}
                color={isUpdatingTemplate ? theme.textSecondary : theme.primary}
              />
              <View style={styles.optionText}>
                <ThemedText
                  style={[
                    styles.optionTitle,
                    { color: isUpdatingTemplate ? theme.textSecondary : theme.text },
                  ]}
                >
                  Get Latest Template
                </ThemedText>
                <ThemedText
                  style={[styles.optionDescription, { color: theme.textSecondary }]}
                >
                  {syncStatus && !syncStatus.isInSync && !syncStatus.isMasterTemplate && syncStatus.hasNewerVersion
                    ? `Update from v${syncStatus.localTemplateVersion} to v${syncStatus.latestTemplateVersion}`
                    : "Download and update to the latest Practa template"}
                </ThemedText>
              </View>
            </View>
            {isUpdatingTemplate ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            )}
          </Pressable>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="refresh-cw" size={20} color={theme.primary} />
            <ThemedText style={styles.sectionTitle}>Reset</ThemedText>
          </View>

          <Pressable
            onPress={handleResetToDemo}
            disabled={isResetting}
            style={({ pressed }) => [
              styles.optionButton,
              {
                backgroundColor: pressed
                  ? theme.backgroundSecondary
                  : "transparent",
              },
            ]}
          >
            <View style={styles.optionContent}>
              <Feather
                name="rotate-ccw"
                size={20}
                color={isResetting ? theme.textSecondary : "#EF4444"}
              />
              <View style={styles.optionText}>
                <ThemedText
                  style={[
                    styles.optionTitle,
                    { color: isResetting ? theme.textSecondary : "#EF4444" },
                  ]}
                >
                  Reset Practa to Demo
                </ThemedText>
                <ThemedText
                  style={[styles.optionDescription, { color: theme.textSecondary }]}
                >
                  Replace current Practa with the demo template
                </ThemedText>
              </View>
            </View>
            {isResetting ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            )}
          </Pressable>
        </Card>

        <ThemedText style={[styles.warningText, { color: theme.textSecondary }]}>
          Note: Your Practa files (my-practa folder) are preserved during updates.
        </ThemedText>
      </View>

      <ConfirmModal
        visible={showUpdateModal}
        title="Update Template"
        message="This will download and overwrite template files from GitHub. Your Practa (my-practa folder) will be preserved. Continue?"
        confirmText="Update"
        cancelText="Cancel"
        onConfirm={handleConfirmUpdate}
        onCancel={() => setShowUpdateModal(false)}
      />

      <ConfirmModal
        visible={showConfirmModal}
        title="Reset to Demo"
        message="This will replace your current Practa files with the demo template. Your changes will be lost. Are you sure?"
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowConfirmModal(false)}
        isDestructive
      />

      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        buttonText={alertModal.buttonText}
        onClose={() => {
          setAlertModal({ ...alertModal, visible: false });
          if (alertModal.onClose) {
            alertModal.onClose();
          }
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  versionBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  versionBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  versionInfo: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  versionLabel: {
    fontSize: 13,
  },
  versionValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  updateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: "#D97706" + "15",
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  updateBannerText: {
    fontSize: 13,
    color: "#D97706",
    fontWeight: "500",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  warningText: {
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
