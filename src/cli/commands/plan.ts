/**
 * refrepo plan - Compute index plan
 */

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { safeLoadManifest, resolveManifestPath } from '../../core/manifest.js';
import { computePlan, formatBytes, type PlanSummary, type RepoPlanResult } from '../../core/plan.js';
import { loadBaseline, compareToBaseline } from '../../core/baseline.js';
import { createLogger, printJson } from '../output.js';
import type { CommandResult, WarningLevel } from '../../core/types.js';

const CHANGES_FILENAME = '.refrepo-changes.json';

interface PlanOptions {
  json?: boolean;
  repo?: string;
}

interface PlanSummaryWithChanges extends PlanSummary {
  baselineComparison?: {
    baselineDate: string;
    newFiles: string[];
    removedFiles: string[];
  };
}

export function createPlanCommand(): Command {
  return new Command('plan')
    .description('Compute index plan (file counts, sizes, warnings)')
    .option('--json', 'Output as JSON')
    .option('--repo <id>', 'Plan single repo')
    .action(async (options: PlanOptions) => {
      const jsonMode = options.json === true;
      const logger = createLogger({ jsonMode });

      const result = await runPlan(options, logger);

      if (jsonMode) {
        printJson(result);
        if (!result.success) {
          process.exitCode = 1;
        }
      } else if (result.success && result.data) {
        printPlanResult(result.data);
      } else {
        logger.error('Error: ' + result.error);
        process.exitCode = 1;
      }
    });
}

function getWarningIcon(level: WarningLevel): string {
  switch (level) {
    case 'green':
      return chalk.green('●');
    case 'yellow':
      return chalk.yellow('●');
    case 'red':
      return chalk.red('●');
  }
}

function getWarningText(level: WarningLevel): string {
  switch (level) {
    case 'green':
      return chalk.green('OK');
    case 'yellow':
      return chalk.yellow('WARN');
    case 'red':
      return chalk.red('HIGH');
  }
}

function printRepoPlan(repo: RepoPlanResult): void {
  const icon = getWarningIcon(repo.warningLevel);
  const status = getWarningText(repo.warningLevel);

  console.log(`  ${icon} ${repo.repoName.padEnd(35)} ${status}`);
  console.log(
    chalk.dim(`      Files: ${repo.includedFileCount.toLocaleString().padStart(6)}  `) +
    chalk.dim(`Size: ${formatBytes(repo.includedTotalBytes).padStart(10)}`)
  );

  // Show top extensions
  if (repo.extensionHistogram.length > 0) {
    const topExts = repo.extensionHistogram
      .slice(0, 5)
      .map((e) => `${e.ext}(${e.count})`)
      .join(', ');
    console.log(chalk.dim(`      Top: ${topExts}`));
  }

  // Show warnings
  for (const warning of repo.warnings) {
    console.log(chalk.yellow(`      ⚠ ${warning}`));
  }
}

