import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FocusCountdown } from '../src/core/focus-countdown.ts';

test('一开始停着,剩余就是总时长', () => {
    const c = new FocusCountdown(30_000);
    assert.equal(c.running, false);
    assert.equal(c.remainingAt(0), 30_000);
});

test('前台才扣时间,后台停住,回来接着扣', () => {
    const c = new FocusCountdown(30_000);
    c.focus(1_000);
    assert.equal(c.running, true);
    assert.equal(c.remainingAt(4_000), 27_000);

    c.blur(4_000);
    assert.equal(c.running, false);
    assert.equal(c.remainingAt(9_000), 27_000);

    c.focus(9_000);
    assert.equal(c.remainingAt(10_000), 26_000);
});

test('重复 focus 不把已走的时间清掉', () => {
    const c = new FocusCountdown(30_000);
    c.focus(0);
    c.focus(5_000);
    assert.equal(c.remainingAt(5_000), 25_000);
});

test('停着的时候 blur 不改变剩余', () => {
    const c = new FocusCountdown(30_000);
    c.blur(5_000);
    assert.equal(c.running, false);
    assert.equal(c.remainingAt(5_000), 30_000);
});

test('时间走完后不再重新开始', () => {
    const c = new FocusCountdown(1_000);
    c.focus(0);
    assert.equal(c.remainingAt(1_000), 0);
    c.blur(1_000);
    c.focus(5_000);
    assert.equal(c.running, false);
    assert.equal(c.remainingAt(9_000), 0);
});
