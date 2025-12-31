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

export interface PreviousPractaContext {
  practaId: string;
  practaType: PractaType;
  content?: PractaContent;
  metadata?: PractaMetadata;
}

export type PractaAssets = Record<string, unknown>;

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
