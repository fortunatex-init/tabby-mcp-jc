import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const NAME = 'tabby-mcp-jc';

function stateDir(): string {
    if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
        return path.join(appData, 'tabby', NAME);
    }
    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'tabby', NAME);
    }
    const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    return path.join(xdg, 'tabby', NAME);
}

export function getTokenMetaPath(): string {
    return path.join(stateDir(), 'token-meta.json');
}

export interface TokenMeta {
    lastRotatedAt: number | null;
    fingerprint?: string;
}

export function readTokenMeta(): TokenMeta {
    try {
        const raw = fs.readFileSync(getTokenMetaPath(), 'utf8');
        const j = JSON.parse(raw);
        return {
            lastRotatedAt: typeof j.lastRotatedAt === 'number' ? j.lastRotatedAt : null,
            fingerprint: typeof j.fingerprint === 'string' ? j.fingerprint : undefined,
        };
    } catch {
        return { lastRotatedAt: null };
    }
}

export function writeTokenMeta(meta: TokenMeta): void {
    fs.mkdirSync(stateDir(), { recursive: true });
    fs.writeFileSync(getTokenMetaPath(), JSON.stringify(meta, null, 2), 'utf8');
}
