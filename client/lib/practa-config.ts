export interface JournalConfig {
  promptStyle?: "guided" | "free" | "structured";
  maxEntryLength?: number;
}

export interface PractaPickerConfig {
  allowMultiple?: boolean;
  categories?: string[];
}

const PRACTA_TYPES_REQUIRING_CONFIG: string[] = ["journal", "practa-picker"];

export function practaHasConfig(type: string): boolean {
  return PRACTA_TYPES_REQUIRING_CONFIG.includes(type);
}

export function practaConfigIsRequired(type: string): boolean {
  return PRACTA_TYPES_REQUIRING_CONFIG.includes(type);
}
