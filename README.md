# AI Apps Configuration MCP Server

A Model Context Protocol (MCP) server that helps locate and read configuration files for different AI applications without memorizing their paths.

## Features

- Automatically discovers configuration files for popular AI applications
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

## MCP Tools

- `find_config` - Locate configuration files for a specific application
- `list_configs` - Show all discovered configuration files
- `read_config` - Read and format configuration file contents
- `search_configs` - Search within configuration files for specific settings

## Configuration File Locations

The server scans these common macOS configuration locations:
- `~/Library/Preferences/` - Application preferences (.plist files)
- `~/Library/Application Support/` - Application support files
- `~/Library/Containers/` - Sandboxed application containers
- `~/.config/` - XDG-compliant configuration files
- Shell configuration files (`~/.zshrc`, `~/.zprofile`, etc.)