import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';
import * as path from 'path';
import { execFile } from 'child_process';
import { Injectable } from '@angular/core';
import { ConfigService } from 'tabby-core';
import { Observable, Subject } from 'rxjs';
import { ToastService } from './toast.service';

import { getStateDir, listSocketPaths } from '../core/paths';
import {
    DEFAULT_HTTP_PORT,
    getHttpPidPath,
    getLocalMcpUrl,
    readHttpPort,
    resolveHttpBindHost,
    writeHttpPort,
} from '../core/http-endpoint';
import { clearPauseOnStartup } from '../core/pause-flag';
import { t } from '../i18n/t';
import { clearHttpSessions, createStreamableHttpServer, tryListen } from '../core/streamable-http';

export type HttpProcessStatus = 'stopped' | 'running' | 'starting' | 'error';

export function getHttpServerScriptPath(): string {
    return path.join(__dirname, 'http-server.js');
}

function isPidAlive(pid: number): boolean {
    if (!Number.isInteger(pid) || pid <= 0) {
        return false;
    }
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

function readPidFile(): number | null {
    try {
        const raw = fs.readFileSync(getHttpPidPath(), 'utf8').trim();
        const n = Number(raw);
        return Number.isInteger(n) && n > 0 ? n : null;
    } catch {
        return null;
    }
}

function writePidFile(pid: number): void {
    fs.mkdirSync(getStateDir(), { recursive: true });
    fs.writeFileSync(getHttpPidPath(), String(pid), 'utf8');
}

function clearPidFile(): void {
    try {
        fs.unlinkSync(getHttpPidPath());
    } catch {
    }
}

export function probeLocalPort(port: number, timeoutMs = 400): Promise<boolean> {
    return new Promise(resolve => {
        const sock = net.connect({ host: '127.0.0.1', port });
        let done = false;
        const finish = (ok: boolean) => {
            if (done) {
                return;
            }
            done = true;
            try {
                sock.destroy();
            } catch {
            }
            resolve(ok);
        };
        sock.once('connect', () => finish(true));
        sock.once('error', () => finish(false));
        sock.setTimeout(timeoutMs, () => finish(false));
    });
}

function logHttp(msg: string): void {
    try {
        // eslint-disable-next-line no-console
        console.log(`tabby-mcp-jc http: ${msg}`);
    } catch {

    }
}

function killLegacyHttpServerChildren(): Promise<number> {
    return new Promise(resolve => {
        if (process.platform === 'win32') {
            const ps = [
                '$n=0',
                'Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |',
                '  Where-Object {',
                "    $_.Name -match '^(node|node\\.exe)$' -and",
                '    $_.CommandLine -and',
                "    $_.CommandLine -match 'http-server\\.js' -and",
                "    $_.CommandLine -match 'tabby-mcp-jc'",
                '  } | ForEach-Object {',
                '    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; $n++ } catch {}',
                '  }',
                'Write-Output $n',
            ].join(' ');
            execFile(
                'powershell.exe',
                ['-NoProfile', '-NonInteractive', '-Command', ps],
                { windowsHide: true, timeout: 15000 },
                (err, stdout) => {
                    if (err) {
                        logHttp(`清理旧 http-server 子进程失败: ${err.message}`);
                        resolve(0);
                        return;
                    }
                    const n = Number(String(stdout).trim()) || 0;
                    if (n > 0) {
                        logHttp(`已结束 ${n} 个旧版 node http-server.js 进程`);
                    }
                    resolve(n);
                },
            );
            return;
        }
        execFile(
            'sh',
            ['-c', "pkill -f 'tabby-mcp-jc.*http-server\\.js' 2>/dev/null; true"],
            { timeout: 5000 },
            () => resolve(0),
        );
    });
}

@Injectable({ providedIn: 'root' })
export class HttpProcessService {
    status: HttpProcessStatus = 'stopped';
    statusMessage = '';

    private readonly changed = new Subject<void>();
    readonly changed$: Observable<void> = this.changed.asObservable();

    private owning = false;
    private server: http.Server | null = null;
    private boundPort: number | null = null;
    private starting: Promise<void> | null = null;
    private takeoverTimer: ReturnType<typeof setInterval> | null = null;
    private closed = false;

    constructor(
        private config: ConfigService,
        private toast: ToastService,
    ) {
        this.startTakeoverWatch();
    }

    get scriptPath(): string {
        return getHttpServerScriptPath();
    }

    get mcpUrl(): string {
        return getLocalMcpUrl(this.boundPort ?? readHttpPort());
    }

    get livePort(): number | null {
        return this.boundPort;
    }

    get recordedPid(): number | null {
        const pid = readPidFile();
        return pid && isPidAlive(pid) ? pid : null;
    }

    get isOwner(): boolean {
        return this.owning;
    }

    private notify(): void {
        this.changed.next();
    }

    private setStatus(status: HttpProcessStatus, message = ''): void {
        this.status = status;
        this.statusMessage = message;
        this.notify();
    }

    async ensureRunning(): Promise<void> {
        if (this.closed) {
            return;
        }
        if (this.owning && this.server) {
            this.setStatus('running', '');
            return;
        }
        if (await this.isServing()) {
            this.setStatus('running', this.owning ? '' : t('settings.hostedElsewhere'));
            return;
        }

        if (this.starting) {
            return this.starting;
        }

        this.starting = this.startOwner().finally(() => {
            this.starting = null;
        });
        return this.starting;
    }

    async restartServing(): Promise<void> {
        this.closed = false;
        this.setStatus('stopped', '');
        await this.closeOwnedServer();
        await killLegacyHttpServerChildren();
        await new Promise<void>(r => setTimeout(r, 400));
        this.setStatus('starting', '');
        await this.ensureRunning();
    }

    stop(opts: { force?: boolean; excludePid?: number } = {}): void {
        this.closed = true;
        this.stopTakeoverWatch();

        if (!opts.force) {
            const others = listSocketPaths().filter(p => p.pid !== opts.excludePid);
            if (others.length > 0) {
                void this.closeOwnedServer();
                this.setStatus('stopped', '');
                return;
            }
        }

        void this.closeOwnedServer();
        void killLegacyHttpServerChildren();
        this.setStatus('stopped', '');
    }

    async isServing(): Promise<boolean> {
        const port = readHttpPort();
        if (await probeLocalPort(port)) {
            return true;
        }
        return port !== DEFAULT_HTTP_PORT && (await probeLocalPort(DEFAULT_HTTP_PORT));
    }

    private async startOwner(): Promise<void> {
        this.setStatus('starting', '');
        clearPauseOnStartup();

        const killed = await killLegacyHttpServerChildren();
        if (killed > 0) {
            await new Promise<void>(r => setTimeout(r, 500));
        }
        this.reapStalePid();

        if (await this.isServing()) {
            this.setStatus('running', t('settings.hostedElsewhere'));
            return;
        }

        const bindHost = resolveHttpBindHost(
            process.env.TABBY_MCP_HTTP_HOST,
            this.config.store?.claudeMcp?.httpBindHost,
        );
        const preferred = Number(process.env.TABBY_MCP_HTTP_PORT) || DEFAULT_HTTP_PORT;

        try {
            const server = createStreamableHttpServer(logHttp);
            let port: number;
            try {
                port = await tryListen(server, preferred, bindHost, 20, logHttp);
            } catch (e: any) {
                if (e?.code === 'EADDRINUSE') {
                    await killLegacyHttpServerChildren();
                    await new Promise<void>(r => setTimeout(r, 500));
                    if (await this.isServing()) {
                        try {
                            server.close();
                        } catch {

                        }
                        this.setStatus('running', t('settings.hostedElsewhere'));
                        return;
                    }
                    port = await tryListen(server, preferred, bindHost, 5, logHttp);
                } else if (await this.isServing()) {
                    this.setStatus('running', t('settings.hostedElsewhere'));
                    return;
                } else {
                    this.setStatus('error', e?.message ?? String(e));
                    logHttp(`启动失败: ${this.statusMessage}`);
                    return;
                }
            }

            this.server = server;
            this.boundPort = port;
            this.owning = true;
            writePidFile(process.pid);
            try {
                writeHttpPort(port);
            } catch (e: any) {
                logHttp(`写入端口文件失败: ${e?.message ?? e}`);
            }

            server.on('close', () => {
                if (this.server === server) {
                    this.server = null;
                    this.owning = false;
                    this.boundPort = null;
                    this.notify();
                }
            });

            logHttp(`listening in-process on ${bindHost}:${port} (pid ${process.pid})`);
            if (port !== preferred) {
                this.toast.notice(t('settings.portFallback', { old: preferred, new: port }));
            }
            this.setStatus('running', '');
        } catch (e: any) {
            if (await this.isServing()) {
                this.setStatus('running', t('settings.hostedElsewhere'));
                return;
            }
            this.setStatus('error', e?.message ?? String(e));
            logHttp(`启动失败: ${this.statusMessage}`);
        }
    }

    private async closeOwnedServer(): Promise<void> {
        clearHttpSessions();
        const server = this.server;
        this.server = null;
        this.owning = false;
        this.boundPort = null;
        this.notify();
        const pid = readPidFile();
        if (pid === process.pid) {
            clearPidFile();
        }
        if (!server) {
            return;
        }
        await new Promise<void>(resolve => {
            let done = false;
            const finish = () => {
                if (done) {
                    return;
                }
                done = true;
                resolve();
            };
            try {
                server.close(() => finish());
                setTimeout(() => {
                    try {
                        (server as any).closeAllConnections?.();
                    } catch {

                    }
                    finish();
                }, 1500);
            } catch {
                finish();
            }
        });
    }

    private startTakeoverWatch(): void {
        if (this.takeoverTimer) {
            return;
        }
        this.takeoverTimer = setInterval(() => {
            if (this.closed || this.owning || this.starting) {
                return;
            }
            void this.isServing().then(ok => {
                if (!ok && !this.closed && !this.owning) {
                    void this.ensureRunning();
                }
            });
        }, 2000);
        try {
            (this.takeoverTimer as any).unref?.();
        } catch {

        }
    }

    private stopTakeoverWatch(): void {
        if (this.takeoverTimer) {
            clearInterval(this.takeoverTimer);
            this.takeoverTimer = null;
        }
    }

    private reapStalePid(): void {
        const pid = readPidFile();
        if (pid !== null && !isPidAlive(pid)) {
            clearPidFile();
        }
    }
}
