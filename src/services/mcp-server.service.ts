import * as fs from 'fs';
import * as net from 'net';
import { randomBytes } from 'crypto';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ConfigService } from 'tabby-core';

import { negotiateProtocolVersion } from '../core/protocol';
import { SERVER_INFO, SERVER_INSTRUCTIONS } from '../core/server-info';
import { ToolError, ToolsService } from './tools.service';
import { McpControlService } from './mcp-control.service';
import { getSocketPath, getStateDir, getTokenPath } from '../core/paths';
import { HttpProcessService } from './http-process.service';
import { t } from '../i18n/t';

const MAX_LINE_BYTES = 4 * 1024 * 1024;

const CLOSE_TIMEOUT_MS = 2000;

export type ServerStatus = 'stopped' | 'running' | 'disabled' | 'error';

function writeJson(sock: net.Socket, obj: any): void {
    try {
        sock.write(JSON.stringify(obj) + '\n');
    } catch {
    }
}

function pipeLines(sock: net.Socket, onLine: (line: string) => void): void {
    let buf = '';
    sock.on('data', chunk => {
        buf += chunk.toString('utf8');
        let idx: number;
        while ((idx = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            if (line.trim()) {
                onLine(line);
            }
        }
        if (buf.length > MAX_LINE_BYTES) {
            sock.destroy();
        }
    });
}

@Injectable({ providedIn: 'root' })
export class McpServerService {
    status: ServerStatus = 'stopped';
    statusMessage = '';
    readonly socketPath = getSocketPath();

    readonly windowId = process.pid;

    private server: net.Server | null = null;
    private token = '';
    private sockets = new Set<net.Socket>();
    private inflight = new Map<net.Socket, Map<string, AbortController>>();
    private changed = new Subject<void>();

    readonly changed$: Observable<void> = this.changed.asObservable();

    constructor(
        private tools: ToolsService,
        private config: ConfigService,
        private httpProcess: HttpProcessService,
        private control: McpControlService,
    ) {
        this.control.initOnStartup();
    }

    get tokenPath(): string {
        return getTokenPath();
    }

    async start(): Promise<void> {
        this.control.initOnStartup();
        if (this.server) {
            return;
        }

        try {
            this.issueToken();
        } catch (e: any) {
            this.setStatus('error', t('settings.tokenFileWriteFailed', { err: e.message }));
            return;
        }

        if (process.platform !== 'win32' && fs.existsSync(this.socketPath)) {
            try {
                fs.unlinkSync(this.socketPath);
            } catch {
            }
        }

        const srv = net.createServer(sock => this.onConnection(sock));
        srv.on('error', (e: any) => {
            this.setStatus('error', e.message);
            this.server = null;
        });

        await new Promise<void>(resolve => {
            srv.once('listening', () => {
                this.server = srv;
                this.setStatus('running', '');
                void this.httpProcess.ensureRunning().then(() => this.changed.next());
                resolve();
            });
            srv.once('error', () => resolve());
            srv.listen(this.socketPath);
        });
    }

    stop(): Promise<void> {
        const owned = this.server;
        this.server = null;

        const closed: Array<Promise<void>> = [];

        if (owned) {
            closed.push(new Promise<void>(resolve => owned.close(() => resolve())));
        }
        for (const sock of this.sockets) {
            closed.push(new Promise<void>(resolve => sock.once('close', () => resolve())));
            sock.destroy();
        }
        this.sockets.clear();

        if (owned && process.platform !== 'win32') {
            try {
                fs.unlinkSync(this.socketPath);
            } catch {
            }
        }

        this.setStatus('stopped', '');
        this.httpProcess.stop({ excludePid: process.pid });

        if (!closed.length) {
            return Promise.resolve();
        }
        return Promise.race([
            Promise.all(closed).then(() => undefined),
            new Promise<void>(resolve => {
                setTimeout(resolve, CLOSE_TIMEOUT_MS).unref?.();
            }),
        ]);
    }

    async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }

    private setStatus(s: ServerStatus, msg: string): void {
        this.status = s;
        this.statusMessage = msg;
        this.changed.next();
    }

    private issueToken(): void {
        fs.mkdirSync(getStateDir(), { recursive: true });
        const p = getTokenPath();

        try {
            const existing = fs.readFileSync(p, 'utf8').trim();
            if (existing.length >= 32) {
                this.token = existing;
                return;
            }
        } catch {
        }

        this.token = randomBytes(32).toString('hex');
        fs.writeFileSync(p, this.token, { encoding: 'utf8', mode: 0o600 });
        if (process.platform !== 'win32') {
            fs.chmodSync(p, 0o600);
        }
    }

    regenerateToken(): void {
        try {
            fs.unlinkSync(getTokenPath());
        } catch {
        }
        this.issueToken();
    }

    applyRotatedToken(token: string): void {
        this.token = token;
    }

    getTokenPlain(): string {
        return this.token || '';
    }

    private onConnection(sock: net.Socket): void {
        this.sockets.add(sock);
        sock.on('close', () => {
            this.abortSocket(sock);
            this.sockets.delete(sock);
        });
        sock.on('error', () => {
        });

        let authed = false;
        pipeLines(sock, line => {
            if (!authed) {
                let ok: boolean;
                try {
                    const msg = JSON.parse(line);
                    ok = typeof msg?.auth === 'string' && msg.auth === this.token;
                } catch {
                    ok = false;
                }
                if (!ok) {
                    sock.destroy();
                    return;
                }
                authed = true;
                return;
            }
            void this.handle(sock, line);
        });
    }

    private async handle(sock: net.Socket, line: string): Promise<void> {
        let msg: any;
        try {
            msg = JSON.parse(line);
        } catch {
            return;
        }

        const id = msg?.id ?? null;
        const reply = (result: any) => writeJson(sock, { jsonrpc: '2.0', id, result });
        const fail = (code: number, message: string) =>
            writeJson(sock, { jsonrpc: '2.0', id, error: { code, message } });

        if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
            return fail(-32600, 'invalid request');
        }

        if (msg.method === 'initialize') {
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

        if (msg.method === 'notifications/cancelled') {
            this.abortCall(sock, msg.params?.requestId);
            return;
        }

        if (msg.id === undefined || msg.method.startsWith('notifications/')) {
            return;
        }

        if (msg.method === 'tools/list') {
            return reply({ tools: this.tools.definitions });
        }

        if (msg.method === 'tools/call') {
            const name = msg.params?.name;
            const args = msg.params?.arguments ?? {};
            const caller = typeof msg.params?.caller === 'string' ? msg.params.caller : undefined;
            const ac = new AbortController();
            this.trackCall(sock, id, ac);
            try {
                const result = await this.tools.call(name, args, { caller, signal: ac.signal });
                if (ac.signal.aborted || sock.destroyed) {
                    return;
                }
                return reply({
                    content: [{ type: 'text', text: JSON.stringify(result) }],
                    structuredContent: result,
                });
            } catch (e: any) {
                if (ac.signal.aborted || sock.destroyed) {
                    return;
                }
                const code = e instanceof ToolError ? e.code : 'internal';
                return reply({
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ error: code, message: e?.message ?? String(e) }),
                        },
                    ],
                    isError: true,
                });
            } finally {
                this.dropCall(sock, id);
            }
        }

        return fail(-32601, `unknown method: ${msg.method}`);
    }

    private trackCall(sock: net.Socket, id: unknown, ac: AbortController): void {
        if (id === undefined || id === null) {
            return;
        }
        let calls = this.inflight.get(sock);
        if (!calls) {
            calls = new Map();
            this.inflight.set(sock, calls);
        }
        calls.set(String(id), ac);
    }

    private dropCall(sock: net.Socket, id: unknown): void {
        const calls = this.inflight.get(sock);
        if (!calls || id === undefined || id === null) {
            return;
        }
        calls.delete(String(id));
        if (!calls.size) {
            this.inflight.delete(sock);
        }
    }

    private abortCall(sock: net.Socket, id: unknown): void {
        if (id === undefined || id === null) {
            return;
        }
        this.inflight.get(sock)?.get(String(id))?.abort();
    }

    private abortSocket(sock: net.Socket): void {
        const calls = this.inflight.get(sock);
        if (!calls) {
            return;
        }
        for (const ac of calls.values()) {
            ac.abort();
        }
        this.inflight.delete(sock);
    }
}
