import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_CONFIRM_NON_WHITELISTED,
    isConfirmNonWhitelisted,
} from '../src/core/confirm-non-whitelisted.ts';

test('isConfirmNonWhitelisted: undefined / null / true → 开启', () => {
    assert.equal(isConfirmNonWhitelisted(undefined), true);
    assert.equal(isConfirmNonWhitelisted(null), true);
    assert.equal(isConfirmNonWhitelisted(true), true);
});

test('isConfirmNonWhitelisted: 显式 false → 关闭', () => {
    assert.equal(isConfirmNonWhitelisted(false), false);
});

test('ConfigProvider 默认常量是 true', () => {
    assert.equal(DEFAULT_CONFIRM_NON_WHITELISTED, true);
});
