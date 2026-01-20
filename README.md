# Agent Context Sync & Serve Tool

A comprehensive CLI tool and Model Context Protocol (MCP) server that solves the challenge of keeping AI agent documentation synchronized and up-to-date. This tool enables both manual content management and programmatic updates by AI agents themselves.

## The Problem

Managing context files for multiple AI agents presents several challenges:

- **Multi-Agent Synchronization**: Different AI agents require separate instruction files (`CLAUDE.md`, `GEMINI.md`, etc.), leading to content drift and inconsistencies
- **Manual Maintenance**: Keeping documentation in sync manually is time-consuming and error-prone
- **Stale Documentation**: As codebases evolve, static documentation quickly becomes outdated
- **No Feedback Loop**: Agents can't update their own context after completing work

## The Solution

This tool provides a **partials-to-templates architecture** with **MCP integration**:

### 🎯 **Single Source of Truth**
All content lives in manageable markdown partials in `docs/agent-partials/`, ensuring consistency and atomic updates.

### 🔧 **Template-Based Generation** 
Mustache templates in `docs/agent-templates/` define how partials are assembled into agent-specific files, allowing for customized formatting and selective content inclusion.

### 🤖 **Interactive MCP Server**
A Model Context Protocol compliant server that exposes tools for agents to programmatically read, update, and rebuild their own documentation.

### 🔄 **Closed-Loop System**
Agents can update their context after performing work, creating living documentation that stays current with the codebase.

## Getting Started

### Prerequisites
- Node.js 18+ 
- Package manager: npm, pnpm, or yarn

### Installation

#### **Global Installation (Recommended)**
```bash
# Using pnpm
pnpm add -g agent-context-sync

# Using npm
npm install -g agent-context-sync

# Using yarn
yarn global add agent-context-sync
```

#### **One-time Usage (No Installation)**
```bash
# Using pnpm
pnpm dlx agent-context-sync init

# Using npm
npx agent-context-sync init

# Using yarn
yarn dlx agent-context-sync init
```

### Quick Start

1. **Initialize a New Project:**
   ```bash
   agent-context-sync init
   ```
   This creates:
   - `docs/agent-partials/` - Source markdown partials
   - `docs/agent-templates/` - Mustache templates for different agents
   - `.agent-instructions.yaml` - Configuration file

2. **Build Agent Files:**
   ```bash
   agent-context-sync build
   ```
   Generates agent-specific files (e.g., `CLAUDE.md`, `GEMINI.md`) from partials and templates.

3. **Watch for Changes (Optional):**
   ```bash
   agent-context-sync watch
   ```
   Auto-rebuilds agent files when partials or templates change.

## CLI Commands

| Command | Description |
|---------|-------------|
| `agent-context-sync init` | Scaffolds new project structure with directories and config |
| `agent-context-sync build` | Generates agent files from partials using templates |
| `agent-context-sync watch` | Auto-rebuilds agent files when partials/templates change |
| `agent-context-sync serve` | Starts MCP server (HTTP mode on port 3000) |
| `agent-context-sync serve --stdio` | Starts MCP server in stdio mode for direct agent integration |
| `agent-context-sync validate` | Validates that generated files are in sync (perfect for CI) |

## Project Structure

```
agent-context-sync/
├── docs/
│   ├── agent-partials/     # 📝 Source markdown content
│   │   ├── overview.md
│   │   ├── project-architecture.md
│   │   └── how-to-update.md
│   └── agent-templates/    # 🎨 Mustache templates
│       ├── claude.md.tmpl
│       ├── gemini.md.tmpl
│       └── agents.md.tmpl
├── .agent-instructions.yaml # ⚙️ Build configuration
├── CLAUDE.md               # 🤖 Generated agent files
├── GEMINI.md               # 🤖 Generated agent files
└── AGENTS.md               # 🤖 Generated agent files
```

## MCP Server Configuration

### Adding to Cursor

To use this MCP server with Cursor IDE, add the following configuration to your Cursor settings:

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Search for "MCP" or navigate to Extensions > MCP
3. Add a new MCP server configuration:

**Option 1: Using environment variable (Recommended)**
```json
{
  "mcpServers": {
    "agent-context-sync": {
      "command": "agent-context-sync",
      "args": ["serve", "--stdio"],
      "env": {
        "AGENT_CONTEXT_PROJECT_DIR": "/absolute/path/to/your/project"
      }
    }
  }
}
```

**Option 2: Using CLI option**
```json
{
  "mcpServers": {
    "agent-context-sync": {
      "command": "agent-context-sync",
      "args": ["serve", "--stdio", "--project-dir", "/absolute/path/to/your/project"]
    }
  }
}
```

