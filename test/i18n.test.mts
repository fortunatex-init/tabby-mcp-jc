import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setUiLocale, t, uiLocale } from '../src/i18n/t.ts';

test('chinese locale shows the existing copy, not the id', () => {
    setUiLocale('zh-CN');
    assert.equal(uiLocale(), 'zh-CN');
    assert.equal(t('common.copy'), '复制');
    assert.equal(t('clients.noToken'), '还没有 token');
    assert.notEqual(t('common.copy'), 'common.copy');
});

test('english locales use the english copy and fill placeholders', () => {
    setUiLocale('en-US');
    assert.equal(t('common.copy'), 'Copy');
    assert.equal(t('clients.lastReset', { when: 'today' }), 'Last reset: today');
    setUiLocale('en-GB');
    assert.equal(t('common.save'), 'Save');
});

test('other locales stay on the existing Chinese, unknown ids pass through', () => {
    setUiLocale('en-US');
    assert.equal(t('missing.id'), 'missing.id');
    setUiLocale('ja-JP');
    assert.equal(t('common.copy'), '复制');
    setUiLocale('zh-TW');
    assert.equal(t('clients.resetToken'), '重置 Token');
    setUiLocale(null);
    assert.equal(uiLocale(), 'zh-CN');
    assert.equal(t('common.copy'), '复制');
});
