export interface SyncStatus {
  isInSync: boolean;
  localVersion: string | null;
  latestVersion: string;
  localTemplateVersion?: string;
  latestTemplateVersion?: string;
  hasNewerVersion?: boolean;
  repoUrl: string;
  isMasterTemplate?: boolean;
}

export interface PractaSyncStatus {
  hasLocalPracta: boolean;
  slug: string | null;
  localVersion: string;
  isPublished: boolean;
  publishedVersion: string | null;
  publishedEntry: {
    slug: string;
    version: string;
    buildId: string;
    name: string;
    description: string;
    author: string;
    category: string;
    practaType: string;
    type: string;
    requiresAI: boolean;
    estimatedDuration: number;
    assets?: Record<string, string>;
    dependencies?: string[];
  } | null;
  hasNewerPublished: boolean;
  localIsAhead: boolean;
  publishedAt: string | null;
  repoVersion: string | null;
  hasNewerInRepo: boolean;
  repoAvailable: boolean;
  repoUrl: string;
  error?: string;
}

export interface HarnessImportStatus {
  available: boolean;
  reason?: string;
  isMasterTemplate?: boolean;
  mainAppRepo?: string;
  mainAppBranch?: string;
  repoAccessible?: boolean;
  syncItems?: Array<{ from: string; to: string; description: string }>;
  lastSync?: string | null;
}

export interface ValidationCheck {
  name: string;
  category: string;
  passed: boolean;
  message: string;
}

export interface UploadPreviewResult {
  token: string;
  practaName: string;
  practaType: string;
  version: string;
  validationScore: number;
  validationChecks: ValidationCheck[];
  valid: boolean;
  expiresAt: string;
  requiresAuth: boolean;
}
