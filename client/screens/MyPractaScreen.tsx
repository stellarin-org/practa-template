import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform } from "react-native";
import { reloadAppAsync } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import MyPracta from "@/my-practa";
import practaMetadataJson from "@/my-practa/metadata.json";
import { validatePracta, ValidationResult } from "@/lib/practa-validator";
import { apiRequest } from "@/lib/query-client";
import { hasSplash, isSplashVideo, getSplashSource, getSplashVideoSource } from "@/lib/practa-assets";

interface PractaMetadata {
  name: string;
  description: string;
  author: string;
  version: string;
  estimatedDuration?: number;
  category?: string;
  tags?: string[];
}

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

interface LastSubmitData {
  timestamp: string | null;
  practaId?: string;
  version?: string;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function formatFullDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function ValidationItem({ result }: { result: ValidationResult }) {
  const { theme } = useTheme();
  
  const iconName = result.severity === "error" 
    ? "x-circle" 
    : result.severity === "warning" 
      ? "alert-circle" 
      : "check-circle";
      
  const iconColor = result.severity === "error"
    ? "#EF4444"
    : result.severity === "warning"
      ? "#F59E0B"
      : "#10B981";

  return (
    <View style={styles.validationItem}>
      <Feather name={iconName} size={16} color={iconColor} />
      <ThemedText 
        style={[
          styles.validationText, 
          { color: result.severity === "error" ? "#EF4444" : theme.textSecondary }
        ]}
      >
        {result.message}
      </ThemedText>
    </View>
  );
}

export default function MyPractaScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [showValidation, setShowValidation] = useState(false);
  const [enableSyncCheck, setEnableSyncCheck] = useState(false);
  const transitionOpacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => setEnableSyncCheck(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      transitionOpacity.value = 0;
    }, [transitionOpacity])
  );

  const { data: savedMetadata } = useQuery<PractaMetadata>({
    queryKey: ["/api/practa/metadata"],
  });

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/template/sync-status"],
    staleTime: 1000 * 60 * 5,
    enabled: enableSyncCheck,
  });

  const { data: lastSubmit } = useQuery<LastSubmitData>({
    queryKey: ["/api/practa/last-submit"],
    staleTime: 1000 * 60,
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/template/update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/template/sync-status"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/template/publish");
      return response.json();
    },
    onSuccess: () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      queryClient.invalidateQueries();
      if (Platform.OS === "web") {
        window.location.reload();
      } else {
        reloadAppAsync();
      }
    },
    onError: () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/practa/metadata"] });
    }, [queryClient])
  );

  const metadata = savedMetadata || practaMetadataJson;

  const validationReport = useMemo(() => {
    return validatePracta(MyPracta, practaMetadataJson);
  }, []);

  const navigateToHarness = useCallback(() => {
    navigation.navigate("HarnessPreview", { practaId: "my-practa" });
  }, [navigation]);

  const handlePreview = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (hasSplash()) {
      transitionOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(navigateToHarness)();
        }
      });
    } else {
      navigateToHarness();
    }
  };

  const transitionStyle = useAnimatedStyle(() => ({
    opacity: transitionOpacity.value,
    pointerEvents: transitionOpacity.value > 0 ? "auto" as const : "none" as const,
  }));

  const toggleValidation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowValidation(!showValidation);
  };

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
          <ThemedText style={styles.title}>Practa Starter</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Build and test your Practa
          </ThemedText>
        </View>

        {syncStatus && !syncStatus.isInSync && (syncStatus.isMasterTemplate || syncStatus.hasNewerVersion) ? (
          <View style={[
            styles.syncBanner, 
            syncStatus.isMasterTemplate && styles.syncBannerMaster
          ]}>
            <View style={styles.syncBannerContent}>
              <Feather 
                name={syncStatus.isMasterTemplate ? "git-commit" : "download-cloud"} 
                size={20} 
                color={syncStatus.isMasterTemplate ? "#3B82F6" : "#D97706"} 
              />
              <View style={styles.syncBannerText}>
                <ThemedText style={styles.syncBannerTitle}>
                  {syncStatus.isMasterTemplate 
                    ? "Unpublished Changes" 
                    : `Update Available: ${syncStatus.localTemplateVersion || "?"} → ${syncStatus.latestTemplateVersion || "?"}`}
                </ThemedText>
                <ThemedText style={[
                  styles.syncBannerMessage,
                  syncStatus.isMasterTemplate && styles.syncBannerMessageMaster
                ]}>
                  {syncStatus.isMasterTemplate
                    ? "Push your changes to GitHub to publish the template."
                    : "A new version of the Practa template is available."}
                </ThemedText>
              </View>
            </View>
            {syncStatus.isMasterTemplate ? (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  publishMutation.mutate();
                }}
                disabled={publishMutation.isPending}
                style={[
                  styles.syncButton,
                  styles.syncButtonPublish,
                  publishMutation.isPending && styles.syncButtonDisabled,
                ]}
              >
                {publishMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ThemedText style={styles.syncButtonText}>
                    Publish to Git
                  </ThemedText>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
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
                    Update Now
                  </ThemedText>
                )}
              </Pressable>
            )}
          </View>
        ) : null}

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="layers" size={24} color={theme.primary} />
            </View>
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

          <Pressable
            onPress={handlePreview}
            style={[styles.previewButton, { backgroundColor: theme.primary }]}
          >
            <Feather name="play" size={20} color="white" />
            <ThemedText style={styles.previewButtonText}>Preview Practa</ThemedText>
          </Pressable>
        </Card>

        <Card style={styles.validationCard}>
          <Pressable onPress={toggleValidation} style={styles.validationHeader}>
            <View style={styles.validationHeaderLeft}>
              <Feather 
                name={validationReport.isValid ? "check-circle" : "alert-circle"} 
                size={20} 
                color={validationReport.isValid ? "#10B981" : "#EF4444"} 
              />
              <ThemedText style={styles.validationTitle}>
                Validation {validationReport.isValid ? "Passed" : "Failed"}
              </ThemedText>
            </View>
            <View style={styles.validationStats}>
              {validationReport.errors.length > 0 ? (
                <View style={[styles.statBadge, { backgroundColor: "#FEE2E2" }]}>
                  <ThemedText style={[styles.statText, { color: "#EF4444" }]}>
                    {validationReport.errors.length} errors
                  </ThemedText>
                </View>
              ) : null}
              {validationReport.warnings.length > 0 ? (
                <View style={[styles.statBadge, { backgroundColor: "#FEF3C7" }]}>
                  <ThemedText style={[styles.statText, { color: "#D97706" }]}>
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
            </View>
          ) : null}
        </Card>

        {lastSubmit?.timestamp ? (
          <Card style={styles.lastSubmitCard}>
            <View style={styles.lastSubmitRow}>
              <Feather name="upload-cloud" size={18} color={theme.textSecondary} />
              <View style={styles.lastSubmitInfo}>
                <ThemedText style={[styles.lastSubmitLabel, { color: theme.textSecondary }]}>
                  Last submitted to Stellarin
                </ThemedText>
                <ThemedText style={styles.lastSubmitTime}>
                  {formatRelativeTime(lastSubmit.timestamp)}
                </ThemedText>
                <ThemedText style={[styles.lastSubmitFullTime, { color: theme.textSecondary }]}>
                  {formatFullDateTime(lastSubmit.timestamp)}
                </ThemedText>
              </View>
            </View>
          </Card>
        ) : null}
      </ScrollView>
      <Animated.View style={[styles.transitionOverlay, transitionStyle]} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "white",
    zIndex: 1000,
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
  previewButton: {
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
  lastSubmitCard: {
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  lastSubmitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  lastSubmitInfo: {
    flex: 1,
  },
  lastSubmitLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  lastSubmitTime: {
    fontSize: 14,
    fontWeight: "500",
  },
  lastSubmitFullTime: {
    fontSize: 12,
    marginTop: 2,
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
  syncButtonPublish: {
    backgroundColor: "#3B82F6",
  },
});
