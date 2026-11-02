import { normalizeUrl } from './config-io';
import { t } from '../i18n/t';

export interface RemotePromptInput {
    mcpUrl: string;
    token: string;
    includeToken: boolean;
}

const TOKEN_PLACEHOLDER = '<YOUR_TOKEN>';
const MCP_SUFFIX = '/mcp';

export function normalizeMcpHttpUrl(raw: string): string {
    const u = normalizeUrl(raw);
    if (!u) return u;
    if (u.endsWith(MCP_SUFFIX)) return u;
    return u + MCP_SUFFIX;
}

export function buildGenericMcpServersJson(mcpUrl: string, token: string): string {
    const url = normalizeMcpHttpUrl(mcpUrl);
    const obj = {
        mcpServers: {
            tabby: {
                type: 'http',
                url,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        },
    };
    return JSON.stringify(obj, null, 2);
}

export function buildRemotePrompt(input: RemotePromptInput): string {
    const token = input.includeToken && input.token ? input.token : TOKEN_PLACEHOLDER;
    const url = normalizeMcpHttpUrl(input.mcpUrl);
    const json = buildGenericMcpServersJson(url, token);

    return [
        t('clients.remotePrompt.intro'),
        '',
        t('clients.remotePrompt.name', { name: 'tabby' }),
        `URL: ${url}`,
        `Header: Authorization: Bearer ${token}`,
        '',
        t('clients.remotePrompt.jsonHeading'),
        json,
        '',
        t('clients.remotePrompt.footer'),
    ].join('\n');
}
