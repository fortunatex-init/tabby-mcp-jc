import * as fs from 'fs';

import { BACKUP_SUFFIX, OWNERSHIP_MARKERS, sameUrl, writeAtomic } from './config-io';
import { t } from '../i18n/t';

export const CURSOR_SERVER_KEY = 'tabby';
export const CURSOR_OWNER_HEADER = 'X-Tabby-Owner';
export const CURSOR_BACKUP_SUFFIX = BACKUP_SUFFIX;

export type CursorBearerStatus =
    | 'updated'
    | 'skipped_no_entry'
    | 'skipped_no_bearer'
    | 'skipped_not_ours'
    | 'skipped_foreign_token'
    | 'error_parse';

export interface CursorInspect {
    kind: 'absent' | 'parse_error' | 'invalid' | 'conflict' | 'installed';
    message?: string;
    recordedEndpoint?: string;
    stale?: boolean;
}

function stripBom(raw: string): string {
    return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

function eolOf(raw: string): string {
    return raw.includes('\r\n') ? '\r\n' : '\n';
}

function stringifyJson(value: unknown, eol: string): string {
    const text = JSON.stringify(value, null, 2) + '\n';
    return eol === '\r\n' ? text.replace(/\n/g, '\r\n') : text;
}

function headerValue(
    headers: Record<string, unknown> | undefined,
    name: string,
): string | undefined {
    if (!headers) return undefined;
    const want = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === want && typeof v === 'string') return v;
    }
    return undefined;
}

export function isLoopbackMcpUrl(url: string): boolean {
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
        if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') return false;
        return u.pathname.replace(/\/+$/, '') === '/mcp';
    } catch {
        return false;
    }
}

function ownerMarker(entry: any): boolean {
    const headers = entry?.headers;
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return false;
    const v = headerValue(headers, CURSOR_OWNER_HEADER);
    return typeof v === 'string' && OWNERSHIP_MARKERS.includes(v);
}

export function isOurCursorEntry(entry: unknown): boolean {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
    const e = entry as any;
    if (ownerMarker(e)) return true;
    if (
        Array.isArray(e.args) &&
        e.args.some(
            (a: unknown) => typeof a === 'string' && OWNERSHIP_MARKERS.some(m => a.includes(m)),
        )
    ) {
        return true;
    }
    return typeof e.url === 'string' && isLoopbackMcpUrl(e.url);
}

function extractBearer(entry: any): string | undefined {
    const auth = headerValue(entry?.headers, 'Authorization');
    if (!auth) return undefined;
    const m = /^Bearer\s+(\S+)\s*$/i.exec(auth.trim());
    return m ? m[1] : undefined;
}

function parseRoot(
    raw: string,
): { ok: true; json: any; eol: string; message: string } | { ok: false; message: string } {
    const text = stripBom(raw);
    if (!text.trim()) {
        return { ok: true, json: {}, eol: eolOf(raw), message: '' };
    }
    try {
        const json = JSON.parse(text);
        return { ok: true, json, eol: eolOf(raw), message: '' };
    } catch (e: any) {
        return { ok: false, message: e?.message || String(e) };
    }
}

function shapeError(json: any): string | null {
    if (typeof json !== 'object' || json === null || Array.isArray(json)) {
        return t('install.notObject');
    }
    if (
        json.mcpServers !== undefined &&
        (typeof json.mcpServers !== 'object' ||
            json.mcpServers === null ||
            Array.isArray(json.mcpServers))
    ) {
        return t('install.mcpNotObject');
    }
    return null;
}

export function buildCursorEntry(
    url: string,
    token: string,
): {
    url: string;
    headers: { Authorization: string; 'X-Tabby-Owner': string };
} {
    return {
        url,
        headers: {
            Authorization: `Bearer ${token}`,
            'X-Tabby-Owner': OWNERSHIP_MARKERS[0],
        },
    };
}

export function inspectCursorConfig(raw: string, currentUrl: string): CursorInspect {
    const parsed = parseRoot(raw);
    if (!parsed.ok) return { kind: 'parse_error', message: parsed.message };
    const bad = shapeError(parsed.json);
    if (bad) return { kind: 'invalid', message: bad };
    const entry = parsed.json.mcpServers?.[CURSOR_SERVER_KEY];
    if (!entry) return { kind: 'absent' };
    if (!isOurCursorEntry(entry)) return { kind: 'conflict' };
    const recordedEndpoint = typeof entry.url === 'string' ? entry.url : undefined;
    return {
        kind: 'installed',
        recordedEndpoint,
        stale: !sameUrl(recordedEndpoint, currentUrl),
    };
}

export function renderCursorInstall(
    raw: string,
    url: string,
    token: string,
): { ok: true; text: string; message: string } | { ok: false; message: string } {
    const parsed = parseRoot(raw);
    if (!parsed.ok) {
        return {
            ok: false,
            message: t('install.badJson', {
                err: parsed.message,
            }),
        };
    }
    const bad = shapeError(parsed.json);
    if (bad) return { ok: false, message: t('bearer.aborted', { err: bad }) };
    const json = parsed.json;
    json.mcpServers = json.mcpServers ?? {};
    const existing = json.mcpServers[CURSOR_SERVER_KEY];
    if (existing && !isOurCursorEntry(existing)) {
        return {
            ok: false,
            message: t('install.mcpForeign', { name: CURSOR_SERVER_KEY }),
        };
    }
    json.mcpServers[CURSOR_SERVER_KEY] = buildCursorEntry(url, token);
    return { ok: true, text: stringifyJson(json, parsed.eol), message: '' };
}

