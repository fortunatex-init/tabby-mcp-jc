import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeCommandText, assertNoSubmit } from '../src/core/sanitize.ts';

test('剥离尾部 CR —— 最典型的"AI 想替你按回车"', () => {
    const r = sanitizeCommandText('ls -la\r');
    assert.equal(r.text, 'ls -la');
    assert.equal(r.modified, true);
    assert.ok(r.removed.includes('newline'));
});

test('剥离 LF 与 CRLF', () => {
    assert.equal(sanitizeCommandText('a\nb').text, 'ab');
    assert.equal(sanitizeCommandText('x\r\n').text, 'x');
    assert.equal(sanitizeCommandText('\n\r\n\r').text, '');
});

test('多行脚本被压成一行,绝不会有任何一行被提交', () => {
    const r = sanitizeCommandText('echo one\necho two\necho three');
    assert.equal(r.text, 'echo oneecho twoecho three');
    assert.ok(!/[\r\n]/.test(r.text));
});

test('保留 Tab —— 它是合法的补全输入', () => {
    const r = sanitizeCommandText('git\tstatus');
    assert.equal(r.text, 'git\tstatus');
    assert.equal(r.modified, false);
});

test('剥离 ESC,防止提前闭合 bracketed paste', () => {
    const r = sanitizeCommandText('ls\x1b[201~rm -rf /');
    assert.ok(!r.text.includes('\x1b'));
    assert.ok(r.removed.includes('control'));
});

test('剥离 NUL 和其它控制字符', () => {
    const r = sanitizeCommandText('ls\x00\x07\x7f');
    assert.equal(r.text, 'ls');
});

test('干净输入原样通过', () => {
    const r = sanitizeCommandText('kubectl get pods -n default');
    assert.equal(r.text, 'kubectl get pods -n default');
    assert.equal(r.modified, false);
    assert.deepEqual(r.removed, []);
});

test('assertNoSubmit 对带换行的文本抛错', () => {
    assert.throws(() => assertNoSubmit('ls\r'), /refusing to send/);
    assert.throws(() => assertNoSubmit('ls\n'), /refusing to send/);
});

test('assertNoSubmit 放行 sanitize 的输出 —— 两者必须一致', () => {
    for (const raw of ['ls\r', 'a\nb', 'x\r\n', 'echo hi', 'git\tlog']) {
        assert.doesNotThrow(() => assertNoSubmit(sanitizeCommandText(raw).text));
    }
});
