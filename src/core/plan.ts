/**
 * Index plan computation for mgrep
 * Analyzes what would be indexed based on ignore rules
 */

import * as fs from 'fs';
import * as path from 'path';
import ignore, { type Ignore } from 'ignore';
import { buildIgnoreContent } from './ignore-rules.js';
import { getRepoPath, getEnabledRepos } from './manifest.js';
import { PLAN_THRESHOLDS, DEFAULT_MAX_FILE_SIZE_BYTES } from './constants.js';
import { toPosixPath } from './path.js';
import type { Manifest, PlanResult, WarningLevel } from './types.js';

export interface PlanOptions {
  maxFileSizeBytes?: number;
  repoId?: string;  // Plan single repo
}

export interface FileStat {
  path: string;
  bytes: number;
}

export interface ExtensionCount {
  ext: string;
  count: number;
}

export interface RepoPlanResult extends PlanResult {
  repoName: string;
  localDir: string;
  repoPath: string;
  /** All included file paths (relative to repo root) */
  files?: string[];
}

export interface PlanSummary {
  repos: RepoPlanResult[];
  totals: {
    includedFileCount: number;
    includedTotalBytes: number;
    repoCount: number;
  };
  overallWarningLevel: WarningLevel;
  /** All included file paths (relative to each repo's localDir) for baseline comparison */
  allFiles?: string[];
}

/**
 * Check if a file/directory is hidden (starts with .)
 * Matches mgrep's isHiddenFile() behavior
 */
function isHiddenPath(relativePath: string): boolean {
  const parts = relativePath.split('/');
  return parts.some(
    (part) => part.startsWith('.') && part !== '.' && part !== '..'
  );
}

/**
 * Walk directory recursively, respecting ignore rules
 */
function walkDirectory(
  dir: string,
  ig: Ignore,
  baseDir: string,
  maxFileSize: number,
  files: FileStat[] = []
): FileStat[] {
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    // Convert to POSIX-style paths for consistent ignore matching on Windows
    const relativePath = toPosixPath(path.relative(baseDir, fullPath));

    // Skip hidden files/directories (matches mgrep behavior)
    if (isHiddenPath(relativePath)) {
      continue;
    }

    // Skip if ignored
    if (ig.ignores(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      // Check if directory is ignored (with trailing slash)
      if (ig.ignores(relativePath + '/')) {
        continue;
      }
      walkDirectory(fullPath, ig, baseDir, maxFileSize, files);
    } else if (entry.isFile()) {
      try {
        const stats = fs.statSync(fullPath);
        // Skip files over max size
        if (stats.size <= maxFileSize) {
          files.push({
            path: relativePath,
            bytes: stats.size,
          });
        }
      } catch {
        // Skip files we can't stat
      }
    }
  }

  return files;
}

/**
 * Build extension histogram from file list
 */
