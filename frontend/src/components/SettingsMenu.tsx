import { useState, useEffect } from 'react';
import { X, Settings, Volume2, Server, ChevronDown, ChevronRight, Plus, Trash2, Power, PowerOff, Shield, FileText, Bot, MousePointer, Cloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { VoiceSettingsContent } from './VoiceSettingsContent';
import { getApiBaseUrl } from '../config/api-config';
import './SettingsMenu.css';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

interface MCPServer {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    enabled: boolean;
}

interface AICoreCredentials {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    baseUrl: string;
    resourceGroup: string;
    timeoutMs: number;
}

interface CollapsiblePanelProps {
    title: string;
    icon: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

function CollapsiblePanel({ title, icon, isExpanded, onToggle, children }: CollapsiblePanelProps) {
    return (
        <div className="collapsible-panel">
            <button className="collapsible-panel-header" onClick={onToggle}>
                <span className="collapsible-panel-icon">{icon}</span>
                <span className="collapsible-panel-title">{title}</span>
                <span className="collapsible-panel-chevron">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
            </button>
            {isExpanded && (
                <div className="collapsible-panel-content">
                    {children}
                </div>
            )}
        </div>
    );
}

export function SettingsMenu({ isOpen, onClose }: SettingsMenuProps) {
    const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
        sound: false,
        behavior: false,
        mcp: false,
        permissions: false,
        rules: false,
        supervisor: false,
        aicore: false
    });

    const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
    const [isAddingServer, setIsAddingServer] = useState(false);
    const [newServer, setNewServer] = useState({ name: '', command: '', args: '' });
    const [skipPermissions, setSkipPermissions] = useState(false);
    const [rules, setRules] = useState('');
    const [rulesSaved, setRulesSaved] = useState(true);
    const [supervisorEnabled, setSupervisorEnabled] = useState(false);
    const [supervisorSystemPrompt, setSupervisorSystemPrompt] = useState('');
    const [supervisorPromptSaved, setSupervisorPromptSaved] = useState(true);
    const [autoFocusOnInput, setAutoFocusOnInput] = useState(false);

    // AI Core credentials state
    const [aiCoreCredentials, setAiCoreCredentials] = useState<AICoreCredentials>({
        clientId: '',
        clientSecret: '',
        authUrl: '',
        baseUrl: '',
        resourceGroup: 'default',
        timeoutMs: 120000
    });
    const [aiCoreSaved, setAiCoreSaved] = useState(true);
    const [aiCoreTestStatus, setAiCoreTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [aiCoreTestMessage, setAiCoreTestMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/config`);
            if (response.ok) {
                const config = await response.json();
                setMcpServers(config.mcpServers || []);
                setSkipPermissions(config.skipPermissions || false);
                setRules(config.rules || '');
                setRulesSaved(true);
                setSupervisorEnabled(config.supervisorEnabled || false);
                setSupervisorSystemPrompt(config.supervisorSystemPrompt || '');
                setSupervisorPromptSaved(true);
                setAutoFocusOnInput(config.autoFocusOnInput || false);
                if (config.aiCoreCredentials) {
                    setAiCoreCredentials(config.aiCoreCredentials);
                }
                setAiCoreSaved(true);
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
        }
    };

    const saveMCPServers = async (servers: MCPServer[]) => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mcpServers: servers })
            });
            if (response.ok) {
                setMcpServers(servers);
            }
        } catch (error) {
            console.error('Failed to save MCP servers:', error);
        }
    };

    const saveSkipPermissions = async (value: boolean) => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skipPermissions: value })
            });
            if (response.ok) {
                setSkipPermissions(value);
            }
        } catch (error) {
            console.error('Failed to save skip permissions:', error);
        }
    };

    const saveRules = async () => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rules })
            });
            if (response.ok) {
                setRulesSaved(true);
            }
        } catch (error) {
            console.error('Failed to save rules:', error);
        }
    };

    const handleRulesChange = (value: string) => {
        setRules(value);
        setRulesSaved(false);
    };

    const saveSupervisorEnabled = async (value: boolean) => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supervisorEnabled: value })
            });
            if (response.ok) {
                setSupervisorEnabled(value);
            }
        } catch (error) {
            console.error('Failed to save supervisor enabled:', error);
        }
    };

    const saveSupervisorPrompt = async () => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supervisorSystemPrompt })
            });
            if (response.ok) {
                setSupervisorPromptSaved(true);
            }
        } catch (error) {
            console.error('Failed to save supervisor prompt:', error);
        }
    };

    const handleSupervisorPromptChange = (value: string) => {
        setSupervisorSystemPrompt(value);
        setSupervisorPromptSaved(false);
    };

    const handleAiCoreChange = (field: keyof AICoreCredentials, value: string | number) => {
        setAiCoreCredentials(prev => ({ ...prev, [field]: value }));
        setAiCoreSaved(false);
        setAiCoreTestStatus('idle');
    };

    const saveAiCoreCredentials = async () => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aiCoreCredentials })
            });
            if (response.ok) {
                setAiCoreSaved(true);
            }
        } catch (error) {
            console.error('Failed to save AI Core credentials:', error);
        }
    };

    const testAiCoreCredentials = async () => {
        setAiCoreTestStatus('testing');
        setAiCoreTestMessage('Testing credentials...');
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/aicore/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aiCoreCredentials)
            });
            const result = await response.json();
            if (response.ok && result.success) {
                setAiCoreTestStatus('success');
                setAiCoreTestMessage(result.message || 'Connection successful!');
            } else {
                setAiCoreTestStatus('error');
                setAiCoreTestMessage(result.error || 'Connection failed');
            }
        } catch (error) {
            setAiCoreTestStatus('error');
            setAiCoreTestMessage('Failed to test credentials');
        }
    };

    const clearAiCoreCredentials = async () => {
        const emptyCredentials: AICoreCredentials = {
            clientId: '',
            clientSecret: '',
            authUrl: '',
            baseUrl: '',
            resourceGroup: 'default',
            timeoutMs: 120000
        };
        setAiCoreCredentials(emptyCredentials);
        try {
            await fetch(`${getApiBaseUrl()}/api/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aiCoreCredentials: undefined })
            });
            setAiCoreSaved(true);
            setAiCoreTestStatus('idle');
            setAiCoreTestMessage('');
        } catch (error) {
            console.error('Failed to clear AI Core credentials:', error);
        }
    };

    const saveAutoFocusOnInput = async (value: boolean) => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ autoFocusOnInput: value })
            });
            if (response.ok) {
                setAutoFocusOnInput(value);
            }
        } catch (error) {
            console.error('Failed to save auto focus setting:', error);
        }
    };

    const togglePanel = (panel: string) => {
        setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
    };

    const handleAddServer = () => {
        if (!newServer.name || !newServer.command) return;

        const server: MCPServer = {
            name: newServer.name,
            command: newServer.command,
            args: newServer.args ? newServer.args.split(' ').filter(a => a) : [],
            enabled: true
        };

        const updatedServers = [...mcpServers, server];
        saveMCPServers(updatedServers);
        setNewServer({ name: '', command: '', args: '' });
        setIsAddingServer(false);
    };

    const handleRemoveServer = (index: number) => {
        const updatedServers = mcpServers.filter((_, i) => i !== index);
        saveMCPServers(updatedServers);
    };

    const handleToggleServer = (index: number) => {
        const updatedServers = mcpServers.map((server, i) =>
            i === index ? { ...server, enabled: !server.enabled } : server
        );
        saveMCPServers(updatedServers);
    };

    if (!isOpen) return null;

    return (
        <div className="settings-menu-overlay" onClick={onClose}>
            <div className="settings-menu" onClick={(e) => e.stopPropagation()}>
                <div className="settings-menu-header">
                    <div className="settings-menu-title">
                        <Settings size={20} />
                        <h2>Settings</h2>
                    </div>
                    <button className="settings-menu-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="settings-menu-content">
                    <CollapsiblePanel
                        title="Sound"
                        icon={<Volume2 size={18} />}
                        isExpanded={expandedPanels.sound}
                        onToggle={() => togglePanel('sound')}
                    >
                        <VoiceSettingsContent />
                    </CollapsiblePanel>

                    <CollapsiblePanel
                        title="Behavior"
                        icon={<MousePointer size={18} />}
                        isExpanded={expandedPanels.behavior}
                        onToggle={() => togglePanel('behavior')}
                    >
                        <div className="permissions-content">
                            <div className="permission-item">
                                <div className="permission-info">
                                    <span className="permission-label">Auto-focus on Input</span>
                                    <span className="permission-description">
                                        Automatically switch to a task when it asks a question or needs input.
                                    </span>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={autoFocusOnInput}
                                        onChange={(e) => saveAutoFocusOnInput(e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel
                        title="MCP Servers"
                        icon={<Server size={18} />}
                        isExpanded={expandedPanels.mcp}
                        onToggle={() => togglePanel('mcp')}
                    >
                        <div className="mcp-servers-content">
                            {mcpServers.length === 0 ? (
                                <p className="mcp-empty-state">No MCP servers configured</p>
                            ) : (
                                <div className="mcp-server-list">
                                    {mcpServers.map((server, index) => (
                                        <div key={index} className={`mcp-server-item ${!server.enabled ? 'disabled' : ''}`}>
                                            <div className="mcp-server-info">
                                                <span className="mcp-server-name">{server.name}</span>
                                                <span className="mcp-server-command">
                                                    {server.command} {server.args?.join(' ')}
                                                </span>
                                            </div>
                                            <div className="mcp-server-actions">
                                                <button
                                                    className={`mcp-toggle-btn ${server.enabled ? 'enabled' : ''}`}
                                                    onClick={() => handleToggleServer(index)}
                                                    title={server.enabled ? 'Disable' : 'Enable'}
                                                >
                                                    {server.enabled ? <Power size={16} /> : <PowerOff size={16} />}
                                                </button>
                                                <button
                                                    className="mcp-delete-btn"
                                                    onClick={() => handleRemoveServer(index)}
                                                    title="Remove"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isAddingServer ? (
                                <div className="mcp-add-form">
                                    <input
                                        type="text"
                                        placeholder="Server name"
                                        value={newServer.name}
                                        onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
                                        className="mcp-input"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Command (e.g., npx)"
                                        value={newServer.command}
                                        onChange={(e) => setNewServer(prev => ({ ...prev, command: e.target.value }))}
                                        className="mcp-input"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Arguments (space-separated)"
                                        value={newServer.args}
                                        onChange={(e) => setNewServer(prev => ({ ...prev, args: e.target.value }))}
                                        className="mcp-input"
                                    />
                                    <div className="mcp-add-form-actions">
                                        <button
                                            className="mcp-cancel-btn"
                                            onClick={() => {
                                                setIsAddingServer(false);
                                                setNewServer({ name: '', command: '', args: '' });
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="mcp-save-btn"
                                            onClick={handleAddServer}
                                            disabled={!newServer.name || !newServer.command}
                                        >
                                            Add Server
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    className="mcp-add-btn"
                                    onClick={() => setIsAddingServer(true)}
                                >
                                    <Plus size={16} />
                                    Add MCP Server
                                </button>
                            )}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel
                        title="Permissions"
                        icon={<Shield size={18} />}
                        isExpanded={expandedPanels.permissions}
                        onToggle={() => togglePanel('permissions')}
                    >
                        <div className="permissions-content">
                            <div className="permission-item">
                                <div className="permission-info">
                                    <span className="permission-label">Skip Permissions</span>
                                    <span className="permission-description">
                                        Automatically approve all Claude actions without prompts.
                                        Use with caution - only enable in trusted environments.
                                    </span>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={skipPermissions}
                                        onChange={(e) => saveSkipPermissions(e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            {skipPermissions && (
                                <div className="permission-warning">
                                    Warning: Claude can execute any command without confirmation.
                                    Only enable in secure, sandboxed environments.
                                </div>
                            )}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel
                        title="Rules"
                        icon={<FileText size={18} />}
                        isExpanded={expandedPanels.rules}
                        onToggle={() => togglePanel('rules')}
                    >
                        <div className="rules-content">
                            <p className="rules-description">
                                Add custom rules for Claude. These will be added to CLAUDE.md in all workspaces.
                            </p>
                            <textarea
                                className="rules-textarea"
                                value={rules}
                                onChange={(e) => handleRulesChange(e.target.value)}
                                placeholder="Enter rules in markdown format...&#10;&#10;Example:&#10;- Always use TypeScript&#10;- Prefer functional components&#10;- Add error handling to API calls"
                                rows={8}
                            />
                            <div className="rules-actions">
                                <span className={`rules-status ${rulesSaved ? 'saved' : 'unsaved'}`}>
                                    {rulesSaved ? 'Saved' : 'Unsaved changes'}
                                </span>
                                <button
                                    className="rules-save-btn"
                                    onClick={saveRules}
                                    disabled={rulesSaved}
                                >
                                    Save Rules
                                </button>
                            </div>
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel
                        title="AI Supervisor"
                        icon={<Bot size={18} />}
                        isExpanded={expandedPanels.supervisor}
                        onToggle={() => togglePanel('supervisor')}
                    >
                        <div className="supervisor-content">
                            <div className="supervisor-toggle-item">
                                <div className="supervisor-toggle-info">
                                    <span className="supervisor-toggle-label">Enable AI Supervisor</span>
                                    <span className="supervisor-toggle-description">
                                        When enabled, the AI will automatically analyze tasks when they complete
                                        and provide feedback in the Chat panel.
                                    </span>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={supervisorEnabled}
                                        onChange={(e) => saveSupervisorEnabled(e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            {supervisorEnabled && (
                                <>
                                    <div className="supervisor-prompt-section">
                                        <p className="supervisor-description">
                                            Configure how the AI supervisor analyzes completed tasks.
                                            This prompt guides the supervisor when tasks finish.
                                        </p>
                                        <textarea
                                            className="supervisor-textarea"
                                            value={supervisorSystemPrompt}
                                            onChange={(e) => handleSupervisorPromptChange(e.target.value)}
                                            placeholder="Enter system prompt for the AI supervisor...&#10;&#10;Example:&#10;Make sure tasks complete without errors and are tested."
                                            rows={10}
                                        />
                                        <div className="supervisor-actions">
                                            <span className={`supervisor-status ${supervisorPromptSaved ? 'saved' : 'unsaved'}`}>
                                                {supervisorPromptSaved ? 'Saved' : 'Unsaved changes'}
                                            </span>
                                            <button
                                                className="supervisor-save-btn"
                                                onClick={saveSupervisorPrompt}
                                                disabled={supervisorPromptSaved}
                                            >
                                                Save Prompt
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel
                        title="SAP AI Core"
                        icon={<Cloud size={18} />}
                        isExpanded={expandedPanels.aicore}
                        onToggle={() => togglePanel('aicore')}
                    >
                        <div className="aicore-content">
                            <p className="aicore-description">
                                Configure SAP AI Core credentials for the embedded Anthropic proxy.
                                This enables Claude models through your SAP AI Core deployment.
                            </p>

                            <div className="aicore-form">
                                <div className="aicore-field">
                                    <label>Client ID</label>
                                    <input
                                        type="text"
                                        value={aiCoreCredentials.clientId}
                                        onChange={(e) => handleAiCoreChange('clientId', e.target.value)}
                                        placeholder="sb-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx!..."
                                        className="aicore-input"
                                    />
                                </div>

                                <div className="aicore-field">
                                    <label>Client Secret</label>
                                    <input
                                        type="password"
                                        value={aiCoreCredentials.clientSecret}
                                        onChange={(e) => handleAiCoreChange('clientSecret', e.target.value)}
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx$..."
                                        className="aicore-input"
                                    />
                                </div>

                                <div className="aicore-field">
                                    <label>Auth URL</label>
                                    <input
                                        type="text"
                                        value={aiCoreCredentials.authUrl}
                                        onChange={(e) => handleAiCoreChange('authUrl', e.target.value)}
                                        placeholder="https://xxx.authentication.sap.hana.ondemand.com"
                                        className="aicore-input"
                                    />
                                </div>

                                <div className="aicore-field">
                                    <label>Base URL</label>
                                    <input
                                        type="text"
                                        value={aiCoreCredentials.baseUrl}
                                        onChange={(e) => handleAiCoreChange('baseUrl', e.target.value)}
                                        placeholder="https://api.ai.xxx.aws.ml.hana.ondemand.com"
                                        className="aicore-input"
                                    />
                                </div>

                                <div className="aicore-row">
                                    <div className="aicore-field aicore-field-half">
                                        <label>Resource Group</label>
                                        <input
                                            type="text"
                                            value={aiCoreCredentials.resourceGroup}
                                            onChange={(e) => handleAiCoreChange('resourceGroup', e.target.value)}
                                            placeholder="default"
                                            className="aicore-input"
                                        />
                                    </div>

                                    <div className="aicore-field aicore-field-half">
                                        <label>Timeout (ms)</label>
                                        <input
                                            type="number"
                                            value={aiCoreCredentials.timeoutMs}
                                            onChange={(e) => handleAiCoreChange('timeoutMs', parseInt(e.target.value) || 120000)}
                                            placeholder="120000"
                                            className="aicore-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {aiCoreTestStatus !== 'idle' && (
                                <div className={`aicore-test-result ${aiCoreTestStatus}`}>
                                    {aiCoreTestStatus === 'testing' && <Loader2 size={16} className="spinning" />}
                                    {aiCoreTestStatus === 'success' && <CheckCircle size={16} />}
                                    {aiCoreTestStatus === 'error' && <AlertCircle size={16} />}
                                    <span>{aiCoreTestMessage}</span>
                                </div>
                            )}

                            <div className="aicore-actions">
                                <span className={`aicore-status ${aiCoreSaved ? 'saved' : 'unsaved'}`}>
                                    {aiCoreSaved ? 'Saved' : 'Unsaved changes'}
                                </span>
                                <div className="aicore-buttons">
                                    <button
                                        className="aicore-clear-btn"
                                        onClick={clearAiCoreCredentials}
                                        disabled={!aiCoreCredentials.clientId && !aiCoreCredentials.clientSecret}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        className="aicore-test-btn"
                                        onClick={testAiCoreCredentials}
                                        disabled={!aiCoreCredentials.clientId || !aiCoreCredentials.clientSecret || aiCoreTestStatus === 'testing'}
                                    >
                                        {aiCoreTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                                    </button>
                                    <button
                                        className="aicore-save-btn"
                                        onClick={saveAiCoreCredentials}
                                        disabled={aiCoreSaved}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>

                            <p className="aicore-note">
                                Note: The server must be restarted after changing credentials for the proxy to use them.
                            </p>
                        </div>
                    </CollapsiblePanel>

                </div>
            </div>
        </div>
    );
}
