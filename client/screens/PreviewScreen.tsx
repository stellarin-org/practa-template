import React, { useMemo, useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useHaptics } from "@/hooks/useHaptics";
import * as Clipboard from "expo-clipboard";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import { Image } from "expo-image";
import { ThemedText } from "@/components/ThemedText";
import { GlassBackground } from "@/components/GlassBackground";
import { GlassCard } from "@/components/GlassCard";
import { AnimatedSection } from "@/components/AnimatedSection";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import MyPracta from "@/my-practa";
import practaMetadataJson from "@/my-practa/metadata.json";
import { resolveAssets } from "@/lib/practa-assets";
import { ValidationResult } from "@/lib/practa-validator";
import { usePractaValidation } from "@/hooks/usePractaValidation";
import { apiRequest } from "@/lib/query-client";
import { PractaFileMetadata } from "@/types/flow";
import { SyncStatus } from "@/types/api";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function ValidationItem({ result }: { result: ValidationResult }) {
  const { theme } = useTheme();
  
  const iconName = result.severity === "error" 
    ? "x-circle" 
    : result.severity === "warning" 
      ? "alert-circle" 
      : "check-circle";
      
  const iconColor = result.severity === "error"
    ? theme.error
    : result.severity === "warning"
      ? theme.warning
      : theme.success;

  return (
    <View style={styles.validationItem}>
      <Feather name={iconName} size={16} color={iconColor} />
      <ThemedText 
        style={[
          styles.validationText, 
          { color: result.severity === "error" ? theme.error : theme.textSecondary }
        ]}
      >
        {result.message}
      </ThemedText>
    </View>
  );
}

