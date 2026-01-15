/**
 * Config Store - Manages application configuration (MCP servers)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface MCPServerConfig {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    enabled: boolean;
}

export interface AICoreCredentials {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    baseUrl: string;
    resourceGroup: string;
    timeoutMs: number;
}

export interface AppConfig {
    mcpServers: MCPServerConfig[];
    skipPermissions: boolean;
    rules: string;
    supervisorEnabled: boolean;
    supervisorSystemPrompt: string;
    autoFocusOnInput: boolean;  // Auto-switch to task when it needs input
    aiCoreCredentials?: AICoreCredentials;  // SAP AI Core credentials for Anthropic proxy
}

const DEFAULT_SUPERVISOR_PROMPT = `You are an AI supervisor monitoring coding tasks. Your job is to:
1. Ensure tasks complete without errors
2. Verify tasks are properly tested when appropriate
3. Identify if follow-up actions are needed

When a task completes, analyze the conversation and determine if:
- The task was completed successfully
- Tests were run (if applicable)
- There are any errors or issues that need attention
- Follow-up actions are recommended

If everything looks good, just confirm the task is complete. If issues exist, suggest specific next steps.`;

const DEFAULT_CONFIG: AppConfig = {
    mcpServers: [],
    skipPermissions: false,
    rules: '',
    supervisorEnabled: false,
    supervisorSystemPrompt: DEFAULT_SUPERVISOR_PROMPT,
    autoFocusOnInput: false
};

export class ConfigStore {
    private config: AppConfig;
    private configFile: string;

    constructor(basePath?: string) {
        this.configFile = basePath
            ? join(basePath, 'config.json')
            : join(__dirname, '..', 'config.json');

        if (basePath && !existsSync(basePath)) {
            mkdirSync(basePath, { recursive: true });
        }

        this.config = this.loadConfig();
    }

    private loadConfig(): AppConfig {
        try {
            if (existsSync(this.configFile)) {
                const data = readFileSync(this.configFile, 'utf-8');
                const loaded = JSON.parse(data) as Partial<AppConfig>;
                return {
                    mcpServers: loaded.mcpServers || [],
                    skipPermissions: loaded.skipPermissions ?? false,
                    rules: loaded.rules ?? '',
                    supervisorEnabled: loaded.supervisorEnabled ?? false,
                    supervisorSystemPrompt: loaded.supervisorSystemPrompt ?? DEFAULT_SUPERVISOR_PROMPT,
                    autoFocusOnInput: loaded.autoFocusOnInput ?? false,
                    aiCoreCredentials: loaded.aiCoreCredentials
                };
            }
        } catch (error) {
            console.error('[ConfigStore] Error loading config:', error);
        }
        return { ...DEFAULT_CONFIG };
    }

    private saveConfig(): void {
        try {
            writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf-8');
            console.log('[ConfigStore] Config saved to', this.configFile);
        } catch (error) {
            console.error('[ConfigStore] Error saving config:', error);
            throw error;
        }
    }

    getConfig(): AppConfig {
        return { ...this.config };
    }

    updateConfig(updates: Partial<AppConfig>): AppConfig {
        if (updates.mcpServers !== undefined) {
            this.config.mcpServers = updates.mcpServers;
        }
        if (updates.skipPermissions !== undefined) {
            this.config.skipPermissions = updates.skipPermissions;
        }
        if (updates.rules !== undefined) {
            this.config.rules = updates.rules;
        }
        if (updates.supervisorEnabled !== undefined) {
            this.config.supervisorEnabled = updates.supervisorEnabled;
        }
        if (updates.supervisorSystemPrompt !== undefined) {
            this.config.supervisorSystemPrompt = updates.supervisorSystemPrompt;
        }
        if (updates.autoFocusOnInput !== undefined) {
            this.config.autoFocusOnInput = updates.autoFocusOnInput;
        }
        if (updates.aiCoreCredentials !== undefined) {
            this.config.aiCoreCredentials = updates.aiCoreCredentials;
        }
        this.saveConfig();
        return this.getConfig();
    }

    getAICoreCredentials(): AICoreCredentials | undefined {
        return this.config.aiCoreCredentials;
    }

    setAICoreCredentials(credentials: AICoreCredentials | undefined): void {
        this.config.aiCoreCredentials = credentials;
        this.saveConfig();
    }

    isSupervisorEnabled(): boolean {
        return this.config.supervisorEnabled;
    }

    getSupervisorSystemPrompt(): string {
        return this.config.supervisorSystemPrompt;
    }

    setSupervisorSystemPrompt(prompt: string): void {
        this.config.supervisorSystemPrompt = prompt;
        this.saveConfig();
    }

    getSkipPermissions(): boolean {
        return this.config.skipPermissions;
    }

    getRules(): string {
        return this.config.rules;
    }

    setRules(rules: string): void {
        this.config.rules = rules;
        this.saveConfig();
    }

    getMCPServers(): MCPServerConfig[] {
        return [...this.config.mcpServers];
    }

    resetToDefaults(): AppConfig {
        this.config = { ...DEFAULT_CONFIG };
        this.saveConfig();
        return this.getConfig();
    }
}
