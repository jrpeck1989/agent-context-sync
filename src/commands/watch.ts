import * as chokidar from 'chokidar';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { runBuild } from '../core/builder';
import { getProjectRoot } from '../core/config';

// A simple debounce function
function debounce(func: () => void, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction() {
    const later = () => {
      clearTimeout(timeout);
      func();
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function watchCommand() {
  const rootDir = getProjectRoot();
  const configPath = path.join(rootDir, '.agent-instructions.yaml');

  if (!fs.existsSync(configPath)) {
    console.error('Error: .agent-instructions.yaml not found. Please run "init" first.');
    process.exit(1);
  }

  const config = yaml.load(fs.readFileSync(configPath, 'utf8')) as any;
  const partialsDir = path.join(rootDir, config.partialsDir);
  const templatesDir = path.join(rootDir, config.templatesDir);

  console.error(`Watching for changes in ${config.partialsDir} and ${config.templatesDir}...`);

  const debouncedBuild = debounce(runBuild, 300);

  const watcher = chokidar.watch([partialsDir, templatesDir], {
    ignored: /(^|[\/])\../, // ignore dotfiles
    persistent: true
  });

  watcher
    .on('add', path => { console.error(`File ${path} has been added`); debouncedBuild(); })
    .on('change', path => { console.error(`File ${path} has been changed`); debouncedBuild(); })
    .on('unlink', path => { console.error(`File ${path} has been removed`); debouncedBuild(); });
}
