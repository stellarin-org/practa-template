import type { PractaStorage } from "@/lib/practa-storage";

export type { PractaStorage };

export type PractaType = "journal" | "silent-meditation" | "personalized-meditation" | "tend" | "integration-breath";

export interface PractaContent {
  type: "text" | "image";
  value: string;
}

export interface PractaMetadata {
  source?: "user" | "ai" | "system";
  themes?: string[];
  duration?: number;
  emotionTags?: string[];
  [key: string]: unknown;
}

interface ConfigFieldBase {
  type: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface StringField extends ConfigFieldBase {
  type: "string";
  placeholder?: string;
  default?: string;
  minLength?: number;
  maxLength?: number;
}

export interface NumberField extends ConfigFieldBase {
  type: "number";
  default?: number;
  min?: number;
  max?: number;
}

export interface BooleanField extends ConfigFieldBase {
  type: "boolean";
  default?: boolean;
}

export interface SelectField extends ConfigFieldBase {
  type: "select";
  options: { value: string; label: string }[];
}

export type ConfigField = StringField | NumberField | BooleanField | SelectField;

export interface ConfigSchema {
  fields: Record<string, ConfigField>;
  requiredConfig?: boolean;
}

export interface PractaFileMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  estimatedDuration?: number;
  category?: string;
  tags?: string[];
  assets?: Record<string, string>;
  dependencies?: string[];
  requiresAI?: boolean;
  configSchema?: ConfigSchema;
  [key: string]: unknown;
}

export interface PreviousPractaContext {
  practaId: string;
  practaType: PractaType;
  content?: PractaContent;
  metadata?: PractaMetadata;
}

export type PractaAssets = Record<string, unknown>;
export type ResolvedAssets = Record<string, number | { uri: string }>;

export interface PractaContext {
  flowId: string;
  practaIndex: number;
  previous?: PreviousPractaContext;
  storage?: PractaStorage;
  assets?: PractaAssets;
}

export interface PractaOutput {
  content?: PractaContent;
  metadata?: PractaMetadata;
}

export interface PractaDefinition {
  id: string;
  type: PractaType;
  name: string;
  description?: string;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description?: string;
  practas: PractaDefinition[];
}

export interface FlowExecutionState {
  flowId: string;
  flowDefinition: FlowDefinition;
  currentIndex: number;
  practaOutputs: PractaOutput[];
  status: "idle" | "running" | "paused" | "completed" | "aborted";
  startedAt?: string;
  completedAt?: string;
}

export type PractaCompleteHandler = (output: PractaOutput) => void;
export type FlowCompleteHandler = (state: FlowExecutionState) => void;

export interface PractaProps {
  context: PractaContext;
  onComplete: PractaCompleteHandler;
  onSkip?: () => void;
  showSettings?: boolean;
  onSettings?: () => void;
}
