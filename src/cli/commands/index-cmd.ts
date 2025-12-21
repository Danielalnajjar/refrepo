/**
 * refrepo index - Run mgrep indexing
 * Note: File named index-cmd.ts to avoid conflict with index.ts
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { safeLoadManifest } from '../../core/manifest.js';
import { computePlan, formatBytes } from '../../core/plan.js';
import { saveBaseline } from '../../core/baseline.js';
import { writeIgnoreFiles } from '../../core/ignore.js';
import { createLogger, printJson, type Logger } from '../output.js';
import type { CommandResult } from '../../core/types.js';

interface IndexOptions {
  json?: boolean;
  root?: string;
  dryRun?: boolean;
  force?: boolean;
  timeoutSeconds?: number;
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

  // Step 1: Compute plan (always needed for baseline)
  logger.dim('Checking index plan...');
  let planFiles: string[] | undefined;

  try {
    const plan = computePlan(manifest, {});
    planFiles = plan.allFiles;

    // Only check thresholds if not forced
    if (!options.force) {
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
    } else {
      logger.success('✓ Plan computed (--force, skipping threshold check)');
      logger.log('');
    }
  } catch {
    logger.warn('⚠ Could not compute plan, proceeding anyway');
    logger.log('');
  }

  // Step 2: Regenerate .mgrepignore to ensure it's up-to-date
  logger.dim('Regenerating .mgrepignore...');
  writeIgnoreFiles(manifest, { global: true });

  // Step 3: Run mgrep watch
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
      logger.log('────────────────────────────────────────────────────────────');
      if (options.dryRun) {
        logger.success('✓ Dry run complete');
        logger.log('');
        logger.log(`  Files found:      ${result.filesFound.toLocaleString()}`);
        logger.log(`  Would upload:     ${result.filesUploaded.toLocaleString()} (new or changed)`);
        logger.log(`  Would delete:     ${result.filesDeleted.toLocaleString()} (removed from index)`);
        logger.log(`  Duration:         ${duration.toFixed(1)}s`);
        logger.log('');
        logger.dim('  To proceed with indexing, run: refrepo index');
      } else {
        logger.success('✓ Indexing complete');
        logger.log('');
        logger.log(`  Files found:      ${result.filesFound.toLocaleString()}`);
        logger.log(`  Files uploaded:   ${result.filesUploaded.toLocaleString()}`);
        logger.log(`  Files deleted:    ${result.filesDeleted.toLocaleString()}`);
        logger.log(`  Duration:         ${duration.toFixed(1)}s`);

        // Save baseline for future plan comparisons
        if (planFiles && planFiles.length > 0) {
          saveBaseline(planFiles);
          logger.log('');
          logger.dim('  Baseline saved for future comparisons');
        }
      }
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
    let syncComplete = false;

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

      // Detect when initial sync is complete and exit
      // mgrep outputs "✔ Initial sync complete" when done with first pass
      // Check both the current chunk and accumulated output in case message is split
      if (!syncComplete && (text.includes('Initial sync complete') || stdout.includes('Initial sync complete'))) {
        syncComplete = true;
        // Give it a moment to flush any remaining output, then terminate
        setTimeout(() => {
          child.kill('SIGTERM');
        }, 500);
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      // mgrep uses ora spinner which outputs to stderr
      // Show as dim instead of red for normal progress messages
      if (text.includes('Indexing') || text.includes('sync complete')) {
        process.stderr.write(chalk.dim(text));
      } else {
        process.stderr.write(chalk.red(text));
      }

      // Also check stderr for sync complete (mgrep uses ora spinner on stderr)
      if (!syncComplete && (text.includes('Initial sync complete') || stderr.includes('Initial sync complete'))) {
        syncComplete = true;
        setTimeout(() => {
          child.kill('SIGTERM');
        }, 500);
      }
    });

    // Set timeout
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`mgrep timed out after ${options.timeoutMs / 1000} seconds`));
    }, options.timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timeout);

      // Combine stdout and stderr for parsing (mgrep uses both)
      const combinedOutput = stdout + '\n' + stderr;

      // If we terminated after sync complete, treat as success
      if (syncComplete) {
        const result = parseMgrepOutput(combinedOutput, options.dryRun);
        resolve(result);
        return;
      }

      if (code !== 0) {
        // Check if it's a "completed" exit (mgrep watch exits after initial sync in non-watch mode)
        // Parse output to check if it completed successfully
        if (combinedOutput.includes('found') && combinedOutput.includes('files')) {
          // Likely completed successfully, parse the result
          const result = parseMgrepOutput(combinedOutput, options.dryRun);
          resolve(result);
          return;
        }

        reject(new Error(`mgrep exited with code ${code}: ${stderr || stdout}`));
        return;
      }

      const result = parseMgrepOutput(combinedOutput, options.dryRun);
      resolve(result);
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start mgrep: ${error.message}`));
    });
  });
}

function parseMgrepOutput(output: string, dryRun: boolean): MgrepWatchResult {
  // Parse output formats:
  // Dry run: "found 3186 files in total, would have uploaded 943 changed or new files, would have deleted 854 files"
  // Actual:  "Initial sync complete (2328/2328) • uploaded 0"
  //          or "Initial sync complete (2328/2328) • uploaded 5 • deleted 3"

  let filesFound = 0;
  let filesUploaded = 0;
  let filesDeleted = 0;

  // Try dry-run format first
  const foundMatch = output.match(/found\s+(\d+)\s+files?\s+in\s+total/i);
  if (foundMatch) {
    filesFound = parseInt(foundMatch[1], 10);
  }

  // Try actual run format: "Initial sync complete (X/Y)"
  if (filesFound === 0) {
    const syncMatch = output.match(/Initial sync complete\s*\((\d+)\/(\d+)\)/i);
    if (syncMatch) {
      filesFound = parseInt(syncMatch[2], 10); // Use the total (second number)
    }
  }

  // Parse uploaded count - handles both "would have uploaded X" and "• uploaded X"
  const uploadMatch = output.match(/(?:would have uploaded|•\s*uploaded)\s+(\d+)/i);
  if (uploadMatch) {
    filesUploaded = parseInt(uploadMatch[1], 10);
  }

  // Parse deleted count - handles both "would have deleted X" and "• deleted X"
  const deleteMatch = output.match(/(?:would have deleted|•\s*deleted)\s+(\d+)/i);
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
