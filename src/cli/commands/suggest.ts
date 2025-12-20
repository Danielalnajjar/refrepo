/**
 * refrepo suggest - Use Claude to analyze new files and suggest ignore rules
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { Command } from 'commander';
import chalk from 'chalk';
import { createLogger, printJson } from '../output.js';
import type { CommandResult } from '../../core/types.js';

const CHANGES_FILENAME = '.refrepo-changes.json';

interface SuggestOptions {
  json?: boolean;
}

interface ChangesFile {
  timestamp: string;
  baselineDate: string;
  totalFiles: number;
  newFiles: string[];
  removedFiles: string[];
  hasChanges: boolean;
}

const TECH_STACK_CONTEXT = `
Our tech stack:
- TanStack Start (React meta-framework)
- TanStack Router, Query, Table, Form
- Convex (backend/database)
- Better Auth (authentication)
- shadcn/ui (React components)
- Tailwind CSS
- TypeScript

We want to index code that's relevant to this stack. We should IGNORE:
- Non-React framework code (Vue, Solid, Angular, Svelte)
- Non-TanStack-Start examples (Next.js, Remix)
- Test files and fixtures
- Build artifacts and generated code
- Documentation that's not about our stack
- Binary files and media assets
`;

export function createSuggestCommand(): Command {
  return new Command('suggest')
    .description('Use Claude to analyze new files and suggest ignore rules')
    .option('--json', 'Output as JSON')
    .action(async (options: SuggestOptions) => {
      const jsonMode = options.json === true;
      const logger = createLogger({ jsonMode });

      const result = await runSuggest(logger);

      if (jsonMode) {
        printJson(result);
        if (!result.success) {
          process.exitCode = 1;
        }
      } else if (!result.success) {
        logger.error('Error: ' + result.error);
        process.exitCode = 1;
      }
    });
}

async function runSuggest(
  logger: ReturnType<typeof createLogger>
): Promise<CommandResult<{ suggestions: string }>> {
  // Load changes file
  const changesPath = path.join(process.cwd(), CHANGES_FILENAME);

  if (!fs.existsSync(changesPath)) {
    return {
      success: false,
      error: 'No changes file found. Run `refrepo plan` first.',
    };
  }

  const changes: ChangesFile = JSON.parse(fs.readFileSync(changesPath, 'utf-8'));

  if (!changes.hasChanges || changes.newFiles.length === 0) {
    logger.log(chalk.dim('No new files to analyze.'));
    return {
      success: true,
      data: { suggestions: 'No new files to analyze.' },
    };
  }

  logger.log(chalk.bold('Analyzing new files with Claude...'));
  logger.log(chalk.dim(`Found ${changes.newFiles.length} new files`));
  logger.log('');

  const prompt = buildPrompt(changes.newFiles);

  try {
    const response = await callClaude(prompt);

    logger.log(chalk.bold('Suggestions:'));
    logger.log('');
    logger.log(response);

    return {
      success: true,
      data: { suggestions: response },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildPrompt(newFiles: string[]): string {
  const fileList = newFiles.map((f) => `  - ${f}`).join('\n');

  return `${TECH_STACK_CONTEXT}

The following NEW files have been added to our reference repos and will be indexed for semantic search:

${fileList}

Analyze these files and tell me:
1. Which files should be IGNORED (not relevant to our stack)?
2. Which files should be KEPT (relevant to our stack)?

For files to ignore, provide the exact path patterns I should add to my ignore rules.

Be concise. Focus only on files that are clearly irrelevant to our stack.
If all files look relevant, just say "All files look relevant to your stack."`;
}

function callClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude exited with code ${code}: ${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to run Claude: ${error.message}. Is Claude Code installed?`));
    });
  });
}