export function renderCursorUninstall(
    raw: string,
): { ok: true; text: string; removed: boolean; message: string } | { ok: false; message: string } {
    const parsed = parseRoot(raw);
    if (!parsed.ok) {
        return {
            ok: false,
            message: t('install.badJsonAbort', { err: parsed.message }),
        };
    }
    const bad = shapeError(parsed.json);
    if (bad) return { ok: false, message: t('bearer.aborted', { err: bad }) };
    const entry = parsed.json?.mcpServers?.[CURSOR_SERVER_KEY];
    if (!entry) return { ok: true, text: raw, removed: false, message: '' };
    if (!isOurCursorEntry(entry)) {
        return {
            ok: false,
            message: t('install.entryNotOurs', {
                name: CURSOR_SERVER_KEY,
            }),
        };
    }
    delete parsed.json.mcpServers[CURSOR_SERVER_KEY];
    return { ok: true, text: stringifyJson(parsed.json, parsed.eol), removed: true, message: '' };
}

export interface CursorBearerUpdate {
    text: string;
    ok: boolean;
    status: CursorBearerStatus;
    message: string;
}

export function updateCursorBearer(
    raw: string,
    opts: { newToken: string; oldToken?: string; expectedUrl: string },
): CursorBearerUpdate {
    const parsed = parseRoot(raw);
    if (!parsed.ok) {
        return {
            text: raw,
            ok: false,
            status: 'error_parse',
            message: t('bearer.badJson', { err: parsed.message }),
        };
    }
    const bad = shapeError(parsed.json);
    if (bad) {
        return {
            text: raw,
            ok: false,
            status: 'error_parse',
            message: t('bearer.notChanged', { err: bad }),
        };
    }
    const entry = parsed.json.mcpServers?.[CURSOR_SERVER_KEY];
    if (!entry) {
        return {
            text: raw,
            ok: false,
            status: 'skipped_no_entry',
            message: t('bearer.noCursorEntry'),
        };
    }
    const url = typeof entry.url === 'string' ? entry.url : undefined;
    if (!sameUrl(url, opts.expectedUrl)) {
        return {
            text: raw,
            ok: false,
            status: 'skipped_not_ours',
            message: t('bearer.cursorWrongUrl'),
        };
    }
    const bearer = extractBearer(entry);
    if (!bearer) {
        return {
            text: raw,
            ok: false,
            status: 'skipped_no_bearer',
            message: t('bearer.cursorNoBearer'),
        };
    }
    if (opts.oldToken !== undefined && opts.oldToken !== '' && bearer !== opts.oldToken) {
        return {
            text: raw,
            ok: false,
            status: 'skipped_foreign_token',
            message: t('bearer.foreign'),
        };
    }
    const headers = entry.headers && typeof entry.headers === 'object' ? entry.headers : {};
    let replaced = false;
    for (const k of Object.keys(headers)) {
        if (k.toLowerCase() === 'authorization') {
            headers[k] = `Bearer ${opts.newToken}`;
            replaced = true;
        }
    }
    if (!replaced) {
        return {
            text: raw,
            ok: false,
            status: 'skipped_no_bearer',
            message: t('bearer.cursorNoBearer'),
        };
    }
    entry.headers = headers;
    return {
        text: stringifyJson(parsed.json, parsed.eol),
        ok: true,
        status: 'updated',
        message: t('bearer.updated'),
    };
}

export interface ApplyCursorBearerResult {
    ok: boolean;
    status: CursorBearerStatus | 'skipped_no_file';
    message: string;
    wrote: boolean;
}

export function applyCursorBearerReset(
    configPath: string,
    opts: { newToken: string; oldToken?: string; expectedUrl: string },
): ApplyCursorBearerResult {
    if (!fs.existsSync(configPath)) {
        return {
            ok: false,
            status: 'skipped_no_file',
            message: t('bearer.cursorMissing'),
            wrote: false,
        };
    }
    let raw: string;
    try {
        raw = fs.readFileSync(configPath, 'utf8');
    } catch (e: any) {
        return {
            ok: false,
            status: 'skipped_no_entry',
            message: t('bearer.cursorReadFailed', { err: e?.message || e }),
            wrote: false,
        };
    }
    const upd = updateCursorBearer(raw, opts);
    if (!upd.ok) {
        return { ok: false, status: upd.status, message: upd.message, wrote: false };
    }
    try {
        fs.copyFileSync(configPath, configPath + BACKUP_SUFFIX);
    } catch {

    }
    try {
        writeAtomic(configPath, upd.text);
    } catch (e: any) {
        return {
            ok: false,
            status: 'error_parse',
            message: t('bearer.cursorWriteFailed', { err: e?.message || e }),
            wrote: false,
        };
    }
    return { ok: true, status: 'updated', message: upd.message, wrote: true };
}
