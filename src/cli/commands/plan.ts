/**
 * refrepo plan - Compute index plan
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { safeLoadManifest } from '../../core/manifest.js';
import { computePlan, formatBytes, type PlanSummary, type RepoPlanResult } from '../../core/plan.js';
import type { CommandResult, WarningLevel } from '../../core/types.js';

interface PlanOptions {
  json?: boolean;
  repo?: string;
}

export function createPlanCommand(): Command {
  return new Command('plan')
    .description('Compute index plan (file counts, sizes, warnings)')
    .option('--json', 'Output as JSON')
    .option('--repo <id>', 'Plan single repo')
    .action(async (options: PlanOptions) => {
      const result = await runPlan(options);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (result.success && result.data) {
        printPlanResult(result.data, options);
      } else {
        console.error(chalk.red('Error:') + ' ' + result.error);
        process.exit(1);
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

function printPlanResult(data: PlanSummary, options: PlanOptions): void {
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

async function runPlan(options: PlanOptions): Promise<CommandResult<PlanSummary>> {
  // Load manifest
  const manifestResult = safeLoadManifest();
  if (!manifestResult.success || !manifestResult.data) {
    return {
      success: false,
      error: manifestResult.error || 'Failed to load manifest',
    };
  }

  try {
    console.log(chalk.dim('Computing index plan...'));
    console.log('');

    const summary = computePlan(manifestResult.data, {
      repoId: options.repo,
    });

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
