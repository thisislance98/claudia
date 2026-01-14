import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    uuid: string;
    thinking?: string;
}

export interface ParsedConversation {
    sessionId: string;
    messages: ConversationMessage[];
    summary?: string;
}

interface JsonlEntry {
    type: string;
    uuid?: string;
    parentUuid?: string;
    timestamp?: string;
    sessionId?: string;
    summary?: string;
    message?: {
        role: string;
        content: string | Array<{ type: string; text?: string; thinking?: string }>;
    };
}

/**
 * Convert a workspace path to the Claude projects folder name format
 * e.g., /Users/I850333/projects/experiments/codeui -> -Users-I850333-projects-experiments-codeui
 */
function workspacePathToClaudeFolderName(workspacePath: string): string {
    // Replace all forward slashes with dashes, and remove leading slash
    return workspacePath.replace(/\//g, '-');
}

/**
 * Get the Claude projects directory for a workspace
 */
function getClaudeProjectsDir(workspacePath: string): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const folderName = workspacePathToClaudeFolderName(workspacePath);
    return path.join(homeDir, '.claude', 'projects', folderName);
}

/**
 * Find the JSONL file for a given session ID
 */
export async function findSessionFile(workspacePath: string, sessionId: string): Promise<string | null> {
    const projectDir = getClaudeProjectsDir(workspacePath);
    const sessionFile = path.join(projectDir, `${sessionId}.jsonl`);

    if (fs.existsSync(sessionFile)) {
        return sessionFile;
    }

    return null;
}

/**
 * Find the most recent JSONL files in a workspace
 */
export async function findRecentSessionFiles(workspacePath: string, limit: number = 10): Promise<string[]> {
    const projectDir = getClaudeProjectsDir(workspacePath);

    if (!fs.existsSync(projectDir)) {
        return [];
    }

    const files = fs.readdirSync(projectDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => ({
            name: f,
            path: path.join(projectDir, f),
            mtime: fs.statSync(path.join(projectDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, limit);

    return files.map(f => f.path);
}

/**
 * Extract text content from a message content field
 */
function extractTextContent(content: string | Array<{ type: string; text?: string; thinking?: string }>): { text: string; thinking?: string } {
    if (typeof content === 'string') {
        return { text: content };
    }

    let text = '';
    let thinking: string | undefined;

    for (const part of content) {
        if (part.type === 'text' && part.text) {
            text += part.text;
        } else if (part.type === 'thinking' && part.thinking) {
            thinking = part.thinking;
        }
    }

    return { text, thinking };
}

/**
 * Parse a JSONL conversation file
 */
export async function parseConversationFile(filePath: string): Promise<ParsedConversation> {
    return new Promise((resolve, reject) => {
        const messages: ConversationMessage[] = [];
        let sessionId = '';
        let summary: string | undefined;
        const seenUuids = new Set<string>();

        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        rl.on('line', (line) => {
            try {
                const entry: JsonlEntry = JSON.parse(line);

                // Capture session ID
                if (entry.sessionId && !sessionId) {
                    sessionId = entry.sessionId;
                }

                // Capture summary
                if (entry.type === 'summary' && entry.summary) {
                    summary = entry.summary;
                }

                // Process user messages
                if (entry.type === 'user' && entry.message && entry.uuid) {
                    // Skip if we've already seen this UUID (avoid duplicates)
                    if (seenUuids.has(entry.uuid)) return;
                    seenUuids.add(entry.uuid);

                    const { text } = extractTextContent(entry.message.content);
                    if (text) {
                        messages.push({
                            role: 'user',
                            content: text,
                            timestamp: entry.timestamp || '',
                            uuid: entry.uuid
                        });
                    }
                }

                // Process assistant messages
                if (entry.type === 'assistant' && entry.message && entry.uuid) {
                    // Skip if we've already seen this UUID
                    if (seenUuids.has(entry.uuid)) return;
                    seenUuids.add(entry.uuid);

                    const { text, thinking } = extractTextContent(entry.message.content);
                    // Only add if there's actual text content (skip pure thinking blocks)
                    if (text) {
                        messages.push({
                            role: 'assistant',
                            content: text,
                            timestamp: entry.timestamp || '',
                            uuid: entry.uuid,
                            thinking
                        });
                    }
                }
            } catch (e) {
                // Skip malformed lines
            }
        });

        rl.on('close', () => {
            resolve({
                sessionId: sessionId || path.basename(filePath, '.jsonl'),
                messages,
                summary
            });
        });

        rl.on('error', reject);
    });
}

/**
 * Get conversation history for a task by session ID
 */
export async function getConversationHistory(workspacePath: string, sessionId: string): Promise<ParsedConversation | null> {
    const filePath = await findSessionFile(workspacePath, sessionId);
    if (!filePath) {
        console.log(`[ConversationParser] No session file found for ${sessionId} in ${workspacePath}`);
        return null;
    }

    console.log(`[ConversationParser] Parsing session file: ${filePath}`);
    return parseConversationFile(filePath);
}

/**
 * Get all session summaries for a workspace
 */
export async function getWorkspaceSessions(workspacePath: string): Promise<Array<{ sessionId: string; summary?: string; lastModified: Date }>> {
    const projectDir = getClaudeProjectsDir(workspacePath);

    if (!fs.existsSync(projectDir)) {
        return [];
    }

    const files = fs.readdirSync(projectDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => ({
            sessionId: path.basename(f, '.jsonl'),
            path: path.join(projectDir, f),
            lastModified: fs.statSync(path.join(projectDir, f)).mtime
        }))
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    // Get summaries from each file (just read first line which usually has summary)
    const results: Array<{ sessionId: string; summary?: string; lastModified: Date }> = [];

    for (const file of files.slice(0, 50)) { // Limit to 50 most recent
        try {
            const firstLines = fs.readFileSync(file.path, 'utf8').split('\n').slice(0, 5);
            let summary: string | undefined;

            for (const line of firstLines) {
                try {
                    const entry = JSON.parse(line);
                    if (entry.type === 'summary' && entry.summary) {
                        summary = entry.summary;
                        break;
                    }
                } catch { /* skip */ }
            }

            results.push({
                sessionId: file.sessionId,
                summary,
                lastModified: file.lastModified
            });
        } catch { /* skip */ }
    }

    return results;
}
