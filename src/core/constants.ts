/**
 * Default values and constants for Reference Repo Manager
 */

import * as path from 'path';
import * as os from 'os';

// Default paths
export const DEFAULT_ROOT = path.join(os.homedir(), 'code', 'Reference Repos');
export const DEFAULT_MANIFEST_NAME = 'refrepo.manifest.yaml';
export const DEFAULT_STORE = 'wok-ops-platform';
export const DEFAULT_REPORTS_DIR = 'reports';
export const DEFAULT_REPORT_NAME = 'refrepo-report.html';

// Git defaults
export const DEFAULT_BRANCH = 'main';
export const DEFAULT_CONCURRENCY = 4;
export const DEFAULT_CLONE_DEPTH = 1;

// mgrep defaults
export const DEFAULT_MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1MB
export const DEFAULT_INDEX_TIMEOUT_SECONDS = 300; // 5 minutes

// Plan thresholds
export const PLAN_THRESHOLDS = {
  maxTotalBytesWarning: 15 * 1024 * 1024,    // 15MB - GREEN below this
  maxTotalBytesError: 50 * 1024 * 1024,      // 50MB - RED above this
  maxFileCountWarning: 2_500,                 // GREEN below this
  maxFileCountError: 10_000,                  // RED above this
} as const;

// File extensions to keep by default
export const DEFAULT_KEEP_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.json', '.yaml', '.yml',
  '.md', '.mdx',
  '.css', '.scss',
  '.html',
] as const;

// Root workspace files to always include with sparse checkout
export const SPARSE_CHECKOUT_ROOT_FILES = [
  'package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'turbo.json',
  'tsconfig.json',
  'tsconfig.*.json',
] as const;

// Environment variable names
export const ENV_VARS = {
  root: 'REFREPO_ROOT',
  store: 'REFREPO_STORE',
  mgrepApiKey: 'MIXEDBREAD_API_KEY',
} as const;
