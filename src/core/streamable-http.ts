import * as http from 'http';
import { randomUUID } from 'crypto';

import { isAllowedOrigin, isAuthorized } from './http-auth';
import { isPaused } from './pause-flag';
import { MCP_HTTP_PATH, readBearerToken } from './http-endpoint';
import { handleMcpMessage } from './mcp-handlers';

const sessions = new Map<string, string>();
let lastCaller = '未知';

function headerSessionId(req: http.IncomingMessage): string | undefined {
    const raw = req.headers['mcp-session-id'];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function callerForRequest(req: http.IncomingMessage): string {
    const sid = headerSessionId(req);
    if (sid && sessions.has(sid)) {
        return sessions.get(sid)!;
    }
    return lastCaller;
}

function rememberCaller(req: http.IncomingMessage, label: string): string {
    lastCaller = label;
    const sid = headerSessionId(req) || randomUUID();
    sessions.set(sid, label);
    return sid;
}

export function clearHttpSessions(): void {
    sessions.clear();
    lastCaller = '未知';
}

function sendJson(
    res: http.ServerResponse,
    status: number,
    body: any,
    extraHeaders?: Record<string, string>,
): void {
    const text = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(text),
        ...extraHeaders,
    });
    res.end(text);
}

function sendText(
    res: http.ServerResponse,
    status: number,
    text: string,
    contentType = 'text/plain; charset=utf-8',
): void {
    res.writeHead(status, {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(text),
    });
    res.end(text);
}

function readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const MAX = 4 * 1024 * 1024;
        req.on('data', (c: Buffer) => {
            size += c.length;
            if (size > MAX) {
                reject(new Error('body too large'));
                req.destroy();
                return;
            }
            chunks.push(c);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

function normalizePath(urlPath: string): string {
    try {
        const u = new URL(urlPath, 'http://127.0.0.1');
        return u.pathname.replace(/\/+$/, '') || '/';
    } catch {
        return urlPath;
    }
}

export type StreamableHttpLog = (msg: string) => void;

export async function handleStreamableHttpRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    _log: StreamableHttpLog = () => undefined,
): Promise<void> {
    const origin = req.headers.origin;
    const hostHdr = req.headers.host;
    if (
        !isAllowedOrigin(
            typeof origin === 'string' ? origin : undefined,
            typeof hostHdr === 'string' ? hostHdr : undefined,
        )
    ) {
        sendText(res, 403, 'Forbidden: invalid Origin');
        return;
    }

    const pathname = normalizePath(req.url || '/');

    if (
        pathname === '/.well-known/oauth-protected-resource' ||
        pathname.startsWith('/.well-known/oauth-authorization-server') ||
        pathname === '/.well-known/openid-configuration'
    ) {
        sendText(res, 404, 'Not Found');
        return;
    }

    if (pathname !== MCP_HTTP_PATH) {
        sendText(res, 404, 'Not Found');
        return;
    }

    const token = readBearerToken();
    if (!isAuthorized(req.headers.authorization, token)) {
        res.writeHead(401, {
            'Content-Type': 'text/plain; charset=utf-8',
            'WWW-Authenticate': 'Bearer',
        });
        res.end('Unauthorized');
        return;
    }

    if (isPaused()) {
        sessions.clear();
        sendText(res, 503, 'Service Unavailable: MCP paused by user');
        return;
    }

    if (req.method === 'GET') {
        res.writeHead(405, { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method Not Allowed: use POST');
        return;
    }

    if (req.method === 'DELETE') {
        const sid = headerSessionId(req);
        if (sid) {
            sessions.delete(sid);
        }
        sendText(res, 200, 'ok');
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405, { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method Not Allowed');
        return;
    }

    let raw: string;
    try {
        raw = await readBody(req);
    } catch (e: any) {
        sendJson(res, 400, {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: e?.message ?? 'bad body' },
        });
        return;
    }

    let msg: any;
    try {
        msg = raw.trim() ? JSON.parse(raw) : null;
    } catch {
        sendJson(res, 400, {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'parse error' },
        });
        return;
    }

    const buildCtx = (incoming: http.IncomingMessage) => {
        let issuedSessionId: string | undefined;
        const ctx = {
            caller: callerForRequest(incoming),
            onInitialize: (label: string) => {
                issuedSessionId = rememberCaller(incoming, label);
                ctx.caller = label;
            },
        };
        return { ctx, getIssued: () => issuedSessionId };
    };

    const gone = listenForClientGone(res);
    try {
        if (Array.isArray(msg)) {
            const { ctx, getIssued } = buildCtx(req);
            const out: any[] = [];
            for (const item of msg) {
                if (gone.signal.aborted) {
                    break;
                }
                ctx.caller = callerForRequest(req);
                if (item?.method === 'initialize') {
                } else if (headerSessionId(req) && sessions.has(headerSessionId(req)!)) {
                    ctx.caller = sessions.get(headerSessionId(req)!)!;
                }
                const r = await handleMcpMessage(item, ctx, gone.signal);
                if (r) {
                    out.push(r);
                }
            }
            if (gone.signal.aborted || res.writableEnded) {
                return;
            }
            if (!out.length) {
                res.writeHead(202);
                res.end();
                return;
            }
            const extra: Record<string, string> = {};
            const sid = getIssued() || headerSessionId(req);
            if (sid) {
                extra['Mcp-Session-Id'] = sid;
            }
            sendJson(res, 200, out, extra);
            return;
        }

        const { ctx, getIssued } = buildCtx(req);
        const response = await handleMcpMessage(msg, ctx, gone.signal);
        if (gone.signal.aborted || res.writableEnded) {
            return;
        }
        if (!response) {
            res.writeHead(202);
            res.end();
            return;
        }
        const extra: Record<string, string> = {};
        const sid = getIssued() || headerSessionId(req);
        if (sid) {
            extra['Mcp-Session-Id'] = sid;
        }
        sendJson(res, 200, response, extra);
    } finally {
        gone.stop();
    }
}

function listenForClientGone(res: http.ServerResponse): { signal: AbortSignal; stop: () => void } {
    const ac = new AbortController();
    const onClose = () => {
        if (!res.writableFinished) {
            ac.abort();
        }
    };
    res.on('close', onClose);
    return {
        signal: ac.signal,
        stop: () => res.off('close', onClose),
    };
}

export function createStreamableHttpServer(log: StreamableHttpLog = () => undefined): http.Server {
    return http.createServer((req, res) => {
        handleStreamableHttpRequest(req, res, log).catch(e => {
            log(`请求处理失败: ${e?.message ?? e}`);
            if (!res.headersSent) {
                sendText(res, 500, 'Internal Server Error');
            }
        });
    });
}

export function tryListen(
    server: http.Server,
    port: number,
    host: string,
    maxAttempts: number,
    log: StreamableHttpLog = () => undefined,
): Promise<number> {
    return new Promise((resolve, reject) => {
        let attempt = 0;
        const tryPort = (p: number) => {
            const onError = (err: NodeJS.ErrnoException) => {
                server.off('listening', onListening);
                if (err.code === 'EADDRINUSE' && attempt < maxAttempts - 1) {
                    attempt++;
                    log(`端口 ${p} 占用,尝试 ${p + 1}`);
                    tryPort(p + 1);
                } else {
                    reject(err);
                }
            };
            const onListening = () => {
                server.off('error', onError);
                resolve(p);
            };
            server.once('error', onError);
            server.once('listening', onListening);
            server.listen(p, host);
        };
        tryPort(port);
    });
}