**Note:** Replace `/absolute/path/to/your/project` with the actual path to your project directory containing `.agent-instructions.yaml`.

### Adding to Claude Desktop

To use this MCP server with Claude Desktop, add the following configuration to your Claude settings file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Option 1: Using environment variable (Recommended)**
```json
{
  "mcpServers": {
    "agent-context-sync": {
      "command": "agent-context-sync",
      "args": ["serve", "--stdio"],
      "env": {
        "AGENT_CONTEXT_PROJECT_DIR": "/absolute/path/to/your/project"
      }
    }
  }
}
```

**Option 2: Using CLI option**
```json
{
  "mcpServers": {
    "agent-context-sync": {
      "command": "agent-context-sync",
      "args": ["serve", "--stdio", "--project-dir", "/absolute/path/to/your/project"]
    }
  }
}
```

**Note:** Replace `/absolute/path/to/your/project` with the actual path to your project directory containing `.agent-instructions.yaml`.

### Adding to Other MCP Clients

For any MCP-compatible client, you can:
- **Stdio Mode**: Use `agent-context-sync serve --stdio` for direct integration
- **HTTP Mode**: Use `agent-context-sync serve` and connect to `http://localhost:3000/mcp`

### Troubleshooting: Project Directory Resolution

The MCP server needs to know which project directory to use. It determines this using the following priority order:

1. **`AGENT_CONTEXT_PROJECT_DIR` environment variable** (highest priority) - Set this in your MCP client configuration
2. **`--project-dir` CLI option** - Pass this as an argument when starting the server
3. **Current working directory** - Falls back to the directory from which the server was started

**Common Issue:** If you see errors like "file not found" or the server looks in your home directory, it means the project directory isn't being set correctly. Use one of the configuration options above to explicitly set your project path.

**Example Error Messages:**
- `.agent-instructions.yaml not found` - The server is looking in the wrong directory
- `Unable to determine project root directory` - No valid project configuration was found

**Solution:** Always use the `env.AGENT_CONTEXT_PROJECT_DIR` setting in your MCP client configuration to ensure the server knows where your project is located.

## MCP Server & Tools

The MCP server provides programmatic access to agent context management through four core tools:

### Available MCP Tools

| Tool | Purpose | Parameters |
|------|---------|------------|
| `list_partials` | List all available content partials | None |
| `read_partial` | Read content of a specific partial | `partial_name: string` |
| `update_partial` | Overwrite a partial file | `partial_name: string`, `new_content: string` |
| `build_context_files` | Rebuild all agent files from partials | None |

### Running the MCP Server

**HTTP Mode (for testing):**
```bash
agent-context-sync serve
# Server available at http://localhost:3000/mcp
```

**Stdio Mode (for agent integration):**
```bash
agent-context-sync serve --stdio
# Communicates via stdin/stdout for direct MCP client integration
```

### Testing the HTTP Server

1. **Tool Discovery:**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"mcp.discover","id":1}' \
     http://localhost:3000/mcp
   ```

2. **List Partials:**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"list_partials","id":2}' \
     http://localhost:3000/mcp
   ```

3. **Read a Partial:**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"read_partial","params":{"partial_name":"overview.md"},"id":3}' \
     http://localhost:3000/mcp
   ```

4. **Update and Rebuild:**
   ```bash
   # Update a partial
   curl -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"update_partial","params":{"partial_name":"test.md","new_content":"# Updated content"},"id":4}' \
     http://localhost:3000/mcp
   
   # Rebuild all agent files
   curl -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"build_context_files","id":5}' \
     http://localhost:3000/mcp
   ```

## Configuration

The `.agent-instructions.yaml` file controls how partials are assembled:

```yaml
schema: 1
partialsDir: docs/agent-partials
templatesDir: docs/agent-templates
output:
  - agent: claude
    template: claude.md.tmpl
    outFile: CLAUDE.md
  - agent: gemini  
    template: gemini.md.tmpl
    outFile: GEMINI.md
  - agent: agents
    template: agents.md.tmpl
    outFile: AGENTS.md
```

## Use Cases

- **Documentation Teams**: Maintain consistent agent instructions across multiple AI tools
- **Development Teams**: Keep agent context synchronized with codebase changes
- **AI Agents**: Self-update documentation after completing tasks
- **CI/CD Pipelines**: Validate documentation consistency with `agent-context-sync validate`
- **Template Customization**: Create agent-specific formatting and content selection

---

*This project enables a new paradigm where documentation becomes a living, collaborative asset between humans and AI agents.*