import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIRM_NON_WHITELISTED } from '../src/core/confirm-non-whitelisted.ts';

test('portFallback 文案 key 约定', async () => {
    const { MESSAGES } = await import('../src/i18n/messages.ts');
    assert.ok(MESSAGES['settings.portFallback']);
    assert.match(MESSAGES['settings.portFallback'].zh, /端口 \{old\} 被占用，已使用 \{new\}/);
});

test('confirmNonWhitelisted 默认常量为 true', () => {
    assert.equal(DEFAULT_CONFIRM_NON_WHITELISTED, true);
});
