import {
    OWNERSHIP_MARKER,
    isOurPath,
    sameUrl,
} from './config-io';
import { t } from '../i18n/t';

export const CODEX_SERVER_KEY = 'tabby';

const OUR_HEADER = /^[ \t]*\[[ \t]*mcp_servers[ \t]*\.[ \t]*"?tabby"?[ \t]*][ \t]*(?:#.*)?$/;

const TABBY_SUB_HEADER =
    /^[ \t]*\[\[?[ \t]*mcp_servers[ \t]*\.[ \t]*(?:"tabby"|'tabby'|tabby)[ \t]*\.[^\][]+[ \t]*\]\]?[ \t]*(?:#.*)?$/;

const ANY_HEADER = /^[ \t]*\[\[?[^\][]*]]?[ \t]*(?:#.*)?$/;

export interface CodexInspect {
    installed: boolean;
    orphans: boolean;
    stale: boolean;
    conflict: boolean;
    parseError?: string;
    recordedEndpoint?: string;
}

export interface CodexRewrite {
    ok: boolean;
    text: string;
    message: string;
    removed?: boolean;
}

interface Section {
    start: number;
    end: number;
    body: string;
}

export function splitToml(raw: string): { lines: string[]; eol: string } {
    return {
        lines: raw.length ? raw.split(/\r?\n/) : [],
        eol: raw.includes('\r\n') ? '\r\n' : '\n',
    };
}

function findHeaderRanges(lines: string[], headerRe: RegExp): Section[] {
    const ranges: Section[] = [];
    for (let i = 0; i < lines.length; i++) {
        if (!headerRe.test(lines[i])) {
            continue;
        }
        let end = lines.length;
        for (let j = i + 1; j < lines.length; j++) {
            if (ANY_HEADER.test(lines[j])) {
                end = j;
                break;
            }
        }
        ranges.push({
            start: i,
            end,
            body: lines.slice(i, end).join('\n'),
        });
    }
    return ranges;
}

function findSection(lines: string[]): Section | null {
    return findHeaderRanges(lines, OUR_HEADER)[0] ?? null;
}

function findSubTables(lines: string[]): Section[] {
    return findHeaderRanges(lines, TABBY_SUB_HEADER);
}

function removeRanges(lines: string[], ranges: Section[]): string[] {
    const kill = new Set<number>();
    for (const r of ranges) {
        for (let i = r.start; i < r.end; i++) {
            kill.add(i);
        }
    }
    return lines.filter((_, i) => !kill.has(i));
}

function quote(v: string): string {
    return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function unquote(s: string): string {
    return s.slice(1, -1).replace(/\\(.)/g, (_, c: string) => {
        if (c === 'n') {
            return '\n';
        }
        if (c === 't') {
            return '\t';
        }
        return c;
    });
}

function extractUrl(body: string): string | undefined {
    const m = /(?:^|\n)[ \t]*url[ \t]*=[ \t]*("(?:[^"\\]|\\.)*")/m.exec(body);
    if (!m) {
        return undefined;
    }
    return unquote(m[1]);
}

function extractShimPath(body: string): string | undefined {
    const strings = body.match(/"(?:[^"\\]|\\.)*"/g) ?? [];
    for (const s of strings) {
        const v = unquote(s);
        if (isOurPath(v) && /shim\.js|http-server\.js/.test(v)) {
            return v;
        }
    }
    return undefined;
}

export function isCodexSectionOurs(body: string): boolean {
    if (body.includes(OWNERSHIP_MARKER) || body.includes('tabby-claude-mcp')) {
        return true;
    }
    if (extractShimPath(body)) {
        return true;
    }
    const url = extractUrl(body);
    return typeof url === 'string' && /127\.0\.0\.1:\d+\/mcp/.test(url);
}

export function renderCodexSection(url: string, token: string): string[] {
    const tok = token || 'REPLACE_WITH_TOKEN';
    return [
        `[mcp_servers.${CODEX_SERVER_KEY}]`,
        `# ${OWNERSHIP_MARKER}`,
        `url = ${quote(url)}`,
        `http_headers = { Authorization = ${quote('Bearer ' + tok)} }`,
    ];
}

export function inspectCodexConfig(raw: string, currentUrl: string): CodexInspect {
    const s: CodexInspect = {
        installed: false,
        orphans: false,
        stale: false,
        conflict: false,
    };
    const { lines } = splitToml(raw);
    if (lines.filter(l => OUR_HEADER.test(l)).length > 1) {
        s.parseError = t('install.codexDuplicate', { name: CODEX_SERVER_KEY });
        return s;
    }
    const section = findSection(lines);
    if (!section) {
        if (findSubTables(lines).length) {
            s.orphans = true;
            s.parseError = t('install.codexOrphanSubtables', {
                name: CODEX_SERVER_KEY,
            });
        }
        return s;
    }
    if (!isCodexSectionOurs(section.body)) {
        s.conflict = true;
        return s;
    }
    s.installed = true;
    s.recordedEndpoint = extractUrl(section.body) ?? extractShimPath(section.body);
    if (extractShimPath(section.body) && !extractUrl(section.body)) {
        s.stale = true;
    } else {
        s.stale = !sameUrl(s.recordedEndpoint, currentUrl);
    }
    return s;
}

export function renderCodexInstall(
    raw: string,
    url: string,
    token: string,
): CodexRewrite {
    if (!token) {
        return { ok: false, text: raw, message: t('install.noToken') };
    }
    const { lines, eol } = splitToml(raw);
    if (lines.filter(l => OUR_HEADER.test(l)).length > 1) {
        return {
            ok: false,
            text: raw,
            message: t('install.codexDuplicate', { name: CODEX_SERVER_KEY }),
        };
    }
    const section = findSection(lines);
    if (section && !isCodexSectionOurs(section.body)) {
        return {
            ok: false,
            text: raw,
            message: t('install.codexForeign', { name: CODEX_SERVER_KEY }),
        };
    }
    const rendered = renderCodexSection(url, token);
    let next: string[];
    if (section) {
        next = [...lines.slice(0, section.start), ...rendered, ...lines.slice(section.end)];
    } else {
        next = [...lines];
        while (next.length && !next[next.length - 1].trim()) {
            next.pop();
        }
        if (next.length) {
            next.push('');
        }
        next.push(...rendered);
    }
    while (next.length && !next[next.length - 1].trim()) {
        next.pop();
    }
    next.push('');
    const text = next.join(eol);
    const check = findSection(splitToml(text).lines);
    if (
        !check ||
        !isCodexSectionOurs(check.body) ||
        !sameUrl(extractUrl(check.body), url)
    ) {
        return { ok: false, text: raw, message: t('install.unrecognized') };
    }
    return { ok: true, text, message: '' };
}

export function renderCodexUninstall(raw: string): CodexRewrite {
    const { lines, eol } = splitToml(raw);
    const section = findSection(lines);
    const subs = findSubTables(lines);
    if (section && !isCodexSectionOurs(section.body)) {
        return {
            ok: false,
            text: raw,
            message: t('install.codexNotOurs', { name: CODEX_SERVER_KEY }),
        };
    }
    if (!section && !subs.length) {
        return {
            ok: true,
            text: raw,
            message: t('install.notPresent'),
            removed: false,
        };
    }
    const ranges = section ? [section, ...subs] : subs;
    const next = removeRanges(lines, ranges);
    while (next.length && !next[next.length - 1].trim()) {
        next.pop();
    }
    const text = next.length ? next.join(eol) + eol : '';
    const after = splitToml(text).lines;
    if (findSection(after) || findSubTables(after).length) {
        return { ok: false, text: raw, message: t('install.stillThere') };
    }
    return {
        ok: true,
        text,
        message: '',
        removed: true,
    };
}
