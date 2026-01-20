import * as fs from "fs";
import * as path from "path";

// Cached project root to avoid repeated filesystem checks
let cachedProjectRoot: string | null = null;

/**
 * Gets the project root directory with multiple fallback options:
 * 1. AGENT_CONTEXT_PROJECT_DIR environment variable (highest priority)
 * 2. Current working directory (process.cwd())
 * 
 * The function validates that the directory exists and contains .agent-instructions.yaml
 */
export function getProjectRoot(): string {
  // Return cached value if already determined
  if (cachedProjectRoot !== null) {
    return cachedProjectRoot;
  }

  // Priority 1: Check environment variable
  const envProjectDir = process.env.AGENT_CONTEXT_PROJECT_DIR;
  if (envProjectDir) {
    const resolvedPath = path.resolve(envProjectDir);
    if (validateProjectRoot(resolvedPath)) {
      cachedProjectRoot = resolvedPath;
      console.error(`[agent-context-sync] Using project directory from AGENT_CONTEXT_PROJECT_DIR: ${resolvedPath}`);
      return cachedProjectRoot;
    } else {
      console.error(
        `[agent-context-sync] Warning: AGENT_CONTEXT_PROJECT_DIR is set to "${envProjectDir}" but this is not a valid project directory. Falling back to current working directory.`
      );
    }
  }

  // Priority 2: Use current working directory
  const cwd = process.cwd();
  if (validateProjectRoot(cwd)) {
    cachedProjectRoot = cwd;
    console.error(`[agent-context-sync] Using current working directory as project root: ${cwd}`);
    return cachedProjectRoot;
  }

  // No valid project root found
  throw new Error(
    `Unable to determine project root directory. Tried:\n` +
    `  1. AGENT_CONTEXT_PROJECT_DIR environment variable: ${envProjectDir || '(not set)'}\n` +
    `  2. Current working directory: ${cwd}\n\n` +
    `Please ensure you are running from a project directory containing .agent-instructions.yaml,\n` +
    `or set the AGENT_CONTEXT_PROJECT_DIR environment variable to your project path.`
  );
}

/**
 * Validates that a directory exists and contains .agent-instructions.yaml
 */
function validateProjectRoot(dir: string): boolean {
  try {
    // Check if directory exists
    if (!fs.existsSync(dir)) {
      return false;
    }

    // Check if it's actually a directory
    const stats = fs.statSync(dir);
    if (!stats.isDirectory()) {
      return false;
    }

    // Check for .agent-instructions.yaml
    const configPath = path.join(dir, ".agent-instructions.yaml");
    if (!fs.existsSync(configPath)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Resets the cached project root (primarily for testing)
 */
export function resetProjectRoot(): void {
  cachedProjectRoot = null;
}

/**
 * Manually sets the project root (useful when specified via CLI options)
 */
export function setProjectRoot(dir: string): void {
  const resolvedPath = path.resolve(dir);
  if (!validateProjectRoot(resolvedPath)) {
    throw new Error(
      `Invalid project directory: "${dir}"\n` +
      `Directory must exist and contain .agent-instructions.yaml file.`
    );
  }
  cachedProjectRoot = resolvedPath;
  console.error(`[agent-context-sync] Project root set to: ${resolvedPath}`);
}
