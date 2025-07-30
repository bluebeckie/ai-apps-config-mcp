# AI Apps Configuration MCP Server

A Model Context Protocol (MCP) server that provides easy access to configuration files for popular AI applications. Pre-configured with common AI tools like Gemini, Claude Desktop, Claude Code, VS Code, and Cursor.

## Features

- Pre-configured mappings for popular AI applications
- Supports multiple configuration file formats (.plist, JSON, YAML, plain text)
- Provides tools to search, locate, and read config files
- Secure file operations with proper permission handling

## Installation

```bash
npm install
npm run build
```

## Usage

Start the server:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Making the code executable

To make the script directly executable from the command line, follow these steps:

1. **Add a `bin` entry to `package.json`**:
   This tells npm how to create a symbolic link to your executable file.

   ```json
   "bin": {
     "ai-apps-config-mcp": "dist/index.js"
   }
   ```

2. **Add a shebang to `src/index.ts`**:
   This line at the very top of your main script tells the system which interpreter to use.

   ```typescript
   #!/usr/bin/env node
   ```

3. **Make the file executable**:
   After building, you need to give the output file execution permissions.

   ```bash
   chmod +x dist/index.js
   ```

4. **Link the package**:
   `npm link` creates a global symbolic link from `ai-apps-config-mcp` to your project, allowing you to run it from anywhere.

   ```bash
   npm link
   ```

## MCP Tools

- `list_apps` - List all available applications with their configuration status
- `find_config` - Locate configuration files for a specific application
- `read_config` - Read and format configuration file contents
- `search_config` - Search within configuration files for specific settings
- `add_config_location` - Add new configuration locations for applications

## Supported Applications & Configuration Locations

The server currently supports these AI applications and their configuration files:

### Google Gemini
- `~/.gemini/settings.json` - Gemini settings configuration

### Claude Desktop
- `~/Library/Application Support/Claude/claude_desktop_config.json` - Claude Desktop configuration

### Claude Code
- `~/.claude/` - Claude Code configuration directory

### Visual Studio Code
- `~/.vscode/mcp.json` - VS Code MCP configuration

### Cursor
- `~/.cursor/mcp.json` - Cursor MCP configuration

## Adding New Applications

You can add support for new applications using the `add_config_location` tool:

```bash
# Example: Add a new config location
{
  "app": "new-app",
  "path": "~/.config/new-app/config.json",
  "type": "file",
  "description": "New App configuration",
  "format": "json"
}
```

## Example Configuration

### Claude Desktop

To use this MCP server with Claude Desktop, add the following configuration to your `claude-desktop-config.json` file. This assumes you have made the script executable and linked it using `npm link`.

```json
{
  "mcpServers": {
    "ai-apps-config": {
      "command": "npx",
      "args": [
        "ai-apps-config-mcp"
      ],
      "env": {}
    }
  }
}
```
Ask Claude Desktop to find my VScode mcp config
<img width="741" height="654" alt="find-config" src="https://github.com/user-attachments/assets/7b5095a4-7db1-4766-a5b9-7280ce0a014e" />


