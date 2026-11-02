import * as fs from 'fs';
import * as net from 'net';

import { getSocketPath, getTokenPath, listSocketPaths } from './core/paths';
import { negotiateProtocolVersion } from './core/protocol';
import { SERVER_INFO, SERVER_INSTRUCTIONS } from './core/server-info';
import { TOOL_DEFINITIONS } from './core/tool-definitions';
import { callerLabel } from './core/caller';

const MAX_LINE_BYTES = 4 * 1024 * 1024;

let shimCaller = '未知';

const NOT_RUNNING =
    'Tabby 没在运行,或者 tabby-mcp-jc 插件没启用 —— 请用户先打开 Tabby,打开后直接重试即可';

function log(msg: string): void {
    process.stderr.write(`tabby-mcp-jc shim: ${msg}\n`);
}

function writeOut(obj: any): void {
    process.stdout.write(JSON.stringify(obj) + '\n');
}

function onLines(
    stream: NodeJS.ReadableStream,
    onLine: (line: string) => void,
    onOverflow: () => void,
): void {
    let buf = '';
    stream.on('data', (chunk: Buffer | string) => {
        buf += chunk.toString();
        let idx: number;
        while ((idx = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            if (line.trim()) {
                onLine(line);
            }
        }
        if (buf.length > MAX_LINE_BYTES) {
            buf = '';
            onOverflow();
        }
    });
}

function replyToolResult(id: any, result: any): void {
    writeOut({
        jsonrpc: '2.0',
        id,
        result: {
            content: [{ type: 'text', text: JSON.stringify(result) }],
            structuredContent: result,
        },
    });
}

function replyToolError(id: any, code: string, message: string): void {
    writeOut({
        jsonrpc: '2.0',
        id,
        result: {
            content: [{ type: 'text', text: JSON.stringify({ error: code, message }) }],
            isError: true,
        },
    });
}

class ShimError extends Error {
    constructor(
        public code: string,
        message: string,
    ) {
        super(message);
    }
}

interface Conn {
    sock: net.Socket;
    seq: number;

    pending: Map<number, { resolve: (msg: any) => void; reject: (e: Error) => void }>;
}

const conns = new Map<number, Promise<Conn | null>>();

function connect(pid: number): Promise<Conn | null> {
    const existing = conns.get(pid);
    if (existing) {
        return existing;
    }

    let token = '';
    try {
        token = fs.readFileSync(getTokenPath(), 'utf8').trim();
    } catch {

    }
    if (!token) {
        log(`读不到 token 文件 ${getTokenPath()}`);
        return Promise.resolve(null);
    }

    const socketPath = getSocketPath(pid);
    const p = new Promise<Conn | null>(resolve => {
        const s = net.createConnection(socketPath);
        const conn: Conn = { sock: s, seq: 0, pending: new Map() };

        let gotData = false;
        let settled = false;

        s.on('connect', () => {
            s.write(JSON.stringify({ auth: token }) + '\n');
            settled = true;
            resolve(conn);
        });

        s.on('error', (e: any) => {
            if (settled) {
                return;
            }
            log(`连不上 ${socketPath}: ${e.message}`);
            if (process.platform !== 'win32' && e.code === 'ECONNREFUSED') {
                try {
                    fs.unlinkSync(socketPath);
                } catch {

                }
            }
        });

        s.on('close', () => {
            if (conns.get(pid) === p) {
                conns.delete(pid);
            }
            if (!settled) {
                settled = true;
                resolve(null);
            }
            const err = gotData
                ? new ShimError(
                      'tabby_disconnected',
                      'Tabby 窗口在处理请求时断开了连接(可能被关掉了),请重新调用 list_tabs',
                  )
                : new ShimError(
                      'tabby_disconnected',
                      '连接被 Tabby 关闭且没有任何响应 —— 可能是窗口刚好被关掉了,请重新调用 list_tabs;' +
                          '如果窗口明明开着却反复出现,可能是 token 校验失败' +
                          '(token 文件被手动改过或重新生成过),请重启 Claude Desktop',
                  );
            for (const r of conn.pending.values()) {
                r.reject(err);
            }
            conn.pending.clear();
        });

        onLines(
            s,
            line => {
                gotData = true;
                let msg: any;
                try {
                    msg = JSON.parse(line);
                } catch {
                    return;
                }
                const r = conn.pending.get(msg?.id);
                if (r) {
                    conn.pending.delete(msg.id);
                    r.resolve(msg);
                }
            },
            () => s.destroy(),
        );
    });
    conns.set(pid, p);
    return p;
}

function callTool(
    conn: Conn,
    name: string,
    args: any,
    timeoutMs?: number,
    caller?: string,
): Promise<any> {
    return new Promise((resolve, reject) => {
        if (conn.sock.destroyed) {
            reject(new ShimError('tabby_disconnected', 'Tabby 窗口已经断开,请重新调用 list_tabs'));
            return;
        }
        const id = ++conn.seq;
        let timer: NodeJS.Timeout | undefined;
        if (timeoutMs !== undefined) {
            timer = setTimeout(() => {
                conn.pending.delete(id);
                reject(new ShimError('window_timeout', `Tabby 窗口 ${timeoutMs}ms 内没有响应`));
            }, timeoutMs);
        }
        conn.pending.set(id, {
            resolve: msg => {
                clearTimeout(timer);
                if (msg?.error) {
                    reject(new ShimError('internal', msg.error.message ?? 'unknown error'));
                } else {
                    resolve(msg?.result);
                }
            },
            reject: e => {
                clearTimeout(timer);
                reject(e);
            },
        });
        conn.sock.write(
            JSON.stringify({
                jsonrpc: '2.0',
                id,
                method: 'tools/call',
                params: caller ? { name, arguments: args, caller } : { name, arguments: args },
            }) + '\n',
        );
    });
}

const TAB_ID_RE = /^(\d+):(.+)$/;

const LIST_TABS_TIMEOUT_MS = 5000;

async function listTabs(id: any): Promise<void> {
    const perWindow = (
        await Promise.all(
            listSocketPaths().map(async ({ pid }) => {
                const conn = await connect(pid);
                if (!conn) {
                    return null;
                }
                try {
                    const r = await callTool(
                        conn,
                        'list_tabs',
                        {},
                        LIST_TABS_TIMEOUT_MS,
                        shimCaller,
                    );
                    if (r?.isError) {
                        log(`窗口 ${pid} 的 list_tabs 返回错误: ${r?.content?.[0]?.text ?? ''}`);
                        return { pid, tabs: null };
                    }
                    const tabs: any[] =
                        r?.structuredContent?.tabs ??
                        JSON.parse(r?.content?.[0]?.text ?? '{}').tabs ??
                        [];
                    return {
                        pid,
                        tabs: tabs.map(t => ({ ...t, id: `${pid}:${t.id}`, window: pid })),
                    };
                } catch (e: any) {
                    log(`窗口 ${pid} 的 list_tabs 失败: ${e.message}`);
                    return { pid, tabs: null };
                }
            }),
        )
    ).filter((w): w is { pid: number; tabs: any[] | null } => w !== null);

    const answered = perWindow.filter(w => w.tabs !== null);
    const unavailable = perWindow.filter(w => w.tabs === null).map(w => w.pid);
    if (!perWindow.length) {
        return replyToolError(id, 'tabby_not_running', NOT_RUNNING);
    }
    if (!answered.length) {
        return replyToolError(
            id,
            'windows_unavailable',
            `找到 ${unavailable.length} 个 Tabby 窗口(${unavailable.join(', ')}),但都没有响应 ——` +
                ' 可能是 Tabby 卡住了或正在关闭,请用户检查 Tabby,必要时重启它;' +
                '如果窗口明明运行正常,可能是 token 校验失败(token 文件被手动改过或重新生成过),请重启 Claude Desktop',
        );
    }
    replyToolResult(id, {
        tabs: answered.flatMap(w => w.tabs as any[]),
        unavailable_windows: unavailable.length ? unavailable : undefined,
        unavailable_hint: unavailable.length
            ? '这些 Tabby 窗口没有响应(可能卡住或正在关闭),它们的标签页不在上面的列表里'
            : undefined,
    });
}

async function routeByTab(id: any, name: string, args: any): Promise<void> {
    if (typeof args?.tab_id !== 'string' || !args.tab_id) {
        return replyToolError(id, 'invalid_args', '缺少 tab_id');
    }
    const m = TAB_ID_RE.exec(args.tab_id);
    if (!m) {
        return replyToolError(
            id,
            'unknown_tab',
            `找不到标签页 ${args.tab_id},请重新调用 list_tabs`,
        );
    }
    const conn = await connect(Number(m[1]));
    if (!conn) {
        return replyToolError(
            id,
            'window_closed',
            `标签页 ${args.tab_id} 所在的 Tabby 窗口已经关闭或不可用,请重新调用 list_tabs`,
        );
    }
    try {
        const r = await callTool(conn, name, { ...args, tab_id: m[2] }, undefined, shimCaller);
        writeOut({ jsonrpc: '2.0', id, result: r });
    } catch (e: any) {
        replyToolError(id, e instanceof ShimError ? e.code : 'internal', e?.message ?? String(e));
    }
}

function handle(line: string): void {
    let msg: any;
    try {
        msg = JSON.parse(line);
    } catch {
        return;
    }

    const id = msg?.id ?? null;
    const reply = (result: any) => writeOut({ jsonrpc: '2.0', id, result });
    const fail = (code: number, message: string) =>
        writeOut({ jsonrpc: '2.0', id, error: { code, message } });

    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
        return fail(-32600, 'invalid request');
    }

    if (msg.method === 'initialize') {
        shimCaller = callerLabel(msg.params?.clientInfo);
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
        return;
    }

    if (msg.method === 'tools/list') {
        return reply({ tools: TOOL_DEFINITIONS });
    }

    if (msg.method === 'tools/call') {
        const name = msg.params?.name;
        const args = msg.params?.arguments ?? {};
        if (!TOOL_DEFINITIONS.some(d => d.name === name)) {
            return replyToolError(msg.id, 'unknown_tool', `unknown tool: ${name}`);
        }
        const task = name === 'list_tabs' ? listTabs(msg.id) : routeByTab(msg.id, name, args);
        task.catch(e => replyToolError(msg.id, 'internal', e?.message ?? String(e)));
        return;
    }

    return fail(-32601, `unknown method: ${msg.method}`);
}

onLines(process.stdin, handle, () => log('stdin 单行超过上限,已丢弃'));

process.stdin.on('end', () => process.exit(0));
process.stdin.on('error', e => {
    log(`stdin 出错: ${e.message}`);
    process.exit(1);
});
