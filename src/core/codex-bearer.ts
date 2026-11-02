import * as fs from 'fs';

import { BACKUP_SUFFIX, normalizeUrl, OWNERSHIP_MARKERS, sameUrl, writeAtomic } from './config-io';
import { t } from '../i18n/t';

export type CodexBearerStatus =
    | 'updated'
    | 'skipped_no_entry'
    | 'skipped_no_bearer'
    | 'skipped_not_ours'
    | 'skipped_foreign_token'
    | 'error_ambiguous';

export interface CodexBearerUpdate {
    text: string;
    ok: boolean;
    status: CodexBearerStatus;
    replacements: number;
    message: string;
    currentBearer?: string;
}

export interface CodexBearerUpdateOpts {
    newToken: string;
    oldToken?: string;
    expectedUrl?: string;
}

export const CODEX_BACKUP_SUFFIX = BACKUP_SUFFIX;

const OUR_HEADER = /^[ \t]*\[[ \t]*mcp_servers[ \t]*\.[ \t]*"?tabby"?[ \t]*\][ \t]*(?:#.*)?$/;
const ANY_HEADER = /^[ \t]*\[\[?[^\][]*\]\]?[ \t]*(?:#.*)?$/;

const BEARER_IN_HEADERS = /(Authorization\s*=\s*)(["'])Bearer\s+([^"']*)\2/gi;

const URL_LINE = /^[ \t]*url[ \t]*=[ \t]*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')[ \t]*(?:#.*)?$/i;

export function sectionPointsAtUs(sectionLines: string[], expectedUrl: string): boolean {
    for (const line of sectionLines) {
        const m = URL_LINE.exec(line);
        if (!m) continue;
        const raw = m[1];
        const unquoted = raw.slice(1, -1).replace(/\\(.)/g, '$1');
        if (sameUrl(unquoted, expectedUrl)) return true;
        try {
            const a = new URL(unquoted);
            const b = new URL(expectedUrl);
            if (
                a.hostname === b.hostname &&
                a.port === b.port &&
                normalizeUrl(a.pathname) === normalizeUrl(b.pathname)
            ) {
                return true;
            }
        } catch {
        }
    }
    return false;
}

function sectionHasOwnership(sectionLines: string[]): boolean {
    const body = sectionLines.join('\n');
    return OWNERSHIP_MARKERS.some(m => body.includes(m));
}

function extractBearer(sectionLines: string[]): string | undefined {
    for (const line of sectionLines) {
        BEARER_IN_HEADERS.lastIndex = 0;
        const m = BEARER_IN_HEADERS.exec(line);
        if (m) return m[3];
    }
    return undefined;
}

export function updateCodexBearer(
    raw: string,
    newTokenOrOpts: string | CodexBearerUpdateOpts,
    maybeOpts?: Omit<CodexBearerUpdateOpts, 'newToken'>,
): CodexBearerUpdate {
    const opts: CodexBearerUpdateOpts =
        typeof newTokenOrOpts === 'string'
            ? { newToken: newTokenOrOpts, ...maybeOpts }
            : newTokenOrOpts;
    const { newToken, oldToken, expectedUrl } = opts;

    if (!raw) {
        return {
            text: raw,
            ok: false,
            status: 'skipped_no_entry',
            replacements: 0,
            message: t('bearer.empty'),
        };
    }
    const lines = raw.split(/\r?\n/);
    const headerIdx: number[] = [];
    for (let i = 0; i < lines.length; i++) {
        if (OUR_HEADER.test(lines[i])) headerIdx.push(i);
    }
    if (headerIdx.length === 0) {
        return {
            text: raw,
            ok: false,
            status: 'skipped_no_entry',
            replacements: 0,
            message: t('bearer.noSection'),
        };
    }

    if (expectedUrl && headerIdx.length > 1) {
        return {
            text: raw,
            ok: false,
            status: 'error_ambiguous',
            replacements: 0,
            message: t('bearer.ambiguous'),
        };
    }

    let replacements = 0;
    const next = [...lines];
    let currentBearer: string | undefined;
    let touchedSection = false;

    for (const start of headerIdx) {
        let end = start + 1;
        while (end < next.length && !ANY_HEADER.test(next[end])) end++;
        const section = next.slice(start, end);

        if (expectedUrl) {
            if (!sectionPointsAtUs(section, expectedUrl)) {
                return {
                    text: raw,
                    ok: false,
                    status: 'skipped_not_ours',
                    replacements: 0,
                    message: t('bearer.wrongUrl'),
                    currentBearer: extractBearer(section),
                };
            }
        }

        const bearer = extractBearer(section);
        currentBearer = bearer;
        if (!bearer) {
            return {
                text: raw,
                ok: false,
                status: 'skipped_no_bearer',
                replacements: 0,
                message: t('bearer.noBearer'),
            };
        }

        if (oldToken !== undefined && oldToken !== '') {
            if (bearer !== oldToken) {
                return {
                    text: raw,
                    ok: false,
                    status: 'skipped_foreign_token',
                    replacements: 0,
                    message: t('bearer.foreign'),
                    currentBearer: bearer,
                };
            }
        } else if (expectedUrl && !sectionHasOwnership(section)) {
            return {
                text: raw,
                ok: false,
                status: 'skipped_foreign_token',
                replacements: 0,
                message: t('bearer.foreign'),
                currentBearer: bearer,
            };
        }

        for (let i = start; i < end; i++) {
            const line = next[i];
            if (!/Authorization/i.test(line) || !/Bearer/i.test(line)) continue;
            BEARER_IN_HEADERS.lastIndex = 0;
            const replaced = line.replace(
                BEARER_IN_HEADERS,
                (_m, prefix: string, quote: string) =>
                    `${prefix}${quote}Bearer ${newToken}${quote}`,
            );
            if (replaced !== line) {
                next[i] = replaced;
                replacements++;
                touchedSection = true;
            }
        }
    }

    if (replacements === 0) {
        return {
            text: raw,
            ok: false,
            status: 'skipped_no_bearer',
            replacements: 0,
            message: t('bearer.replaceFailed'),
            currentBearer,
        };
    }

    const nl = raw.includes('\r\n') ? '\r\n' : '\n';
    return {
        text: next.join(nl),
        ok: true,
        status: 'updated',
        replacements,
        message: touchedSection
            ? t('bearer.updatedN', { n: replacements })
            : `updated ${replacements} Authorization Bearer value(s)`,
        currentBearer,
    };
}

export interface ApplyCodexBearerResult {
    ok: boolean;
    status: CodexBearerStatus | 'skipped_no_file';
    message: string;
    wrote: boolean;
}

export function applyCodexBearerReset(
    configPath: string,
    opts: CodexBearerUpdateOpts,
): ApplyCodexBearerResult {
    if (!fs.existsSync(configPath)) {
        return {
            ok: false,
            status: 'skipped_no_file',
            message: t('bearer.codexMissing'),
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
            message: t('bearer.codexReadFailed', { err: e?.message || e }),
            wrote: false,
        };
    }
    const upd = updateCodexBearer(raw, opts);
    if (!upd.ok) {
        return {
            ok: false,
            status: upd.status,
            message: upd.message,
            wrote: false,
        };
    }
    try {
        fs.copyFileSync(configPath, configPath + CODEX_BACKUP_SUFFIX);
    } catch {

    }
    try {
        writeAtomic(configPath, upd.text);
    } catch (e: any) {
        return {
            ok: false,
            status: 'skipped_no_entry',
            message: t('bearer.codexWriteFailed', { err: e?.message || e }),
            wrote: false,
        };
    }
    return {
        ok: true,
        status: 'updated',
        message: upd.message,
        wrote: true,
    };
}
