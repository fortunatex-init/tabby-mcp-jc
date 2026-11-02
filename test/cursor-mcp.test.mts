import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
    CURSOR_BACKUP_SUFFIX,
    CURSOR_OWNER_HEADER,
    applyCursorBearerReset,
    inspectCursorConfig,
    renderCursorInstall,
    renderCursorUninstall,
    updateCursorBearer,
} from '../src/core/cursor-mcp.ts';

const URL = 'http://127.0.0.1:18765/mcp';
const OLD = 'OLDTOKEN1234567890abcdef';
const NEW = 'NEWTOKEN999abcdef0123456789';

function sample(extra: Record<string, unknown> = {}): string {
    return (
        JSON.stringify(
            {
                mcpServers: {
                    'chrome-devtools': {
                        command: 'npx.cmd',
                        args: ['-y', 'chrome-devtools-mcp@latest'],
                    },
                    ...extra,
                },
            },
            null,
            2,
        ) + '\n'
    );
}

test('install adds tabby and keeps other servers', () => {
    const r = renderCursorInstall(sample(), URL, OLD);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const json = JSON.parse(r.text);
    assert.equal(json.mcpServers.tabby.url, URL);
    assert.equal(json.mcpServers.tabby.headers.Authorization, `Bearer ${OLD}`);
    assert.equal(json.mcpServers.tabby.headers[CURSOR_OWNER_HEADER], 'tabby-mcp-jc');
    assert.equal(json.mcpServers['chrome-devtools'].command, 'npx.cmd');
    assert.equal(json.mcpServers.tabby.type, undefined);
    const inspected = inspectCursorConfig(r.text, URL);
    assert.equal(inspected.kind, 'installed');
    assert.equal(inspected.stale, false);
});

test('install into empty file', () => {
    const r = renderCursorInstall('', URL, OLD);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(inspectCursorConfig(r.text, URL).kind, 'installed');
});

test('stale when recorded port differs', () => {
    const r = renderCursorInstall('', 'http://127.0.0.1:19999/mcp', OLD);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const inspected = inspectCursorConfig(r.text, URL);
    assert.equal(inspected.kind, 'installed');
    assert.equal(inspected.stale, true);
});

test('refuse to overwrite a foreign tabby entry', () => {
    const raw = sample({
        tabby: { url: 'https://example.com/mcp', headers: { Authorization: 'Bearer other' } },
    });
    const r = renderCursorInstall(raw, URL, OLD);
    assert.equal(r.ok, false);
    assert.equal(inspectCursorConfig(raw, URL).kind, 'conflict');
    const removed = renderCursorUninstall(raw);
    assert.equal(removed.ok, false);
});

test('loopback /mcp without owner header still counts as ours', () => {
    const raw = sample({
        tabby: { url: URL, headers: { Authorization: `Bearer ${OLD}` } },
    });
    assert.equal(inspectCursorConfig(raw, URL).kind, 'installed');
    const removed = renderCursorUninstall(raw);
    assert.equal(removed.ok, true);
    if (!removed.ok) return;
    assert.equal(removed.removed, true);
    assert.equal(JSON.parse(removed.text).mcpServers.tabby, undefined);
    assert.ok(JSON.parse(removed.text).mcpServers['chrome-devtools']);
});

test('invalid json and bad mcpServers are refused', () => {
    assert.equal(inspectCursorConfig('{', URL).kind, 'parse_error');
    assert.equal(renderCursorInstall('{', URL, OLD).ok, false);
    const bad = JSON.stringify({ mcpServers: [] });
    assert.equal(inspectCursorConfig(bad, URL).kind, 'invalid');
    assert.equal(renderCursorInstall(bad, URL, OLD).ok, false);
});

test('preserves CRLF when rewriting', () => {
    const raw = '{\r\n  "mcpServers": {\r\n    "other": { "command": "x" }\r\n  }\r\n}\r\n';
    const r = renderCursorInstall(raw, URL, OLD);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.ok(r.text.includes('\r\n'));
    assert.equal(JSON.parse(r.text).mcpServers.other.command, 'x');
});

test('bearer reset updates only matching token', () => {
    const raw = sample({
        tabby: {
            url: URL,
            headers: { Authorization: `Bearer ${OLD}`, [CURSOR_OWNER_HEADER]: 'tabby-mcp-jc' },
        },
    });
    const r = updateCursorBearer(raw, { newToken: NEW, oldToken: OLD, expectedUrl: URL });
    assert.equal(r.ok, true);
    assert.equal(r.status, 'updated');
    const json = JSON.parse(r.text);
    assert.equal(json.mcpServers.tabby.headers.Authorization, `Bearer ${NEW}`);
    assert.equal(json.mcpServers.tabby.headers[CURSOR_OWNER_HEADER], 'tabby-mcp-jc');
    assert.equal(json.mcpServers['chrome-devtools'].command, 'npx.cmd');
});

test('bearer reset skips foreign token and wrong url', () => {
    const foreign = sample({
        tabby: { url: URL, headers: { Authorization: 'Bearer SOMEONE_ELSE' } },
    });
    const a = updateCursorBearer(foreign, { newToken: NEW, oldToken: OLD, expectedUrl: URL });
    assert.equal(a.status, 'skipped_foreign_token');
    assert.ok(a.text.includes('SOMEONE_ELSE'));

    const otherUrl = sample({
        tabby: { url: 'http://127.0.0.1:1/mcp', headers: { Authorization: `Bearer ${OLD}` } },
    });
    const b = updateCursorBearer(otherUrl, { newToken: NEW, oldToken: OLD, expectedUrl: URL });
    assert.equal(b.status, 'skipped_not_ours');
    assert.ok(b.text.includes(OLD));
});

test('applyCursorBearerReset writes file and backup, skips when missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-mcp-'));
    const missing = path.join(dir, 'nope.json');
    const skip = applyCursorBearerReset(missing, {
        newToken: NEW,
        oldToken: OLD,
        expectedUrl: URL,
    });
    assert.equal(skip.status, 'skipped_no_file');
    assert.equal(skip.wrote, false);
    assert.equal(fs.existsSync(missing + CURSOR_BACKUP_SUFFIX), false);

    const file = path.join(dir, 'mcp.json');
    fs.writeFileSync(
        file,
        sample({
            tabby: { url: URL, headers: { Authorization: `Bearer ${OLD}` } },
        }),
    );
    const applied = applyCursorBearerReset(file, {
        newToken: NEW,
        oldToken: OLD,
        expectedUrl: URL,
    });
    assert.equal(applied.wrote, true);
    assert.equal(applied.status, 'updated');
    assert.ok(fs.readFileSync(file, 'utf8').includes(NEW));
    assert.ok(fs.readFileSync(file + CURSOR_BACKUP_SUFFIX, 'utf8').includes(OLD));
    fs.rmSync(dir, { recursive: true, force: true });
});
