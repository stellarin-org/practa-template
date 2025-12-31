import { PractaAssets } from "@/types/flow";

export interface CommunityPracta {
  slug: string;
  name: string;
  description: string;
  author: string;
  version: string;
  component: React.ComponentType<unknown>;
}

export function getCommunityPractaBySlug(slug: string): CommunityPracta | undefined {
  return undefined;
}

export async function resolveAssetsForPractaAsync(
  practaSlug: string,
  metadata?: { assets?: Record<string, string> }
): Promise<{ assets: PractaAssets } | undefined> {
  return undefined;
}

export function canLaunchPracta(practaSlug: string): { canLaunch: boolean; reason?: string } {
  return { canLaunch: true };
}
