import { z } from "zod";
import React from "react";

export const JournalConfigSchema = z.object({
  prompt: z.string().max(100).optional(),
  aiEnabled: z.boolean().optional(),
});

export const IntegrationBreathConfigSchema = z.object({
  cycles: z.number().int().min(1).max(10).default(3),
});

export const PractaPickerConfigSchema = z.object({
  title: z.string().optional(),
  eligiblePracta: z.array(z.string()).min(1, "Select at least one activity"),
  autoPickRandom: z.boolean().optional(),
  aiEnabled: z.boolean().optional(),
});

export type JournalConfig = z.infer<typeof JournalConfigSchema>;
export type IntegrationBreathConfig = z.infer<typeof IntegrationBreathConfigSchema>;
export type PractaPickerConfig = z.infer<typeof PractaPickerConfigSchema>;

export interface PractaConfigMeta<T = unknown> {
  schema: z.ZodType<T>;
  defaultConfig: T;
  isRequired: boolean;
  Editor: React.ComponentType<ConfigEditorProps<T>>;
}

export interface ConfigEditorProps<T = unknown> {
  config: T;
  onChange: (config: T) => void;
}

const CONFIG_REGISTRY: Record<string, PractaConfigMeta<unknown>> = {};

export function registerPractaConfig<T>(
  practaType: string,
  meta: PractaConfigMeta<T>
): void {
  CONFIG_REGISTRY[practaType] = meta as PractaConfigMeta<unknown>;
}

export function getPractaConfigMeta(practaType: string): PractaConfigMeta<unknown> | undefined {
  return CONFIG_REGISTRY[practaType];
}

export function practaHasConfig(practaType: string): boolean {
  return practaType in CONFIG_REGISTRY;
}

export function practaHasMeaningfulConfig(practaType: string): boolean {
  const meta = CONFIG_REGISTRY[practaType];
  if (!meta) return false;

  const defaultKeys = Object.keys(meta.defaultConfig as Record<string, unknown>);
  const nonAIKeys = defaultKeys.filter((k) => k !== "aiEnabled");
  return nonAIKeys.length > 0;
}

export function practaConfigIsRequired(practaType: string): boolean {
  const meta = CONFIG_REGISTRY[practaType];
  return meta?.isRequired ?? false;
}

export function getDefaultConfig(practaType: string): Record<string, unknown> {
  const meta = CONFIG_REGISTRY[practaType];
  return (meta?.defaultConfig ?? {}) as Record<string, unknown>;
}

export function validateConfig(practaType: string, config: unknown): { success: true; data: unknown } | { success: false; error: string } {
  const meta = CONFIG_REGISTRY[practaType];
  if (!meta) {
    return { success: true, data: config };
  }
  
  const result = meta.schema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const firstError = result.error.errors[0];
  return { success: false, error: firstError?.message || "Invalid configuration" };
}

export function canSaveConfig(practaType: string, config: unknown): boolean {
  const meta = CONFIG_REGISTRY[practaType];
  if (!meta) return true;
  
  if (!meta.isRequired) return true;
  
  return meta.schema.safeParse(config).success;
}

export function getConfigEditor(practaType: string): React.ComponentType<ConfigEditorProps<unknown>> | undefined {
  const meta = CONFIG_REGISTRY[practaType];
  return meta?.Editor;
}

export function getRegisteredConfigTypes(): string[] {
  return Object.keys(CONFIG_REGISTRY);
}

export function isPractaAIEnabled(config?: Record<string, unknown>): boolean {
  if (!config) return true;
  if (config.aiEnabled === undefined) return true;
  return config.aiEnabled === true;
}
