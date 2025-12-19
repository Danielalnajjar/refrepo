/**
 * refrepo status - Show repo status
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import {
  loadManifest,
  safeLoadManifest,
  getRepoPath,
  getReposByCategory,
} from '../../core/manifest.js';
import { getRepoStatus } from '../../core/git.js';
import { resolveRoot } from '../../core/config.js';
import type { CommandResult, RepoStatusInfo, RepoConfig } from '../../core/types.js';

interface StatusOptions {
  json?: boolean;
  root?: string;
}

interface StatusResult {
  root: string;
  repos: RepoStatusInfo[];
  summary: {
    total: number;
    enabled: number;
    present: number;
    missing: number;
    dirty: number;
  };
}

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Show repo status (present/missing, branch, commit)')
    .option('--json', 'Output as JSON')
    .option('--root <path>', 'Override root path')
    .action(async (options: StatusOptions) => {
      const result = await runStatus(options);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (result.success && result.data) {
        printStatus(result.data);
      } else {
        console.error(chalk.red('Error:') + ' ' + result.error);
        process.exit(1);
      }
    });
}

function printStatus(data: StatusResult): void {
  const { root, repos, summary } = data;

  console.log(chalk.bold('Reference Repos Status'));
  console.log(chalk.dim('Root: ' + root));
  console.log('');

  // Group by category
  const byCategory: Record<string, RepoStatusInfo[]> = {
    source: [],
    glue: [],
    example: [],
  };

  for (const repo of repos) {
    // We need category from somewhere - let's infer from the data
    // Actually we stored it in the repo config, need to map it
  }

  // Just print in order for now
  for (const repo of repos) {
    printRepoLine(repo);
  }

  console.log('');
  console.log(chalk.bold('Summary'));
  console.log(`  Total:    ${summary.total} (${summary.enabled} enabled)`);
  console.log(`  Present:  ${chalk.green(summary.present)}`);
  console.log(`  Missing:  ${summary.missing > 0 ? chalk.yellow(summary.missing) : summary.missing}`);
  if (summary.dirty > 0) {
    console.log(`  Dirty:    ${chalk.yellow(summary.dirty)}`);
  }
}

function printRepoLine(repo: RepoStatusInfo): void {
  const statusIcon =
    repo.status === 'present'
      ? chalk.green('✓')
      : repo.status === 'disabled'
        ? chalk.dim('○')
        : chalk.yellow('✗');

  const name = repo.status === 'disabled' ? chalk.dim(repo.name) : repo.name;

  let details = '';
  if (repo.status === 'present') {
    const parts: string[] = [];
    if (repo.branch) parts.push(chalk.cyan(repo.branch));
    if (repo.commit) parts.push(chalk.dim(repo.commit));
    if (repo.dirty) parts.push(chalk.yellow('*dirty'));
    details = parts.join(' ');
  } else if (repo.status === 'disabled') {
    details = chalk.dim('(disabled)');
  } else {
    details = chalk.dim('not cloned');
  }

  console.log(`  ${statusIcon} ${name.padEnd(35)} ${details}`);
}

async function runStatus(options: StatusOptions): Promise<CommandResult<StatusResult>> {
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

  // Check each repo
  const repos: RepoStatusInfo[] = [];
  let presentCount = 0;
  let missingCount = 0;
  let dirtyCount = 0;
  let enabledCount = 0;

  for (const repoConfig of manifest.repos) {
    const repoPath = getRepoPath(root, repoConfig.localDir);
    const exists = fs.existsSync(repoPath);

    if (!repoConfig.enabled) {
      repos.push({
        id: repoConfig.id,
        name: repoConfig.name,
        status: 'disabled',
        localPath: repoPath,
      });
      continue;
    }

    enabledCount++;

    if (!exists) {
      repos.push({
        id: repoConfig.id,
        name: repoConfig.name,
        status: 'missing',
        localPath: repoPath,
      });
      missingCount++;
      continue;
    }

    // Get git status
    const gitStatus = await getRepoStatus(repoPath);

    repos.push({
      id: repoConfig.id,
      name: repoConfig.name,
      status: 'present',
      localPath: repoPath,
      branch: gitStatus.branch,
      commit: gitStatus.commit,
      commitDate: gitStatus.commitDate,
      dirty: gitStatus.dirty,
      remote: gitStatus.remote,
    });

    presentCount++;
    if (gitStatus.dirty) dirtyCount++;
  }

  return {
    success: true,
    data: {
      root,
      repos,
      summary: {
        total: manifest.repos.length,
        enabled: enabledCount,
        present: presentCount,
        missing: missingCount,
        dirty: dirtyCount,
      },
    },
  };
}
