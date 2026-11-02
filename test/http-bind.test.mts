import { test } from 'node:test';

import assert from 'node:assert/strict';

import {
    DEFAULT_HTTP_BIND_HOST,
    LAN_HTTP_BIND_HOST,
    resolveHttpBindHost,
} from '../src/core/http-bind.ts';

import { isAuthorized } from '../src/core/http-auth.ts';

test('resolveHttpBindHost 默认本机回环', () => {
    assert.equal(resolveHttpBindHost(), DEFAULT_HTTP_BIND_HOST);

    assert.equal(resolveHttpBindHost(undefined, undefined), '127.0.0.1');

    assert.equal(resolveHttpBindHost('', ''), '127.0.0.1');

    assert.equal(resolveHttpBindHost('bogus', 'also-bad'), '127.0.0.1');
});

test('resolveHttpBindHost 接受配置 0.0.0.0', () => {
    assert.equal(resolveHttpBindHost(undefined, '0.0.0.0'), LAN_HTTP_BIND_HOST);

    assert.equal(resolveHttpBindHost(null, '127.0.0.1'), '127.0.0.1');
});

test('resolveHttpBindHost 环境变量覆盖配置', () => {
    assert.equal(resolveHttpBindHost('0.0.0.0', '127.0.0.1'), '0.0.0.0');

    assert.equal(resolveHttpBindHost('127.0.0.1', '0.0.0.0'), '127.0.0.1');
});

test('客户端展示 URL 约定为本机回环(与绑定解耦)', () => {

    const port = 18765;

    assert.equal(`http://127.0.0.1:${port}/mcp`, 'http://127.0.0.1:18765/mcp');
});

test('非回环绑定下 Bearer 仍强制(逻辑与 host 解耦)', () => {
    const token = 'a'.repeat(64);

    assert.equal(token.length, 64);

    assert.equal(isAuthorized(undefined, token), false);

    assert.equal(isAuthorized('Bearer wrong', token), false);

    assert.equal(isAuthorized('Bearer ' + token, token), true);
});
