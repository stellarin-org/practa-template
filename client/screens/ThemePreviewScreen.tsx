import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface PaletteOption {
  id: string;
  name: string;
  description: string;
  dark: {
    primary: string;
    amber: string;
    amberMuted: string;
    tabIconSelected: string;
    link: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
  };
  light: {
    primary: string;
    amber: string;
    amberMuted: string;
    tabIconSelected: string;
    link: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
  };
}

const PALETTE_OPTIONS: PaletteOption[] = [
  {
    id: "current",
    name: "Current (Orange)",
    description: "The existing warm orange accent",
    dark: {
      primary: "#FF9933",
      amber: "#FF9933",
      amberMuted: "#3D3526",
      tabIconSelected: "#FF9933",
      link: "#FF9933",
      backgroundSecondary: "#2E2E2E",
      backgroundTertiary: "#383838",
    },
    light: {
      primary: "#FC7D0F",
      amber: "#FC7D0F",
      amberMuted: "#FFF4E6",
      tabIconSelected: "#FC7D0F",
      link: "#FC7D0F",
      backgroundSecondary: "#FFF8F3",
      backgroundTertiary: "#FFF0E6",
    },
  },
  {
    id: "warm-gold",
    name: "Warm Gold",
    description: "Sophisticated candlelight warmth",
    dark: {
      primary: "#E8B84B",
      amber: "#E8B84B",
      amberMuted: "#3A3425",
      tabIconSelected: "#E8B84B",
      link: "#E8B84B",
      backgroundSecondary: "#2E2E2E",
      backgroundTertiary: "#383838",
    },
    light: {
      primary: "#D4A033",
      amber: "#D4A033",
      amberMuted: "#FFF8E8",
      tabIconSelected: "#D4A033",
      link: "#D4A033",
      backgroundSecondary: "#FFFCF5",
      backgroundTertiary: "#FFF7E6",
    },
  },
  {
    id: "soft-peach",
    name: "Soft Peach",
    description: "Gentle apricot glow, calming warmth",
    dark: {
      primary: "#F0A878",
      amber: "#F0A878",
      amberMuted: "#3D3028",
      tabIconSelected: "#F0A878",
      link: "#F0A878",
      backgroundSecondary: "#2E2E2E",
      backgroundTertiary: "#383838",
    },
    light: {
      primary: "#E08B5A",
      amber: "#E08B5A",
      amberMuted: "#FFF3EB",
      tabIconSelected: "#E08B5A",
      link: "#E08B5A",
      backgroundSecondary: "#FFF9F5",
      backgroundTertiary: "#FFF0E8",
    },
  },
  {
    id: "terracotta",
    name: "Muted Terracotta",
    description: "Earthy, grounded, wellness-forward",
    dark: {
      primary: "#D4886B",
      amber: "#D4886B",
      amberMuted: "#3A2E28",
      tabIconSelected: "#D4886B",
      link: "#D4886B",
      backgroundSecondary: "#2E2E2E",
      backgroundTertiary: "#383838",
    },
    light: {
      primary: "#C07050",
      amber: "#C07050",
      amberMuted: "#FFF0EA",
      tabIconSelected: "#C07050",
      link: "#C07050",
      backgroundSecondary: "#FFF8F5",
      backgroundTertiary: "#FFEDE6",
    },
  },
  {
    id: "dusty-gold",
    name: "Dusty Gold",
    description: "Calm premium feel, pairs with blue",
    dark: {
      primary: "#D4A76A",
      amber: "#D4A76A",
      amberMuted: "#3A3425",
      tabIconSelected: "#D4A76A",
      link: "#D4A76A",
      backgroundSecondary: "#2E2E2E",
      backgroundTertiary: "#383838",
    },
    light: {
      primary: "#BF8F50",
      amber: "#BF8F50",
      amberMuted: "#FFF7EC",
      tabIconSelected: "#BF8F50",
      link: "#BF8F50",
      backgroundSecondary: "#FFFBF5",
      backgroundTertiary: "#FFF5E6",
    },
  },
  {
    id: "sage-green",
    name: "Sage Green",
    description: "Fresh nature-inspired wellness tone",
    dark: {
      primary: "#8FB596",
      amber: "#8FB596",
      amberMuted: "#283028",
      tabIconSelected: "#8FB596",
      link: "#8FB596",
      backgroundSecondary: "#2E2E2E",
      backgroundTertiary: "#383838",
    },
    light: {
      primary: "#6B9E75",
      amber: "#6B9E75",
      amberMuted: "#EFF7F0",
      tabIconSelected: "#6B9E75",
      link: "#6B9E75",
      backgroundSecondary: "#F6FBF7",
      backgroundTertiary: "#EAF5EC",
    },
  },
  {
    id: "soft-lilac",
    name: "Soft Lilac",
    description: "Serene mindfulness, gentle contrast",
    dark: {
      primary: "#B89DD4",
      amber: "#B89DD4",
      amberMuted: "#332D3A",
      tabIconSelected: "#B89DD4",
      link: "#B89DD4",
      backgroundSecondary: "#2E2E2E",
      backgroundTertiary: "#383838",
    },
    light: {
      primary: "#9B7DC0",
      amber: "#9B7DC0",
      amberMuted: "#F5F0FA",
      tabIconSelected: "#9B7DC0",
      link: "#9B7DC0",
      backgroundSecondary: "#FAF7FD",
      backgroundTertiary: "#F0E8F7",
    },
  },
];

