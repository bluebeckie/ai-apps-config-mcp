import { homedir } from 'os';
import { stat, access } from 'fs/promises';
import { join } from 'path';

export interface ConfigLocation {
  path: string;
  type: 'file' | 'directory';
  description: string;
  format: 'json' | 'plist' | 'yaml' | 'text' | 'directory';
}

export interface AppConfig {
  displayName: string;
  bundleId?: string;
  configs: ConfigLocation[];
}

export class AppConfigMapping {
  private static readonly APP_CONFIGS: { [key: string]: AppConfig } = {
    'gemini': {
      displayName: 'Google Gemini',
      configs: [
        {
          path: '~/.gemini/settings.json',
          type: 'file',
          description: 'Gemini settings configuration',
          format: 'json'
        }
      ]
    },
    'claude desktop': {
      displayName: 'Claude Desktop',
      configs: [
        {
          path: '~/Library/Application Support/Claude/claude_desktop_config.json',
          type: 'file',
          description: 'Claude Desktop configuration',
          format: 'json'
        }
      ]
    },
    'claude code': {
      displayName: 'Claude Code',
      configs: [
        {
          path: '~/.claude/',
          type: 'directory',
          description: 'Claude Code configuration directory',
          format: 'directory'
        }
      ]
    },
    'vscode': {
      displayName: 'Visual Studio Code',
      bundleId: 'com.microsoft.VSCode',
      configs: [
        {
          path: '~/.vscode/mcp.json',
          type: 'file',
          description: 'VS Code MCP configuration',
          format: 'json'
        }
      ]
    },
    'cursor': {
      displayName: 'Cursor',
      configs: [
        {
          path: '~/.cursor/mcp.json',
          type: 'file',
          description: 'Cursor MCP configuration',
          format: 'json'
        }
      ]
    }
  };

  private static expandPath(path: string): string {
    return path.replace(/^~/, homedir());
  }

  static getAvailableApps(): string[] {
    return Object.keys(this.APP_CONFIGS);
  }

  static getAppConfig(appKey: string): AppConfig | undefined {
    return this.APP_CONFIGS[appKey.toLowerCase()];
  }

  static async findConfigsForApp(appKey: string): Promise<ConfigLocation[]> {
    const appConfig = this.getAppConfig(appKey);
    if (!appConfig) {
      return [];
    }

    const validConfigs: ConfigLocation[] = [];
    
    for (const config of appConfig.configs) {
      const expandedPath = this.expandPath(config.path);
      
      try {
        await access(expandedPath);
        const stats = await stat(expandedPath);
        
        // Verify the type matches what we expect
        if ((config.type === 'file' && stats.isFile()) || 
            (config.type === 'directory' && stats.isDirectory())) {
          validConfigs.push({
            ...config,
            path: expandedPath
          });
        }
      } catch (error) {
        // Config doesn't exist or isn't accessible, skip it
        continue;
      }
    }
    
    return validConfigs;
  }

  static async getAllAvailableConfigs(): Promise<{ [appKey: string]: ConfigLocation[] }> {
    const result: { [appKey: string]: ConfigLocation[] } = {};
    
    for (const appKey of this.getAvailableApps()) {
      result[appKey] = await this.findConfigsForApp(appKey);
    }
    
    return result;
  }

  static addConfigLocation(appKey: string, configLocation: ConfigLocation): void {
    const app = this.APP_CONFIGS[appKey.toLowerCase()];
    if (app) {
      app.configs.push(configLocation);
    }
  }

  static updateAppConfigs(appKey: string, configs: ConfigLocation[]): void {
    const app = this.APP_CONFIGS[appKey.toLowerCase()];
    if (app) {
      app.configs = configs;
    }
  }
}