function buildExtensionHistogram(files: FileStat[]): ExtensionCount[] {
  const counts = new Map<string, number>();

  for (const file of files) {
    const ext = path.extname(file.path).toLowerCase() || '(no ext)';
    counts.set(ext, (counts.get(ext) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([ext, count]) => ({ ext, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Determine warning level based on thresholds
 */
function getWarningLevel(fileCount: number, totalBytes: number): WarningLevel {
  if (
    totalBytes > PLAN_THRESHOLDS.maxTotalBytesError ||
    fileCount > PLAN_THRESHOLDS.maxFileCountError
  ) {
    return 'red';
  }

  if (
    totalBytes > PLAN_THRESHOLDS.maxTotalBytesWarning ||
    fileCount > PLAN_THRESHOLDS.maxFileCountWarning
  ) {
    return 'yellow';
  }

  return 'green';
}

/**
 * Generate warnings for a plan result
 */
function generateWarnings(fileCount: number, totalBytes: number): string[] {
  const warnings: string[] = [];

  if (totalBytes > PLAN_THRESHOLDS.maxTotalBytesError) {
    warnings.push(
      `Total bytes (${formatBytes(totalBytes)}) exceeds error threshold (${formatBytes(PLAN_THRESHOLDS.maxTotalBytesError)})`
    );
  } else if (totalBytes > PLAN_THRESHOLDS.maxTotalBytesWarning) {
    warnings.push(
      `Total bytes (${formatBytes(totalBytes)}) exceeds warning threshold (${formatBytes(PLAN_THRESHOLDS.maxTotalBytesWarning)})`
    );
  }

  if (fileCount > PLAN_THRESHOLDS.maxFileCountError) {
    warnings.push(
      `File count (${fileCount.toLocaleString()}) exceeds error threshold (${PLAN_THRESHOLDS.maxFileCountError.toLocaleString()})`
    );
  } else if (fileCount > PLAN_THRESHOLDS.maxFileCountWarning) {
    warnings.push(
      `File count (${fileCount.toLocaleString()}) exceeds warning threshold (${PLAN_THRESHOLDS.maxFileCountWarning.toLocaleString()})`
    );
  }

  return warnings;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Compute plan for a single repo
 */
export function computeRepoPlan(
  repoId: string,
  repoName: string,
  localDir: string,
  repoPath: string,
  options: PlanOptions = {}
): RepoPlanResult {
  const maxFileSize = options.maxFileSizeBytes || DEFAULT_MAX_FILE_SIZE_BYTES;

  // Build ignore rules
  const ignoreContent = buildIgnoreContent(repoId);
  const ig = ignore().add(ignoreContent);

  // Walk directory
  const files = walkDirectory(repoPath, ig, repoPath, maxFileSize);

  // Calculate stats
  const includedFileCount = files.length;
  const includedTotalBytes = files.reduce((sum, f) => sum + f.bytes, 0);

  // Top largest files
  const topLargestFiles = [...files]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10);

  // Extension histogram
  const extensionHistogram = buildExtensionHistogram(files);

  // Warning level
  const warningLevel = getWarningLevel(includedFileCount, includedTotalBytes);
  const warnings = generateWarnings(includedFileCount, includedTotalBytes);

  // Extract file paths prefixed with localDir for baseline tracking
  const filePaths = files.map((f) => `${localDir}/${f.path}`);

  return {
    repoId,
    repoName,
    localDir,
    repoPath,
    includedFileCount,
    includedTotalBytes,
    topLargestFiles,
    extensionHistogram,
    warningLevel,
    warnings,
    files: filePaths,
  };
}

/**
 * Compute plan for all repos in manifest
 */
export function computePlan(manifest: Manifest, options: PlanOptions = {}): PlanSummary {
  const root = manifest.defaultRoot;
  let enabledRepos = getEnabledRepos(manifest);

  // Filter to single repo if specified
  if (options.repoId) {
    enabledRepos = enabledRepos.filter((r) => r.id === options.repoId);
    if (enabledRepos.length === 0) {
      throw new Error(`Repo not found: ${options.repoId}`);
    }
  }

  const repos: RepoPlanResult[] = [];

  for (const repo of enabledRepos) {
    const repoPath = getRepoPath(root, repo.localDir);

    if (!fs.existsSync(repoPath)) {
      // Skip missing repos
      repos.push({
        repoId: repo.id,
        repoName: repo.name,
        localDir: repo.localDir,
        repoPath,
        includedFileCount: 0,
        includedTotalBytes: 0,
        topLargestFiles: [],
        extensionHistogram: [],
        warningLevel: 'green',
        warnings: ['Repo not cloned'],
      });
      continue;
    }

    repos.push(
      computeRepoPlan(repo.id, repo.name, repo.localDir, repoPath, options)
    );
  }

  // Calculate totals
  const totals = {
    includedFileCount: repos.reduce((sum, r) => sum + r.includedFileCount, 0),
    includedTotalBytes: repos.reduce((sum, r) => sum + r.includedTotalBytes, 0),
    repoCount: repos.length,
  };

  // Aggregate all files for baseline comparison
  const allFiles: string[] = [];
  for (const repo of repos) {
    if (repo.files) {
      allFiles.push(...repo.files);
    }
  }

  // Overall warning level (worst of all repos)
  const overallWarningLevel: WarningLevel = repos.some((r) => r.warningLevel === 'red')
    ? 'red'
    : repos.some((r) => r.warningLevel === 'yellow')
      ? 'yellow'
      : 'green';

  return {
    repos,
    totals,
    overallWarningLevel,
    allFiles,
  };
}
