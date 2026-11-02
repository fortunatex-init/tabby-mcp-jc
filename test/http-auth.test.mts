import { test } from 'node:test';

import assert from 'node:assert/strict';

import {
    extractBearerToken,
    hostnameFromHostHeader,
    isAllowedOrigin,
    isAuthorized,
} from '../src/core/http-auth.ts';

import {
    negotiateProtocolVersion,
    PREFERRED_PROTOCOL_VERSION,
    SUPPORTED_PROTOCOL_VERSIONS,
} from '../src/core/protocol.ts';

test('无 Origin 放行(非浏览器客户端)', () => {
    assert.equal(isAllowedOrigin(undefined), true);

    assert.equal(isAllowedOrigin(null), true);

    assert.equal(isAllowedOrigin(''), true);
});

test('本机 loopback Origin 放行', () => {
    assert.equal(isAllowedOrigin('http://127.0.0.1:3456'), true);

    assert.equal(isAllowedOrigin('http://localhost:18765'), true);

    assert.equal(isAllowedOrigin('http://[::1]:8080'), true);
});

test('非法跨站 Origin 必须拒绝', () => {
    assert.equal(isAllowedOrigin('http://evil.example'), false);

    assert.equal(isAllowedOrigin('https://attacker.test'), false);

    assert.equal(isAllowedOrigin('not-a-url'), false);

    assert.equal(isAllowedOrigin('https://evil.example', '192.168.99.120:18765'), false);
});

test('Origin hostname 与 Host 一致时放行(局域网 / 隧道同站)', () => {
    assert.equal(
        isAllowedOrigin('http://192.168.99.120:18765', '192.168.99.120:18765'),

        true,
    );

    assert.equal(
        isAllowedOrigin('https://abc.trycloudflare.com', 'abc.trycloudflare.com'),

        true,
    );

    assert.equal(
        isAllowedOrigin('http://192.168.99.120:18765', '192.168.99.120'),

        true,
    );
});

test('隧道/局域网无 Origin 放行(典型 Codex / cloudflared 上游)', () => {
    assert.equal(isAllowedOrigin(undefined, '192.168.99.120:18765'), true);

    assert.equal(isAllowedOrigin('', 'abc.trycloudflare.com'), true);
});

test('hostnameFromHostHeader', () => {
    assert.equal(hostnameFromHostHeader('192.168.99.120:18765'), '192.168.99.120');

    assert.equal(hostnameFromHostHeader('localhost:18765'), 'localhost');

    assert.equal(hostnameFromHostHeader('[::1]:18765'), '::1');

    assert.equal(hostnameFromHostHeader(undefined), null);
});

test('Bearer 提取', () => {
    assert.equal(extractBearerToken('Bearer abc123'), 'abc123');

    assert.equal(extractBearerToken('bearer xyz'), 'xyz');

    assert.equal(extractBearerToken('Basic abc'), null);

    assert.equal(extractBearerToken(undefined), null);

    assert.equal(extractBearerToken(''), null);
});

test('鉴权比对(与绑定主机无关,缺 Bearer / 错 Bearer 一律失败)', () => {
    assert.equal(isAuthorized('Bearer secret', 'secret'), true);

    assert.equal(isAuthorized('Bearer wrong', 'secret'), false);

    assert.equal(isAuthorized(undefined, 'secret'), false);

    assert.equal(isAuthorized('Bearer secret', ''), false);

    assert.equal(isAuthorized(undefined, 'lan-token-at-least-32-chars-long!!'), false);

    assert.equal(isAuthorized('Bearer bad', 'lan-token-at-least-32-chars-long!!'), false);

    assert.equal(
        isAuthorized(
            'Bearer lan-token-at-least-32-chars-long!!',
            'lan-token-at-least-32-chars-long!!',
        ),
        true,
    );
});

test('协议列表包含 2025-06-18 与 2025-11-25', () => {
    assert.ok(SUPPORTED_PROTOCOL_VERSIONS.includes('2025-06-18'));

    assert.ok(SUPPORTED_PROTOCOL_VERSIONS.includes('2025-11-25'));

    assert.equal(negotiateProtocolVersion('2025-06-18'), '2025-06-18');

    assert.equal(negotiateProtocolVersion('2025-11-25'), '2025-11-25');

    assert.equal(PREFERRED_PROTOCOL_VERSION, '2025-11-25');
});
