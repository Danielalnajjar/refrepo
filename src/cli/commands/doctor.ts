/**
 * refrepo doctor - Verify dependencies
 */

import { Command } from 'commander';
import type { CommandResult, DoctorResult } from '../../core/types.js';

interface DoctorOptions {
  json?: boolean;
}

export function createDoctorCommand(): Command {
  return new Command('doctor')
    .description('Verify dependencies (git, mgrep)')
    .option('--json', 'Output as JSON')
    .action(async (options: DoctorOptions) => {
      const result = await runDoctor(options);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (result.success && result.data) {
        const d = result.data;
        console.log('Dependency Check:');
        console.log(`  git:    ${d.git.found ? `✓ ${d.git.version}` : '✗ not found'}`);
        console.log(`  mgrep:  ${d.mgrep.found ? `✓ ${d.mgrep.version}` : '⚠ not found (optional)'}`);
        console.log(`  API key: ${d.apiKey.found ? '✓ set' : '⚠ not set'}`);
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    });
}

async function runDoctor(options: DoctorOptions): Promise<CommandResult<DoctorResult>> {
  // TODO: Implement in Phase 3
  return {
    success: true,
    data: {
      git: { found: false },
      mgrep: { found: false },
      apiKey: { found: false },
    },
  };
}
