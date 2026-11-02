import { test } from 'node:test';
import assert from 'node:assert/strict';

import { encodeCursor, decodeCursor, resolveReadWithCursor } from '../src/core/read-slice.ts';

function linesOf(n: number): string[] {
    return Array.from({ length: n }, (_, i) => `L${i}`);
}

test('encode/decode roundtrip', () => {
    const c = encodeCursor(42, 'hello');
    const d = decodeCursor(c);
    assert.ok(d);
    assert.equal(d!.end, 42);
    assert.equal(d!.sig.length, 8);
});

test('decode rejects garbage', () => {
    assert.equal(decodeCursor('nope'), null);
    assert.equal(decodeCursor('v1.x.yyyyyyyy'), null);
    assert.equal(decodeCursor(123), null);
});

test('no cursor: default anchor / last N', () => {
    const buf = linesOf(100);
    const lineAt = (i: number) => buf[i] ?? '';
    const r = resolveReadWithCursor(lineAt, 100, 30, 80, undefined);
    assert.equal(r.incremental, false);
    assert.equal(r.cursor_invalid, undefined);
    assert.equal(r.range.start, 80);
    assert.equal(r.range.end, 100);
    assert.ok(r.nextCursor.startsWith('v1.'));
});

test('valid cursor: only new lines since position', () => {
    const buf = linesOf(100);
    const lineAt = (i: number) => buf[i] ?? '';
    const cur = encodeCursor(90, buf[89]);
    const r = resolveReadWithCursor(lineAt, 100, 50, null, cur);
    assert.equal(r.incremental, true);
    assert.equal(r.cursor_invalid, undefined);
    assert.equal(r.range.start, 90);
    assert.equal(r.range.end, 100);
});

test('cursor hard cap: more than N new lines → last N of delta', () => {
    const buf = linesOf(500);
    const lineAt = (i: number) => buf[i] ?? '';
    const cur = encodeCursor(10, buf[9]);
    const r = resolveReadWithCursor(lineAt, 500, 50, null, cur);
    assert.equal(r.incremental, true);
    assert.equal(r.range.start, 450);
    assert.equal(r.range.end, 500);
});

test('malformed cursor → cursor_invalid + fallback', () => {
    const buf = linesOf(100);
    const lineAt = (i: number) => buf[i] ?? '';
    const r = resolveReadWithCursor(lineAt, 100, 20, null, 'bogus');
    assert.equal(r.cursor_invalid, true);
    assert.equal(r.cursor_invalid_reason, 'cursor_malformed');
    assert.equal(r.incremental, false);
    assert.equal(r.range.start, 80);
});

test('scrollback trimmed / sig mismatch → cursor_invalid', () => {
    const buf = linesOf(100);
    const lineAt = (i: number) => buf[i] ?? '';
    const cur = encodeCursor(50, 'NOT_THE_REAL_LINE');
    const r = resolveReadWithCursor(lineAt, 100, 20, null, cur);
    assert.equal(r.cursor_invalid, true);
    assert.equal(r.cursor_invalid_reason, 'scrollback_trimmed_or_changed');
    assert.equal(r.incremental, false);
});

test('cursor ahead of buffer → cursor_invalid', () => {
    const buf = linesOf(50);
    const lineAt = (i: number) => buf[i] ?? '';
    const cur = encodeCursor(80, 'x');
    const r = resolveReadWithCursor(lineAt, 50, 20, null, cur);
    assert.equal(r.cursor_invalid, true);
    assert.equal(r.cursor_invalid_reason, 'cursor_ahead_of_buffer');
});
