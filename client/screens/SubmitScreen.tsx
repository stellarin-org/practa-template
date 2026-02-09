import React, { useMemo, useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, Linking, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import codeMetadata from "@/my-practa/metadata.json";
import { usePractaValidation, ValidationReport } from "@/hooks/usePractaValidation";
import { getApiUrl } from "@/lib/query-client";
import { PractaFileMetadata } from "@/types/flow";

const VERIFICATION_SERVICE_URL = "https://stellarin-practa-verification.replit.app";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

export default function SubmitScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitResult, setSubmitResult] = useState<UploadPreviewResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedValidation, setCopiedValidation] = useState(false);
  const [releaseType, setReleaseType] = useState<"major" | "minor" | "patch">("patch");
  const [bumpResult, setBumpResult] = useState<{ previousVersion?: string; newVersion?: string; releaseType?: string } | null>(null);

  const { data: metadata, refetch: refetchMetadata } = useQuery<PractaFileMetadata>({
    queryKey: ["/api/practa/metadata"],
  });

  const { data: syncStatus } = useQuery<{ isMasterTemplate?: boolean }>({
    queryKey: ["/api/template/sync-status"],
  });

  const isMasterTemplate = syncStatus?.isMasterTemplate === true;

  const validationReport = usePractaValidation();

  const hasErrors = !validationReport.isValid;
  const errorCount = validationReport.errors.length;
  const warningCount = validationReport.warnings.length;

  const handleCopyValidationForAI = async () => {
    const errors = validationReport.errors.map(e => `- ${e.message}`).join("\n");
    const warnings = validationReport.warnings.map(w => `- ${w.message}`).join("\n");
    let message = `Fix the following validation issues in my Practa (client/my-practa/):\n\n`;
    if (errors) message += `Errors:\n${errors}\n\n`;
    if (warnings) message += `Warnings:\n${warnings}\n`;
    await Clipboard.setStringAsync(message.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedValidation(true);
    setTimeout(() => setCopiedValidation(false), 2000);
  };

  const handleSubmit = async () => {
    if (hasErrors) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitState("submitting");
    setSubmitError(null);
    
    try {
      const endpoint = isMasterTemplate ? "/api/practa/bump-version" : "/api/practa/submit";
      const response = await fetch(new URL(endpoint, getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ releaseType }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || data.details || "Failed");
      }

      if (isMasterTemplate) {
        setBumpResult(data);
        refetchMetadata();
      } else {
        setSubmitResult(data);
      }
      setSubmitState("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      queryClient.invalidateQueries({ queryKey: ["/api/practa/last-submit"] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed";
      const isNetworkError = errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("Network");
      setSubmitError(
        isNetworkError 
          ? "Unable to reach the server. Please check your connection and try again." 
          : errorMessage
      );
      setSubmitState("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleClaimSubmission = () => {
    if (!submitResult?.token) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const submitUrl = `${VERIFICATION_SERVICE_URL}/submit?token=${submitResult.token}`;
    Linking.openURL(submitUrl);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    return `${diffMins} min`;
  };

  const displayMetadata = metadata || codeMetadata;
  const canSubmit = !hasErrors && submitState !== "submitting";

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>{isMasterTemplate ? "Update Version" : "Submit Practa"}</ThemedText>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <ThemedText style={styles.cardTitle}>{displayMetadata.name}</ThemedText>
          <ThemedText style={styles.cardSubtitle}>
            {displayMetadata.id} v{displayMetadata.version}
          </ThemedText>
          <ThemedText style={[styles.cardDescription, { color: theme.textSecondary }]}>
            by {displayMetadata.author}
          </ThemedText>
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

          {validationReport.errors.length > 0 || validationReport.warnings.length > 0 ? (
            <View style={styles.errorList}>
              {validationReport.errors.map((error, index) => (
                <View key={`err-${index}`} style={styles.errorItem}>
                  <Feather name="x-circle" size={14} color={theme.error} />
                  <ThemedText style={[styles.errorMessage, { color: theme.error }]}>
                    {error.message}
                  </ThemedText>
                </View>
              ))}
              {validationReport.warnings.map((warning, index) => (
                <View key={`warn-${index}`} style={styles.errorItem}>
                  <Feather name="alert-circle" size={14} color={theme.warning} />
                  <ThemedText style={[styles.errorMessage, { color: theme.textSecondary }]}>
                    {warning.message}
                  </ThemedText>
                </View>
              ))}
              <Pressable
                onPress={handleCopyValidationForAI}
                style={[styles.copyForAIButton, { backgroundColor: theme.primary + "15", borderColor: theme.primary + "30" }]}
              >
                <Feather name={copiedValidation ? "check" : "copy"} size={14} color={theme.primary} />
                <ThemedText style={[styles.copyForAIText, { color: theme.primary }]}>
                  {copiedValidation ? "Copied" : "Copy for AI"}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <ThemedText style={styles.releaseTitle}>Release Type</ThemedText>
          <ThemedText style={[styles.releaseSubtitle, { color: theme.textSecondary }]}>
            How should the version number change?
          </ThemedText>
          <View style={styles.releaseOptions}>
            {([
              { type: "patch" as const, label: "Bug Fix", description: `${displayMetadata.version.split(".").slice(0, 2).join(".")}.X`, icon: "tool" as const },
              { type: "minor" as const, label: "New Feature", description: `${displayMetadata.version.split(".")[0]}.X.0`, icon: "plus-circle" as const },
              { type: "major" as const, label: "Major Release", description: `X.0.0`, icon: "zap" as const },
            ]).map((option) => (
              <Pressable
                key={option.type}
                onPress={() => {
                  setReleaseType(option.type);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.releaseOption,
                  {
                    backgroundColor: releaseType === option.type ? theme.primary + "15" : "transparent",
                    borderColor: releaseType === option.type ? theme.primary : theme.textSecondary + "30",
                  },
                ]}
              >
                <View style={styles.releaseOptionLeft}>
                  <Feather name={option.icon} size={18} color={releaseType === option.type ? theme.primary : theme.textSecondary} />
                  <View>
                    <ThemedText style={[styles.releaseOptionLabel, releaseType === option.type ? { color: theme.primary } : null]}>
                      {option.label}
                    </ThemedText>
                    <ThemedText style={[styles.releaseOptionDesc, { color: theme.textSecondary }]}>
                      {option.description}
                    </ThemedText>
                  </View>
                </View>
                <View style={[
                  styles.releaseRadio,
                  { borderColor: releaseType === option.type ? theme.primary : theme.textSecondary + "50" },
                ]}>
                  {releaseType === option.type ? (
                    <View style={[styles.releaseRadioInner, { backgroundColor: theme.primary }]} />
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.infoRow}>
            <Feather name="info" size={18} color={theme.textSecondary} />
            <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
              {isMasterTemplate
                ? "This will update the version in metadata.json. Push to GitHub to publish."
                : "Your Practa will be validated and uploaded. Sign in on Stellarin to claim your submission."}
            </ThemedText>
          </View>
        </Card>

        {submitState === "success" && isMasterTemplate && bumpResult ? (
          <Card style={{ ...styles.card, borderColor: theme.success, borderWidth: 1 }}>
            <View style={styles.successHeader}>
              <Feather name="check-circle" size={24} color={theme.success} />
              <ThemedText style={[styles.successTitle, { color: theme.success }]}>
                Version Updated
              </ThemedText>
            </View>

            <View style={styles.submissionDetails}>
              <ThemedText style={styles.detailLabel}>Previous</ThemedText>
              <ThemedText style={[styles.detailValue, { color: theme.textSecondary }]}>
                {bumpResult.previousVersion}
              </ThemedText>
            </View>

            <View style={styles.submissionDetails}>
              <ThemedText style={styles.detailLabel}>New</ThemedText>
              <ThemedText style={[styles.detailValue, { fontWeight: "600" }]}>
                {bumpResult.newVersion}
              </ThemedText>
            </View>

            <ThemedText style={[styles.bumpHint, { color: theme.textSecondary }]}>
              Push to GitHub when ready to publish the new version.
            </ThemedText>
          </Card>
        ) : null}

        {submitState === "success" && !isMasterTemplate && submitResult ? (
          <Card style={{ ...styles.card, borderColor: theme.success, borderWidth: 1 }}>
            <View style={styles.successHeader}>
              <Feather name="check-circle" size={24} color={theme.success} />
              <ThemedText style={[styles.successTitle, { color: theme.success }]}>
                Upload Complete
              </ThemedText>
            </View>
            
            <ThemedText style={[styles.successText, { color: theme.textSecondary }]}>
              Your Practa has been validated and uploaded. Sign in on Stellarin to claim your submission.
            </ThemedText>

            <View style={styles.submissionDetails}>
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

            <View style={styles.submissionDetails}>
              <ThemedText style={styles.detailLabel}>Claim Token Expires</ThemedText>
              <ThemedText style={[styles.detailValue, { color: theme.textSecondary }]}>
                {formatExpiryTime(submitResult.expiresAt)}
              </ThemedText>
            </View>

            {submitResult.validationChecks.length > 0 ? (
              <View style={styles.checksContainer}>
                <ThemedText style={[styles.checksTitle, { color: theme.textSecondary }]}>
                  Validation Checks
                </ThemedText>
                {submitResult.validationChecks.slice(0, 5).map((check, index) => (
                  <View key={index} style={styles.checkRow}>
                    <Feather
                      name={check.passed ? "check" : "x"}
                      size={14}
                      color={check.passed ? theme.success : theme.error}
                    />
                    <ThemedText style={[styles.checkText, { color: theme.textSecondary }]}>
                      {check.name}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              style={[styles.claimButton, { backgroundColor: theme.primary }]}
              onPress={handleClaimSubmission}
            >
              <Feather name="external-link" size={18} color="#FFFFFF" />
              <ThemedText style={styles.claimButtonText}>Sign in to Claim</ThemedText>
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
          </Card>
        ) : null}

        {submitState !== "success" ? (
          <Pressable
            style={[
              styles.submitButton,
              { 
                backgroundColor: canSubmit ? theme.primary : theme.textSecondary,
                opacity: submitState === "submitting" ? 0.7 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitState === "submitting" ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name={isMasterTemplate ? "tag" : "upload-cloud"} size={20} color="#FFFFFF" />
            )}
            <ThemedText style={styles.submitButtonText}>
              {submitState === "submitting"
                ? (isMasterTemplate ? "Updating..." : "Validating...")
                : (isMasterTemplate ? "Update Version" : "Submit to Stellarin")}
            </ThemedText>
          </Pressable>
        ) : null}

        {hasErrors ? (
          <ThemedText style={[styles.warningText, { color: theme.error }]}>
            Fix all validation errors before submitting
          </ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  card: {
    padding: Spacing.lg,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  cardDescription: {
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
  submissionDetails: {
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
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  claimButtonText: {
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
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
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
  },
  bumpHint: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.md,
  },
  releaseTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  releaseSubtitle: {
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  releaseOptions: {
    gap: Spacing.sm,
  },
  releaseOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  releaseOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  releaseOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  releaseOptionDesc: {
    fontSize: 12,
  },
  releaseRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  releaseRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  errorList: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  errorItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  copyForAIButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  copyForAIText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
