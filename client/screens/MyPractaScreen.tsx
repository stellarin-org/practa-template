import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform, TextInput, Switch, Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import { reloadAppAsync } from "expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useHaptics } from "@/hooks/useHaptics";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from "react-native-reanimated";

import { Image } from "expo-image";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassBackground } from "@/components/GlassBackground";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import MyPracta from "@/my-practa";
import practaMetadataJson from "@/my-practa/metadata.json";
import { apiRequest } from "@/lib/query-client";
import { hasSplash, getSplashSource, resolveAssets } from "@/lib/practa-assets";
import { PractaFileMetadata, ConfigField, ConfigSchema, StringField, NumberField, BooleanField, SelectField } from "@/types/flow";
import { SyncStatus, PractaSyncStatus } from "@/types/api";
import { AnimatedSection } from "@/components/AnimatedSection";
import PractaWidget, { shouldDisplay as widgetShouldDisplay } from "@/my-practa/widget";

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

export default function MyPractaScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [enableSyncCheck, setEnableSyncCheck] = useState(false);
  const transitionOpacity = useSharedValue(0);
  const haptics = useHaptics();
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [widgetData, setWidgetData] = useState<Record<string, unknown>>({});
  const [widgetForceShow, setWidgetForceShow] = useState(false);
  const [widgetDataLoaded, setWidgetDataLoaded] = useState(false);

  const widgetMeta = (practaMetadataJson as Record<string, unknown>).widget as
    | { enabled: boolean; displayName: string; description?: string }
    | undefined;
  const hasWidget = widgetMeta?.enabled === true;

  useEffect(() => {
    const timer = setTimeout(() => setEnableSyncCheck(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      transitionOpacity.value = 0;
    }, [transitionOpacity])
  );

  useFocusEffect(
    useCallback(() => {
      if (!hasWidget) return;
      const loadWidgetData = async () => {
        try {
          const prefix = `practa:dev-user:${practaMetadataJson.id}:`;
          const allKeys = await AsyncStorage.getAllKeys();
          const practaKeys = allKeys.filter(
            (k) => k.startsWith(prefix) && !k.endsWith("__quota__")
          );
          const pairs = await AsyncStorage.multiGet(practaKeys);
          const data: Record<string, unknown> = {};
          for (const [fullKey, value] of pairs) {
            const shortKey = fullKey.replace(prefix, "");
            if (value !== null) {
              try {
                data[shortKey] = JSON.parse(value);
              } catch {
                data[shortKey] = value;
              }
            }
          }
          setWidgetData(data);
          setWidgetDataLoaded(true);
        } catch {
          setWidgetData({});
          setWidgetDataLoaded(true);
        }
      };
      loadWidgetData();
    }, [hasWidget])
  );

  const { data: savedMetadata } = useQuery<PractaFileMetadata>({
    queryKey: ["/api/practa/metadata"],
  });

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/template/sync-status"],
    staleTime: 1000 * 60 * 5,
    enabled: enableSyncCheck,
  });

  const { data: practaSyncStatus, isLoading: practaSyncLoading } = useQuery<PractaSyncStatus>({
    queryKey: ["/api/practa/sync-status"],
    staleTime: 1000 * 60 * 5,
    enabled: enableSyncCheck,
  });

  const [copiedUpdateInstructions, setCopiedUpdateInstructions] = useState(false);

  const copyUpdateInstructions = useCallback(async () => {
    const versionInfo = syncStatus?.hasNewerVersion 
      ? ` (${syncStatus?.localTemplateVersion || "?"} → ${syncStatus?.latestTemplateVersion || "?"})` 
      : "";
    const message = `My Practa template has updates available${versionInfo}. Please update it by following the instructions in .agents/skills/update-practa-template/SKILL.md — then run the post-update review from .agents/skills/post-template-update/SKILL.md using the SHA values returned by the update.`;
    await Clipboard.setStringAsync(message);
    setCopiedUpdateInstructions(true);
    haptics.success();
    setTimeout(() => setCopiedUpdateInstructions(false), 3000);
  }, [syncStatus]);

  const syncPractaMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/practa/sync");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practa/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/practa/metadata"] });
      haptics.success();
    },
    onError: () => {
      haptics.error();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/template/publish");
      return response.json();
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries();
      if (Platform.OS === "web") {
        window.location.reload();
      } else {
        reloadAppAsync();
      }
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
  const typedMetadata = practaMetadataJson as unknown as PractaFileMetadata;

  useEffect(() => {
    if (typedMetadata.configSchema?.fields) {
      const defaults: Record<string, unknown> = {};
      Object.entries(typedMetadata.configSchema.fields).forEach(([key, field]) => {
        if (field.type === "string") {
          defaults[key] = (field as StringField).default ?? "";
        } else if (field.type === "number") {
          defaults[key] = (field as NumberField).default ?? 0;
        } else if (field.type === "boolean") {
          defaults[key] = (field as BooleanField).default ?? false;
        } else if (field.type === "select") {
          const selectField = field as SelectField;
          defaults[key] = (selectField as unknown as { default?: string }).default ?? selectField.options[0]?.value ?? "";
        }
      });
      setConfigValues(defaults);
    }
  }, []);

  const navigateToHarness = useCallback(() => {
    navigation.navigate("HarnessPreview", { practaId: "my-practa" });
  }, [navigation]);

  const handlePreview = () => {
    haptics.medium();
    
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

  return (
    <GlassBackground style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <ThemedText style={styles.title}>Practa Starter</ThemedText>
            <View style={styles.headerActions}>
              
            </View>
          </View>
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
                name={syncStatus.isMasterTemplate ? "git-commit" : "download-cloud"} 
                size={20} 
                color={syncStatus.isMasterTemplate ? "#3B82F6" : theme.warning} 
              />
              <View style={styles.syncBannerText}>
                <ThemedText style={styles.syncBannerTitle}>
                  {syncStatus.isMasterTemplate 
                    ? "Unpublished Changes" 
                    : syncStatus.hasNewerVersion
                      ? `Template Update: ${syncStatus.localTemplateVersion || "?"} → ${syncStatus.latestTemplateVersion || "?"}`
                      : "Template Changes Available"}
                </ThemedText>
                <ThemedText style={[
                  styles.syncBannerMessage,
                  syncStatus.isMasterTemplate && styles.syncBannerMessageMaster
                ]}>
                  {syncStatus.isMasterTemplate
                    ? "Push your changes to GitHub to publish the template."
                    : "Your template is out of date. Copy the instructions below and paste them to your AI agent to run the update."}
                </ThemedText>
              </View>
            </View>
            {syncStatus.isMasterTemplate ? null : (
              <Pressable
                onPress={copyUpdateInstructions}
                style={[
                  styles.syncButton,
                  copiedUpdateInstructions && styles.syncButtonCopied,
                ]}
              >
                <Feather 
                  name={copiedUpdateInstructions ? "check" : "copy"} 
                  size={14} 
                  color="white" 
                  style={{ marginRight: 6 }}
                />
                <ThemedText style={styles.syncButtonText}>
                  {copiedUpdateInstructions ? "Copied" : "Copy Instructions for AI"}
                </ThemedText>
              </Pressable>
            )}
          </View>
        ) : null}

        {practaSyncStatus?.hasNewerInRepo ? (
          <View style={[styles.syncBanner, styles.practaSyncBanner]}>
            <View style={styles.syncBannerContent}>
              <Feather name="git-pull-request" size={20} color="#7C3AED" />
              <View style={styles.syncBannerText}>
                <ThemedText style={[styles.syncBannerTitle, { color: "#5B21B6" }]}>
                  Newer Version in Repo: {practaSyncStatus.localVersion} → {practaSyncStatus.repoVersion}
                </ThemedText>
                <ThemedText style={[styles.syncBannerMessage, { color: "#5B21B6" }]}>
                  A collaborator has pushed a newer version. Pull to update your local files.
                </ThemedText>
              </View>
            </View>
            <Pressable
              onPress={() => {
                haptics.medium();
                syncPractaMutation.mutate();
              }}
              disabled={syncPractaMutation.isPending}
              style={[
                styles.syncButton,
                styles.practaSyncButton,
                syncPractaMutation.isPending && styles.syncButtonDisabled,
              ]}
            >
              {syncPractaMutation.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <ThemedText style={styles.syncButtonText}>
                  Pull Latest
                </ThemedText>
              )}
            </Pressable>
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

          <Pressable
            onPress={handlePreview}
            style={[styles.previewButton, { backgroundColor: theme.primary }]}
          >
            <Feather name="play" size={20} color="white" />
            <ThemedText style={styles.previewButtonText}>Preview Practa</ThemedText>
          </Pressable>

          {practaSyncLoading ? (
            <View style={styles.publishedInfoRow}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
              <ThemedText style={[styles.publishedInfoText, { color: theme.textSecondary }]}>
                Checking published status...
              </ThemedText>
            </View>
          ) : practaSyncStatus?.isPublished ? (
            <View style={styles.publishedInfoContainer}>
              {practaSyncStatus.publishedAt ? (
                <View style={styles.publishedInfoRow}>
                  <Feather name="globe" size={16} color={theme.textSecondary} />
                  <ThemedText style={[styles.publishedInfoLabel, { color: theme.textSecondary }]}>
                    Last Published:
                  </ThemedText>
                  <ThemedText style={styles.publishedInfoValue}>
                    {formatRelativeTime(practaSyncStatus.publishedAt)}
                  </ThemedText>
                </View>
              ) : null}
              <View style={styles.publishedInfoRow}>
                <Feather name="tag" size={16} color={theme.textSecondary} />
                <ThemedText style={[styles.publishedInfoLabel, { color: theme.textSecondary }]}>
                  Published Version:
                </ThemedText>
                <ThemedText style={styles.publishedInfoValue}>
                  {practaSyncStatus.publishedVersion}
                </ThemedText>
                {practaSyncStatus.localIsAhead ? (
                  <View style={[styles.versionBadge, { backgroundColor: theme.warning + "20" }]}>
                    <ThemedText style={[styles.versionBadgeText, { color: theme.warning }]}>
                      Local: {practaSyncStatus.localVersion}
                    </ThemedText>
                  </View>
                ) : practaSyncStatus.hasNewerPublished ? (
                  <View style={[styles.versionBadge, { backgroundColor: theme.error + "20" }]}>
                    <ThemedText style={[styles.versionBadgeText, { color: theme.error }]}>
                      Behind
                    </ThemedText>
                  </View>
                ) : (
                  <View style={[styles.versionBadge, { backgroundColor: theme.success + "20" }]}>
                    <ThemedText style={[styles.versionBadgeText, { color: theme.success }]}>
                      Up to date
                    </ThemedText>
                  </View>
                )}
              </View>
              {practaSyncStatus.repoAvailable ? (
                <View style={styles.publishedInfoRow}>
                  <Feather name="git-branch" size={16} color={theme.textSecondary} />
                  <ThemedText style={[styles.publishedInfoLabel, { color: theme.textSecondary }]}>
                    Repo Version:
                  </ThemedText>
                  <ThemedText style={styles.publishedInfoValue}>
                    {practaSyncStatus.repoVersion}
                  </ThemedText>
                  {practaSyncStatus.hasNewerInRepo ? (
                    <View style={[styles.versionBadge, { backgroundColor: "#7C3AED20" }]}>
                      <ThemedText style={[styles.versionBadgeText, { color: "#7C3AED" }]}>
                        Update available
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.publishedInfoRow}>
              <Feather name="globe" size={16} color={theme.textSecondary} />
              <ThemedText style={[styles.publishedInfoText, { color: theme.textSecondary }]}>
                Not yet published to Stellarin
              </ThemedText>
            </View>
          )}
        </GlassCard>
        </AnimatedSection>

        {typedMetadata.configSchema && Object.keys(typedMetadata.configSchema.fields || {}).length > 0 ? (
          <AnimatedSection index={1}>
          <GlassCard style={styles.configCard}>
            <View style={styles.configHeader}>
              <Feather name="sliders" size={20} color={theme.primary} />
              <ThemedText style={styles.configTitle}>Configuration Options</ThemedText>
              {typedMetadata.configSchema?.requiredConfig ? (
                <View style={[styles.statBadge, { backgroundColor: theme.primary + "20" }]}>
                  <ThemedText style={[styles.statText, { color: theme.primary }]}>
                    Required
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText style={[styles.configDescription, { color: theme.textSecondary }]}>
              Users can customize these settings when adding your Practa to a flow.
            </ThemedText>
            <View style={styles.configList}>
              {Object.entries(typedMetadata.configSchema?.fields || {}).map(([key, field]) => (
                <View key={key} style={styles.configItem}>
                  <View style={styles.configItemHeader}>
                    <ThemedText style={styles.configItemLabel}>
                      {(field as ConfigField).label}
                    </ThemedText>
                    {(field as ConfigField).required ? (
                      <ThemedText style={[styles.requiredMark, { color: theme.error }]}>*</ThemedText>
                    ) : null}
                  </View>
                  {(field as ConfigField).description ? (
                    <ThemedText style={[styles.configItemDescription, { color: theme.textSecondary }]}>
                      {(field as ConfigField).description}
                    </ThemedText>
                  ) : null}
                  <View style={styles.configInputContainer}>
                    {(field as ConfigField).type === "string" ? (
                      <TextInput
                        style={[styles.configTextInput, { borderColor: theme.border, color: theme.text }]}
                        value={String(configValues[key] ?? "")}
                        onChangeText={(text) => setConfigValues(prev => ({ ...prev, [key]: text }))}
                        placeholder={(field as StringField).placeholder || ""}
                        placeholderTextColor={theme.textSecondary}
                      />
                    ) : (field as ConfigField).type === "number" ? (
                      <View style={styles.numberInputRow}>
                        <TextInput
                          style={[styles.configTextInput, styles.numberInput, { borderColor: theme.border, color: theme.text }]}
                          value={String(configValues[key] ?? "")}
                          onChangeText={(text) => {
                            const num = parseInt(text, 10);
                            if (!isNaN(num)) {
                              const nf = field as NumberField;
                              const clamped = Math.min(Math.max(num, nf.min ?? -Infinity), nf.max ?? Infinity);
                              setConfigValues(prev => ({ ...prev, [key]: clamped }));
                            } else if (text === "") {
                              setConfigValues(prev => ({ ...prev, [key]: "" }));
                            }
                          }}
                          keyboardType="numeric"
                          placeholder={String((field as NumberField).default ?? "")}
                          placeholderTextColor={theme.textSecondary}
                        />
                        {(field as NumberField).min !== undefined || (field as NumberField).max !== undefined ? (
                          <ThemedText style={[styles.numberRange, { color: theme.textSecondary }]}>
                            {(field as NumberField).min !== undefined && (field as NumberField).max !== undefined
                              ? `(${(field as NumberField).min}-${(field as NumberField).max})`
                              : (field as NumberField).min !== undefined
                                ? `(min: ${(field as NumberField).min})`
                                : `(max: ${(field as NumberField).max})`}
                          </ThemedText>
                        ) : null}
                      </View>
                    ) : (field as ConfigField).type === "boolean" ? (
                      <View style={styles.switchRow}>
                        <Switch
                          value={Boolean(configValues[key])}
                          onValueChange={(value) => setConfigValues(prev => ({ ...prev, [key]: value }))}
                          trackColor={{ false: theme.border, true: theme.primary }}
                          thumbColor="white"
                        />
                        <ThemedText style={[styles.switchLabel, { color: theme.textSecondary }]}>
                          {configValues[key] ? "On" : "Off"}
                        </ThemedText>
                      </View>
                    ) : (field as ConfigField).type === "select" ? (
                      <View style={styles.selectContainer}>
                        {(field as SelectField).options.map((option) => {
                          const isSelected = configValues[key] === option.value;
                          return (
                            <Pressable
                              key={option.value}
                              style={[
                                styles.selectOption,
                                { borderColor: isSelected ? theme.primary : theme.border },
                                isSelected && { backgroundColor: theme.primary + "15" },
                              ]}
                              onPress={() => setConfigValues(prev => ({ ...prev, [key]: option.value }))}
                            >
                              <View style={[styles.selectRadio, { borderColor: isSelected ? theme.primary : theme.border }]}>
                                {isSelected ? <View style={[styles.selectRadioInner, { backgroundColor: theme.primary }]} /> : null}
                              </View>
                              <ThemedText style={[styles.selectLabel, isSelected && { color: theme.primary }]}>
                                {option.label}
                              </ThemedText>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </GlassCard>
          </AnimatedSection>
        ) : null}

        {hasWidget ? (
          <AnimatedSection index={2}>
          <GlassCard style={styles.widgetCard}>
            <View style={styles.widgetHeader}>
              <Feather name="layout" size={20} color={theme.primary} />
              <ThemedText style={styles.widgetTitle}>Widget Preview</ThemedText>
            </View>
            {widgetMeta?.displayName ? (
              <ThemedText style={[styles.widgetDisplayName, { color: theme.textSecondary }]}>
                {widgetMeta.displayName}
                {widgetMeta.description ? ` — ${widgetMeta.description}` : ""}
              </ThemedText>
            ) : null}

            <View style={styles.widgetStatusRow}>
              <View style={[
                styles.widgetStatusBadge,
                { backgroundColor: (widgetShouldDisplay(widgetData) ? theme.success : theme.textSecondary) + "20" },
              ]}>
                <Feather
                  name={widgetShouldDisplay(widgetData) ? "eye" : "eye-off"}
                  size={12}
                  color={widgetShouldDisplay(widgetData) ? theme.success : theme.textSecondary}
                />
                <ThemedText style={[
                  styles.widgetStatusText,
                  { color: widgetShouldDisplay(widgetData) ? theme.success : theme.textSecondary },
                ]}>
                  {widgetShouldDisplay(widgetData) ? "shouldDisplay: visible" : "shouldDisplay: hidden"}
                </ThemedText>
              </View>
              <View style={styles.widgetForceRow}>
                <ThemedText style={[styles.widgetForceLabel, { color: theme.textSecondary }]}>
                  Force show
                </ThemedText>
                <Switch
                  value={widgetForceShow}
                  onValueChange={setWidgetForceShow}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="white"
                />
              </View>
            </View>

            {(widgetShouldDisplay(widgetData) || widgetForceShow) ? (
              <Pressable
                style={[styles.widgetPreviewFrame, { borderColor: theme.border }]}
                onPress={handlePreview}
              >
                <PractaWidget
                  data={widgetData}
                  theme={theme}
                  isDark={isDark}
                  practaName={practaMetadataJson.name}
                />
                <View style={styles.widgetTapHint}>
                  <Feather name="arrow-up-right" size={12} color={theme.textSecondary} />
                  <ThemedText style={[styles.widgetTapHintText, { color: theme.textSecondary }]}>
                    Tap opens Practa
                  </ThemedText>
                </View>
              </Pressable>
            ) : (
              <View style={[styles.widgetHiddenBox, { borderColor: theme.border }]}>
                <Feather name="eye-off" size={24} color={theme.textSecondary} />
                <ThemedText style={[styles.widgetHiddenText, { color: theme.textSecondary }]}>
                  Widget hidden by shouldDisplay logic
                </ThemedText>
                <ThemedText style={[styles.widgetHiddenHint, { color: theme.textSecondary }]}>
                  Toggle "Force show" to preview anyway
                </ThemedText>
              </View>
            )}

            {widgetDataLoaded ? (
              <View style={styles.widgetDataSection}>
                <ThemedText style={[styles.widgetDataLabel, { color: theme.textSecondary }]}>
                  Storage data ({Object.keys(widgetData).length} key{Object.keys(widgetData).length !== 1 ? "s" : ""})
                </ThemedText>
                {Object.keys(widgetData).length > 0 ? (
                  <View style={[styles.widgetDataBox, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
                    {Object.entries(widgetData).map(([key, value]) => (
                      <View key={key} style={styles.widgetDataRow}>
                        <ThemedText style={[styles.widgetDataKey, { color: theme.primary }]}>{key}</ThemedText>
                        <ThemedText style={[styles.widgetDataValue, { color: theme.textSecondary }]} numberOfLines={1}>
                          {JSON.stringify(value)}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ) : (
                  <ThemedText style={[styles.widgetDataEmpty, { color: theme.textSecondary }]}>
                    No stored data yet. Run the Practa to generate data.
                  </ThemedText>
                )}
              </View>
            ) : null}
          </GlassCard>
          </AnimatedSection>
        ) : null}

      </ScrollView>
      <Animated.View style={[styles.transitionOverlay, transitionStyle]} />
    </GlassBackground>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  previewButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  publishedInfoContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
    gap: Spacing.sm,
  },
  publishedInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  publishedInfoLabel: {
    fontSize: 13,
  },
  publishedInfoValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  publishedInfoText: {
    fontSize: 13,
  },
  versionBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
  },
  versionBadgeText: {
    fontSize: 11,
    fontWeight: "500",
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
    flexDirection: "row",
    justifyContent: "center",
  },
  syncButtonCopied: {
    backgroundColor: "#059669",
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  syncInfoContainer: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  syncInfoText: {
    fontSize: 12,
    fontStyle: "italic",
    opacity: 0.8,
  },
  syncBannerMaster: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  syncBannerMessageMaster: {
    color: "#1E40AF",
  },
  practaSyncBanner: {
    backgroundColor: "#F5F3FF",
    borderColor: "#7C3AED",
  },
  practaSyncButton: {
    backgroundColor: "#7C3AED",
  },
  syncButtonPublish: {
    backgroundColor: "#3B82F6",
  },
  configCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  configHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  configDescription: {
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  configList: {
    gap: Spacing.md,
  },
  configItem: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  configItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  configTypeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  configTypeText: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  configItemLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  requiredMark: {
    fontSize: 14,
    fontWeight: "600",
  },
  configItemDescription: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  configItemDetails: {
    marginTop: Spacing.xs,
  },
  configDetailText: {
    fontSize: 12,
  },
  configInputContainer: {
    marginTop: Spacing.sm,
  },
  configTextInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
  },
  numberInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  numberInput: {
    width: 80,
    textAlign: "center",
  },
  numberRange: {
    fontSize: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  switchLabel: {
    fontSize: 14,
  },
  selectContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  selectOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  selectRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  selectRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectLabel: {
    fontSize: 14,
  },
  widgetCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  widgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  widgetDisplayName: {
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  widgetStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  widgetStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  widgetStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  widgetForceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  widgetForceLabel: {
    fontSize: 12,
  },
  widgetPreviewFrame: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  widgetTapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  widgetTapHintText: {
    fontSize: 11,
  },
  widgetHiddenBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  widgetHiddenText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  widgetHiddenHint: {
    fontSize: 12,
    textAlign: "center",
  },
  widgetDataSection: {
    marginTop: Spacing.xs,
  },
  widgetDataLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  widgetDataBox: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: 4,
  },
  widgetDataRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  widgetDataKey: {
    fontSize: 12,
    fontWeight: "600",
  },
  widgetDataValue: {
    fontSize: 12,
    flex: 1,
  },
  widgetDataEmpty: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
