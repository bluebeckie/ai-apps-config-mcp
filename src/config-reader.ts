import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import * as plist from 'plist';
import * as yaml from 'js-yaml';
import { ConfigLocation } from './app-config-mapping.js';

export interface ConfigContent {
  path: string;
  content: string;
  parsed?: any;
  format: string;
  error?: string;
}

export class ConfigReader {
  static async readConfig(configLocation: ConfigLocation): Promise<ConfigContent> {
    try {
      if (configLocation.type === 'directory') {
        return await this.readDirectory(configLocation);
      } else {
        return await this.readFile(configLocation);
      }
    } catch (error) {
      return {
        path: configLocation.path,
        content: '',
        format: configLocation.format,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async readFile(configLocation: ConfigLocation): Promise<ConfigContent> {
    const content = await readFile(configLocation.path, 'utf-8');
    const result: ConfigContent = {
      path: configLocation.path,
      content,
      format: configLocation.format
    };

    try {
      switch (configLocation.format) {
        case 'json':
          result.parsed = JSON.parse(content);
          break;
        case 'plist':
          result.parsed = plist.parse(content);
          break;
        case 'yaml':
          result.parsed = yaml.load(content);
          break;
        default:
          // For text files, just keep the raw content
          break;
      }
    } catch (parseError) {
      result.error = `Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`;
    }

    return result;
  }

  private static async readDirectory(configLocation: ConfigLocation): Promise<ConfigContent> {
    try {
      const entries = await readdir(configLocation.path);
      const fileList = entries.filter(entry => !entry.startsWith('.')).sort();
      
      return {
        path: configLocation.path,
        content: `Directory contents:\n${fileList.map(file => `  ${file}`).join('\n')}`,
        format: 'directory',
        parsed: fileList
      };
    } catch (error) {
      return {
        path: configLocation.path,
        content: '',
        format: 'directory',
        error: error instanceof Error ? error.message : 'Unknown error reading directory'
      };
    }
  }

  static async searchInConfig(configLocation: ConfigLocation, searchTerm: string): Promise<string[]> {
    try {
      const configContent = await this.readConfig(configLocation);
      
      if (configContent.error) {
        return [];
      }

      const lines = configContent.content.split('\n');
      const matchingLines: string[] = [];
      
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
          matchingLines.push(`Line ${index + 1}: ${line.trim()}`);
        }
      });

      return matchingLines;
    } catch (error) {
      return [];
    }
  }

  static formatConfigForDisplay(configContent: ConfigContent): string {
    if (configContent.error) {
      return `Error reading ${configContent.path}: ${configContent.error}`;
    }

    let output = `📄 ${configContent.path}\n`;
    output += `Format: ${configContent.format}\n\n`;

    if (configContent.format === 'directory') {
      output += configContent.content;
    } else if (configContent.parsed && (configContent.format === 'json' || configContent.format === 'plist')) {
      output += JSON.stringify(configContent.parsed, null, 2);
    } else {
      // Show first 50 lines for text files
      const lines = configContent.content.split('\n');
      if (lines.length > 50) {
        output += lines.slice(0, 50).join('\n');
        output += `\n\n... (showing first 50 lines of ${lines.length} total lines)`;
      } else {
        output += configContent.content;
      }
    }

    return output;
  }
}