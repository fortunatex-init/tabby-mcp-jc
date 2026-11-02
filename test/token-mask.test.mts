import { test } from 'node:test';
import assert from 'node:assert/strict';

import { maskToken, tokenFingerprint } from '../src/core/token-mask.ts';

test('maskToken short and long', () => {
    assert.equal(maskToken(''), '(空)');
    assert.equal(maskToken('abcd'), '****');
    assert.equal(maskToken('abcdefghijklmnop'), 'abcd…mnop');
});

test('tokenFingerprint stable non-empty', () => {
    const a = tokenFingerprint('hello-token-value-32chars-aaaaaa');
    const b = tokenFingerprint('hello-token-value-32chars-aaaaaa');
    const c = tokenFingerprint('other');
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.equal(a.length, 8);
});