function printPlanResult(data: PlanSummary): void {
  console.log(chalk.bold('Index Plan'));
  console.log('');

  // Print each repo
  for (const repo of data.repos) {
    printRepoPlan(repo);
    console.log('');
  }

  // Print totals
  console.log(chalk.bold('─'.repeat(60)));
  console.log(chalk.bold('Totals'));
  console.log(`  Repos:       ${data.totals.repoCount}`);
  console.log(`  Files:       ${data.totals.includedFileCount.toLocaleString()}`);
  console.log(`  Total Size:  ${formatBytes(data.totals.includedTotalBytes)}`);

  // Check for baseline and show diff
  const baseline = loadBaseline();
  if (baseline && data.allFiles) {
    const diff = compareToBaseline(data.allFiles, baseline);
    const hasChanges = diff.newFiles.length > 0 || diff.removedFiles.length > 0;

    if (hasChanges) {
      console.log('');
      console.log(chalk.bold('Changes since last index'));
      console.log(chalk.dim(`  (baseline from ${new Date(baseline.timestamp).toLocaleDateString()})`));

      if (diff.newFiles.length > 0) {
        console.log('');
        console.log(chalk.green(`  + ${diff.newFiles.length} new file${diff.newFiles.length === 1 ? '' : 's'}:`));
        // Show all new files
        for (const file of diff.newFiles) {
          console.log(chalk.green(`    ${file}`));
        }
      }

      if (diff.removedFiles.length > 0) {
        console.log('');
        console.log(chalk.red(`  - ${diff.removedFiles.length} removed file${diff.removedFiles.length === 1 ? '' : 's'}:`));
        // Show all removed files
        for (const file of diff.removedFiles) {
          console.log(chalk.red(`    ${file}`));
        }
      }
    } else {
      console.log('');
      console.log(chalk.dim('  No changes since last index'));
    }
  } else if (!baseline) {
    console.log('');
    console.log(chalk.dim('  No baseline yet - run `refrepo index` to create one'));
  }

  console.log('');

  // Overall status
  const overallIcon = getWarningIcon(data.overallWarningLevel);
  const overallText = getWarningText(data.overallWarningLevel);

  console.log(`  Overall: ${overallIcon} ${overallText}`);

  if (data.overallWarningLevel === 'red') {
    console.log('');
    console.log(chalk.red('  ⚠ Indexing blocked - review ignore rules before proceeding'));
    console.log(chalk.dim('    Use `refrepo index --force` to override'));
  } else if (data.overallWarningLevel === 'yellow') {
    console.log('');
    console.log(chalk.yellow('  ⚠ Some repos exceed warning thresholds'));
    console.log(chalk.dim('    Consider reviewing ignore rules'));
  } else {
    console.log('');
    console.log(chalk.green('  ✓ Ready for indexing'));
    console.log(chalk.dim('    Run `refrepo index` to index with mgrep'));
  }
}

async function runPlan(
  options: PlanOptions,
  logger: ReturnType<typeof createLogger>
): Promise<CommandResult<PlanSummary>> {
  // Load manifest
  const manifestResult = safeLoadManifest();
  if (!manifestResult.success || !manifestResult.data) {
    return {
      success: false,
      error: manifestResult.error || 'Failed to load manifest',
    };
  }

  try {
    logger.dim('Computing index plan...');
    logger.log('');

    const summary = computePlan(manifestResult.data, {
      repoId: options.repo,
    });

    // Add baseline comparison to the summary for JSON output
    const baseline = loadBaseline();
    if (baseline && summary.allFiles) {
      const diff = compareToBaseline(summary.allFiles, baseline);
      const comparison = {
        baselineDate: baseline.timestamp,
        newFiles: diff.newFiles,
        removedFiles: diff.removedFiles,
      };
      (summary as PlanSummaryWithChanges).baselineComparison = comparison;

      // Always save changes to file for easy access
      const changesFile = {
        timestamp: new Date().toISOString(),
        baselineDate: baseline.timestamp,
        totalFiles: summary.totals.includedFileCount,
        newFiles: diff.newFiles,
        removedFiles: diff.removedFiles,
        hasChanges: diff.newFiles.length > 0 || diff.removedFiles.length > 0,
      };
      const manifestDir = path.dirname(resolveManifestPath());
      fs.writeFileSync(
        path.join(manifestDir, CHANGES_FILENAME),
        JSON.stringify(changesFile, null, 2),
        'utf-8'
      );
    } else if (!baseline && summary.allFiles) {
      // No baseline - treat all files as "new" for first-time suggest
      const changesFile = {
        timestamp: new Date().toISOString(),
        baselineDate: 'none',
        totalFiles: summary.totals.includedFileCount,
        newFiles: summary.allFiles,
        removedFiles: [],
        hasChanges: summary.allFiles.length > 0,
      };
      const manifestDir = path.dirname(resolveManifestPath());
      fs.writeFileSync(
        path.join(manifestDir, CHANGES_FILENAME),
        JSON.stringify(changesFile, null, 2),
        'utf-8'
      );
    }

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
