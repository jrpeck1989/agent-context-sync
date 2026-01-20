import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { spawn, ChildProcess } from "child_process";
import { runBuild } from "./builder";
import { z } from "zod";
import { getProjectRoot } from "./config";

// Simplified schema for tools - we only need the directory paths
const ToolsConfigSchema = z.object({
  partialsDir: z.string(),
  templatesDir: z.string(),
});

// Global state for watcher process
let watcherProcess: ChildProcess | null = null;

// Function to get config paths
function getConfigPaths(): { partialsDir: string; templatesDir: string } {
  const rootDir = getProjectRoot();
  const configPath = path.join(rootDir, ".agent-instructions.yaml");

  if (!fs.existsSync(configPath)) {
    // Fallback to default if config doesn't exist
    console.warn(
      "Warning: .agent-instructions.yaml not found. Using default 'docs' directory."
    );
    return {
      partialsDir: path.join(rootDir, "docs/agent-partials"),
      templatesDir: path.join(rootDir, "docs/agent-templates"),
    };
  }

  try {
    const config = yaml.load(fs.readFileSync(configPath, "utf8"));
    const validatedConfig = ToolsConfigSchema.parse(config);
    return {
      partialsDir: path.join(rootDir, validatedConfig.partialsDir),
      templatesDir: path.join(rootDir, validatedConfig.templatesDir),
    };
  } catch (error) {
    console.warn(
      `Warning: Error reading config file: ${
        error instanceof Error ? error.message : "Unknown error"
      }. Using default 'docs' directory.`
    );
    return {
      partialsDir: path.join(rootDir, "docs/agent-partials"),
      templatesDir: path.join(rootDir, "docs/agent-templates"),
    };
  }
}

export const toolSchemas = [
  {
    name: "list_partials",
    description: "Lists all available content partials.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "read_partial",
    description: "Reads the content of a specific partial.",
    inputSchema: {
      type: "object",
      properties: {
        partial_name: {
          type: "string",
          description: "The name of the partial to read.",
        },
      },
      required: ["partial_name"],
    },
  },
  {
    name: "update_partial",
    description: "Overwrites the content of a specific partial file.",
    inputSchema: {
      type: "object",
      properties: {
        partial_name: {
          type: "string",
          description: "The name of the partial to update.",
        },
        new_content: {
          type: "string",
          description: "The new, complete content for the partial.",
        },
      },
      required: ["partial_name", "new_content"],
    },
  },
  {
    name: "build_context_files",
    description:
      "Triggers the build process to regenerate all physical agent files from the partials.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_new_partial",
    description: "Creates a new partial file.",
    inputSchema: {
      type: "object",
      properties: {
        partial_name: {
          type: "string",
          description: "The name of the partial to create.",
        },
        content: {
          type: "string",
          description: "The content of the partial to create.",
        },
      },
      required: ["partial_name", "content"],
    },
  },
  {
    name: "list_templates",
    description: "Lists all available templates.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "read_template",
    description: "Reads the content of a specific template.",
    inputSchema: {
      type: "object",
      properties: {
        template_name: {
          type: "string",
          description: "The name of the template to read.",
        },
      },
      required: ["template_name"],
    },
  },
  {
    name: "update_template",
    description: "Overwrites the content of a specific template file.",
    inputSchema: {
      type: "object",
      properties: {
        template_name: {
          type: "string",
          description: "The name of the template to update.",
        },
        new_content: {
          type: "string",
          description: "The new, complete content for the template.",
        },
      },
      required: ["template_name", "new_content"],
    },
  },
  {
    name: "start_watcher",
    description:
      "Starts the agent-context-sync watcher to monitor file changes and auto-rebuild context files.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "stop_watcher",
    description: "Stops the currently running agent-context-sync watcher process.",
    inputSchema: { type: "object", properties: {} },
  },
];

interface ToolImplementations {
  [key: string]: (...args: any[]) => any;
}

