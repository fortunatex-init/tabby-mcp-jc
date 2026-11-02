import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    buildGenericMcpServersJson,
    buildRemotePrompt,
    normalizeMcpHttpUrl,
} from '../src/core/remote-prompt.ts';
import { setUiLocale } from '../src/i18n/t.ts';

const URL = 'http://127.0.0.1:9/mcp';
const TOK = 'SECRETTOKENVALUE';

test('normalizeMcpHttpUrl: bare host gets /mcp', () => {
    assert.equal(
        normalizeMcpHttpUrl('https://tabby-mcp.jcsun.top'),
        'https://tabby-mcp.jcsun.top/mcp',
    );
});

test('normalizeMcpHttpUrl: trailing slash then /mcp', () => {
    assert.equal(
        normalizeMcpHttpUrl('https://tabby-mcp.jcsun.top/'),
        'https://tabby-mcp.jcsun.top/mcp',
    );
    assert.equal(
        normalizeMcpHttpUrl('https://tabby-mcp.jcsun.top///'),
        'https://tabby-mcp.jcsun.top/mcp',
    );
});

test('normalizeMcpHttpUrl: already /mcp no doubling', () => {
    assert.equal(
        normalizeMcpHttpUrl('https://tabby-mcp.jcsun.top/mcp'),
        'https://tabby-mcp.jcsun.top/mcp',
    );
    assert.equal(
        normalizeMcpHttpUrl('https://tabby-mcp.jcsun.top/mcp/'),
        'https://tabby-mcp.jcsun.top/mcp',
    );
    assert.equal(normalizeMcpHttpUrl(URL), URL);
});

test('normalizeMcpHttpUrl: trim whitespace', () => {
    assert.equal(
        normalizeMcpHttpUrl('  https://example.com/tunnel  '),
        'https://example.com/tunnel/mcp',
    );
});

test('prompt / JSON use normalized url', () => {
    const bare = 'https://tabby-mcp.jcsun.top';
    const withTok = buildRemotePrompt({
        mcpUrl: bare,
        token: TOK,
        includeToken: true,
    });
    assert.ok(withTok.includes(`URL: ${bare}/mcp`));
    assert.ok(!withTok.includes(`URL: ${bare}\n`));
    const json = JSON.parse(buildGenericMcpServersJson(bare, TOK));
    assert.equal(json.mcpServers.tabby.url, `${bare}/mcp`);
});

test('prompt is actionable AI instruction with generic JSON only', () => {
    const withTok = buildRemotePrompt({
        mcpUrl: URL,
        token: TOK,
        includeToken: true,
    });
    assert.ok(withTok.includes('请把下面这个 MCP 服务器添加到你的 MCP 配置中'));
    assert.ok(withTok.includes('Streamable HTTP'));
    assert.ok(withTok.includes('list_tabs'));
    assert.ok(withTok.includes('名称: tabby'));
    assert.ok(withTok.includes(`URL: ${URL}`));
    assert.ok(withTok.includes(`Authorization: Bearer ${TOK}`));
    assert.ok(withTok.includes('"mcpServers"'));
    assert.ok(withTok.includes('"type": "http"'));
    assert.ok(withTok.includes('若你无法修改自身配置，请把对应片段和配置文件位置告诉用户'));
    assert.ok(!withTok.includes('claude mcp add'));
    assert.ok(!withTok.includes('[mcp_servers.tabby]'));
    assert.ok(!withTok.includes('Codex'));
    assert.ok(!withTok.includes('Claude'));
});

test('without token uses placeholder everywhere', () => {
    const noTok = buildRemotePrompt({
        mcpUrl: 'https://example.com/mcp',
        token: TOK,
        includeToken: false,
    });
    assert.ok(!noTok.includes(TOK));
    assert.ok(noTok.includes('<YOUR_TOKEN>'));
    assert.ok(noTok.includes('https://example.com/mcp'));
});

test('english locale translates the prompt prose', () => {
    setUiLocale('en-US');
    try {
        const text = buildRemotePrompt({
            mcpUrl: URL,
            token: TOK,
            includeToken: true,
        });
        assert.ok(text.startsWith('Add the MCP server below'));
        assert.ok(text.includes('Name: tabby'));
        assert.ok(text.includes('If you cannot edit your own configuration'));
        assert.ok(!text.includes('请把下面这个 MCP 服务器'));
    } finally {
        setUiLocale('zh-CN');
    }
});

test('generic JSON helper shape', () => {
    const json = JSON.parse(buildGenericMcpServersJson(URL, TOK));
    assert.equal(json.mcpServers.tabby.type, 'http');
    assert.equal(json.mcpServers.tabby.url, URL);
    assert.equal(json.mcpServers.tabby.headers.Authorization, `Bearer ${TOK}`);
});
