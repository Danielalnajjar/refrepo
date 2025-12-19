/**
 * Zod schemas for manifest validation
 */

import { z } from 'zod';
import {
  DEFAULT_ROOT,
  DEFAULT_STORE,
  DEFAULT_BRANCH,
  DEFAULT_MAX_FILE_SIZE_BYTES,
} from './constants.js';

export const RepoCategorySchema = z.enum(['glue', 'source', 'example']);

export const IgnoreModeSchema = z.enum(['denylist', 'allowlist']);

export const IgnoreStrategySchema = z.enum(['perRepo', 'global']);

export const SparseCheckoutConfigSchema = z.object({
  enabled: z.boolean().default(false),
  include: z.array(z.string()).default([]),
});

export const MgrepConfigSchema = z.object({
  store: z.string().optional(),
  maxFileSizeBytes: z.number().positive().optional(),
});

export const IgnoreConfigSchema = z.object({
  mode: IgnoreModeSchema.default('denylist'),
  keepPaths: z.array(z.string()).default([]),
  dropPaths: z.array(z.string()).default([]),
  keepExtensions: z.array(z.string()).optional(),
  dropExtensions: z.array(z.string()).optional(),
});

export const RepoConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  branch: z.string().default(DEFAULT_BRANCH),
  category: RepoCategorySchema,
  localDir: z.string().min(1),
  enabled: z.boolean().default(true),
  sparseCheckout: SparseCheckoutConfigSchema.optional(),
  mgrep: MgrepConfigSchema.optional(),
  ignore: IgnoreConfigSchema.optional(),
  mgrepIgnoreStrategy: IgnoreStrategySchema.optional(),
});

export const ManifestSchema = z.object({
  version: z.number().int().positive(),
  defaultRoot: z.string().default(DEFAULT_ROOT),
  defaultStore: z.string().default(DEFAULT_STORE),
  repos: z.array(RepoConfigSchema),
});

// Type exports derived from schemas
export type RepoConfigInput = z.input<typeof RepoConfigSchema>;
export type ManifestInput = z.input<typeof ManifestSchema>;

/**
 * Validate manifest data against schema
 */
export function validateManifest(data: unknown): z.infer<typeof ManifestSchema> {
  return ManifestSchema.parse(data);
}

/**
 * Safely validate manifest, returning result object
 */
export function safeValidateManifest(data: unknown): {
  success: boolean;
  data?: z.infer<typeof ManifestSchema>;
  error?: z.ZodError;
} {
  const result = ManifestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
