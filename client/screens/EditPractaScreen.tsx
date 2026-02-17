import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { GlassBackground } from "@/components/GlassBackground";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { PractaFileMetadata } from "@/types/flow";

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
  error?: string;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.fieldContainer}>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            backgroundColor: theme.backgroundSecondary,
            color: theme.text,
            borderColor: error ? "#EF4444" : theme.border,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        keyboardType={keyboardType}
      />
      {error ? (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      ) : null}
    </View>
  );
}

export default function EditPractaScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const queryClient = useQueryClient();

  // Fields in same order as metadata.json: id, name, version, description, author, estimatedDuration, category, tags
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { data: metadata, isLoading } = useQuery<PractaFileMetadata>({
    queryKey: ["/api/practa/metadata"],
  });

  useEffect(() => {
    if (metadata) {
      setId(metadata.id || "");
      setName(metadata.name || "");
      setVersion(metadata.version || "");
      setDescription(metadata.description || "");
      setAuthor(metadata.author || "");
      setEstimatedDuration(
        metadata.estimatedDuration ? String(metadata.estimatedDuration) : ""
      );
      setCategory(metadata.category || "");
      setTags(metadata.tags?.join(", ") || "");
      setHasUnsavedChanges(false);
    }
  }, [metadata]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<PractaFileMetadata>) => {
      const res = await apiRequest("PUT", "/api/practa/metadata", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save");
      }
      return res.json() as Promise<PractaFileMetadata>;
    },
    onSuccess: (savedData) => {
      queryClient.setQueryData(["/api/practa/metadata"], savedData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHasUnsavedChanges(false);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Save Failed", error.message || "Failed to save");
    },
  });

  const handleIdChange = (text: string) => {
    const sanitized = text.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setId(sanitized);
    setErrors(prev => ({ ...prev, id: "" }));
    setHasUnsavedChanges(true);
  };

  const handleFieldChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setHasUnsavedChanges(true);
  };

  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {};
    const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

    if (!id.trim()) {
      newErrors.id = "Practa ID is required";
    } else if (id.length < 3 || id.length > 50) {
      newErrors.id = "Must be 3-50 characters";
    } else if (!idPattern.test(id)) {
      newErrors.id = "Use lowercase letters, numbers, hyphens only";
    }

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!version.trim()) {
      newErrors.version = "Version is required";
    } else if (!/^\d+\.\d+\.\d+$/.test(version)) {
      newErrors.version = "Use format: 1.0.0";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!author.trim()) {
      newErrors.author = "Author is required";
    }

    if (estimatedDuration && isNaN(Number(estimatedDuration))) {
      newErrors.estimatedDuration = "Must be a number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateFields()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const tagsArray = tags.trim()
      ? tags.split(",").map(t => t.trim()).filter(Boolean)
      : undefined;

    const data: Partial<PractaFileMetadata> = {
      id: id.trim(),
      name: name.trim(),
      version: version.trim(),
      description: description.trim(),
      author: author.trim(),
      estimatedDuration: estimatedDuration ? Number(estimatedDuration) : undefined,
      category: category.trim() || undefined,
      tags: tagsArray,
    };

    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <GlassBackground style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>Edit Practa</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Update your Practa metadata
          </ThemedText>
        </View>

        <GlassCard style={styles.card}>
          <FormField
            label="Practa ID"
            value={id}
            onChangeText={handleIdChange}
            placeholder="my-practa-id"
            error={errors.id}
          />

          <FormField
            label="Display Name"
            value={name}
            onChangeText={handleFieldChange(setName)}
            placeholder="My Practa"
            error={errors.name}
          />

          <FormField
            label="Version"
            value={version}
            onChangeText={handleFieldChange(setVersion)}
            placeholder="1.0.0"
            error={errors.version}
          />

          <FormField
            label="Description"
            value={description}
            onChangeText={handleFieldChange(setDescription)}
            placeholder="What does your Practa do?"
            multiline
            error={errors.description}
          />

          <FormField
            label="Author"
            value={author}
            onChangeText={handleFieldChange(setAuthor)}
            placeholder="Your Name"
            error={errors.author}
          />

          <FormField
            label="Estimated Duration (seconds)"
            value={estimatedDuration}
            onChangeText={handleFieldChange(setEstimatedDuration)}
            placeholder="15"
            keyboardType="numeric"
            error={errors.estimatedDuration}
          />

          <FormField
            label="Category (optional)"
            value={category}
            onChangeText={handleFieldChange(setCategory)}
            placeholder="wellness"
          />

          <FormField
            label="Tags (optional, comma-separated)"
            value={tags}
            onChangeText={handleFieldChange(setTags)}
            placeholder="meditation, calm, breathing"
          />
        </GlassCard>

        <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
          Changes are saved to metadata.json in your Practa folder.
        </ThemedText>

        <Pressable
          onPress={handleSave}
          disabled={saveMutation.isPending || !hasUnsavedChanges}
          style={[
            styles.saveButton,
            { backgroundColor: theme.primary },
            (saveMutation.isPending || !hasUnsavedChanges) && styles.buttonDisabled,
          ]}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Feather name="save" size={18} color="white" />
              <ThemedText style={styles.saveButtonText}>
                {hasUnsavedChanges ? "Save Changes" : "Saved"}
              </ThemedText>
            </>
          )}
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
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
    marginBottom: Spacing.md,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
