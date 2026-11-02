import * as fs from 'fs';

import * as path from 'path';

import { getStateDir, getTokenPath } from './paths';

export { DEFAULT_HTTP_BIND_HOST, LAN_HTTP_BIND_HOST, resolveHttpBindHost } from './http-bind';

export const DEFAULT_HTTP_PORT = 18765;

export const MCP_HTTP_PATH = '/mcp';

export function getHttpPortPath(): string {
    return path.join(getStateDir(), 'http-port');
}

export function getHttpPidPath(): string {
    return path.join(getStateDir(), 'http.pid');
}

export function getLocalMcpUrl(port: number = DEFAULT_HTTP_PORT): string {
    return `http://127.0.0.1:${port}${MCP_HTTP_PATH}`;
}

export function readHttpPort(): number {
    try {
        const raw = fs.readFileSync(getHttpPortPath(), 'utf8').trim();

        const n = Number(raw);

        if (Number.isInteger(n) && n > 0 && n < 65536) {
            return n;
        }
    } catch {
        /* 尚未启动过 */
    }

    return DEFAULT_HTTP_PORT;
}

export function writeHttpPort(port: number): void {
    fs.mkdirSync(getStateDir(), { recursive: true });

    fs.writeFileSync(getHttpPortPath(), String(port), 'utf8');
}

export function readBearerToken(): string {
    try {
        return fs.readFileSync(getTokenPath(), 'utf8').trim();
    } catch {
        return '';
    }
}