function MiniPreview({ palette, mode }: { palette: PaletteOption; mode: "light" | "dark" }) {
  const colors = mode === "dark" ? palette.dark : palette.light;
  const base = mode === "dark" ? Colors.dark : Colors.light;
  const bg = mode === "dark" ? base.backgroundDefault : base.backgroundDefault;
  const text = mode === "dark" ? base.text : base.text;
  const textSec = mode === "dark" ? base.textSecondary : base.textSecondary;

  return (
    <View style={[styles.miniPreview, { backgroundColor: bg }]}>
      <View style={styles.miniHeader}>
        <View style={[styles.miniDot, { backgroundColor: colors.primary }]} />
        <View style={[styles.miniTitleBar, { backgroundColor: text, opacity: 0.8 }]} />
      </View>
      <View style={[styles.miniCard, { backgroundColor: colors.amberMuted }]}>
        <View style={[styles.miniLine, { backgroundColor: colors.primary, width: "60%" }]} />
        <View style={[styles.miniLine, { backgroundColor: textSec, width: "80%", opacity: 0.4 }]} />
      </View>
      <View style={[styles.miniButton, { backgroundColor: colors.primary }]}>
        <View style={[styles.miniButtonText, { backgroundColor: "#FFFFFF" }]} />
      </View>
      <View style={styles.miniTabBar}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.miniTabDot,
              { backgroundColor: i === 0 ? colors.primary : textSec, opacity: i === 0 ? 1 : 0.3 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default function ThemePreviewScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedId(id === selectedId ? null : id);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.screenTitle}>Theme Preview</ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing["3xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.sectionDesc, { color: theme.textSecondary }]}>
          Preview how each color palette looks in both light and dark mode. Tap one you like to select it.
        </ThemedText>

        {PALETTE_OPTIONS.map((palette) => {
          const isSelected = selectedId === palette.id;
          return (
            <Pressable
              key={palette.id}
              onPress={() => handleSelect(palette.id)}
              style={[
                styles.paletteCard,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: isSelected ? palette.dark.primary : theme.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <View style={styles.paletteHeader}>
                <View style={styles.paletteTitleRow}>
                  <View style={[styles.colorDot, { backgroundColor: isDark ? palette.dark.primary : palette.light.primary }]} />
                  <ThemedText style={styles.paletteName}>{palette.name}</ThemedText>
                </View>
                {isSelected ? (
                  <Feather name="check-circle" size={20} color={isDark ? palette.dark.primary : palette.light.primary} />
                ) : null}
              </View>
              <ThemedText style={[styles.paletteDesc, { color: theme.textSecondary }]}>
                {palette.description}
              </ThemedText>

              <View style={styles.previewRow}>
                <View style={styles.previewCol}>
                  <ThemedText style={[styles.modeLabel, { color: theme.textSecondary }]}>Light</ThemedText>
                  <MiniPreview palette={palette} mode="light" />
                </View>
                <View style={styles.previewCol}>
                  <ThemedText style={[styles.modeLabel, { color: theme.textSecondary }]}>Dark</ThemedText>
                  <MiniPreview palette={palette} mode="dark" />
                </View>
              </View>

              <View style={styles.swatchRow}>
                <View style={styles.swatchItem}>
                  <View style={[styles.swatch, { backgroundColor: palette.light.primary }]} />
                  <ThemedText style={[styles.swatchLabel, { color: theme.textSecondary }]}>Light</ThemedText>
                </View>
                <View style={styles.swatchItem}>
                  <View style={[styles.swatch, { backgroundColor: palette.dark.primary }]} />
                  <ThemedText style={[styles.swatchLabel, { color: theme.textSecondary }]}>Dark</ThemedText>
                </View>
                <View style={styles.swatchItem}>
                  <View style={[styles.swatch, { backgroundColor: palette.light.amberMuted }]} />
                  <ThemedText style={[styles.swatchLabel, { color: theme.textSecondary }]}>Muted L</ThemedText>
                </View>
                <View style={styles.swatchItem}>
                  <View style={[styles.swatch, { backgroundColor: palette.dark.amberMuted }]} />
                  <ThemedText style={[styles.swatchLabel, { color: theme.textSecondary }]}>Muted D</ThemedText>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  sectionDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  paletteCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  paletteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  paletteTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  paletteName: {
    fontSize: 17,
    fontWeight: "600",
  },
  paletteDesc: {
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  previewRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  previewCol: {
    flex: 1,
    alignItems: "center",
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  miniPreview: {
    width: "100%",
    aspectRatio: 0.55,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  miniHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  miniTitleBar: {
    height: 6,
    borderRadius: 3,
    width: "40%",
  },
  miniCard: {
    borderRadius: 6,
    padding: 8,
    gap: 4,
  },
  miniLine: {
    height: 4,
    borderRadius: 2,
  },
  miniButton: {
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  miniButtonText: {
    height: 4,
    width: "30%",
    borderRadius: 2,
  },
  miniTabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 4,
  },
  miniTabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  swatchRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  swatchItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  swatch: {
    width: "100%",
    height: 24,
    borderRadius: 6,
  },
  swatchLabel: {
    fontSize: 10,
  },
});