export default function PreviewScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const haptics = useHaptics();
  const [showValidation, setShowValidation] = useState(false);
  const [enableSyncCheck, setEnableSyncCheck] = useState(false);
  const [copiedValidation, setCopiedValidation] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setEnableSyncCheck(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const { data: savedMetadata } = useQuery<PractaFileMetadata>({
    queryKey: ["/api/practa/metadata"],
  });

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/template/sync-status"],
    staleTime: 1000 * 60 * 5,
    enabled: enableSyncCheck,
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/template/update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/template/sync-status"] });
      haptics.success();
    },
    onError: () => {
      haptics.error();
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/practa/metadata"] });
    }, [queryClient])
  );

  const metadata = savedMetadata || practaMetadataJson;

  const validationReport = usePractaValidation();

  const handlePreview = () => {
    haptics.medium();
    navigation.navigate("HarnessPreview", { practaId: "my-practa" });
  };

  const toggleValidation = () => {
    haptics.light();
    setShowValidation(!showValidation);
  };

  const handleEditMetadata = () => {
    haptics.light();
    navigation.navigate("MetadataEditor");
  };

  const handleSubmit = () => {
    haptics.medium();
    navigation.navigate("Submit");
  };

  const handleCopyValidationForAI = async () => {
    const errors = validationReport.errors.map(e => `- ${e.message}`).join("\n");
    const warnings = validationReport.warnings.map(w => `- ${w.message}`).join("\n");
    let message = `Fix the following validation issues in my Practa (client/my-practa/):\n\n`;
    if (errors) message += `Errors:\n${errors}\n\n`;
    if (warnings) message += `Warnings:\n${warnings}\n`;
    await Clipboard.setStringAsync(message.trim());
    haptics.success();
    setCopiedValidation(true);
    setTimeout(() => setCopiedValidation(false), 2000);
  };

  return (
    <GlassBackground style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>Practa Starter</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Build and test your Practa
          </ThemedText>
        </View>

        {syncStatus && !syncStatus.isInSync ? (
          <View style={[
            styles.syncBanner, 
            syncStatus.isMasterTemplate && styles.syncBannerMaster
          ]}>
            <View style={styles.syncBannerContent}>
              <Feather 
                name={syncStatus.isMasterTemplate ? "git-commit" : "alert-triangle"} 
                size={20} 
                color={syncStatus.isMasterTemplate ? "#3B82F6" : theme.warning} 
              />
              <View style={styles.syncBannerText}>
                <ThemedText style={styles.syncBannerTitle}>
                  {syncStatus.isMasterTemplate 
                    ? "Unpublished Changes" 
                    : "Template Out of Sync"}
                </ThemedText>
                <ThemedText style={[
                  styles.syncBannerMessage,
                  syncStatus.isMasterTemplate && styles.syncBannerMessageMaster
                ]}>
                  {syncStatus.isMasterTemplate
                    ? "Push your changes to GitHub to publish the template."
                    : "The underlying Stellarin Practa Template has changed."}
                </ThemedText>
              </View>
            </View>
            {!syncStatus.isMasterTemplate ? (
              <Pressable
                onPress={() => {
                  haptics.medium();
                  updateTemplateMutation.mutate();
                }}
                disabled={updateTemplateMutation.isPending}
                style={[
                  styles.syncButton,
                  updateTemplateMutation.isPending && styles.syncButtonDisabled,
                ]}
              >
                {updateTemplateMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ThemedText style={styles.syncButtonText}>
                    Update to Latest
                  </ThemedText>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <AnimatedSection index={0}>
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            {resolveAssets("my-practa").icon ? (
              <Image
                source={resolveAssets("my-practa").icon}
                style={styles.iconImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="layers" size={24} color={theme.primary} />
              </View>
            )}
            <View style={styles.cardInfo}>
              <ThemedText style={styles.cardTitle}>{metadata.name}</ThemedText>
              <ThemedText style={[styles.cardDescription, { color: theme.textSecondary }]}>
                {metadata.description}
              </ThemedText>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <ThemedText style={[styles.metaLabel, { color: theme.textSecondary }]}>
                Author
              </ThemedText>
              <ThemedText style={styles.metaValue}>{metadata.author}</ThemedText>
            </View>
            <View style={styles.metaItem}>
              <ThemedText style={[styles.metaLabel, { color: theme.textSecondary }]}>
                Version
              </ThemedText>
              <ThemedText style={styles.metaValue}>{metadata.version}</ThemedText>
            </View>
            <View style={styles.metaItem}>
              <ThemedText style={[styles.metaLabel, { color: theme.textSecondary }]}>
                Duration
              </ThemedText>
              <ThemedText style={styles.metaValue}>
                {metadata.estimatedDuration ? `${metadata.estimatedDuration}s` : "—"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleEditMetadata}
              style={[styles.editButton, { borderColor: theme.primary }]}
            >
              <Feather name="edit-2" size={18} color={theme.primary} />
              <ThemedText style={[styles.editButtonText, { color: theme.primary }]}>
                Edit Info
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handlePreview}
              style={[styles.previewButton, { backgroundColor: theme.primary }]}
            >
              <Feather name="play" size={20} color="white" />
              <ThemedText style={styles.previewButtonText}>Preview</ThemedText>
            </Pressable>
          </View>
        </GlassCard>
        </AnimatedSection>

        <AnimatedSection index={1}>
        <GlassCard style={styles.validationCard}>
          <Pressable onPress={toggleValidation} style={styles.validationHeader}>
            <View style={styles.validationHeaderLeft}>
              <Feather 
                name={validationReport.isValid ? "check-circle" : "alert-circle"} 
                size={20} 
                color={validationReport.isValid ? theme.success : theme.error} 
              />
              <ThemedText style={styles.validationTitle}>
                Validation {validationReport.isValid ? "Passed" : "Failed"}
              </ThemedText>
            </View>
            <View style={styles.validationStats}>
              {validationReport.errors.length > 0 ? (
                <View style={[styles.statBadge, { backgroundColor: "#FEE2E2" }]}>
                  <ThemedText style={[styles.statText, { color: theme.error }]}>
                    {validationReport.errors.length} errors
                  </ThemedText>
                </View>
              ) : null}
              {validationReport.warnings.length > 0 ? (
                <View style={[styles.statBadge, { backgroundColor: "#FEF3C7" }]}>
                  <ThemedText style={[styles.statText, { color: theme.warning }]}>
                    {validationReport.warnings.length} warnings
                  </ThemedText>
                </View>
              ) : null}
              <Feather 
                name={showValidation ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={theme.textSecondary} 
              />
            </View>
          </Pressable>
          
          {showValidation ? (
            <View style={styles.validationList}>
              {validationReport.errors.map((result, i) => (
                <ValidationItem key={`error-${i}`} result={result} />
              ))}
              {validationReport.warnings.map((result, i) => (
                <ValidationItem key={`warning-${i}`} result={result} />
              ))}
              {validationReport.successes.map((result, i) => (
                <ValidationItem key={`success-${i}`} result={result} />
              ))}
              {validationReport.errors.length > 0 || validationReport.warnings.length > 0 ? (
                <Pressable
                  onPress={handleCopyValidationForAI}
                  style={[styles.copyForAIButton, { backgroundColor: theme.primary + "15", borderColor: theme.primary + "30" }]}
                >
                  <Feather name={copiedValidation ? "check" : "copy"} size={14} color={theme.primary} />
                  <ThemedText style={[styles.copyForAIText, { color: theme.primary }]}>
                    {copiedValidation ? "Copied" : "Copy for AI"}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </GlassCard>
        </AnimatedSection>

        <AnimatedSection index={2}>
        <View style={styles.instructions}>
          <ThemedText style={styles.instructionsTitle}>How to develop</ThemedText>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.stepNumberText}>1</ThemedText>
            </View>
            <ThemedText style={[styles.stepText, { color: theme.textSecondary }]}>
              Edit my-practa/index.tsx to build your Practa
            </ThemedText>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.stepNumberText}>2</ThemedText>
            </View>
            <ThemedText style={[styles.stepText, { color: theme.textSecondary }]}>
              Check validation results above for requirements
            </ThemedText>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.stepNumberText}>3</ThemedText>
            </View>
            <ThemedText style={[styles.stepText, { color: theme.textSecondary }]}>
              Preview your changes using the button above
            </ThemedText>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.stepNumberText}>4</ThemedText>
            </View>
            <ThemedText style={[styles.stepText, { color: theme.textSecondary }]}>
              Update the metadata export with your details
            </ThemedText>
          </View>
        </View>
        </AnimatedSection>

        <AnimatedSection index={3}>
        <Pressable
          onPress={handleSubmit}
          style={[styles.submitButton, { backgroundColor: theme.primary }]}
        >
          <Feather name="upload" size={20} color="white" />
          <ThemedText style={styles.submitButtonText}>Submit for Review</ThemedText>
        </Pressable>
        </AnimatedSection>
      </ScrollView>
    </GlassBackground>
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconImage: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    fontSize: 14,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  previewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  previewButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  validationCard: {
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  validationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  validationHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  validationTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  validationStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statText: {
    fontSize: 12,
    fontWeight: "500",
  },
  validationList: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  validationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  validationText: {
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
  instructions: {
    marginTop: Spacing.md,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  stepNumberText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  syncBanner: {
    backgroundColor: "#FEF3C7",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  syncBannerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  syncBannerText: {
    flex: 1,
  },
  syncBannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 2,
  },
  syncBannerMessage: {
    fontSize: 13,
    color: "#92400E",
  },
  syncButton: {
    backgroundColor: "#D97706",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  syncBannerMaster: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  syncBannerMessageMaster: {
    color: "#1E40AF",
  },
});
