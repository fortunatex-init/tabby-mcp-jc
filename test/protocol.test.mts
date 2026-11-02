import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    negotiateProtocolVersion,
    PREFERRED_PROTOCOL_VERSION,
    SUPPORTED_PROTOCOL_VERSIONS,
} from '../src/core/protocol.ts';

test('支持的版本必须原样回显 —— 规范的硬性要求', () => {
    for (const v of SUPPORTED_PROTOCOL_VERSIONS) {
        assert.equal(negotiateProtocolVersion(v), v, `应回显: ${v}`);
    }
});

test('比我们新的版本回退到自己最新的,由客户端决定断不断', () => {
    assert.equal(negotiateProtocolVersion('2099-01-01'), PREFERRED_PROTOCOL_VERSION);
});

test('不认识的旧版本同样回退', () => {
    assert.equal(negotiateProtocolVersion('1999-01-01'), PREFERRED_PROTOCOL_VERSION);
});

test('字段缺失或类型不对都不会崩', () => {
    for (const bad of [undefined, null, 42, {}, [], true, '']) {
        assert.equal(negotiateProtocolVersion(bad), PREFERRED_PROTOCOL_VERSION);
    }
});

test('首选版本必须在支持列表里 —— 否则回出去的版本自己都不认', () => {
    assert.ok(SUPPORTED_PROTOCOL_VERSIONS.includes(PREFERRED_PROTOCOL_VERSION));
});

test('版本号格式统一,且没有重复', () => {
    for (const v of SUPPORTED_PROTOCOL_VERSIONS) {
        assert.match(v, /^\d{4}-\d{2}-\d{2}$/, `格式不对: ${v}`);
    }
    assert.equal(new Set(SUPPORTED_PROTOCOL_VERSIONS).size, SUPPORTED_PROTOCOL_VERSIONS.length);
});
