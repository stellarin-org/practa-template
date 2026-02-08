import { z } from "zod";

export const practaFileMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  author: z.string(),
  version: z.string(),
  estimatedDuration: z.number().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assets: z.record(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  requiresAI: z.boolean().optional(),
  configSchema: z.object({
    fields: z.record(z.unknown()),
    requiredConfig: z.boolean().optional(),
  }).optional(),
}).passthrough();

export type PractaFileMetadata = z.infer<typeof practaFileMetadataSchema>;
