#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { AppConfigMapping, ConfigLocation } from './app-config-mapping.js';
import { ConfigReader } from './config-reader.js';

class MacOSConfigServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'ai-apps-config-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const allConfigs = await AppConfigMapping.getAllAvailableConfigs();
      const resources = [];

      for (const [appKey, configs] of Object.entries(allConfigs)) {
        const appConfig = AppConfigMapping.getAppConfig(appKey);
        if (appConfig && configs.length > 0) {
          resources.push({
            uri: `config://${appKey}`,
            mimeType: 'application/json',
            name: `${appConfig.displayName} Configuration`,
            description: `Configuration files for ${appConfig.displayName}`,
          });
        }
      }

      return { resources };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const match = uri.match(/^config:\/\/(.+)$/);
      
      if (!match) {
        throw new Error(`Invalid resource URI: ${uri}`);
      }

      const appKey = match[1];
      const configs = await AppConfigMapping.findConfigsForApp(appKey);
      
      if (configs.length === 0) {
        throw new Error(`No configurations found for app: ${appKey}`);
      }

      const configContents = await Promise.all(
        configs.map(config => ConfigReader.readConfig(config))
      );

      const result = {
        app: AppConfigMapping.getAppConfig(appKey)?.displayName || appKey,
        configs: configContents.map(content => ({
          path: content.path,
          format: content.format,
          content: content.content,
          parsed: content.parsed,
          error: content.error
        }))
      };

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_apps',
            description: 'List all available applications with configuration mappings',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'find_config',
            description: 'Find configuration files for a specific application',
            inputSchema: {
              type: 'object',
              properties: {
                app: {
                  type: 'string',
                  description: 'Application name (gemini, claude desktop, claude code, vscode, cursor)',
                },
              },
              required: ['app'],
            },
          },
          {
            name: 'read_config',
            description: 'Read and display configuration file contents',
            inputSchema: {
              type: 'object',
              properties: {
                app: {
                  type: 'string',
                  description: 'Application name',
                },
                config_path: {
                  type: 'string',
                  description: 'Optional: specific config file path to read',
                },
              },
              required: ['app'],
            },
          },
          {
            name: 'search_config',
            description: 'Search for specific content within configuration files',
            inputSchema: {
              type: 'object',
              properties: {
                app: {
                  type: 'string',
                  description: 'Application name',
                },
                search_term: {
                  type: 'string',
                  description: 'Term to search for in configuration files',
                },
              },
              required: ['app', 'search_term'],
            },
          },
          {
            name: 'add_config_location',
            description: 'Add a new configuration location for an application',
            inputSchema: {
              type: 'object',
              properties: {
                app: {
                  type: 'string',
                  description: 'Application name',
                },
                path: {
                  type: 'string',
                  description: 'Path to configuration file or directory',
                },
                type: {
                  type: 'string',
                  enum: ['file', 'directory'],
                  description: 'Whether the path is a file or directory',
                },
                description: {
                  type: 'string',
                  description: 'Description of what this configuration contains',
                },
                format: {
                  type: 'string',
                  enum: ['json', 'plist', 'yaml', 'text', 'directory'],
                  description: 'Format of the configuration file',
                },
              },
              required: ['app', 'path', 'type', 'description', 'format'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'list_apps': {
          const apps = AppConfigMapping.getAvailableApps();
          const result = [];
          
          for (const appKey of apps) {
            const appConfig = AppConfigMapping.getAppConfig(appKey);
            const configs = await AppConfigMapping.findConfigsForApp(appKey);
            
            result.push({
              key: appKey,
              displayName: appConfig?.displayName || appKey,
              bundleId: appConfig?.bundleId,
              configCount: configs.length,
              hasConfigs: configs.length > 0
            });
          }

          return {
            content: [
              {
                type: 'text',
                text: `Available applications:\n\n${result
                  .map(app => `• ${app.displayName} (${app.key}) - ${app.configCount} configs ${app.hasConfigs ? '✅' : '❌'}`)
                  .join('\n')}`
              }
            ]
          };
        }

        case 'find_config': {
          const { app } = args as { app: string };
          const configs = await AppConfigMapping.findConfigsForApp(app);
          
          if (configs.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No configurations found for "${app}". Available apps: ${AppConfigMapping.getAvailableApps().join(', ')}`
                }
              ]
            };
          }

          const appConfig = AppConfigMapping.getAppConfig(app);
          let result = `Configuration files for ${appConfig?.displayName || app}:\n\n`;
          
          configs.forEach((config, index) => {
            result += `${index + 1}. ${config.description}\n`;
            result += `   Path: ${config.path}\n`;
            result += `   Type: ${config.type} (${config.format})\n\n`;
          });

          return {
            content: [{ type: 'text', text: result }]
          };
        }

        case 'read_config': {
          const { app, config_path } = args as { app: string; config_path?: string };
          const configs = await AppConfigMapping.findConfigsForApp(app);
          
          if (configs.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No configurations found for "${app}"`
                }
              ]
            };
          }

          let targetConfigs = configs;
          if (config_path) {
            targetConfigs = configs.filter(c => c.path.includes(config_path));
            if (targetConfigs.length === 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `No configuration found matching path "${config_path}" for app "${app}"`
                  }
                ]
              };
            }
          }

          const results = await Promise.all(
            targetConfigs.map(config => ConfigReader.readConfig(config))
          );

          const output = results
            .map(content => ConfigReader.formatConfigForDisplay(content))
            .join('\n\n' + '='.repeat(80) + '\n\n');

          return {
            content: [{ type: 'text', text: output }]
          };
        }

        case 'search_config': {
          const { app, search_term } = args as { app: string; search_term: string };
          const configs = await AppConfigMapping.findConfigsForApp(app);
          
          if (configs.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No configurations found for "${app}"`
                }
              ]
            };
          }

          const results = [];
          for (const config of configs) {
            const matches = await ConfigReader.searchInConfig(config, search_term);
            if (matches.length > 0) {
              results.push({
                path: config.path,
                description: config.description,
                matches
              });
            }
          }

          if (results.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No matches found for "${search_term}" in ${app} configurations`
                }
              ]
            };
          }

          let output = `Search results for "${search_term}" in ${app} configurations:\n\n`;
          results.forEach(result => {
            output += `📄 ${result.path}\n`;
            output += `${result.description}\n`;
            result.matches.forEach(match => {
              output += `  ${match}\n`;
            });
            output += '\n';
          });

          return {
            content: [{ type: 'text', text: output }]
          };
        }

        case 'add_config_location': {
          const { app, path, type, description, format } = args as {
            app: string;
            path: string;
            type: 'file' | 'directory';
            description: string;
            format: 'json' | 'plist' | 'yaml' | 'text' | 'directory';
          };

          const configLocation: ConfigLocation = {
            path,
            type,
            description,
            format
          };

          AppConfigMapping.addConfigLocation(app, configLocation);

          return {
            content: [
              {
                type: 'text',
                text: `Added configuration location for ${app}:\n${description}\nPath: ${path}`
              }
            ]
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AI Apps Config MCP Server running on stdio');
  }
}

const server = new MacOSConfigServer();
server.run().catch(console.error);