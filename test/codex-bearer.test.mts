import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { applyCodexBearerReset, updateCodexBearer } from '../src/core/codex-bearer.ts';
import { CODEX_BACKUP_SUFFIX } from '../src/core/codex-bearer.ts';

const EXPECTED = 'http://127.0.0.1:18765/mcp';
const OLD = 'OLDTOKEN1234567890abcdef';
const NEW = 'NEWTOKEN999abcdef0123456789';

function sample(opts: { url?: string; token?: string; marker?: boolean } = {}): string {
    const url = opts.url ?? EXPECTED;
    const token = opts.token ?? OLD;
    const marker = opts.marker === false ? '' : '# tabby-mcp-jc\n';
    return `# comment keep me
[mcp_servers.other]
url = "http://x"

[mcp_servers.tabby]
${marker}url = "${url}"
http_headers = { Authorization = "Bearer ${token}" }

[mcp_servers.foo]
url = "y"
`;
}

test('updates Bearer in tabby section only (legacy no opts)', () => {
    const r = updateCodexBearer(sample(), NEW);
    assert.equal(r.ok, true);
    assert.equal(r.status, 'updated');
    assert.equal(r.replacements, 1);
    assert.ok(r.text.includes(`Bearer ${NEW}`));
    assert.ok(!r.text.includes(OLD));
    assert.ok(r.text.includes('# comment keep me'));
    assert.ok(r.text.includes('[mcp_servers.other]'));
    assert.ok(r.text.includes('[mcp_servers.foo]'));
});

test('skip when no tabby entry', () => {
    const r = updateCodexBearer('[mcp_servers.x]\nurl="a"\n', NEW);
    assert.equal(r.ok, false);
    assert.equal(r.status, 'skipped_no_entry');
});

test('skip when tabby has no Bearer', () => {
    const raw = '[mcp_servers.tabby]\nurl = "http://127.0.0.1/mcp"\n';
    const r = updateCodexBearer(raw, NEW);
    assert.equal(r.ok, false);
    assert.equal(r.status, 'skipped_no_bearer');
});

test('updates multiple tabby-like headers if duplicated (legacy)', () => {
    const raw = `[mcp_servers.tabby]
http_headers = { Authorization = "Bearer AAA" }
[mcp_servers.tabby]
http_headers = { Authorization = "Bearer BBB" }
`;
    const r = updateCodexBearer(raw, 'CCC');
    assert.equal(r.ok, true);
    assert.equal(r.replacements, 2);
    assert.equal(r.text.split('CCC').length - 1, 2);
});

test('strict: url not ours → skipped_not_ours', () => {
    const r = updateCodexBearer(sample({ url: 'http://127.0.0.1:9999/mcp' }), {
        newToken: NEW,
        oldToken: OLD,
        expectedUrl: EXPECTED,
    });
    assert.equal(r.ok, false);
    assert.equal(r.status, 'skipped_not_ours');
    assert.ok(r.text.includes(OLD));
});

test('strict: foreign token → skipped_foreign_token', () => {
    const r = updateCodexBearer(sample({ token: 'FOREIGN_TOKEN_XXX' }), {
        newToken: NEW,
        oldToken: OLD,
        expectedUrl: EXPECTED,
    });
    assert.equal(r.ok, false);
    assert.equal(r.status, 'skipped_foreign_token');
    assert.match(r.message, /不是本服务的/);
    assert.ok(r.text.includes('FOREIGN_TOKEN_XXX'));
});

test('strict: installed + our token → updated', () => {
    const r = updateCodexBearer(sample(), {
        newToken: NEW,
        oldToken: OLD,
        expectedUrl: EXPECTED,
    });
    assert.equal(r.ok, true);
    assert.equal(r.status, 'updated');
    assert.ok(r.text.includes(`Bearer ${NEW}`));
});

test('file: not installed → untouched mtime, no bak', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-bearer-'));
    const cfg = path.join(dir, 'config.toml');
    const body = '[mcp_servers.other]\nurl = "x"\n';
    fs.writeFileSync(cfg, body);
    const before = fs.statSync(cfg).mtimeMs;
    const r = applyCodexBearerReset(cfg, { newToken: NEW, oldToken: OLD, expectedUrl: EXPECTED });
    assert.equal(r.wrote, false);
    assert.ok(r.status === 'skipped_no_entry' || r.status === 'skipped_not_ours');
    assert.equal(fs.readFileSync(cfg, 'utf8'), body);
    assert.equal(fs.statSync(cfg).mtimeMs, before);
    assert.equal(fs.existsSync(cfg + CODEX_BACKUP_SUFFIX), false);
    fs.rmSync(dir, { recursive: true, force: true });
});

test('file: installed → updated + bak', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-bearer-'));
    const cfg = path.join(dir, 'config.toml');
    fs.writeFileSync(cfg, sample());
    const r = applyCodexBearerReset(cfg, { newToken: NEW, oldToken: OLD, expectedUrl: EXPECTED });
    assert.equal(r.ok, true);
    assert.equal(r.wrote, true);
    const after = fs.readFileSync(cfg, 'utf8');
    assert.ok(after.includes(`Bearer ${NEW}`));
    assert.ok(!after.includes(OLD));
    assert.equal(fs.existsSync(cfg + CODEX_BACKUP_SUFFIX), true);
    assert.ok(fs.readFileSync(cfg + CODEX_BACKUP_SUFFIX, 'utf8').includes(OLD));
    fs.rmSync(dir, { recursive: true, force: true });
});

test('file: foreign token → skipped, mtime same, no bak', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-bearer-'));
    const cfg = path.join(dir, 'config.toml');
    const body = sample({ token: 'HANDSET_OTHER' });
    fs.writeFileSync(cfg, body);
    const before = fs.statSync(cfg).mtimeMs;
    const r = applyCodexBearerReset(cfg, { newToken: NEW, oldToken: OLD, expectedUrl: EXPECTED });
    assert.equal(r.wrote, false);
    assert.equal(r.status, 'skipped_foreign_token');
    assert.equal(fs.readFileSync(cfg, 'utf8'), body);
    assert.equal(fs.statSync(cfg).mtimeMs, before);
    assert.equal(fs.existsSync(cfg + CODEX_BACKUP_SUFFIX), false);
    fs.rmSync(dir, { recursive: true, force: true });
});

test('file: missing → skipped_no_file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-bearer-'));
    const cfg = path.join(dir, 'nope.toml');
    const r = applyCodexBearerReset(cfg, { newToken: NEW, oldToken: OLD, expectedUrl: EXPECTED });
    assert.equal(r.status, 'skipped_no_file');
    assert.equal(r.wrote, false);
    fs.rmSync(dir, { recursive: true, force: true });
});
