/**
 * refrepo sync - Clone missing / pull existing repos
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import {
  safeLoadManifest,
  getRepoPath,
  getEnabledRepos,
} from '../../core/manifest.js';
import { cloneRepo, pullRepo, isGitRepo } from '../../core/git.js';
import { resolveRoot } from '../../core/config.js';
import type { CommandResult, RepoConfig } from '../../core/types.js';

interface SyncOptions {
  json?: boolean;
  root?: string;
  concurrency?: string;
  depth?: string;
}

interface RepoSyncResult {
  id: string;
  name: string;
  action: 'cloned' | 'pulled' | 'skipped' | 'failed';
  updated?: boolean;
  error?: string;
}

interface SyncResult {
  root: string;
  repos: RepoSyncResult[];
  summary: {
    cloned: number;
    pulled: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

export function createSyncCommand(): Command {
  return new Command('sync')
    .description('Clone missing / pull existing repos')
    .option('--json', 'Output as JSON')
    .option('--root <path>', 'Override root path')
    .option('--concurrency <n>', 'Number of concurrent operations', '4')
    .option('--depth <n>', 'Clone depth (use 1 for shallow)', '1')
    .action(async (options: SyncOptions) => {
      const result = await runSync(options);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (result.success && result.data) {
        printSyncResult(result.data);
      } else {
        console.error(chalk.red('Error:') + ' ' + result.error);
        process.exit(1);
      }
    });
}

function printSyncResult(data: SyncResult): void {
  console.log(chalk.bold('Sync Complete'));
  console.log(chalk.dim('Root: ' + data.root));
  console.log('');

  for (const repo of data.repos) {
    const icon =
      repo.action === 'cloned'
        ? chalk.green('+')
        : repo.action === 'pulled'
          ? repo.updated
            ? chalk.blue('↓')
            : chalk.dim('=')
          : repo.action === 'failed'
            ? chalk.red('✗')
            : chalk.dim('○');

    const actionText =
      repo.action === 'cloned'
        ? chalk.green('cloned')
        : repo.action === 'pulled'
          ? repo.updated
            ? chalk.blue('updated')
            : chalk.dim('up-to-date')
          : repo.action === 'failed'
            ? chalk.red('failed')
            : chalk.dim('skipped');

    console.log(`  ${icon} ${repo.name.padEnd(35)} ${actionText}`);

    if (repo.error) {
      console.log(chalk.dim(`      ${repo.error}`));
    }
  }

  console.log('');
  console.log(chalk.bold('Summary'));

  const { summary } = data;
  if (summary.cloned > 0) console.log(`  Cloned:   ${chalk.green(summary.cloned)}`);
  if (summary.updated > 0) console.log(`  Updated:  ${chalk.blue(summary.updated)}`);
  if (summary.pulled - summary.updated > 0) {
    console.log(`  Up-to-date: ${summary.pulled - summary.updated}`);
  }
  if (summary.failed > 0) console.log(`  Failed:   ${chalk.red(summary.failed)}`);
}

async function syncRepo(
  repoConfig: RepoConfig,
  root: string,
  depth: number
): Promise<RepoSyncResult> {
  const repoPath = getRepoPath(root, repoConfig.localDir);
  const exists = fs.existsSync(repoPath);

  if (!exists) {
    // Clone the repo
    console.log(chalk.dim(`  Cloning ${repoConfig.name}...`));

    const cloneOptions: { depth?: number; branch?: string } = {
      branch: repoConfig.branch,
    };

    if (depth > 0) {
      cloneOptions.depth = depth;
    }

    const result = await cloneRepo(repoConfig.url, repoPath, cloneOptions);

    if (result.success) {
      return { id: repoConfig.id, name: repoConfig.name, action: 'cloned' };
    } else {
      return {
        id: repoConfig.id,
        name: repoConfig.name,
        action: 'failed',
        error: result.error,
      };
    }
  }

  // Check if it's a git repo
  if (!isGitRepo(repoPath)) {
    return {
      id: repoConfig.id,
      name: repoConfig.name,
      action: 'skipped',
      error: 'Directory exists but is not a git repository',
    };
  }

  // Pull updates
  console.log(chalk.dim(`  Pulling ${repoConfig.name}...`));
  const result = await pullRepo(repoPath, { ffOnly: true });

  if (result.success) {
    return {
      id: repoConfig.id,
      name: repoConfig.name,
      action: 'pulled',
      updated: result.updated,
    };
  } else {
    return {
      id: repoConfig.id,
      name: repoConfig.name,
      action: 'failed',
      error: result.error,
    };
  }
}

async function runSync(options: SyncOptions): Promise<CommandResult<SyncResult>> {
  // Load manifest
  const manifestResult = safeLoadManifest();
  if (!manifestResult.success || !manifestResult.data) {
    return {
      success: false,
      error: manifestResult.error || 'Failed to load manifest',
    };
  }

  const manifest = manifestResult.data;
  const root = options.root ? resolveRoot(options.root) : manifest.defaultRoot;
  const depth = parseInt(options.depth || '1', 10);
  const concurrency = parseInt(options.concurrency || '4', 10);

  // Ensure root directory exists
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }

  console.log(chalk.bold('Syncing Reference Repos'));
  console.log(chalk.dim('Root: ' + root));
  console.log('');

  // Get enabled repos
  const enabledRepos = getEnabledRepos(manifest);

  // Process repos with concurrency limit
  const results: RepoSyncResult[] = [];
  const chunks: RepoConfig[][] = [];

  for (let i = 0; i < enabledRepos.length; i += concurrency) {
    chunks.push(enabledRepos.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map((repo) => syncRepo(repo, root, depth))
    );
    results.push(...chunkResults);
  }

  // Calculate summary
  const summary = {
    cloned: results.filter((r) => r.action === 'cloned').length,
    pulled: results.filter((r) => r.action === 'pulled').length,
    updated: results.filter((r) => r.action === 'pulled' && r.updated).length,
    skipped: results.filter((r) => r.action === 'skipped').length,
    failed: results.filter((r) => r.action === 'failed').length,
  };

  console.log(''); // Clear line after progress

  return {
    success: true,
    data: {
      root,
      repos: results,
      summary,
    },
  };
}
