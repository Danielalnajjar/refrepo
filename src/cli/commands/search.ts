/**
 * refrepo search - Search indexed content via mgrep
 */

import { Command } from 'commander';
import { execa } from 'execa';
import { safeLoadManifest } from '../../core/manifest.js';
import { createLogger, printJson } from '../output.js';
import type { CommandResult } from '../../core/types.js';

interface SearchOptions {
  json?: boolean;
  limit?: string;
}

export function createSearchCommand(): Command {
  return new Command('search')
    .description('Search indexed content via mgrep')
    .argument('<query>', 'Search query')
    .option('--json', 'Output as JSON')
    .option('--limit <n>', 'Maximum number of results', '10')
    .action(async (query: string, options: SearchOptions) => {
      const jsonMode = options.json === true;
      const logger = createLogger({ jsonMode });
      const result = await runSearch(query, options, jsonMode);

      if (jsonMode) {
        printJson(result);
        if (!result.success) {
          process.exitCode = 1;
        }
      } else if (!result.success) {
        logger.error('Error: ' + result.error);
        process.exitCode = 1;
      }
      // In non-JSON mode, output is streamed directly by mgrep
    });
}

async function runSearch(
  query: string,
  options: SearchOptions,
  jsonMode: boolean
): Promise<CommandResult> {
  // Load manifest to get store name
  const manifestResult = safeLoadManifest();
  if (!manifestResult.success || !manifestResult.data) {
    return {
      success: false,
      error: manifestResult.error?.toString() || 'Failed to load manifest',
    };
  }

  const store = manifestResult.data.defaultStore;
  const limit = options.limit || '10';

  try {
    // Build mgrep search args
    const args = ['--store', store, 'search', query, '--limit', limit];

    if (jsonMode) {
      args.push('--json');
    }

    // Run mgrep and stream output directly
    const result = await execa('mgrep', args, {
      stdio: jsonMode ? 'pipe' : 'inherit',
      reject: false,
    });

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || `mgrep exited with code ${result.exitCode}`,
      };
    }

    if (jsonMode && result.stdout) {
      // Parse and return JSON result
      try {
        const data = JSON.parse(result.stdout);
        return { success: true, data };
      } catch {
        return { success: true, data: { raw: result.stdout } };
      }
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Check for common errors
    if (message.includes('ENOENT') || message.includes('not found')) {
      return {
        success: false,
        error: 'mgrep not found. Install it from https://github.com/mixedbread-ai/mgrep',
      };
    }

    return { success: false, error: message };
  }
}
