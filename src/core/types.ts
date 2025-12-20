/**
 * Core types for Reference Repo Manager
 */

export type RepoCategory = 'glue' | 'source' | 'example';
export type IgnoreMode = 'denylist' | 'allowlist';
export type IgnoreStrategy = 'perRepo' | 'global';
export type WarningLevel = 'green' | 'yellow' | 'red';
export type RepoStatus = 'present' | 'missing' | 'disabled';

export interface SparseCheckoutConfig {
  enabled: boolean;
  include: string[];
}

export interface MgrepConfig {
  store?: string;
  maxFileSizeBytes?: number;
}

export interface IgnoreConfig {
  mode: IgnoreMode;
  keepPaths: string[];
  dropPaths: string[];
  keepExtensions?: string[];
  dropExtensions?: string[];
}

export interface RepoConfig {
  id: string;
  name: string;
  url: string;
  branch: string;
  category: RepoCategory;
  localDir: string;
  enabled: boolean;
  sparseCheckout?: SparseCheckoutConfig;
  mgrep?: MgrepConfig;
  ignore?: IgnoreConfig;
  mgrepIgnoreStrategy?: IgnoreStrategy;
}

export interface Manifest {
  version: number;
  defaultRoot: string;
  defaultStore: string;
  repos: RepoConfig[];
  /** User-added ignore patterns (from refrepo suggest --apply) */
  customIgnores?: string[];
}

export interface RepoStatusInfo {
  id: string;
  name: string;
  status: RepoStatus;
  localPath: string;
  branch?: string;
  commit?: string;
  commitDate?: string;
  dirty?: boolean;
  remote?: string;
}

export interface PlanResult {
  repoId: string;
  includedFileCount: number;
  includedTotalBytes: number;
  topLargestFiles: Array<{ path: string; bytes: number }>;
  extensionHistogram: Array<{ ext: string; count: number }>;
  warningLevel: WarningLevel;
  warnings: string[];
}

export interface DoctorResult {
  git: { found: boolean; version?: string; path?: string };
  mgrep: { found: boolean; version?: string; path?: string };
  apiKey: { found: boolean; masked?: string };
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
