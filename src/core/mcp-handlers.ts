import { negotiateProtocolVersion } from './protocol';
import { dispatchToolCall } from './pipe-client';
import { callerLabel } from './caller';
import { SERVER_INFO, SERVER_INSTRUCTIONS } from './server-info';
import { TOOL_DEFINITIONS } from './tool-definitions';

export type McpHandlerContext = {
    caller?: string;
    onInitialize?: (caller: string) => void;
};

export type JsonRpcResponse = {
    jsonrpc: '2.0';
    id: any;
    result?: any;
    error?: { code: number; message: string };
};

export async function handleMcpMessage(
    msg: any,
    ctx?: McpHandlerContext,
    signal?: AbortSignal,
): Promise<JsonRpcResponse | null> {
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
        return {
            jsonrpc: '2.0',
            id: msg?.id ?? null,
            error: { code: -32600, message: 'invalid request' },
        };
    }

    const id = msg.id ?? null;
    const reply = (result: any): JsonRpcResponse => ({ jsonrpc: '2.0', id, result });
    const fail = (code: number, message: string): JsonRpcResponse => ({
        jsonrpc: '2.0',
        id,
        error: { code, message },
    });

    if (msg.method === 'initialize') {
        const label = callerLabel(msg.params?.clientInfo);
        ctx?.onInitialize?.(label);
        return reply({
            protocolVersion: negotiateProtocolVersion(msg.params?.protocolVersion),
            serverInfo: SERVER_INFO,
            capabilities: { tools: {} },
            instructions: SERVER_INSTRUCTIONS,
        });
    }

    if (msg.method === 'ping') {
        return reply({});
    }

    if (msg.id === undefined || msg.method.startsWith('notifications/')) {
        return null;
    }

    if (msg.method === 'tools/list') {
        return reply({ tools: TOOL_DEFINITIONS });
    }

    if (msg.method === 'tools/call') {
        const name = msg.params?.name;
        const args = msg.params?.arguments ?? {};
        try {
            const result = await dispatchToolCall(name, args, ctx?.caller, signal);
            return reply(result);
        } catch (e: any) {
            return reply({
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            error: 'internal',
                            message: e?.message ?? String(e),
                        }),
                    },
                ],
                isError: true,
            });
        }
    }

    return fail(-32601, `unknown method: ${msg.method}`);
}
