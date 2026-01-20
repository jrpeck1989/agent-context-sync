import * as fs from 'fs';
import * as path from 'path';
import { getBuildOutput } from '../core/builder';
import { getProjectRoot } from '../core/config';

export async function validateCommand() {
  console.error('Validating generated files...');
  const buildOutputs = await getBuildOutput();
  const rootDir = getProjectRoot();
  let allFilesValid = true;

  for (const output of buildOutputs) {
    let filePath: string;
    
    if (output.isCursorRule) {
      filePath = path.join(rootDir, '.cursor', 'rules', output.outFile);
    } else {
      filePath = path.join(rootDir, output.outFile);
    }
    
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File ${output.outFile} not found. Please run "build" first.`);
      allFilesValid = false;
      continue;
    }

    const existingContent = fs.readFileSync(filePath, 'utf8');
    if (existingContent !== output.content) {
      console.error(`Error: File ${output.outFile} is out of date. Please run "build".`);
      allFilesValid = false;
    }
  }

  if (allFilesValid) {
    console.error('All generated files are up-to-date.');
  } else {
    process.exit(1);
  }
}
