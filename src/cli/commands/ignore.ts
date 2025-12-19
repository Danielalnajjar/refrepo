/**
 * refrepo ignore - Build .mgrepignore files
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { safeLoadManifest } from '../../core/manifest.js';
import { writeIgnoreFiles, type IgnoreBuildSummary } from '../../core/ignore.js';
import type { CommandResult } from '../../core/types.js';

interface IgnoreBuildOptions {
  json?: boolean;
  dryRun?: boolean;
  global?: boolean;
}

export function createIgnoreCommand(): Command {
  const cmd = new Command('ignore')
    .description('Manage .mgrepignore files');

  cmd.command('build')
    .description('Generate .mgrepignore files for all repos')
    .option('--json', 'Output as JSON')
    .option('--dry-run', 'Preview without writing files')
    .option('--global', 'Use global mode (single file at root)')
    .action(async (options: IgnoreBuildOptions) => {
      const result = await runIgnoreBuild(options);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (result.success && result.data) {
        printIgnoreBuildResult(result.data, options);
      } else {
        console.error(chalk.red('Error:') + ' ' + result.error);
        process.exit(1);
      }
    });

  return cmd;
}

function printIgnoreBuildResult(data: IgnoreBuildSummary, options: IgnoreBuildOptions): void {
  const { mode, results, totalRules, filesWritten } = data;

  if (options.dryRun) {
    console.log(chalk.yellow('Dry run') + ' - no files written');
    console.log('');
  }

  console.log(chalk.bold('Ignore Build Summary'));
  console.log(`  Mode: ${mode === 'global' ? 'Global (single file)' : 'Per-repo'}`);
  console.log('');

  for (const result of results) {
    const icon = result.written
      ? chalk.green('✓')
      : options.dryRun
        ? chalk.yellow('○')
        : chalk.dim('○');

    const status = result.written
      ? chalk.green('written')
      : options.dryRun
        ? chalk.yellow('would write')
        : chalk.dim('skipped');

    console.log(`  ${icon} ${result.repoName.padEnd(35)} ${result.ruleCount} rules ${chalk.dim('→')} ${status}`);
  }

  console.log('');
  console.log(chalk.bold('Summary'));
  console.log(`  Total rules:   ${totalRules}`);
  console.log(`  Files ${options.dryRun ? 'to write' : 'written'}: ${filesWritten}`);

  if (!options.dryRun && filesWritten > 0) {
    console.log('');
    console.log(chalk.dim('Run `refrepo plan` to see what would be indexed'));
  }
}

async function runIgnoreBuild(
  options: IgnoreBuildOptions
): Promise<CommandResult<IgnoreBuildSummary>> {
  // Load manifest
  const manifestResult = safeLoadManifest();
  if (!manifestResult.success || !manifestResult.data) {
    return {
      success: false,
      error: manifestResult.error || 'Failed to load manifest',
    };
  }

  try {
    const summary = writeIgnoreFiles(manifestResult.data, {
      dryRun: options.dryRun,
      global: options.global,
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
