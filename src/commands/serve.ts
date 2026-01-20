import { startServer } from '../server';
import { setProjectRoot } from '../core/config';

export async function serveCommand(options: { stdio?: boolean; projectDir?: string }) {
  // If project directory is specified via CLI, set it before starting the server
  if (options.projectDir) {
    try {
      setProjectRoot(options.projectDir);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }
  
  await startServer(options);
}
