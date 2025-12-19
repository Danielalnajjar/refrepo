/**
 * Configuration loading and resolution
 *
 * Note: Manifest-specific functions are in manifest.ts
 */

import * as path from 'path';
import {
  DEFAULT_ROOT,
  DEFAULT_STORE,
  ENV_VARS,
} from './constants.js';

export interface ConfigOptions {
  root?: string;
  manifestPath?: string;
}

/**
 * Resolve the root path for reference repos
 */
export function resolveRoot(override?: string): string {
  // Priority: CLI flag > env var > default
  if (override) return path.resolve(override);
  if (process.env[ENV_VARS.root]) return path.resolve(process.env[ENV_VARS.root]!);
  return DEFAULT_ROOT;
}

/**
 * Get the default mgrep store name
 */
export function resolveStore(override?: string): string {
  if (override) return override;
  if (process.env[ENV_VARS.store]) return process.env[ENV_VARS.store]!;
  return DEFAULT_STORE;
}
