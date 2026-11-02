export interface ReadRange {
    start: number;
    end: number;
    usedAnchor: boolean;
}

export function resolveReadRange(
    anchor: number | null | undefined,
    contentEnd: number,
    want: number,
): ReadRange {
    const end = Math.max(0, Math.floor(contentEnd));
    const cap = Math.max(1, Math.floor(want));

    if (typeof anchor === 'number' && Number.isFinite(anchor)) {
        const a = Math.floor(anchor);
        if (a >= 0 && a < end) {
            const start = Math.max(a, end - cap);
            return { start, end, usedAnchor: true };
        }
    }

    return { start: Math.max(0, end - cap), end, usedAnchor: false };
}

export const CURSOR_PREFIX = 'v1.';

export interface CursorParts {
    end: number;
    sig: string;
}

export interface ResolveWithCursorResult {
    range: ReadRange;
    nextCursor: string;
    cursor_invalid?: boolean;
    cursor_invalid_reason?: string;
    incremental: boolean;
}

function lineSig(line: string): string {
    let h = 2166136261;
    const s = line || '';
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

export function encodeCursor(end: number, lastLine: string): string {
    const e = Math.max(0, Math.floor(end));
    return CURSOR_PREFIX + e + '.' + lineSig(lastLine);
}

export function decodeCursor(raw: unknown): CursorParts | null {
    if (typeof raw !== 'string' || !raw.startsWith(CURSOR_PREFIX)) return null;
    const rest = raw.slice(CURSOR_PREFIX.length);
    const dot = rest.indexOf('.');
    if (dot <= 0) return null;
    const end = Number(rest.slice(0, dot));
    const sig = rest.slice(dot + 1);
    if (!Number.isFinite(end) || end < 0 || !/^[0-9a-f]{8}$/.test(sig)) return null;
    return { end: Math.floor(end), sig };
}

export function resolveReadWithCursor(
    lineAt: (i: number) => string,
    contentEnd: number,
    want: number,
    writeAnchor: number | null | undefined,
    cursorRaw: unknown,
): ResolveWithCursorResult {
    const end = Math.max(0, Math.floor(contentEnd));
    const cap = Math.max(1, Math.floor(want));

    const finish = (
        range: ReadRange,
        incremental: boolean,
        invalid?: { reason: string },
    ): ResolveWithCursorResult => {
        const lastLine = range.end > range.start ? lineAt(range.end - 1) : '';
        const nextCursor = encodeCursor(range.end, lastLine);
        const out: ResolveWithCursorResult = { range, nextCursor, incremental };
        if (invalid) {
            out.cursor_invalid = true;
            out.cursor_invalid_reason = invalid.reason;
        }
        return out;
    };

    const decoded =
        cursorRaw === undefined || cursorRaw === null || cursorRaw === ''
            ? null
            : decodeCursor(cursorRaw);

    if (cursorRaw !== undefined && cursorRaw !== null && cursorRaw !== '' && !decoded) {
        const range = resolveReadRange(writeAnchor, end, cap);
        return finish(range, false, { reason: 'cursor_malformed' });
    }

    if (decoded) {
        if (decoded.end > end) {
            const range = resolveReadRange(writeAnchor, end, cap);
            return finish(range, false, { reason: 'cursor_ahead_of_buffer' });
        }
        if (decoded.end > 0) {
            const prev = lineAt(decoded.end - 1);
            if (lineSig(prev) !== decoded.sig) {
                const range = resolveReadRange(writeAnchor, end, cap);
                return finish(range, false, { reason: 'scrollback_trimmed_or_changed' });
            }
        }
        const start = Math.max(decoded.end, end - cap);
        const range: ReadRange = { start, end, usedAnchor: false };
        return finish(range, true);
    }

    const range = resolveReadRange(writeAnchor, end, cap);
    return finish(range, false);
}
