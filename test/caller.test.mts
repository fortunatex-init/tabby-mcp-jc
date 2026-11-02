import assert from 'node:assert/strict';
import { test } from 'node:test';

import { callerLabel } from '../src/core/caller.ts';

test('codex 名字映射成 Codex', () => {
    assert.equal(callerLabel({ name: 'codex-mcp-client', version: '1.0.0' }), 'Codex');
    assert.equal(callerLabel({ name: 'Codex' }), 'Codex');
});

test('claude 名字映射成 Claude', () => {
    assert.equal(callerLabel({ name: 'claude-ai' }), 'Claude');
    assert.equal(callerLabel({ name: 'Claude Desktop' }), 'Claude');
});

test('cursor 名字映射成 Cursor', () => {
    assert.equal(callerLabel({ name: 'cursor-vscode', version: '1.0.0' }), 'Cursor');
    assert.equal(callerLabel({ name: 'Cursor' }), 'Cursor');
});

test('未知客户端保留原名,有 version 就附上', () => {
    assert.equal(callerLabel({ name: 'my-bot' }), 'my-bot');
    assert.equal(callerLabel({ name: 'my-bot', version: '2.1' }), 'my-bot 2.1');
});

test('没有名字 → 未知', () => {
    assert.equal(callerLabel(undefined), '未知');
    assert.equal(callerLabel(null), '未知');
    assert.equal(callerLabel({}), '未知');
    assert.equal(callerLabel({ name: '  ' }), '未知');
    assert.equal(callerLabel({ name: 123 }), '未知');
});
