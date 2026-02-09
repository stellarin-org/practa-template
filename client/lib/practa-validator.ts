/**
 * Practa Validator
 * 
 * Validates that a Practa component meets all requirements for submission.
 * Run-time validation that can be displayed in the PreviewScreen.
 * 
 * Field definitions live in shared/metadata-schema.ts (single source of truth).
 * This file converts schema results into the ValidationResult format used by
 * the UI, and adds component / source-code checks that are client-only.
 * 
 * Note: Asset validation (file sizes, formats) is done server-side via
 * the /api/practa/validate-assets endpoint since client-side code cannot
 * access the file system.
 * 
 * Asset Rules (enforced by server):
 * - Per-file limit: 5MB maximum per asset
 * - Total package limit: 25MB maximum for entire Practa
 * - Supported formats: Images (png, jpg, jpeg, gif, webp, svg), 
 *   Audio (mp3, wav, m4a, ogg), Video (mp4, webm), Data (json, txt)
 */

import { validateMetadataFields } from "@shared/metadata-schema";

export interface ValidationResult {
  passed: boolean;
  message: string;
  severity: "error" | "warning" | "success";
}

export interface ValidationReport {
  isValid: boolean;
  results: ValidationResult[];
  errors: ValidationResult[];
  warnings: ValidationResult[];
  successes: ValidationResult[];
}

/**
 * Validates metadata object against the shared schema
 */
export function validateMetadata(metadata: unknown): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (!metadata || typeof metadata !== "object") {
    results.push({
      passed: false,
      message: "metadata.json is missing or not valid JSON",
      severity: "error",
    });
    return results;
  }

  const meta = metadata as Record<string, unknown>;
  const schemaResult = validateMetadataFields(meta);

  for (const err of schemaResult.errors) {
    results.push({ passed: false, message: err.message, severity: "error" });
  }

  for (const warn of schemaResult.warnings) {
    results.push({ passed: true, message: warn.message, severity: "warning" });
  }

  for (const suc of schemaResult.successes) {
    results.push({ passed: true, message: `${suc.label} is valid`, severity: "success" });
  }

  return results;
}

/**
 * Validates that the component is a valid function
 */
export function validateComponent(component: unknown): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (!component) {
    results.push({
      passed: false,
      message: "Default export (component) is missing",
      severity: "error",
    });
    return results;
  }

  if (typeof component !== "function") {
    results.push({
      passed: false,
      message: "Default export must be a function component",
      severity: "error",
    });
    return results;
  }

  results.push({
    passed: true,
    message: "Component is a valid function",
    severity: "success",
  });

  const fn = component as Function;
  if (fn.length === 0) {
    results.push({
      passed: true,
      message: "Component may not accept props (0 parameters). Ensure it accepts { context, onComplete }",
      severity: "warning",
    });
  } else {
    results.push({
      passed: true,
      message: `Component accepts ${fn.length} parameter(s)`,
      severity: "success",
    });
  }

  return results;
}

/**
 * Validates Practa source code for best practices
 * Note: This is a static analysis based on the source string
 */
export function validateSourceCode(source: string): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (!source.includes("onComplete")) {
    results.push({
      passed: false,
      message: "Component must call onComplete when finished",
      severity: "error",
    });
  } else {
    results.push({
      passed: true,
      message: "Component calls onComplete",
      severity: "success",
    });
  }

  if (!source.includes("context")) {
    results.push({
      passed: true,
      message: "Component doesn't use context (may be intentional)",
      severity: "warning",
    });
  } else {
    results.push({
      passed: true,
      message: "Component accepts context prop",
      severity: "success",
    });
  }

  if (!source.includes("useTheme")) {
    results.push({
      passed: true,
      message: "Consider using useTheme() for theme-aware colors",
      severity: "warning",
    });
  } else {
    results.push({
      passed: true,
      message: "Uses theme system",
      severity: "success",
    });
  }

  if (!source.includes("Haptics")) {
    results.push({
      passed: true,
      message: "Consider adding haptic feedback for better UX",
      severity: "warning",
    });
  } else {
    results.push({
      passed: true,
      message: "Uses haptic feedback",
      severity: "success",
    });
  }


  if (!source.includes("useSafeAreaInsets") && !source.includes("SafeAreaView")) {
    results.push({
      passed: true,
      message: "Consider using safe area insets for proper layout",
      severity: "warning",
    });
  } else {
    results.push({
      passed: true,
      message: "Uses safe area handling",
      severity: "success",
    });
  }

  const requirePattern = /require\s*\(\s*["']\.\/assets\//;
  if (requirePattern.test(source)) {
    results.push({
      passed: false,
      message: "Do not use require() directly. Declare assets in metadata.json and use context.assets instead",
      severity: "error",
    });
  } else if (source.includes("context.assets")) {
    results.push({
      passed: true,
      message: "Uses context.assets pattern correctly",
      severity: "success",
    });
  }

  return results;
}

/**
 * Run full validation and return a report
 */
export function validatePracta(
  component: unknown,
  metadata: unknown,
  source?: string
): ValidationReport {
  const allResults: ValidationResult[] = [
    ...validateComponent(component),
    ...validateMetadata(metadata),
    ...(source ? validateSourceCode(source) : []),
  ];

  const errors = allResults.filter((r) => r.severity === "error" && !r.passed);
  const warnings = allResults.filter((r) => r.severity === "warning");
  const successes = allResults.filter((r) => r.severity === "success" && r.passed);

  return {
    isValid: errors.length === 0,
    results: allResults,
    errors,
    warnings,
    successes,
  };
}

/**
 * Quick check if Practa is valid (no errors)
 */
export function isPractaValid(component: unknown, metadata: unknown): boolean {
  const report = validatePracta(component, metadata);
  return report.isValid;
}
