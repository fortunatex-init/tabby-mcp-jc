import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const NAME = 'tabby-mcp-jc';

const WIN_PIPE_DIR = '\\\\.\\pipe\\';

function socketBaseName(): string {
    if (process.platform === 'win32') {
        const user = (os.userInfo().username || 'user').replace(/[^A-Za-z0-9._-]/g, '_');
        return `${NAME}-${user}-`;
    }
    return `${NAME}-${process.getuid?.() ?? 0}-`;
}

function socketDir(): string {
    return process.env.XDG_RUNTIME_DIR || os.tmpdir();
}

export function getSocketPath(pid: number = process.pid): string {
    if (process.platform === 'win32') {
        return `${WIN_PIPE_DIR}${socketBaseName()}${pid}`;
    }
    return path.join(socketDir(), `${socketBaseName()}${pid}.sock`);
}

export function listSocketPaths(): Array<{ pid: number; path: string }> {
    const base = socketBaseName();
    const suffix = process.platform === 'win32' ? '' : '.sock';
    let names: string[];
    try {
        names = fs.readdirSync(process.platform === 'win32' ? WIN_PIPE_DIR : socketDir());
    } catch {
        return [];
    }
    const out: Array<{ pid: number; path: string }> = [];
    for (const name of names) {
        if (!name.startsWith(base) || !name.endsWith(suffix)) {
            continue;
        }
        const rest = name.slice(base.length, name.length - suffix.length);
        if (!/^\d+$/.test(rest)) {
            continue;
        }
        const pid = Number(rest);
        out.push({ pid, path: getSocketPath(pid) });
    }
    return out;
}

function tabbyDataDir(): string {
    if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
        return path.join(appData, 'tabby');
    }
    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'tabby');
    }
    const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    return path.join(xdg, 'tabby');
}

export function getStateDir(): string {
    return path.join(tabbyDataDir(), NAME);
}

export function getTokenPath(): string {
    return path.join(getStateDir(), 'token');
}

export function getAuditPath(day: string): string {
    return path.join(getStateDir(), `audit-${day}.log`);
}

export function getLegacyAuditPath(): string {
    return path.join(getStateDir(), 'audit.log');
}

export function auditDayStamp(t: number = Date.now()): string {
    const d = new Date(t);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
