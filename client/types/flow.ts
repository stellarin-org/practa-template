export type PractaType = string;

export interface PractaAssets {
  [key: string]: string; // Maps asset name to filename in assets/ folder
}

export interface PractaContent {
  type: "text" | "image";
  value: string;
}

export interface PractaMetadata {
  source?: "user" | "ai" | "system";
  themes?: string[];
  duration?: number;
  emotionTags?: string[];
  assets?: PractaAssets;
  [key: string]: unknown;
}

export interface PreviousPractaContext {
  practaId: string;
  practaType: PractaType;
  content?: PractaContent;
  metadata?: PractaMetadata;
}

/**
 * Storage interface for persisting practa state across sessions.
 * See docs/practa-storage-system.md for full documentation.
 */
export interface PractaStorage {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Asset types supported by the asset system:
 * - Images (.png, .jpg, .jpeg, .gif): number (require) or { uri: string } (CDN)
 * - JSON (.json): Any valid JSON value (object, array, string, number, boolean, null)
 */
export type ImageAsset = number | { uri: string };
export type JsonAsset = unknown;
export type AssetValue = ImageAsset | JsonAsset;

/**
 * Resolved assets available to the Practa at runtime.
 * In dev: resolved from require() statements
 * In production: CDN URLs provided by Stellarin
 * 
 * Usage:
 * - Images: <Image source={context.assets.splash} />
 * - JSON: context.assets.wordlist (already parsed, use directly)
 */
export interface ResolvedAssets {
  splash?: ImageAsset;
  [key: string]: AssetValue | undefined;
}

/**
 * Context passed to every practa component.
 * Includes flow information and optional storage for persistence.
 */
export interface PractaContext {
  flowId: string;
  practaIndex: number;
  previous?: PreviousPractaContext;
  /** 
   * Optional storage for persisting state across sessions.
   * See docs/practa-storage-system.md for usage examples.
   */
  storage?: PractaStorage;
  /**
   * Resolved assets declared in metadata.json.
   * Use this to access splash screens, images, etc.
   */
  assets?: ResolvedAssets;
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
