import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const NAME = 'tabby-mcp-jc';
const FLAG = 'pause.flag';

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

export function getPauseFlagPath(): string {
    return path.join(stateDir(), FLAG);
}

export function isPaused(): boolean {
    try {
        return fs.existsSync(getPauseFlagPath());
    } catch {
        return false;
    }
}

export function setPaused(paused: boolean): void {
    const p = getPauseFlagPath();
    if (paused) {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, String(Date.now()), 'utf8');
    } else {
        try {
            fs.unlinkSync(p);
        } catch {
        }
    }
}

export function clearPauseOnStartup(): void {
    setPaused(false);
}
