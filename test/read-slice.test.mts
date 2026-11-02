import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveReadRange } from '../src/core/read-slice.ts';

test('有锚点:从锚点读到内容末尾', () => {
    assert.deepEqual(resolveReadRange(80, 100, 200), { start: 80, end: 100, usedAnchor: true });
});

test('无锚点:退回末尾 N 行', () => {
    assert.deepEqual(resolveReadRange(null, 100, 30), { start: 70, end: 100, usedAnchor: false });
    assert.deepEqual(resolveReadRange(undefined, 100, 30), {
        start: 70,
        end: 100,
        usedAnchor: false,
    });
});

test('锚点无效(负数/越界/NaN):同样退回末尾 N 行', () => {
    assert.deepEqual(resolveReadRange(-1, 100, 20), { start: 80, end: 100, usedAnchor: false });
    assert.deepEqual(resolveReadRange(100, 100, 20), { start: 80, end: 100, usedAnchor: false });
    assert.deepEqual(resolveReadRange(999, 100, 20), { start: 80, end: 100, usedAnchor: false });
    assert.deepEqual(resolveReadRange(Number.NaN, 100, 20), {
        start: 80,
        end: 100,
        usedAnchor: false,
    });
});

test('硬上限:锚点之后超过 N 行时只返回最后 N 行', () => {
    assert.deepEqual(resolveReadRange(10, 500, 50), { start: 450, end: 500, usedAnchor: true });
});

test('锚点靠近末尾且不足 N:从锚点起全部返回', () => {
    assert.deepEqual(resolveReadRange(90, 100, 50), { start: 90, end: 100, usedAnchor: true });
});

test('内容比 N 还短:从头返回', () => {
    assert.deepEqual(resolveReadRange(null, 10, 50), { start: 0, end: 10, usedAnchor: false });
    assert.deepEqual(resolveReadRange(0, 10, 50), { start: 0, end: 10, usedAnchor: true });
});

test('空缓冲', () => {
    assert.deepEqual(resolveReadRange(0, 0, 50), { start: 0, end: 0, usedAnchor: false });
    assert.deepEqual(resolveReadRange(null, 0, 50), { start: 0, end: 0, usedAnchor: false });
});
