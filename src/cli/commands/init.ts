/**
 * refrepo init - Initialize manifest with default repos
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  getDefaultManifest,
  saveManifest,
  manifestExists,
  resolveManifestPath,
} from '../../core/manifest.js';
import { resolveRoot } from '../../core/config.js';
import { createLogger, printJson } from '../output.js';
import type { CommandResult, Manifest } from '../../core/types.js';

interface InitOptions {
  json?: boolean;
  force?: boolean;
  root?: string;
}

interface InitResult {
  manifestPath: string;
  root: string;
  repoCount: number;
  enabledCount: number;
}

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize manifest with default repos')
    .option('--json', 'Output as JSON')
    .option('--force', 'Overwrite existing manifest')
    .option('--root <path>', 'Override default root path')
    .action(async (options: InitOptions) => {
      const jsonMode = options.json === true;
      const logger = createLogger({ jsonMode });
      const result = await runInit(options);

      if (jsonMode) {
        printJson(result);
        if (!result.success) {
          process.exitCode = 1;
        }
      } else if (result.success && result.data) {
        const d = result.data;
        logger.success('✓ Manifest created: ' + chalk.cyan(d.manifestPath));
        logger.log('');
        logger.log('  Root path:    ' + chalk.dim(d.root));
        logger.log('  Total repos:  ' + d.repoCount);
        logger.log('  Enabled:      ' + d.enabledCount);
        logger.log('');
        logger.log('Next steps:');
        logger.log('  ' + chalk.cyan('refrepo status') + '  - Check which repos exist');
        logger.log('  ' + chalk.cyan('refrepo sync') + '    - Clone/pull all repos');
      } else {
        logger.error('Error: ' + result.error);
        process.exitCode = 1;
      }
    });
}

async function runInit(options: InitOptions): Promise<CommandResult<InitResult>> {
  const manifestPath = resolveManifestPath();

  // Check if manifest already exists
  if (manifestExists() && !options.force) {
    return {
      success: false,
      error: `Manifest already exists: ${manifestPath}\nUse --force to overwrite.`,
    };
  }

  // Create default manifest
  const manifest = getDefaultManifest();

  // Override root if specified
  if (options.root) {
    manifest.defaultRoot = resolveRoot(options.root);
  }

  // Save manifest
  try {
    const savedPath = saveManifest(manifest);
    const enabledCount = manifest.repos.filter((r) => r.enabled).length;

    return {
      success: true,
      data: {
        manifestPath: savedPath,
        root: manifest.defaultRoot,
        repoCount: manifest.repos.length,
        enabledCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
