import * as fs from 'fs';
import * as path from 'path';
import trimEnd from 'lodash/trimEnd';

import { t } from '../i18n/t';

export const OWNERSHIP_MARKER = 'tabby-mcp-jc';

export const OWNERSHIP_MARKERS = [OWNERSHIP_MARKER, 'tabby-claude-mcp'];

export const BACKUP_SUFFIX = '.bak-tabby-mcp-jc';
export const TMP_SUFFIX = '.tmp-tabby-mcp-jc';

export interface WriteConfigResult {
    ok: boolean;
    message: string;
    backupPath: string | null;
}

export function isOurPath(v: unknown): v is string {
    return typeof v === 'string' && OWNERSHIP_MARKERS.some(m => v.includes(m));
}

export function normalizeUrl(u: string): string {
    return trimEnd((u || '').trim(), '/');
}

export function sameUrl(a: string | undefined, b: string): boolean {
    if (!a) {
        return false;
    }
    return normalizeUrl(a) === normalizeUrl(b);
}

export function samePath(a: string | undefined, b: string): boolean {
    if (!a) {
        return false;
    }
    const norm = (s: string) => {
        const n = path.normalize(s);
        return process.platform === 'win32' ? n.toLowerCase() : n;
    };
    return norm(a) === norm(b);
}

export function writeAtomic(p: string, text: string): void {
    const tmp = p + TMP_SUFFIX;
    fs.writeFileSync(tmp, text, 'utf8');
    try {
        fs.renameSync(tmp, p);
    } catch (e) {
        try {
            fs.unlinkSync(tmp);
        } catch {
        }
        throw e;
    }
}

export function writeConfigFile(configPath: string, text: string): WriteConfigResult {
    const backupPath = configPath + BACKUP_SUFFIX;
    const existed = fs.existsSync(configPath);
    if (existed) {
        try {
            fs.copyFileSync(configPath, backupPath);
        } catch (e: any) {
            return {
                ok: false,
                message: t('install.backupFailed', { err: e.message }),
                backupPath: null,
            };
        }
    } else {
        try {
            fs.mkdirSync(path.dirname(configPath), { recursive: true });
        } catch (e: any) {
            return {
                ok: false,
                message: t('install.mkdirFailed', { err: e.message }),
                backupPath: null,
            };
        }
    }
    try {
        writeAtomic(configPath, text);
    } catch (e: any) {
        const hint = existed ? t('install.backupHint', { path: backupPath }) : '';
        return {
            ok: false,
            message: t('install.writeFailed', { err: `${e.message}${hint}` }),
            backupPath: existed ? backupPath : null,
        };
    }
    return { ok: true, message: '', backupPath: existed ? backupPath : null };
}
