/**
 * refrepo doctor - Verify dependencies
 */

import { Command } from 'commander';
import { execSync } from 'child_process';
import { ENV_VARS } from '../../core/constants.js';
import { createLogger, printJson } from '../output.js';
import type { CommandResult, DoctorResult } from '../../core/types.js';

interface DoctorOptions {
  json?: boolean;
}

export function createDoctorCommand(): Command {
  return new Command('doctor')
    .description('Verify dependencies (git, mgrep)')
    .option('--json', 'Output as JSON')
    .action(async (options: DoctorOptions) => {
      const jsonMode = options.json === true;
      const logger = createLogger({ jsonMode });

      const result = await runDoctor(logger);

      if (jsonMode) {
        printJson(result);
        if (!result.success) {
          process.exitCode = 1;
        }
      } else if (result.success && result.data) {
        const d = result.data;
        logger.log('Dependency Check:');
        logger.log(`  git:    ${d.git.found ? `✓ ${d.git.version}` : '✗ not found'}`);
        logger.log(`  mgrep:  ${d.mgrep.found ? `✓ ${d.mgrep.version}` : '⚠ not found (optional)'}`);
        logger.log(`  API key: ${d.apiKey.found ? '✓ set' : '⚠ not set'}`);

        if (d.apiKey.deprecated) {
          logger.warn(`  ⚠ Using deprecated ${ENV_VARS.mgrepApiKeyLegacy}. Please migrate to ${ENV_VARS.mgrepApiKey}`);
        }
      } else {
        logger.error('Error: ' + result.error);
        process.exitCode = 1;
      }
    });
}

function getCommandVersion(command: string, versionFlag = '--version'): { found: boolean; version?: string; path?: string } {
  try {
    const output = execSync(`${command} ${versionFlag}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const version = output.split('\n')[0];

    let cmdPath: string | undefined;
    // Skip path lookup on Windows (no 'which' command)
    if (process.platform !== 'win32') {
      try {
        cmdPath = execSync(`which ${command}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
      } catch {
        // Ignore - path lookup is optional
      }
    }

    return { found: true, version, path: cmdPath };
  } catch {
    return { found: false };
  }
}

function checkApiKey(): { found: boolean; masked?: string; deprecated?: boolean } {
  // Check canonical env var first
  const primaryKey = process.env[ENV_VARS.mgrepApiKey];
  if (primaryKey) {
    return {
      found: true,
      masked: primaryKey.substring(0, 4) + '...' + primaryKey.substring(primaryKey.length - 4),
      deprecated: false,
    };
  }

  // Check legacy env var with deprecation warning
  const legacyKey = process.env[ENV_VARS.mgrepApiKeyLegacy];
  if (legacyKey) {
    return {
      found: true,
      masked: legacyKey.substring(0, 4) + '...' + legacyKey.substring(legacyKey.length - 4),
      deprecated: true,
    };
  }

  return { found: false };
}

async function runDoctor(logger: ReturnType<typeof createLogger>): Promise<CommandResult<DoctorResult & { apiKey: { deprecated?: boolean } }>> {
  const git = getCommandVersion('git');
  const mgrep = getCommandVersion('mgrep', '--version');
  const apiKey = checkApiKey();

  return {
    success: true,
    data: {
      git,
      mgrep,
      apiKey,
    },
  };
}
