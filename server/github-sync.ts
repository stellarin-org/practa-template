import * as fs from "fs";
import * as path from "path";

const GITHUB_HEADERS = {
  "Accept": "application/vnd.github+json",
  "Cache-Control": "no-cache, no-store, must-revalidate",
};

const TEMPLATE_REPO = "stellarin-org/practa-template";
const PRACTA_REPO = "stellarin-org/stellarin-practa";

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

export async function fetchRepoInfo(repo: string): Promise<{ defaultBranch: string; available: boolean } | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, { headers: GITHUB_HEADERS });
    if (!response.ok) return { defaultBranch: "main", available: false };
    const data = await response.json();
    return { defaultBranch: data.default_branch || "main", available: true };
  } catch {
    return { defaultBranch: "main", available: false };
  }
}

export async function fetchLatestSha(repo: string, branch: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/branches/${branch}`, { headers: GITHUB_HEADERS });
    if (!response.ok) return null;
    const data = await response.json();
    return data.commit.sha;
  } catch {
    return null;
  }
}

export async function fetchFileContent(repo: string, filePath: string, branch?: string): Promise<string | null> {
  try {
    const ref = branch ? `?ref=${branch}` : "";
    const response = await fetch(
      `https://api.github.com/repos/${repo}/contents/${filePath}${ref}`,
      { headers: { ...GITHUB_HEADERS, "Accept": "application/vnd.github.raw+json" } }
    );
    if (!response.ok) {
      if (response.status === 403) {
        console.warn(`[GitHub] Rate limited fetching ${repo}/${filePath} (${response.status})`);
      } else if (response.status !== 404) {
        console.warn(`[GitHub] Failed to fetch ${repo}/${filePath} (${response.status})`);
      }
      return null;
    }
    return await response.text();
  } catch (err) {
    console.warn(`[GitHub] Network error fetching ${repo}/${filePath}:`, err);
    return null;
  }
}

export async function fetchJsonFile<T = unknown>(repo: string, filePath: string, branch?: string): Promise<T | null> {
  const content = await fetchFileContent(repo, filePath, branch);
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function downloadRepoZip(repo: string, branch: string): Promise<Buffer | null> {
  try {
    const archiveUrl = `https://api.github.com/repos/${repo}/zipball/${branch}`;
    const response = await fetch(archiveUrl, { headers: GITHUB_HEADERS });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export interface RegistryEntry {
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
}

export interface PractaRegistry {
  registryVersion: string;
  practas: RegistryEntry[];
}

export async function fetchPractaRegistry(): Promise<PractaRegistry | null> {
  return fetchJsonFile<PractaRegistry>(PRACTA_REPO, "_registry.json");
}

export function findInRegistry(registry: PractaRegistry, slug: string): RegistryEntry | null {
  return registry.practas.find(p => p.slug === slug) || null;
}

export async function fetchRepoPractaMetadata(slug: string): Promise<Record<string, unknown> | null> {
  return fetchJsonFile<Record<string, unknown>>(PRACTA_REPO, `practas/${slug}/metadata.json`);
}

export async function listPractaFiles(slug: string, branch?: string): Promise<Array<{ name: string; path: string; type: string; download_url: string | null }> | null> {
  try {
    const ref = branch ? `?ref=${branch}` : "";
    const response = await fetch(
      `https://api.github.com/repos/${PRACTA_REPO}/contents/practas/${slug}${ref}`,
      { headers: GITHUB_HEADERS }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function readLocalMetadata(): Record<string, unknown> | null {
  const metadataPath = path.resolve(process.cwd(), "client/my-practa/metadata.json");
  try {
    if (fs.existsSync(metadataPath)) {
      return JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    }
  } catch {}
  return null;
}

export { TEMPLATE_REPO, PRACTA_REPO, GITHUB_HEADERS };
