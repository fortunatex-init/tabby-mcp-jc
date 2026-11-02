import truncate from 'lodash/truncate';
import uniq from 'lodash/uniq';

type Dialect = 'posix' | 'powershell';
const DIALECTS: Dialect[] = ['posix', 'powershell'];

type SplitResult = { segments: string[] } | { blocked: string };

const NULL_TARGETS = ['/dev/null', '$null', 'nul'];

const isBoundary = (ch: string | undefined): boolean =>
    ch === undefined || /\s/.test(ch) || ch === ';' || ch === '|' || ch === '&';

function matchSafeRedirect(cmd: string, gt: number): number {
    let j = gt + 1;
    const append = cmd[j] === '>';
    if (append) {
        j++;
    }

    if (
        !append &&
        cmd[j] === '&' &&
        (cmd[j + 1] === '1' || cmd[j + 1] === '2') &&
        isBoundary(cmd[j + 2])
    ) {
        return j + 2;
    }

    while (cmd[j] === ' ') {
        j++;
    }
    for (const target of NULL_TARGETS) {
        const text = cmd.slice(j, j + target.length);
        const hit = target === 'nul' ? text.toLowerCase() === target : text === target;
        if (hit && isBoundary(cmd[j + target.length])) {
            return j + target.length;
        }
    }
    return -1;
}

function splitSegments(cmd: string, dialect: Dialect): SplitResult {
    const segments: string[] = [];
    let cur = '';
    let quote = '';

    for (let i = 0; i < cmd.length;) {
        const c = cmd[i];
        const next = cmd[i + 1];

        if (quote === "'") {
            if (c === "'") {
                quote = '';
            }
            cur += c;
            i++;
            continue;
        }

        if (quote === '"') {
            if (c === '`') {
                return { blocked: '` (命令替换)' };
            }
            if (c === '$' && next === '(') {
                return { blocked: '$( (命令替换)' };
            }
            if (dialect === 'posix' && c === '\\' && next !== undefined && '"\\`$'.includes(next)) {
                cur += c + next;
                i += 2;
                continue;
            }
            if (c === '"') {
                quote = '';
            }
            cur += c;
            i++;
            continue;
        }

        if (dialect === 'posix' && c === '\\') {
            cur += c + (next ?? '');
            i += 2;
            continue;
        }
        if (c === "'" || c === '"') {
            quote = c;
            cur += c;
            i++;
            continue;
        }
        if (c === '`') {
            return { blocked: '` (命令替换)' };
        }
        if (c === '$' && next === '(') {
            return { blocked: '$( (命令替换)' };
        }
        if (c === '(') {
            return { blocked: '( (子表达式/子 shell)' };
        }
        if (c === '{' && cmd[i - 1] !== '$') {
            return { blocked: '{ (脚本块/命令组)' };
        }
        if (c === '<') {
            return { blocked: '< (重定向)' };
        }
        if (c === ';') {
            segments.push(cur);
            cur = '';
            i++;
            continue;
        }
        if (c === '|') {
            segments.push(cur);
            cur = '';
            i += next === '|' || next === '&' ? 2 : 1;
            continue;
        }
        if (c === '&') {
            segments.push(cur);
            cur = '';
            i += next === '&' ? 2 : 1;
            continue;
        }
        if (c === '>') {
            const fd = /(^|\s)[12]$/.exec(cur);
            const standalone = fd !== null || cur === '' || /\s$/.test(cur);
            const end = standalone ? matchSafeRedirect(cmd, i) : -1;
            if (end < 0) {
                return { blocked: '> (重定向)' };
            }
            if (fd) {
                cur = cur.slice(0, -1);
            }
            cur += ' ';
            i = end;
            continue;
        }

        cur += c;
        i++;
    }

    if (quote) {
        return { blocked: '未闭合的引号(看不清命令边界)' };
    }
    segments.push(cur);
    return { segments };
}

export const DEFAULT_WHITELIST: string[] = [
    'ls',
    'dir',
    'pwd',
    'cd',
    'cat',
    'less',
    'more',
    'tail',
    'head',
    'grep',
    'find',
    'which',
    'file',
    'stat',
    'tree',
    'wc',
    'ps',
    'top',
    'htop',
    'df',
    'du',
    'free',
    'uname',
    'hostname',
    'whoami',
    'id',
    'date',
    'uptime',
    'env',
    'printenv',
    'echo',
    '/^journalctl(?!.*\\s--(va|rot|fl|syn|rel|sm|setu|up))(\\s|$)/',
    'clear',
    'git status',
    'git log',
    'git diff',
    'git branch',
    'git show',
    'git remote',
    'git stash list',
    'git tag',
    'docker ps',
    'docker images',
    'docker logs',
    '/^kubectl (get|describe|logs|top) /',
    'npm ls',
    'npm view',
    'npm outdated',
    'pip list',
    'pip show',
    'mvn -version',
    'node -v',
    'node --version',
    'Get-ChildItem',
    'Get-Content',
    'Get-Location',
    'Get-Process',
    'Get-Service',
    'Get-Item',
    'Test-Path',
];

export type DenyReason = 'empty' | 'shell-metachar' | 'no-match';

export interface WhitelistCheck {
    allowed: boolean;
    matchedRule?: string;
    reason?: DenyReason;
    detail?: string;
}

const DETAIL_MAX = 80;

function asRegex(rule: string): RegExp | null {
    const m = /^\/(.+)\/([gimsuy]*)$/.exec(rule.trim());
    if (!m) {
        return null;
    }
    try {
        return new RegExp(m[1], m[2]);
    } catch {
        return null;
    }
}

function prefixMatches(command: string, prefix: string): boolean {
    const c = command.trim();
    const p = prefix.trim();
    if (!p) {
        return false;
    }
    if (c === p) {
        return true;
    }
    return c.startsWith(p) && /\s/.test(c.charAt(p.length));
}

function matchRule(segment: string, rules: string[]): string | null {
    for (const rule of rules) {
        const re = asRegex(rule);
        if (re ? re.test(segment) : prefixMatches(segment, rule)) {
            return rule;
        }
    }
    return null;
}

export function checkWhitelist(
    command: string,
    rules: string[] = DEFAULT_WHITELIST,
): WhitelistCheck {
    const cmd = command.trim();
    if (!cmd) {
        return { allowed: false, reason: 'empty' };
    }

    const splits = DIALECTS.map(d => splitSegments(cmd, d));
    for (const split of splits) {
        if ('blocked' in split) {
            return { allowed: false, reason: 'shell-metachar', detail: split.blocked };
        }
    }

    const matched: string[] = [];
    for (const split of splits) {
        if ('blocked' in split) {
            continue;
        }
        const segments = split.segments.map(s => s.trim()).filter(Boolean);
        if (!segments.length) {
            return { allowed: false, reason: 'empty' };
        }
        for (const segment of segments) {
            const rule = matchRule(segment, rules);
            if (rule === null) {
                const detail = truncate(segment, { length: DETAIL_MAX + 1, omission: '…' });
                return { allowed: false, reason: 'no-match', detail };
            }
            matched.push(rule);
        }
    }

    return { allowed: true, matchedRule: uniq(matched).join(', ') };
}
