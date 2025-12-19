/**
 * refrepo index - Run mgrep indexing
 * Note: File named index-cmd.ts to avoid conflict with index.ts
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { safeLoadManifest } from '../../core/manifest.js';
import { computePlan, formatBytes } from '../../core/plan.js';
import { createLogger, printJson, type Logger } from '../output.js';
import type { CommandResult } from '../../core/types.js';

interface IndexOptions {
  json?: boolean;
  root?: string;
  dryRun?: boolean;
  force?: boolean;
  timeoutSeconds?: number;
  repo?: string;
}

interface IndexResult {
  filesFound: number;
  filesUploaded: number;
  filesDeleted: number;
  dryRun: boolean;
  store: string;
  duration: number;
}

export function createIndexCommand(): Command {
  return new Command('index')
    .description('Run mgrep indexing (with safeguards)')
    .option('--json', 'Output as JSON')
    .option('--root <path>', 'Override root path')
    .option('--dry-run', 'Preview without indexing')
    .option('--force', 'Skip plan check')
    .option('--timeout-seconds <n>', 'Kill mgrep after N seconds', '300')
    .option('--repo <id>', 'Index single repo')
    .action(async (options: IndexOptions) => {
      const jsonMode = options.json === true;
      const logger = createLogger({ jsonMode });

      const result = await runIndex(options, logger, jsonMode);

      if (jsonMode) {
        printJson(result);
        if (!result.success) {
          process.exitCode = 1;
        }
      } else if (!result.success) {
        logger.error('Error: ' + result.error);
        process.exitCode = 1;
      }
      // Success message already printed by runIndex in non-JSON mode
    });
}

async function runIndex(
  options: IndexOptions,
  logger: Logger,
  jsonMode: boolean
): Promise<CommandResult<IndexResult>> {
  // Load manifest
  const manifestResult = safeLoadManifest();
  if (!manifestResult.success || !manifestResult.data) {
    return {
      success: false,
      error: manifestResult.error || 'Failed to load manifest',
    };
  }

  const manifest = manifestResult.data;
  const root = options.root || manifest.defaultRoot;
  const store = manifest.defaultStore;

  // Step 1: Run plan check (unless --force)
  if (!options.force) {
    logger.dim('Checking index plan...');

    try {
      const plan = computePlan(manifest, { repoId: options.repo });

      if (plan.overallWarningLevel === 'red') {
        logger.log('');
        logger.error('✖ Index blocked - plan exceeds error thresholds');
        logger.log('');
        logger.log(`  Files: ${plan.totals.includedFileCount.toLocaleString()}`);
        logger.log(`  Size:  ${formatBytes(plan.totals.includedTotalBytes)}`);
        logger.log('');
        logger.dim('  Run `refrepo plan` to see details');
        logger.dim('  Use `refrepo index --force` to override');
        return {
          success: false,
          error: 'Index blocked due to RED warning level. Use --force to override.',
        };
      }

      if (plan.overallWarningLevel === 'yellow') {
        logger.warn('⚠ Warning: plan exceeds warning thresholds');
        logger.dim('  Proceeding anyway...');
        logger.log('');
      } else {
        logger.success('✓ Plan check passed');
        logger.log('');
      }
    } catch {
      logger.warn('⚠ Could not compute plan, proceeding anyway');
      logger.log('');
    }
  }

  // Step 2: Run mgrep watch
  const startTime = Date.now();
  const timeoutMs = (options.timeoutSeconds || 300) * 1000;

  logger.dim(`Indexing with mgrep (store: ${store})...`);
  if (options.dryRun) {
    logger.dim('(dry-run mode - no files will be uploaded)');
  }
  logger.log('');

  try {
    const result = await runMgrepWatch({
      root,
      store,
      dryRun: options.dryRun || false,
      timeoutMs,
      jsonMode,
    });

    const duration = (Date.now() - startTime) / 1000;

    if (!jsonMode) {
      logger.log('');
      if (options.dryRun) {
        logger.success('✓ Dry run complete');
      } else {
        logger.success('✓ Indexing complete');
      }
      logger.log('');
      logger.log(`  Files found:    ${result.filesFound.toLocaleString()}`);
      logger.log(`  Files uploaded: ${result.filesUploaded.toLocaleString()}`);
      logger.log(`  Files deleted:  ${result.filesDeleted.toLocaleString()}`);
      logger.log(`  Duration:       ${duration.toFixed(1)}s`);
    }

    return {
      success: true,
      data: {
        ...result,
        store,
        duration,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

interface MgrepWatchOptions {
  root: string;
  store: string;
  dryRun: boolean;
  timeoutMs: number;
  jsonMode: boolean;
}

interface MgrepWatchResult {
  filesFound: number;
  filesUploaded: number;
  filesDeleted: number;
  dryRun: boolean;
}

function runMgrepWatch(options: MgrepWatchOptions): Promise<MgrepWatchResult> {
  return new Promise((resolve, reject) => {
    const args = ['--store', options.store, 'watch'];
    if (options.dryRun) {
      args.push('--dry-run');
    }

    const child = spawn('mgrep', args, {
      cwd: options.root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      // In JSON mode, stream to stderr to keep stdout clean
      // In normal mode, stream to stdout
      if (options.jsonMode) {
        process.stderr.write(chalk.dim(text));
      } else {
        process.stdout.write(chalk.dim(text));
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(chalk.red(text));
    });

    // Set timeout
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`mgrep timed out after ${options.timeoutMs / 1000} seconds`));
    }, options.timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        // Check if it's a "completed" exit (mgrep watch exits after initial sync in non-watch mode)
        // Parse output to check if it completed successfully
        const output = stdout + stderr;

        if (output.includes('found') && output.includes('files')) {
          // Likely completed successfully, parse the result
          const result = parseMgrepOutput(output, options.dryRun);
          resolve(result);
          return;
        }

        reject(new Error(`mgrep exited with code ${code}: ${stderr || stdout}`));
        return;
      }

      const result = parseMgrepOutput(stdout, options.dryRun);
      resolve(result);
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start mgrep: ${error.message}`));
    });
  });
}

function parseMgrepOutput(output: string, dryRun: boolean): MgrepWatchResult {
  // Parse output like:
  // "Dry run: found 3186 files in total, would have uploaded 943 changed or new files, would have deleted 854 files"
  // or actual run output

  let filesFound = 0;
  let filesUploaded = 0;
  let filesDeleted = 0;

  // Try to find summary line
  const foundMatch = output.match(/found\s+(\d+)\s+files?\s+in\s+total/i);
  if (foundMatch) {
    filesFound = parseInt(foundMatch[1], 10);
  }

  const uploadMatch = output.match(/(?:would have uploaded|uploaded)\s+(\d+)/i);
  if (uploadMatch) {
    filesUploaded = parseInt(uploadMatch[1], 10);
  }

  const deleteMatch = output.match(/(?:would have deleted|deleted)\s+(\d+)/i);
  if (deleteMatch) {
    filesDeleted = parseInt(deleteMatch[1], 10);
  }

  // If no summary, count individual lines
  if (filesFound === 0 && filesUploaded === 0) {
    const uploadLines = (output.match(/would have uploaded|Uploaded/gi) || []).length;
    filesUploaded = uploadLines;
    filesFound = uploadLines; // Approximate
  }

  return {
    filesFound,
    filesUploaded,
    filesDeleted,
    dryRun,
  };
}
