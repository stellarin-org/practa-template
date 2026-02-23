import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Modal, Platform, ScrollView } from "react-native";
import * as Clipboard from "expo-clipboard";
import { reloadAppAsync } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useHaptics } from "@/hooks/useHaptics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassBackground } from "@/components/GlassBackground";
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

interface HarnessImportStatus {
  available: boolean;
  reason?: string;
  isMasterTemplate?: boolean;
  mainAppRepo?: string;
  mainAppBranch?: string;
  repoAccessible?: boolean;
  syncItems?: Array<{ from: string; to: string; description: string }>;
  lastSync?: string | null;
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
                { backgroundColor: isDestructive ? theme.error : theme.primary },
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
  secondaryButtonText,
  onSecondaryPress,
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
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
          {secondaryButtonText && onSecondaryPress ? (
            <View style={{ gap: Spacing.sm, marginBottom: Spacing.xs }}>
              <Pressable
                onPress={onSecondaryPress}
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}
              >
                <Feather name="copy" size={14} color={theme.textSecondary} style={{ marginRight: Spacing.xs }} />
                <ThemedText style={[styles.modalButtonText, { color: theme.text }]}>{secondaryButtonText}</ThemedText>
              </Pressable>
            </View>
          ) : null}
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
  const haptics = useHaptics();
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
  const [isHarnessImporting, setIsHarnessImporting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showHarnessImportModal, setShowHarnessImportModal] = useState(false);
  const [enableSyncCheck, setEnableSyncCheck] = useState(false);
  const [alertModal, setAlertModal] = useState<{ visible: boolean; title: string; message: string; onClose?: () => void; buttonText?: string; secondaryButtonText?: string; onSecondaryPress?: () => void }>({
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

  const { data: harnessImportStatus } = useQuery<HarnessImportStatus>({
    queryKey: ["/api/harness-import/status"],
    staleTime: 1000 * 60 * 5,
    enabled: enableSyncCheck && syncStatus?.isMasterTemplate,
  });

  const showAlert = (title: string, message: string, options?: { onClose?: () => void; buttonText?: string; secondaryButtonText?: string; onSecondaryPress?: () => void }) => {
    setAlertModal({ visible: true, title, message, onClose: options?.onClose, buttonText: options?.buttonText, secondaryButtonText: options?.secondaryButtonText, onSecondaryPress: options?.onSecondaryPress });
  };

  const updateTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/template/update");
      return response.json();
    },
    onSuccess: (data) => {
      haptics.success();
      queryClient.invalidateQueries();

      const reviewPrompt = data.previousSha
        ? `The Practa template just updated from commit ${data.previousSha} to ${data.updatedTo} in the ${data.repoName} repo. Can you review the changes between these commits, fix any breaking changes in my Practa (client/my-practa/), and suggest any new features I might want to use.`
        : null;

      showAlert(
        "Template Updated",
        `Successfully updated to the latest template. Tap to reload the app.`,
        {
          buttonText: "Reload App",
          onClose: async () => {
            if (Platform.OS === "web") {
              window.location.reload();
            } else {
              await reloadAppAsync();
            }
          },
          secondaryButtonText: reviewPrompt ? "Copy Review Prompt" : undefined,
          onSecondaryPress: reviewPrompt
            ? async () => {
                await Clipboard.setStringAsync(reviewPrompt);
                haptics.success();
              }
            : undefined,
        }
      );
    },
    onError: (error: Error) => {
      haptics.error();
      showAlert("Update Failed", error.message || "Failed to update template");
    },
    onSettled: () => {
      setIsUpdatingTemplate(false);
    },
  });

  const handleUpdateTemplate = () => {
    haptics.medium();
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
      haptics.success();
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
      haptics.error();
      showAlert("Reset Failed", error.message || "Failed to reset Practa");
    },
    onSettled: () => {
      setIsResetting(false);
    },
  });

  const handleResetToDemo = () => {
    haptics.medium();
    setShowConfirmModal(true);
  };

  const handleConfirmReset = () => {
    setShowConfirmModal(false);
    setIsResetting(true);
    resetMutation.mutate();
  };

  const harnessImportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/harness-import/sync");
      return response.json();
    },
    onSuccess: (data) => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["/api/harness-import/status"] });
      const successCount = data.results?.filter((r: { status: string }) => r.status === "success").length || 0;
      const failedCount = data.results?.filter((r: { status: string }) => r.status === "failed").length || 0;
      
      if (failedCount > 0) {
        showAlert(
          "Import Partially Complete",
          `Imported ${successCount} files. ${failedCount} files failed. Check console for details.`
        );
      } else {
        showAlert(
          "Import Complete",
          `Successfully imported ${successCount} files from the main app. Restart the app to see changes.`,
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
      }
    },
    onError: (error: Error) => {
      haptics.error();
      showAlert("Import Failed", error.message || "Failed to import from main app");
    },
    onSettled: () => {
      setIsHarnessImporting(false);
    },
  });

  const handleHarnessImport = () => {
    haptics.medium();
    setShowHarnessImportModal(true);
  };

  const handleConfirmHarnessImport = () => {
    setShowHarnessImportModal(false);
    setIsHarnessImporting(true);
    harnessImportMutation.mutate();
  };

  return (
    <GlassBackground style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <ThemedText style={styles.title}>Developer Options</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Tools for development and testing
        </ThemedText>
      </View>

      <View style={styles.content}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="download" size={20} color={theme.primary} />
            <ThemedText style={styles.sectionTitle}>Template</ThemedText>
            {syncStatus ? (
              <View style={[
                styles.versionBadge, 
                { backgroundColor: (syncStatus.isInSync || !syncStatus.hasNewerVersion) ? theme.primary + "20" : theme.warning + "20" }
              ]}>
                <ThemedText style={[
                  styles.versionBadgeText, 
                  { color: (syncStatus.isInSync || !syncStatus.hasNewerVersion) ? theme.primary : theme.warning }
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
                  syncStatus.hasNewerVersion && { color: theme.warning }
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

          {syncStatus && !syncStatus.isInSync && !syncStatus.isMasterTemplate ? (
            <View style={styles.updateBanner}>
              <Feather name="download-cloud" size={16} color={theme.warning} />
              <ThemedText style={styles.updateBannerText}>
                {syncStatus.hasNewerVersion
                  ? `Update available: ${syncStatus.localTemplateVersion} → ${syncStatus.latestTemplateVersion}`
                  : "Template update available"}
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
                  {syncStatus && !syncStatus.isInSync && !syncStatus.isMasterTemplate
                    ? (syncStatus.hasNewerVersion
                      ? `Update from v${syncStatus.localTemplateVersion} to v${syncStatus.latestTemplateVersion}`
                      : "New template changes available")
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
        </GlassCard>

        <GlassCard style={styles.section}>
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
                color={isResetting ? theme.textSecondary : theme.error}
              />
              <View style={styles.optionText}>
                <ThemedText
                  style={[
                    styles.optionTitle,
                    { color: isResetting ? theme.textSecondary : theme.error },
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
        </GlassCard>

        {harnessImportStatus?.available ? (
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="git-pull-request" size={20} color={theme.primary} />
              <ThemedText style={styles.sectionTitle}>Test Harness Import</ThemedText>
              <View style={[styles.versionBadge, { backgroundColor: theme.success + "20" }]}>
                <ThemedText style={[styles.versionBadgeText, { color: theme.success }]}>
                  Master
                </ThemedText>
              </View>
            </View>

            {harnessImportStatus.lastSync ? (
              <View style={styles.versionInfo}>
                <View style={styles.versionRow}>
                  <ThemedText style={[styles.versionLabel, { color: theme.textSecondary }]}>
                    Last Import
                  </ThemedText>
                  <ThemedText style={styles.versionValue}>
                    {new Date(harnessImportStatus.lastSync).toLocaleDateString()}
                  </ThemedText>
                </View>
                <View style={styles.versionRow}>
                  <ThemedText style={[styles.versionLabel, { color: theme.textSecondary }]}>
                    Source
                  </ThemedText>
                  <ThemedText style={[styles.versionValue, { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12 }]}>
                    {harnessImportStatus.mainAppRepo}
                  </ThemedText>
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={handleHarnessImport}
              disabled={isHarnessImporting || !harnessImportStatus.repoAccessible}
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
                  name="download"
                  size={20}
                  color={isHarnessImporting ? theme.textSecondary : theme.success}
                />
                <View style={styles.optionText}>
                  <ThemedText
                    style={[
                      styles.optionTitle,
                      { color: isHarnessImporting ? theme.textSecondary : theme.success },
                    ]}
                  >
                    Import from Stellarin
                  </ThemedText>
                  <ThemedText
                    style={[styles.optionDescription, { color: theme.textSecondary }]}
                  >
                    Import design system, components, and types ({harnessImportStatus.syncItems?.length || 0} files)
                  </ThemedText>
                </View>
              </View>
              {isHarnessImporting ? (
                <ActivityIndicator size="small" color={theme.textSecondary} />
              ) : (
                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              )}
            </Pressable>
          </GlassCard>
        ) : null}

        <ThemedText style={[styles.warningText, { color: theme.textSecondary }]}>
          Note: Your Practa files (my-practa folder) are preserved during updates.
        </ThemedText>
      </View>
      </ScrollView>

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

      <ConfirmModal
        visible={showHarnessImportModal}
        title="Import Test Harness"
        message={`This will import ${harnessImportStatus?.syncItems?.length || 0} files from the Stellarin app (design system, components, types). Existing files will be overwritten. Continue?`}
        confirmText="Import"
        cancelText="Cancel"
        onConfirm={handleConfirmHarnessImport}
        onCancel={() => setShowHarnessImportModal(false)}
      />

      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        buttonText={alertModal.buttonText}
        secondaryButtonText={alertModal.secondaryButtonText}
        onSecondaryPress={alertModal.onSecondaryPress}
        onClose={() => {
          setAlertModal({ ...alertModal, visible: false });
          if (alertModal.onClose) {
            alertModal.onClose();
          }
        }}
      />
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
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
