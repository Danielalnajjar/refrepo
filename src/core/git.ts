/**
 * Git operations for repository management
 */

import { execa } from 'execa';
import * as fs from 'fs';
import * as path from 'path';

export interface CloneOptions {
  depth?: number;
  branch?: string;
  sparse?: {
    enabled: boolean;
    include: string[];
  };
}

export interface PullOptions {
  ffOnly?: boolean;
}

export interface GitStatus {
  isRepo: boolean;
  branch?: string;
  commit?: string;
  commitDate?: string;
  dirty?: boolean;
  remote?: string;
  ahead?: number;
  behind?: number;
}

/**
 * Check if a directory is a git repository
 */
export function isGitRepo(dirPath: string): boolean {
  return fs.existsSync(path.join(dirPath, '.git'));
}

/**
 * Check if git is available
 */
export async function isGitAvailable(): Promise<{ available: boolean; version?: string; path?: string }> {
  try {
    const result = await execa('git', ['--version']);
    const version = result.stdout.replace('git version ', '').trim();

    const whichResult = await execa('which', ['git']).catch(() => ({ stdout: '' }));

    return {
      available: true,
      version,
      path: whichResult.stdout.trim() || undefined,
    };
  } catch {
    return { available: false };
  }
}

/**
 * Get the status of a git repository
 */
export async function getRepoStatus(repoPath: string): Promise<GitStatus> {
  if (!isGitRepo(repoPath)) {
    return { isRepo: false };
  }

  const execOpts = { cwd: repoPath };

  try {
    // Get current branch
    const branchResult = await execa('git', ['branch', '--show-current'], execOpts);
    const branchOut = String(branchResult.stdout || '').trim();
    const branch = branchOut || undefined;

    // Get current commit (short hash)
    const commitResult = await execa('git', ['rev-parse', '--short', 'HEAD'], execOpts);
    const commit = String(commitResult.stdout || '').trim();

    // Get commit date
    const dateResult = await execa('git', ['log', '-1', '--format=%ci'], execOpts);
    const commitDate = String(dateResult.stdout || '').trim();

    // Check for uncommitted changes
    const statusResult = await execa('git', ['status', '--porcelain'], execOpts);
    const dirty = String(statusResult.stdout || '').trim().length > 0;

    // Get remote URL
    let remote: string | undefined;
    try {
      const remoteResult = await execa('git', ['remote', 'get-url', 'origin'], execOpts);
      remote = String(remoteResult.stdout || '').trim();
    } catch {
      // No remote configured
    }

    return {
      isRepo: true,
      branch,
      commit,
      commitDate,
      dirty,
      remote,
    };
  } catch (error) {
    return { isRepo: true };
  }
}

/**
 * Clone a repository
 */
export async function cloneRepo(
  url: string,
  destPath: string,
  options: CloneOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const args = ['clone'];

  if (options.depth && options.depth > 0) {
    args.push('--depth', String(options.depth));
  }

  if (options.branch) {
    args.push('--branch', options.branch);
  }

  if (options.sparse?.enabled) {
    args.push('--sparse');
  }

  args.push(url, destPath);

  try {
    await execa('git', args);

    // Set up sparse checkout if enabled
    if (options.sparse?.enabled && options.sparse.include.length > 0) {
      await execa('git', ['sparse-checkout', 'init', '--cone'], { cwd: destPath });
      await execa('git', ['sparse-checkout', 'set', ...options.sparse.include], { cwd: destPath });
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * Pull updates for a repository
 */
export async function pullRepo(
  repoPath: string,
  options: PullOptions = { ffOnly: true }
): Promise<{ success: boolean; error?: string; updated?: boolean }> {
  if (!isGitRepo(repoPath)) {
    return { success: false, error: 'Not a git repository' };
  }

  const args = ['pull'];

  if (options.ffOnly) {
    args.push('--ff-only');
  }

  try {
    const result = await execa('git', args, { cwd: repoPath });
    const updated = !result.stdout.includes('Already up to date');
    return { success: true, updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * Fetch updates without merging
 */
export async function fetchRepo(repoPath: string): Promise<{ success: boolean; error?: string }> {
  if (!isGitRepo(repoPath)) {
    return { success: false, error: 'Not a git repository' };
  }

  try {
    await execa('git', ['fetch'], { cwd: repoPath });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
