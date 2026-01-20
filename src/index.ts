#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { initCommand } from './commands/init';
import { buildCommand } from './commands/build';
import { watchCommand } from './commands/watch';
import { validateCommand } from './commands/validate';
import { serveCommand } from './commands/serve';

const program = new Command();

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

program
  .name('agent-context-sync')
  .description('A CLI and server for managing and serving agent context.')
  .version(packageJson.version);

// Placeholder for commands
program.command('init')
  .description('Scaffold a new project')
  .action(initCommand);

program.command('build')
  .description('Build the physical agent files')
  .action(buildCommand);

program.command('watch')
  .description('Watch for changes and rebuild files')
  .action(watchCommand);

program.command('serve')
  .description('Start the interactive MCP server')
  .option('--stdio', 'Use stdio for communication instead of HTTP')
  .option('--project-dir <path>', 'Path to the project directory (defaults to current directory)')
  .action(serveCommand);

program.command('validate')
  .description('Validate that the generated files are up-to-date')
  .action(validateCommand);

program.parse(process.argv);
