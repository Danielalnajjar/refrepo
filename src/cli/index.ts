#!/usr/bin/env node
/**
 * Reference Repo Manager CLI
 *
 * Manage local reference repositories with mgrep integration.
 */

import { Command } from 'commander';
import { createInitCommand } from './commands/init.js';
import { createStatusCommand } from './commands/status.js';
import { createSyncCommand } from './commands/sync.js';
import { createPlanCommand } from './commands/plan.js';
import { createIgnoreCommand } from './commands/ignore.js';
import { createIndexCommand } from './commands/index-cmd.js';
import { createReportCommand } from './commands/report.js';
import { createDoctorCommand } from './commands/doctor.js';
import { createSearchCommand } from './commands/search.js';

const program = new Command();

program
  .name('refrepo')
  .description('Reference Repo Manager - Manage local repos with mgrep integration')
  .version('0.1.0');

// Register all commands
program.addCommand(createInitCommand());
program.addCommand(createStatusCommand());
program.addCommand(createSyncCommand());
program.addCommand(createPlanCommand());
program.addCommand(createIgnoreCommand());
program.addCommand(createIndexCommand());
program.addCommand(createReportCommand());
program.addCommand(createDoctorCommand());
program.addCommand(createSearchCommand());

// Parse and execute
program.parse();
