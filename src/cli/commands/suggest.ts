/**
 * refrepo suggest - Use Claude to analyze new files and suggest ignore rules
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { Command } from 'commander';
import chalk from 'chalk';
import { addCustomIgnores, resolveManifestPath } from '../../core/manifest.js';
import { writeIgnoreFiles } from '../../core/ignore.js';
import { safeLoadManifest } from '../../core/manifest.js';
import { createLogger, printJson } from '../output.js';
import type { CommandResult } from '../../core/types.js';

const CHANGES_FILENAME = '.refrepo-changes.json';

interface SuggestOptions {
  json?: boolean;
  apply?: boolean;
}

interface ChangesFile {
  timestamp: string;
  baselineDate: string;
  totalFiles: number;
  newFiles: string[];
  removedFiles: string[];
  hasChanges: boolean;
}

interface SuggestResult {
  suggestions: string;
  patterns?: string[];
  applied?: boolean;
  patternsAdded?: number;
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
    .option('--apply', 'Apply suggested patterns to manifest and regenerate .mgrepignore')
    .action(async (options: SuggestOptions) => {
      const jsonMode = options.json === true;
      const applyMode = options.apply === true;
      const logger = createLogger({ jsonMode });

      const result = await runSuggest(logger, applyMode);

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
  logger: ReturnType<typeof createLogger>,
  applyMode: boolean
): Promise<CommandResult<SuggestResult>> {
  // Load changes file from manifest directory
  const manifestDir = path.dirname(resolveManifestPath());
  const changesPath = path.join(manifestDir, CHANGES_FILENAME);

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

  const prompt = applyMode ? buildApplyPrompt(changes.newFiles) : buildPrompt(changes.newFiles);

  try {
    const response = await callClaude(prompt);

    if (applyMode) {
      // Parse patterns from Claude's response
      const patterns = parsePatterns(response);

      if (patterns.length === 0) {
        logger.log(chalk.green('✓ Claude found no files to ignore'));
        logger.log('');
        logger.log(response);
        return {
          success: true,
          data: { suggestions: response, patterns: [], applied: true, patternsAdded: 0 },
        };
      }

      logger.log(chalk.bold('Patterns to ignore:'));
      for (const pattern of patterns) {
        logger.log(chalk.yellow(`  ${pattern}`));
      }
      logger.log('');

      // Add patterns to manifest
      const addResult = addCustomIgnores(patterns);
      if (!addResult.success) {
        return {
          success: false,
          error: `Failed to add patterns to manifest: ${addResult.error}`,
        };
      }

      if (addResult.added.length === 0) {
        logger.log(chalk.dim('All patterns already exist in manifest'));
      } else {
        logger.log(chalk.green(`✓ Added ${addResult.added.length} pattern(s) to manifest`));
      }

      // Regenerate .mgrepignore
      const manifestResult = safeLoadManifest();
      if (manifestResult.success && manifestResult.data) {
        writeIgnoreFiles(manifestResult.data, { global: true });
        logger.log(chalk.green('✓ Regenerated .mgrepignore'));
      }

      logger.log('');
      logger.log(chalk.dim('Run `refrepo plan` to see updated file counts'));

      return {
        success: true,
        data: {
          suggestions: response,
          patterns,
          applied: true,
          patternsAdded: addResult.added.length,
        },
      };
    } else {
      // Just show suggestions
      logger.log(chalk.bold('Suggestions:'));
      logger.log('');
      logger.log(response);
      logger.log('');
      logger.log(chalk.dim('Run `refrepo suggest --apply` to apply these patterns'));

      return {
        success: true,
        data: { suggestions: response },
      };
    }
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

function buildApplyPrompt(newFiles: string[]): string {
  const fileList = newFiles.map((f) => `  - ${f}`).join('\n');

  return `${TECH_STACK_CONTEXT}

The following NEW files have been added to our reference repos:

${fileList}

Analyze these files and return ONLY the ignore patterns for files that should NOT be indexed.

CRITICAL: Patterns MUST include the repository folder prefix (the first path component like "tanstack-router/", "better-auth-main/", etc.)

Return patterns in this exact format - one pattern per line, starting with "IGNORE:":
IGNORE: tanstack-router/examples/vue/
IGNORE: better-auth-main/docs/content/docs/examples/nuxt.mdx

Rules for patterns:
- ALWAYS include the repository prefix (first folder in the path)
- Use the exact file path for specific files
- Use trailing / for directories to ignore all contents
- Use * for wildcards when a whole directory should be ignored

If ALL files are relevant and should be kept, respond with exactly:
NONE

Be conservative - only ignore files that are clearly not relevant to our React/TanStack/Convex stack.`;
}

function parsePatterns(response: string): string[] {
  const patterns: string[] = [];

  // Check if Claude said none
  if (response.trim().toUpperCase() === 'NONE') {
    return [];
  }

  // Parse IGNORE: lines
  const lines = response.split('\n');
  for (const line of lines) {
    const match = line.match(/^IGNORE:\s*(.+)$/i);
    if (match) {
      const pattern = match[1].trim();
      if (pattern) {
        patterns.push(pattern);
      }
    }
  }

  return patterns;
}

function callClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use stdin for prompt to avoid E2BIG (argument list too long) errors
    const child = spawn('claude', ['-p', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
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

    // Write prompt to stdin and close
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
