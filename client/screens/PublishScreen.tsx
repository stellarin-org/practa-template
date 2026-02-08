import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, Linking, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import codeMetadata from "@/my-practa/metadata.json";
import { usePractaValidation, ValidationReport } from "@/hooks/usePractaValidation";
import { getApiUrl } from "@/lib/query-client";
import { PractaFileMetadata } from "@/types/flow";

const VERIFICATION_SERVICE_URL = "https://stellarin-practa-verification.replit.app";

interface ValidationCheck {
  name: string;
  category: string;
  passed: boolean;
  message: string;
}

interface UploadPreviewResult {
  token: string;
  practaName: string;
  practaType: string;
  version: string;
  validationScore: number;
  validationChecks: ValidationCheck[];
  valid: boolean;
  expiresAt: string;
  requiresAuth: boolean;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function PublishScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitResult, setSubmitResult] = useState<UploadPreviewResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: metadata } = useQuery<PractaFileMetadata>({
    queryKey: ["/api/practa/metadata"],
  });

  const validationReport = usePractaValidation();

  const hasErrors = !validationReport.isValid;
  const errorCount = validationReport.errors.length;
  const warningCount = validationReport.warnings.length;

  const handleSubmit = async () => {
    if (hasErrors) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitState("submitting");
    setSubmitError(null);
    
    try {
      const response = await fetch(new URL("/api/practa/submit", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || data.details || "Submission failed");
      }
      
      setSubmitResult(data);
      setSubmitState("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Submission failed";
      const isNetworkError = errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("Network");
      setSubmitError(
        isNetworkError 
          ? "Unable to reach Stellarin. Please check your connection and try again." 
          : errorMessage
      );
      setSubmitState("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleContinueToSubmit = () => {
    if (!submitResult?.token) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const submitUrl = `${VERIFICATION_SERVICE_URL}/submit?token=${submitResult.token}`;
    Linking.openURL(submitUrl);
    // Reset to initial state so user can submit again if needed
    setSubmitState("idle");
    setSubmitResult(null);
  };

  const handleDownloadZip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const downloadUrl = new URL("/api/practa/download-zip", getApiUrl()).toString();
    Linking.openURL(downloadUrl);
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubmitState("idle");
    setSubmitResult(null);
    setSubmitError(null);
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    return `${diffMins} min`;
  };

  const displayMetadata = (metadata || codeMetadata) as PractaFileMetadata;
  const canSubmit = !hasErrors && submitState !== "submitting";

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>Publish</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Submit your Practa to Stellarin
          </ThemedText>
        </View>

        <Card style={styles.card}>
          <View style={styles.practaHeader}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="package" size={24} color={theme.primary} />
            </View>
            <View style={styles.practaInfo}>
              <ThemedText style={styles.practaName}>{displayMetadata.name}</ThemedText>
              <ThemedText style={[styles.practaType, { color: theme.textSecondary }]}>
                {String(displayMetadata.type || "practa")} v{displayMetadata.version}
              </ThemedText>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.statusRow}>
            <Feather
              name={hasErrors ? "alert-circle" : "check-circle"}
              size={20}
              color={hasErrors ? theme.error : theme.success}
            />
            <ThemedText style={styles.statusText}>
              {hasErrors ? "Validation Failed" : "Ready to Submit"}
            </ThemedText>
          </View>
          
          <View style={styles.statsRow}>
            {errorCount > 0 ? (
              <View style={[styles.statBadge, { backgroundColor: theme.error + "20" }]}>
                <ThemedText style={[styles.statText, { color: theme.error }]}>
                  {errorCount} error{errorCount !== 1 ? "s" : ""}
                </ThemedText>
              </View>
            ) : null}
            {warningCount > 0 ? (
              <View style={[styles.statBadge, { backgroundColor: theme.warning + "20" }]}>
                <ThemedText style={[styles.statText, { color: theme.warning }]}>
                  {warningCount} warning{warningCount !== 1 ? "s" : ""}
                </ThemedText>
              </View>
            ) : null}
            {errorCount === 0 && warningCount === 0 ? (
              <View style={[styles.statBadge, { backgroundColor: theme.success + "20" }]}>
                <ThemedText style={[styles.statText, { color: theme.success }]}>
                  All checks passed
                </ThemedText>
              </View>
            ) : null}
          </View>
        </Card>

        {submitState === "success" && submitResult ? (
          <Card style={{ ...styles.card, borderColor: theme.success, borderWidth: 1 }}>
            <View style={styles.successHeader}>
              <Feather name="check-circle" size={24} color={theme.success} />
              <ThemedText style={[styles.successTitle, { color: theme.success }]}>
                Validation Complete
              </ThemedText>
            </View>
            
            <ThemedText style={[styles.successText, { color: theme.textSecondary }]}>
              Your Practa has been validated and is ready. Continue to Stellarin to complete your submission.
            </ThemedText>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Validation Score</ThemedText>
              <View style={[
                styles.scoreBadge, 
                { backgroundColor: submitResult.validationScore >= 70 ? theme.success + "20" : theme.warning + "20" }
              ]}>
                <ThemedText style={[
                  styles.scoreText, 
                  { color: submitResult.validationScore >= 70 ? theme.success : theme.warning }
                ]}>
                  {submitResult.validationScore}/100
                </ThemedText>
              </View>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Complete within</ThemedText>
              <ThemedText style={[styles.detailValue, { color: theme.textSecondary }]}>
                {formatExpiryTime(submitResult.expiresAt)}
              </ThemedText>
            </View>

            {submitResult.validationChecks.filter(c => !c.passed).length > 0 ? (
              <View style={styles.checksContainer}>
                <ThemedText style={[styles.checksTitle, { color: theme.error }]}>
                  Failed Checks
                </ThemedText>
                {submitResult.validationChecks.filter(c => !c.passed).map((check, index) => (
                  <View key={index} style={styles.checkRow}>
                    <Feather name="x" size={14} color={theme.error} />
                    <ThemedText style={[styles.checkText, { color: theme.error }]}>
                      {check.name}{check.message ? `: ${check.message}` : ""}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              style={[styles.continueButton, { backgroundColor: theme.primary }]}
              onPress={handleContinueToSubmit}
            >
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
              <ThemedText style={styles.continueButtonText}>Continue to Submit</ThemedText>
            </Pressable>
          </Card>
        ) : null}

        {submitState === "error" && submitError ? (
          <Card style={{ ...styles.card, borderColor: theme.error, borderWidth: 1 }}>
            <View style={styles.errorHeader}>
              <Feather name="alert-circle" size={24} color={theme.error} />
              <ThemedText style={[styles.errorTitle, { color: theme.error }]}>
                Submission Failed
              </ThemedText>
            </View>
            <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
              {submitError}
            </ThemedText>
            <Pressable
              style={[styles.retryButton, { backgroundColor: theme.error }]}
              onPress={handleReset}
            >
              <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
            </Pressable>
          </Card>
        ) : null}

        {submitState === "idle" ? (
          <>
            <Card style={styles.card}>
              <View style={styles.infoRow}>
                <Feather name="info" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
                  Your Practa will be validated. After validation, continue to Stellarin to complete your submission.
                </ThemedText>
              </View>
            </Card>

            <Pressable
              style={[
                styles.submitButton,
                { 
                  backgroundColor: canSubmit ? theme.primary : theme.textSecondary,
                  opacity: !canSubmit ? 0.6 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Feather name="upload-cloud" size={20} color="#FFFFFF" />
              <ThemedText style={styles.submitButtonText}>
                Submit to Stellarin
              </ThemedText>
            </Pressable>

            {hasErrors ? (
              <ThemedText style={[styles.warningText, { color: theme.error }]}>
                Fix all validation errors before submitting
              </ThemedText>
            ) : null}

            <Pressable onPress={handleDownloadZip} style={styles.downloadLink}>
              <Feather name="download" size={16} color={theme.primary} />
              <ThemedText style={[styles.downloadLinkText, { color: theme.primary }]}>
                Download ZIP for manual upload
              </ThemedText>
            </Pressable>
          </>
        ) : null}

        {submitState === "submitting" ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
              Validating and uploading...
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  practaHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  practaInfo: {
    flex: 1,
  },
  practaName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  practaType: {
    fontSize: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statText: {
    fontSize: 13,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  successHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  successText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
  },
  scoreBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  checksContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  checksTitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  checkText: {
    fontSize: 13,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  retryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  warningText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: Spacing.md,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  downloadLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  downloadLinkText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
