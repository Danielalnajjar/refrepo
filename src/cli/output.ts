/**
 * Output utilities for JSON-safe CLI logging
 *
 * In JSON mode:
 * - All progress/info logs go to stderr (or are suppressed)
 * - Only the final JSON result goes to stdout
 *
 * In normal mode:
 * - Logs go to stdout/stderr as usual
 */

import chalk from 'chalk';

export interface Logger {
  /** Info message (progress, status) */
  info(message: string): void;
  /** Dimmed message (secondary info) */
  dim(message: string): void;
  /** Success message */
  success(message: string): void;
  /** Warning message */
  warn(message: string): void;
  /** Error message */
  error(message: string): void;
  /** Raw log (no formatting) */
  log(message: string): void;
}

export interface LoggerOptions {
  /** If true, all logs go to stderr to keep stdout clean for JSON */
  jsonMode: boolean;
}

/**
 * Create a logger that respects JSON mode
 */
export function createLogger(options: LoggerOptions): Logger {
  const { jsonMode } = options;

  // In JSON mode, write to stderr; in normal mode, write to stdout
  const out = jsonMode ? process.stderr : process.stdout;
  const err = process.stderr;

  return {
    info(message: string) {
      out.write(message + '\n');
    },

    dim(message: string) {
      out.write(chalk.dim(message) + '\n');
    },

    success(message: string) {
      out.write(chalk.green(message) + '\n');
    },

    warn(message: string) {
      err.write(chalk.yellow(message) + '\n');
    },

    error(message: string) {
      err.write(chalk.red(message) + '\n');
    },

    log(message: string) {
      out.write(message + '\n');
    },
  };
}

/**
 * Print JSON result to stdout (only place that writes to stdout in JSON mode)
 */
export function printJson<T>(result: { success: boolean; data?: T; error?: string }): void {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

/**
 * Handle command completion with proper exit codes
 */
export function exitWithResult<T>(
  result: { success: boolean; data?: T; error?: string },
  options: { jsonMode: boolean }
): void {
  if (options.jsonMode) {
    printJson(result);
  }

  if (!result.success) {
    process.exitCode = 1;
  }
}