export const toolImplementations: ToolImplementations = {
  list_partials: () => {
    const { partialsDir } = getConfigPaths();
    return fs.readdirSync(partialsDir);
  },
  read_partial: ({ partial_name }: { partial_name: string }) => {
    const { partialsDir } = getConfigPaths();
    const partialPath = path.join(partialsDir, partial_name);
    return fs.readFileSync(partialPath, "utf8");
  },
  update_partial: ({
    partial_name,
    new_content,
  }: {
    partial_name: string;
    new_content: string;
  }) => {
    const { partialsDir } = getConfigPaths();
    const partialPath = path.join(partialsDir, partial_name);
    fs.writeFileSync(partialPath, new_content);
    return { success: true };
  },
  build_context_files: async () => {
    // Run build in current working directory
    await runBuild();
    return { success: true };
  },
  create_new_partial: ({
    partial_name,
    content,
  }: {
    partial_name: string;
    content: string;
  }) => {
    const { partialsDir } = getConfigPaths();
    const partialPath = path.join(partialsDir, partial_name);
    fs.writeFileSync(partialPath, content);
    return { success: true };
  },
  list_templates: () => {
    const { templatesDir } = getConfigPaths();
    return fs.readdirSync(templatesDir);
  },
  read_template: ({ template_name }: { template_name: string }) => {
    const { templatesDir } = getConfigPaths();
    const templatePath = path.join(templatesDir, template_name);
    return fs.readFileSync(templatePath, "utf8");
  },
  update_template: ({
    template_name,
    new_content,
  }: {
    template_name: string;
    new_content: string;
  }) => {
    const { templatesDir } = getConfigPaths();
    const templatePath = path.join(templatesDir, template_name);
    fs.writeFileSync(templatePath, new_content);
    return { success: true };
  },
  start_watcher: () => {
    if (watcherProcess && !watcherProcess.killed) {
      return { success: false, message: "Watcher is already running" };
    }

    try {
      // Get the path to the current binary
      const executablePath = process.execPath; // Path to node
      const scriptPath = path.resolve(__dirname, "../index.js");

      // Check if compiled version exists, otherwise use ts-node for development
      const isBuilt = fs.existsSync(scriptPath);

      if (isBuilt) {
        // Use the built version
        watcherProcess = spawn(executablePath, [scriptPath, "watch"], {
          stdio: "pipe",
          detached: false,
        });
      } else {
        // Use ts-node for development
        const tsNodePath = path.resolve(
          getProjectRoot(),
          "node_modules/.bin/ts-node"
        );
        const srcScriptPath = path.resolve(__dirname, "../index.ts");

        if (fs.existsSync(tsNodePath)) {
          watcherProcess = spawn(tsNodePath, [srcScriptPath, "watch"], {
            stdio: "pipe",
            detached: false,
          });
        } else {
          // Fallback to npx ts-node
          watcherProcess = spawn("npx", ["ts-node", srcScriptPath, "watch"], {
            stdio: "pipe",
            detached: false,
          });
        }
      }

      watcherProcess.stdout?.on("data", (data) => {
        console.log(`Watcher: ${data}`);
      });

      watcherProcess.stderr?.on("data", (data) => {
        console.error(`Watcher: ${data}`);
      });

      watcherProcess.on("close", (code) => {
        console.error(`Watcher process exited with code ${code}`);
        watcherProcess = null;
      });

      watcherProcess.on("error", (error) => {
        console.error(`Watcher process error: ${error.message}`);
        watcherProcess = null;
      });

      return {
        success: true,
        message: "Watcher started successfully",
        pid: watcherProcess.pid,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to start watcher: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
  stop_watcher: () => {
    if (!watcherProcess || watcherProcess.killed) {
      return {
        success: false,
        message: "No watcher process is currently running",
      };
    }

    try {
      watcherProcess.kill("SIGTERM");

      // Give it a moment to gracefully shutdown, then force kill if needed
      setTimeout(() => {
        if (watcherProcess && !watcherProcess.killed) {
          watcherProcess.kill("SIGKILL");
        }
      }, 5000);

      return { success: true, message: "Watcher stop signal sent" };
    } catch (error) {
      return {
        success: false,
        message: `Failed to stop watcher: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }
};
