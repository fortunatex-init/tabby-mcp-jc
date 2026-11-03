import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CODEX_SERVER_KEY } from '../src/core/codex-config.ts';
import {
    inspectCodexConfig,
    renderCodexInstall,
    renderCodexUninstall,
} from '../src/core/codex-config.ts';
import { updateCodexBearer } from '../src/core/codex-bearer.ts';

const URL = 'http://127.0.0.1:18765/mcp';
const TOKEN = 'TESTTOKEN1234567890abcdef';

function sampleWithSubs(): string {
    return `# keep me
[mcp_servers.other]
url = "http://x"

[mcp_servers.${CODEX_SERVER_KEY}]
# tabby-mcp-jc
url = "${URL}"
http_headers = { Authorization = "Bearer ${TOKEN}" }

[mcp_servers.${CODEX_SERVER_KEY}.tools.read_terminal]
approval_mode = "approve"

[mcp_servers.${CODEX_SERVER_KEY}.tools.write_terminal]
approval_mode = "approve"

[mcp_servers.foo]
url = "y"
`;
}

test('status orphans flag is false when main section is present', () => {
    const st = inspectCodexConfig(sampleWithSubs(), URL);
    assert.equal(st.installed, true);
    assert.equal(st.orphans, false);
    assert.equal(st.parseError, undefined);
});

test('uninstall removes main section and Codex sub-tables', () => {
    const r = renderCodexUninstall(sampleWithSubs());
    assert.equal(r.ok, true);
    assert.equal(r.removed, true);
    assert.ok(r.text.includes('# keep me'));
    assert.ok(r.text.includes('[mcp_servers.other]'));
    assert.ok(r.text.includes('[mcp_servers.foo]'));
    assert.ok(!r.text.includes('[mcp_servers.tabby]'));
    assert.ok(!r.text.includes('mcp_servers.tabby.'));
    assert.ok(!r.text.includes('approval_mode'));
});

test('uninstall cleans orphan sub-tables when main is missing', () => {
    const raw = `[mcp_servers.other]
url = "x"

[mcp_servers.tabby.tools.read_terminal]
approval_mode = "approve"

[mcp_servers."tabby".tools.await_enter]
approval_mode = "approve"
`;
    const st = inspectCodexConfig(raw, URL);
    assert.equal(st.installed, false);
    assert.equal(st.orphans, true);
    assert.ok(st.parseError);
    assert.match(st.parseError!, /子表|Orphan|sub-tables/i);

    const r = renderCodexUninstall(raw);
    assert.equal(r.ok, true);
    assert.equal(r.removed, true);
    assert.ok(r.text.includes('[mcp_servers.other]'));
    assert.ok(!r.text.includes('mcp_servers.tabby'));
    assert.ok(!r.text.includes('approval_mode'));
});

test('foreign main section is left untouched including nearby sub-tables', () => {
    const raw = `[mcp_servers.tabby]
url = "https://example.com/mcp"
http_headers = { Authorization = "Bearer FOREIGN" }

[mcp_servers.tabby.tools.read_terminal]
approval_mode = "approve"
`;
    const st = inspectCodexConfig(raw, URL);
    assert.equal(st.conflict, true);
    assert.equal(st.installed, false);

    const r = renderCodexUninstall(raw);
    assert.equal(r.ok, false);
    assert.equal(r.text, raw);
});

test('install preserves existing Codex sub-tables and keeps one main header', () => {
    const raw = `[mcp_servers.tabby]
# tabby-mcp-jc
url = "http://127.0.0.1:19999/mcp"
http_headers = { Authorization = "Bearer OLDOLDOLDOLDOLDOLD" }

[mcp_servers.tabby.tools.read_terminal]
approval_mode = "approve"

[mcp_servers.other]
url = "z"
`;
    const r = renderCodexInstall(raw, URL, TOKEN);
    assert.equal(r.ok, true, r.message);
    const mains = r.text.match(/^\[mcp_servers\.tabby\]/gm) || [];
    assert.equal(mains.length, 1);
    assert.ok(r.text.includes(`url = "${URL}"`));
    assert.ok(r.text.includes('[mcp_servers.tabby.tools.read_terminal]'));
    assert.ok(r.text.includes('approval_mode = "approve"'));
    assert.ok(r.text.includes('[mcp_servers.other]'));
    assert.ok(r.text.includes('Bearer ' + TOKEN));
});

test('install with sub-table before parent stays valid and keeps one main header', () => {
    const raw = `[mcp_servers.tabby.tools.read_terminal]
approval_mode = "approve"

[mcp_servers.tabby]
# tabby-mcp-jc
url = "http://127.0.0.1:19999/mcp"
http_headers = { Authorization = "Bearer OLDOLDOLDOLDOLDOLD" }
`;
    const r = renderCodexInstall(raw, URL, TOKEN);
    assert.equal(r.ok, true, r.message);
    assert.equal((r.text.match(/^\[mcp_servers\.tabby\]/gm) || []).length, 1);
    assert.ok(r.text.includes('[mcp_servers.tabby.tools.read_terminal]'));
    assert.ok(r.text.includes('approval_mode = "approve"'));
    assert.ok(r.text.includes(`url = "${URL}"`));
});

test('bearer update rewrites token without touching sub-tables', () => {
    const raw = sampleWithSubs();
    const r = updateCodexBearer(raw, {
        newToken: 'NEWTOKEN999abcdef0123456789',
        oldToken: TOKEN,
        expectedUrl: URL,
    });
    assert.equal(r.ok, true);
    assert.ok(r.text.includes('Bearer NEWTOKEN999abcdef0123456789'));
    assert.ok(!r.text.includes(TOKEN));
    assert.ok(r.text.includes('[mcp_servers.tabby.tools.read_terminal]'));
    assert.ok(r.text.includes('approval_mode = "approve"'));
    assert.ok(r.text.includes('[mcp_servers.other]'));
});
